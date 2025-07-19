import { supabase } from './supabaseClient.js';

let userId, userRole, map;
let storeMarkers = {};

// 🔐 Session & role
(async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return alert("You're not signed in.");
  const user = data.user;
  userId = user.id;
  userRole = user.user_metadata?.role || 'consumer';

  setupNavbar();
  setupStoreDropdown();
  setupLocationControls();
  initMap();
  userRole === 'consumer' ? await locateNearby() : await loadAllStores();
  watchStoreSync();
})();

// 🧭 Role-based nav + panels
function setupNavbar() {
  document.querySelector('.tab-nav').innerHTML =
    userRole === 'store_owner'
      ? `<a href="dashboard.html">📋 Dashboard</a><a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`
      : `<a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`;

  const panel = document.getElementById(userRole === 'store_owner' ? 'storeUploadPanel' : 'mapLinkOnly');
  if (panel) panel.style.display = 'block';
}

// 🏪 Populate store dropdown
async function setupStoreDropdown() {
  if (userRole !== 'store_owner') return;
  const { data, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', userId);

  if (error) return console.error("Failed to load stores:", error.message);
  const select = document.getElementById('storeSelect');
  data.forEach(store => {
    const opt = document.createElement('option');
    opt.value = store.id;
    opt.textContent = store.name;
    select.appendChild(opt);
  });
}

// 🗺️ Leaflet setup
function initMap() {
  map = L.map('map').setView([7.032, 125.092], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// 📍 Auto geolocation
async function locateNearby() {
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
      await loadNearbyStores(latitude, longitude);
    },
    err => alert("❌ Location error: " + err.message)
  );
}

// 🔁 Realtime store sync
function watchStoreSync() {
  supabase.channel('store-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stores' },
      ({ new: store }) => {
        console.log("⚡ New store:", store.name);
        addStoreToMap(store);
      }
    ).subscribe();
}

// 📦 Location selector buttons
function setupLocationControls() {
  const autoToggle = document.getElementById('autoLocationToggle');
  const locationDisplay = document.getElementById('locationDisplay');
  const useLocationBtn = document.getElementById('useLocationBtn');

  autoToggle?.addEventListener('change', () => {
    if (autoToggle.checked) getGeolocation();
  });

  useLocationBtn?.addEventListener('click', getGeolocation);

  function getGeolocation() {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        document.querySelector('[name=lat]').value = latitude;
        document.querySelector('[name=lng]').value = longitude;
        locationDisplay.textContent = `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      },
      err => alert("❌ Location error: " + err.message)
    );
  }
}

// 🏪 Store registration
document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  const { name, address, lat, lng } = form;

  const { data, error } = await supabase.from('stores').insert([{
    name,
    address,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    owner_id: userId
  }]).select();

  if (error) return alert("❌ Store insert failed: " + error.message);
  alert("✅ Store registered!");
  addStoreToMap(data[0]);
});

// 🍽️ Dish upload
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const image = form.get('image');
  if (!image || !image.name || !image.type.startsWith('image/')) {
    alert("❌ Invalid image file");
    return;
  }

  const safeName = image.name.replace(/[^\w.-]/g, '_');
  const filePath = `public/${Date.now()}-${safeName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('dish-images')
    .upload(filePath, image, { upsert: true });

  if (uploadError) return alert("❌ Image upload failed: " + uploadError.message);
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/dish-images/${uploadData.path}`;
  const store_id = form.get('store_id');

  const { error: insertError } = await supabase.from('foods').insert([{
    name: form.get('name'),
    description: form.get('description'),
    price: parseFloat(form.get('price')),
    image_url: imageUrl,
    uploader_id: userId,
    store_id
  }]);

  if (insertError) alert("❌ Dish insert failed: " + insertError.message);
  else alert("✅ Dish uploaded!");
});

// 📍 Add store to map
function addStoreToMap(store) {
  if (storeMarkers[store.id]) return;
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>${store.address}<br>
    <button onclick="viewMenu('${store.id}', '${store.name}')">🍽️ View Menu</button>
  `);
  storeMarkers[store.id] = marker;
}

// 🧭 Nearby store filter
async function loadNearbyStores(lat1, lon1) {
  const { data, error } = await supabase.from('stores').select('*');
  if (error) return alert("❌ Failed to load stores");
  data.forEach(store => {
    const d = haversine(lat1, lon1, store.lat, store.lng);
    if (d <= 5) addStoreToMap(store);
  });
}
async function loadAllStores() {
  const { data, error } = await supabase.from('stores').select('*');
  if (error) return alert("❌ Failed to load stores");
  data.forEach(addStoreToMap);
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const toRad = deg => deg * Math.PI / 180;

// 🍱 View menu per store
window.viewMenu = async (storeId, storeName) => {
  const { data: menu, error } = await supabase.from('foods').select('*').eq('store_id', storeId);
  if (error) return alert("❌ Failed to load menu");

  const panel = document.getElementById('menuPanel');
  panel.style.display = 'block';
  document.getElementById('menuTitle').textContent = `🍽️ ${storeName}'s Menu`;
  const list = document.getElementById('menuList');
  list.innerHTML = '';
  
  menu.forEach(item => {
    const li = document.createElement('li');
    const isOwner = userRole === 'store_owner';
    li.innerHTML = `
      <img src="${item.image_url}" width="100" />
      <p><strong>${item.name}</strong> – ₱${item.price}<br>${item.description}</p>
      ${isOwner ? `<button onclick="editDish('${item.id}')">✏️ Edit</button>` : ''}
    `;
    list.appendChild(li);
  });
};

// ✏️ Dish Edit Function
// ✏️ Open modal and populate form
window.editDish = async (dishId) => {
  console.log("🔧 Opening edit modal for dish:", dishId);
  const { data, error } = await supabase.from('foods').select('*').eq('id', dishId).single();
  if (error) return alert("❌ Failed to fetch dish");

  const form = document.getElementById('editDishForm');
  form.dish_id.value = dishId;
  form.name.value = data.name;
  form.description.value = data.description;
  form.price.value = data.price;

  document.getElementById('editDishModal').style.display = 'block';
};

// 🛑 Close modal
window.closeEditModal = () => {
  document.getElementById('editDishModal').style.display = 'none';
};

// 💾 Handle save
document.getElementById('editDishForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  const { dish_id, name, description, price } = form;

  const { error } = await supabase
    .from('foods')
    .update({ name, description, price: parseFloat(price) })
    .eq('id', dish_id);

  if (error) return alert("❌ Update failed: " + error.message);

  alert("✅ Dish updated!");
  closeEditModal();
  window.location.reload(); // or re-call viewMenu if you prefer
});

