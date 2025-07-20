// src/js/profile.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'; // 🔐 Replace with your actual key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  const authStatus = document.getElementById('authStatus');
  const logoutBtn = document.getElementById('logoutBtn');

  if (error || !userData?.user) {
    // 👋 Show sign-in prompt if not logged in
    if (authStatus) {
      authStatus.innerHTML = `
        <p>👋 You're not signed in.</p>
        <button id="signInBtn">🔐 Sign in with Google</button>
      `;
      document.getElementById('logoutBtn').style.display = 'none';

      document.getElementById('signInBtn').addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: location.origin + '/Orderneario/profile.html'
          }
        });
        if (error) alert("❌ Sign-in error: " + error.message);
      });
    }
    return;
  }

  // ✅ User is signed in
  const user = userData.user;
  const meta = user.user_metadata || {};

  document.getElementById('profileName').textContent = meta.full_name || 'No name';
  document.getElementById('profileEmail').textContent = user.email || 'No email';
  document.getElementById('profileImage').src = meta.avatar_url || '';
  document.getElementById('profileRole').textContent = `Role: ${meta.role || 'customer'}`;
  if (authStatus) authStatus.textContent = `✅ Signed in as ${user.email}`;
  if (logoutBtn) logoutBtn.style.display = 'inline-block';

  
  // 🔓 Logout
  logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('❌ Logout failed: ' + error.message);
    } else {
      window.location.href = location.origin + '/Orderneario/index.html';
    }
  });
})();

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const userId = user.id;

  // 🏪 Fetch latest store
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 🍱 Fetch latest dish
  const { data: dish } = await supabase
    .from('foods')
    .select('*')
    .eq('uploader_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 🎨 Render to profile
  if (store) {
    document.getElementById('latestStore').innerHTML = `
      <h3>🏪 Your Store: ${store.name}</h3>
      <p>${store.address}</p>
    `;
  }

  if (dish) {
    document.getElementById('latestDish').innerHTML = `
      <h3>🍽️ Recent Dish: ${dish.name}</h3>
      <img src="${dish.image_url}" width="150" />
      <p>${dish.description} – ₱${dish.price}</p>
    `;
  }
})();
