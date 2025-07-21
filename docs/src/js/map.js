import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🔐 Supabase Setup
const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'
);

// 🗺️ Initialize Leaflet Map
const map = L.map('map').setView([7.032, 125.092], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 🌐 DOM Elements
const panel = document.getElementById('menuPanel');
const titleEl = document.getElementById('menuTitle');
const listEl = document.getElementById('menuList');

// 👤 Auth and Role Check
let currentUser = null;
let userRole = 'guest';

async function initAuth() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;
  userRole = currentUser?.user_metadata?.role || 'guest';
}

await initAuth();

// 📍 Add Store Pin to Map
function renderStore(store) {
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`
    <strong>${store.name}</strong><br>
    ${store.address}<br>
    <button class="viewMenuBtn" data-id="${store.id}" data-name="${store.name}">🍽️ View Menu</button>
  `);
}

// 🗂️ Load All Stores
const loadStores = async () => {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) return console.error("❌ Error loading stores:", error.message);
  stores.forEach(renderStore);
};

await loadStores();

// 🔄 Realtime Store Sync
supabase.channel('realtime-stores')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'stores'
  }, payload => {
    renderStore(payload.new);
  })
  .subscribe();

// 🍽️ Display Store Menu
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
        : `<button class="orderBtn" data-id="${item.id}" data-name="${item.name}">🛒 Order</button>`
      }
    `;
    listEl.appendChild(li);
  });
};

// 🛒 Place Order for Dish
window.placeOrder = async (foodId) => {
  if (!currentUser) {
    const { data } = await supabase.auth.getUser();
    currentUser = data?.user;
    if (!currentUser) return alert('🔒 Please sign in first.');
  }

  const order = {
    user_id: currentUser.id,
    food_id: foodId,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  const { error } = await supabase.from('orders').insert([order]);

  if (error) return alert(`❌ Order failed: ${error.message}`);
  alert('✅ Dish added to your order! Visit the 🧾 Checkout page to confirm.');
  document.querySelector(`[data-id="${foodId}"]`)?.setAttribute('disabled', true);
};

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

