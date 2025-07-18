// src/js/map.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'; // truncated

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const map = L.map('map').setView([7.0, 125.0], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Load stores and add markers
const { data: stores, error } = await supabase.from('stores').select('*');
if (error) console.error("❌ Store fetch error:", error.message);

stores.forEach(store => {
  const marker = L.marker([store.lat, store.lng]).addTo(map);
  marker.bindPopup(`<b>${store.name}</b><br>${store.address}<br><button onclick="loadMenu('${store.id}', '${store.name}')">View Menu</button>`);
});

// Load menu for selected store
window.loadMenu = async (storeId, storeName) => {
  const { data: foods, error } = await supabase.from('foods').select('*').eq('store_id', storeId);
  if (error) return alert("❌ Menu fetch failed");

  document.getElementById('storeName').textContent = storeName;
  const menuList = document.getElementById('menuList');
  menuList.innerHTML = '';

  foods.forEach(food => {
    const item = document.createElement('li');
    item.innerHTML = `
      <img src="${food.image_url}" width="100" />
      <p><strong>${food.name}</strong> - ₱${food.price}</p>
      <button onclick="placeOrder('${food.id}')">Order</button>
    `;
    menuList.appendChild(item);
  });

  document.getElementById('menuPanel').style.display = 'block';
};

// Place order
window.placeOrder = async (foodId) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return alert("Please sign in to order.");

  const { error } = await supabase.from('orders').insert([{
    user_id: userData.user.id,
    food_id: foodId,
    status: 'pending',
    timestamp: new Date().toISOString()
  }]);

  if (error) alert("❌ Order failed: " + error.message);
  else alert("✅ Order placed!");
};

