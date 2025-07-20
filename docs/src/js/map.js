// src/js/map.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🧭 Initialize the map
const map = L.map('map').setView([7.032, 125.092], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 🌐 DOM Elements
const panel = document.getElementById('menuPanel');
const titleEl = document.getElementById('menuTitle');
const listEl = document.getElementById('menuList');

// 👤 Auth + Role
let currentUser = null;
let userRole = 'guest';

// 🔐 Ensure Auth Loads Before Actions
const initAuth = async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
  userRole = currentUser?.user_metadata?.role || 'guest';
};

await initAuth(); // Wait before continuing

// 📍 Render Store Marker
function renderStore(store) {
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>
    ${store.address}<br>
    <button class="viewMenuBtn" data-id="${store.id}" data-name="${store.name}">🍽️ View Menu</button>
  `);
}

// 🗺️ Load Stores
const loadStores = async () => {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return console.error("❌ Store load error:", error.message);
  stores.forEach(renderStore);
};
await loadStores();

// 🔄 Realtime Store Sync
supabase.channel('realtime-stores')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stores' }, ({ new: store }) => {
    console.log("📦 New store added:", store);
    renderStore(store);
  })
  .subscribe();

// 🍽️ View Menu
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
        : `<button class="orderBtn" data-id="${item.id}" data-name="${item.name}">🛒 Order</button>`}
    `;
    listEl.appendChild(li);
  });
};

// 🛒 Place an Order (Safe Insert)
window.placeOrder = async (foodId) => {
  // ⏳ Ensure currentUser is loaded
  if (!currentUser) {
    const { data } = await supabase.auth.getUser();
    currentUser = data?.user;
    if (!currentUser) return alert('🔒 Please sign in first.');
  }

  const newOrder = {
    user_id: currentUser.id,
    food_id,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  console.log("🚀 Order payload:", newOrder); // ✅ Log before the insert

  const { error } = await supabase.from('orders').insert([newOrder]);

  if (error) return alert(`❌ Order failed: ${error.message}`);
  alert('✅ Dish added to your order! Check out 🧾 Checkout page to confirm.');
  document.querySelector(`[data-id="${foodId}"]`)?.setAttribute('disabled', true);
}; // ← ✅ This closing brace was missing


// 🎯 Event Delegation
document.addEventListener('click', async (e) => {
  if (e.target.matches('.viewMenuBtn')) {
    const { id, name } = e.target.dataset;
    await viewMenu(id, name);
  }

  if (e.target.matches('.orderBtn')) {
    const { id } = e.target.dataset;
    await placeOrder(id);
  }
});
