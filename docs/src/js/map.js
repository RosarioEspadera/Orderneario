// src/js/map.js
import { supabase, SUPABASE_URL } from './supabaseClient.js';

// 🗺️ Initialize the map
const map = L.map('map').setView([7.032, 125.092], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 📦 DOM elements
const storeNameEl = document.getElementById('storeName');
const menuListEl = document.getElementById('menuList');
const menuPanelEl = document.getElementById('menuPanel');

// 📌 Add a store marker with button
function addStoreMarker(store) {
  const marker = L.marker([store.lat, store.lng]).addTo(map);

  marker.bindPopup(`
    <strong>${store.name}</strong><br>
    ${store.address}<br>
    <button class="viewMenuBtn" data-id="${store.id}" data-name="${store.name}">
      🍽️ View Menu
    </button>
  `);
}

// 🚀 Load all stores
async function loadStores() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return console.error('❌ Store fetch error:', error.message);
  stores.forEach(addStoreMarker);
}
loadStores();

// 🔁 Real-time store updates
supabase.channel('realtime-stores')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stores' },
    payload => {
      console.log('📦 New store added:', payload.new);
      addStoreMarker(payload.new);
    }
  )
  .subscribe();

// 🍽️ Load menu for selected store
async function loadMenu(storeId, storeName) {
  const { data: foods, error } = await supabase.from('foods').select('*').eq('store_id', storeId);
  if (error) return alert('❌ Menu fetch failed');

  storeNameEl.textContent = storeName;
  menuListEl.innerHTML = '';

  foods.forEach(food => {
    const item = document.createElement('li');
    item.innerHTML = `
      <img src="${food.image_url}" width="100" />
      <p><strong>${food.name}</strong> - ₱${food.price}</p>
      <button class="orderBtn" data-id="${food.id}">🛒 Order</button>
    `;
    menuListEl.appendChild(item);
  });

  menuPanelEl.style.display = 'block';
}

// 🛍️ Handle order placement
async function placeOrder(foodId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('🔒 Please sign in to order.');

  const { error } = await supabase.from('orders').insert([{
    user_id: user.id,
    food_id: foodId,
    status: 'pending',
    timestamp: new Date().toISOString()
  }]);

  alert(error ? `❌ Order failed: ${error.message}` : '✅ Order placed!');
}

// 🎯 Delegate button clicks
document.addEventListener('click', (e) => {
  if (e.target.matches('.viewMenuBtn')) {
    const storeId = e.target.dataset.id;
    const storeName = e.target.dataset.name;
    loadMenu(storeId, storeName);
  }

  if (e.target.matches('.orderBtn')) {
    const foodId = e.target.dataset.id;
    placeOrder(foodId);
  }
});
