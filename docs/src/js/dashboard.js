import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🌍 Global state
let userId;
let userRole;
let map;
let storeMarkers = {};

(async () => {
  // 🔐 Auth check
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) return alert("You're not signed in.");

  userId = userData.user.id;
  userRole = userData.user.user_metadata?.role || 'consumer';
  console.log("👤 Role from JWT:", userRole);

  // 🧭 Tab nav & panel visibility
  document.querySelector('.tab-nav').innerHTML =
    userRole === 'store_owner'
      ? `<a href="dashboard.html">📋 Dashboard</a><a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`
      : `<a href="map.html">🗺️ Map</a><a href="profile.html">👤 Profile</a>`;
  const panelId = userRole === 'store_owner' ? 'storeUploadPanel' : 'mapLinkOnly';
  const rolePanel = document.getElementById(panelId);
  if (rolePanel) rolePanel.style.display = 'block';

  // 🗺️ Leaflet map setup
  map = L.map('map').setView([7.032, 125.092], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // 📍 Consumer geolocation + filtering
  if (userRole === 'consumer') {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
        await loadNearbyStores(latitude, longitude);
      },
      err => alert("❌ Location error: " + err.message)
    );
  } else {
    await loadAllStores();
  }

  // 🔁 Realtime store sync
  supabase.channel('realtime-store-sync')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'stores',
    }, payload => {
      console.log("⚡ New store detected:", payload.new);
      addStoreToMap(payload.new);
    })
    .subscribe();

  // 📍 Manual location detection
  const locationDisplay = document.getElementById('locationDisplay');
  const autoToggle = document.getElementById('autoLocationToggle');
  const useLocationBtn = document.getElementById('useLocationBtn');

  function applyLocation(coords) {
    document.querySelector('[name=lat]').value = coords.latitude;
    document.querySelector('[name=lng]').value = coords.longitude;
    locationDisplay.textContent = `📍 ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }

  function getGeolocation() {
    navigator.geolocation.getCurrentPosition(
      pos => applyLocation(pos.coords),
      err => alert("❌ Location error: " + err.message)
    );
  }

  autoToggle?.addEventListener('change', () => {
    if (autoToggle.checked) getGeolocation();
  });

  useLocationBtn?.addEventListener('click', getGeolocation);
})();

// 🏪 Register Store
document.getElementById('storeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const { name, address, lat, lng } = Object.fromEntries(form.entries());

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

// 🍽️ Upload Dish
document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const file = form.get('image');

  if (!file || !file.name) return alert("❌ No image selected.");

  const safeName = encodeURIComponent(file.name.replace(/[^\w.-]/g, '_'));
  const filePath = `public/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('dish-images')
    .upload(filePath, file, { upsert: true });

  if (uploadError) return alert("❌ Upload failed: " + uploadError.message);

  const imageUrl = `https://neigxicrhalonnsaqkud.supabase.co/storage/v1/object/public/dish-images/${filePath}`;

  const { error: insertError } = await supabase.from('foods').insert([{
    name: form.get('name'),
    description: form.get('description'),
    price: parseFloat(form.get('price')),
    image_url: imageUrl,
    uploader_id: userId
    // Add store_id here if linking dish to a specific store
  }]);

  if (insertError) alert("❌ Dish insert failed: " + insertError.message);
  else alert("✅ Dish uploaded!");
});
console.log("📸 Uploaded image key:", uploadData?.path);

// 📍 Map rendering
function addStoreToMap(store) {
  if (storeMarkers[store.id]) return;
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>${store.address}<br>
    <button onclick="viewMenu('${store.id}', '${store.name}')">🍽️ View Menu</button>
  `);
  storeMarkers[store.id] = marker;
}

// 🧭 Nearby filtering
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const toRad = deg => deg * Math.PI / 180;

async function loadNearbyStores(userLat, userLng) {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return alert("❌ Failed to load stores");

  stores.forEach(store => {
    const distance = haversine(userLat, userLng, store.lat, store.lng);
    if (distance <= 5) addStoreToMap(store);
  });
}

async function loadAllStores() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return alert("❌ Failed to load stores");
  stores.forEach(addStoreToMap);
}

// 🍱 Menu per store
window.viewMenu = async (storeId, storeName) => {
  const { data: menu, error } = await supabase.from('foods')
    .select('*').eq('store_id', storeId); // ✅ store_id reference

  if (error) return alert("❌ Failed to load menu");

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
    `;
    list.appendChild(li);
  });
};
