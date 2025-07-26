import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'
);

// 🔥 Fetch and show menu for a given store ID
async function showMenu(storeId) {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('store_id', storeId);

  if (error) {
    console.error('Error fetching menu:', error.message);
    return;
  }

  const menuPanel = document.getElementById('menuPanel');
  const menuList = document.getElementById('menuList');
  const menuTitle = document.getElementById('menuTitle');

  menuList.innerHTML = ''; // Clear previous items

  if (data.length === 0) {
    menuList.innerHTML = '<li>No dishes available for this store.</li>';
  } else {
    data.forEach(dish => {
      const item = document.createElement('li');
      item.textContent = `${dish.name} – ₱${dish.price}`;
      menuList.appendChild(item);
    });
  }

  menuTitle.textContent = `🍽️ Menu for Store #${storeId}`;
  menuPanel.style.display = 'block';
}
