// src/js/map.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'your-public-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🗺️ Initialize the map
const map = L.map('map').setView([7.032, 125.092], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 🧑‍🍳 Detect user and role
let currentUser = null;
let userRole = 'guest';

(async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
  userRole = currentUser?.user_metadata?.role || 'guest';
})();

// 📦 DOM elements
const panel = document.getElementById('menuPanel');
const titleEl = document.getElementById('menuTitle');
const listEl = document.getElementById('menuList');

// 📌 Render store marker
function renderStore(store) {
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>
    ${store.address}<br>
    <button class="viewMenuBtn" data-id="${store.id}" data-name="${store.name}">🍽️ View Menu</button>
  `);
}

// 📍 Load all stores
async function loadStores() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return console.error('❌ Failed to load stores:', error.message);
  stores.forEach(renderStore);
}
loadStores();

// 🔁 Realtime store sync
supabase.channel('realtime-stores')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stores' }, ({ new: store }) => {
    console.log('📦 New store added:', store);
    renderStore(store);
  })
  .subscribe();

// 🍽️ View menu for selected store
window.viewMenu = async (storeId, storeName) => {
  const { data: foods, error } = await supabase
    .from('foods')
    .select('*')
    .eq('store_id', storeId);

  if (error) return alert('❌ Failed to load menu');
  if (!foods || foods.length === 0) return alert(`ℹ️ No dishes available for ${storeName}`);

  titleEl.textContent = `🍽️ ${storeName}'s Menu`;
  listEl.innerHTML = '';
  panel.style.display = 'block';

  foods.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${item.image_url}" width="100" />
      <p><strong>${item.name}</strong> – ₱${item.price}<br>${item.description}</p>
      ${userRole === 'store_owner'
        ? `<button onclick="editDish('${item.id}')">✏️ Edit</button>`
        : `<button class="orderBtn" data-id="${item.id}">🛒 Order</button>`}
    `;
    listEl.appendChild(li);
  });
};

// 🛍️ Place an order
window.placeOrder = async (foodId) => {
  if (!currentUser) return alert('🔒 Please sign in first.');

  const { error } = await supabase.from('orders').insert([{
    user_id: currentUser.id,
    food_id: foodId,
    status: 'pending',
    timestamp: new Date().toISOString()
  }]);

  alert(error ? `❌ Order failed: ${error.message}` : '✅ Order placed!');
};

// 🎯 Button click handler
document.addEventListener('click', (e) => {
  if (e.target.matches('.viewMenuBtn')) {
    const id = e.target.dataset.id;
    const name = e.target.dataset.name;
    viewMenu(id, name);
  }

  if (e.target.matches('.orderBtn')) {
    const foodId = e.target.dataset.id;
    placeOrder(foodId);
  }
});
