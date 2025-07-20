// src/js/dashboard.js
import { supabase, SUPABASE_URL } from './supabaseClient.js';

let userId, userRole, map;
let userStoreId = null;
let storeMarkers = {};

// 🚪 Session & Role Detection
(async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return alert("You're not signed in.");

  const user = data.user;
  userId = user.id;
  userRole = user.user_metadata?.role || 'consumer';

  setupNavbar();
  await setupStoreDropdown();
  setupLocationControls();
  initMap();
  userRole === 'consumer' ? await locateNearby() : await loadAllStores();
  watchStoreSync();

  // 🧑‍🍳 Auto-show owner’s menu
  if (userRole === 'store_owner') {
    const { data: stores } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId);

    if (stores?.length) {
      const store = stores[0];
      addStoreToMap(store);
      viewMenu(store.id, store.name);
    }
  }
})();

// 🧭 Navbar Links & Panels
function setupNavbar() {
  const nav = document.querySelector('.tab-nav');
  nav.innerHTML = userRole === 'store_owner'
    ? `<a href="dashboard.html">📋 Dashboard</a><a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`
    : `<a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`;

  const panel = document.getElementById(userRole === 'store_owner' ? 'storeUploadPanel' : 'mapLinkOnly');
  if (panel) panel.style.display = 'block';
}

// 🏪 Store Dropdown
async function setupStoreDropdown() {
  if (userRole !== 'store_owner') return;

  const { data, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', userId);

  if (error || !data?.length) return console.error("❌ No store found:", error?.message);

  const select = document.getElementById('storeSelect');
  data.forEach((store, i) => {
    const opt = document.createElement('option');
    opt.value = store.id;
    opt.textContent = store.name;
    select.appendChild(opt);
    if (i === 0) userStoreId = store.id;
  });

  select.addEventListener('change', e => {
    userStoreId = e.target.value;
  });
}

// 🗺️ Leaflet Map
function initMap() {
  map = L.map('map').setView([7.032, 125.092], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}
function addStoreToMap(store) {
  if (!store.lat || !store.lng || storeMarkers[store.id]) return;

  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>${store.address}<br>
    <button onclick="viewMenu('${store.id}', '${store.name}')">🍽️ View Menu</button>
  `);

  storeMarkers[store.id] = marker;
}
function watchStoreSync() {
  supabase.channel('store-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stores' }, ({ new: store }) => {
      console.log("⚡ New store added:", store.name);
      addStoreToMap(store);
    })
    .subscribe();
}

async function loadAllStores() {
  const { data, error } = await supabase.from('stores').select('*');
  if (error) return console.error("❌ Failed to load stores:", error.message);

  data.forEach(store => addStoreToMap(store));
}

// 📍 Auto-geolocation
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

// 📦 Location Input Controls
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

// 🏪 Register Store
document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  const { name, address, lat, lng } = form;

  const { data, error } = await supabase.from('stores').insert([{
    name, address, lat: parseFloat(lat), lng: parseFloat(lng), owner_id: userId
  }]).select();

  if (error) return alert("❌ Store insert failed: " + error.message);
  alert("✅ Store registered!");
  addStoreToMap(data[0]);
});

// 🍽️ Upload Dish
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
  const store_id = userStoreId;

  const { error: insertError } = await supabase.from('foods').insert([{
    name: form.get('name'),
    description: form.get('description'),
    price: parseFloat(form.get('price')),
    image_url: imageUrl,
    uploader_id: userId,
   store_id: userStoreId
  }])
.select();
 if (insertError) {
  alert("❌ Dish insert failed: " + insertError.message);
} else {
 else {
  console.log("✅ Dish inserted:", insertResult);
}
});

// 🧑‍🍳 View Menu
window.viewMenu = async (storeId, storeName) => {
  const { data: userData } = await supabase.auth.getUser();
  const role = userData?.user?.user_metadata?.role || 'guest';

  const { data: menu, error } = await supabase
    .from('foods')
    .select('*')
    .eq('store_id', storeId);

  if (error) return alert('❌ Failed to load menu');
  if (!menu?.length) return alert(`ℹ️ No dishes yet for ${storeName}`);

  const panel = document.getElementById('menuPanel');
  panel.style.display = 'block';
  document.getElementById('menuTitle').textContent = `🍽️ ${storeName}'s Menu`;
  const list = document.getElementById('menuList');
  list.innerHTML = '';

  menu.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${item.image_url}" width="100" />
      <p><strong>${item.name}</strong> – ₱${item.price}<br>${item.description}</p>
      ${role === 'store_owner' ? `<button onclick="editDish('${item.id}')">✏️ Edit</button>` : ''}
    `;
    list.appendChild(li);
  });
};

// ✏️ Edit Dish Modal
window.editDish = async (dishId) => {
  const { data, error } = await supabase.from('foods').select('*').eq('id', dishId).single();
  if (error) return alert("❌ Failed to fetch dish");

  const form = document.getElementById('editDishForm');
  form.dish_id.value = dishId;
  form.name.value = data.name;
  form.description.value = data.description;
  form.price.value = data.price;

  document.getElementById('editDishModal').style.display = 'block';
};

window.closeEditModal = () => {
  document.getElementById('editDishModal').style.display = 'none';
};

document.getElementById('editDishForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  const { dish_id, name, description, price } = form;

  const { error } = await supabase.from('foods')
    .update({ name, description, price: parseFloat(price) })
    .eq('id', dish_id);

  if (error) return alert("❌ Update failed: " + error.message);
  alert("✅ Dish updated!");
  closeEditModal();
  window.location.reload(); // Or re-call viewMenu
});

//

