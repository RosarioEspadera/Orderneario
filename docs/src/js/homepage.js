import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'
);

// 🔥 Fetch and show menu for a given store ID
async function showMenu(storeId) {
  const { data: foods, error } = await supabase
  .from('foods')
  .select('name, price, store_id, store:store_id(name)')
  .eq('store_id', storeId);

  if (error) {
    console.error('Error fetching menu:', error.message);
    return;
  }

  const menuPanel = document.getElementById('menuPanel');
  const menuList = document.getElementById('menuList');
  const menuTitle = document.getElementById('menuTitle');

  menuList.innerHTML = ''; // Clear previous items

  if (foods.length === 0) {
  menuList.innerHTML = '<li>No dishes available for this store.</li>';
} else {
  foods.forEach(dish => {
    const item = document.createElement('li');
    item.innerHTML = `
      <div>
        <strong>${dish.name}</strong> – ₱${dish.price}
        <div class="store-label">🛍️ from ${dish.store?.name || `Store #${dish.store_id}`}</div>
      </div>
    `;
    menuList.appendChild(item);
  });
}


  menuTitle.textContent = `🍽️ Menu for Store #${storeId}`;
  menuPanel.style.display = 'block';
}
