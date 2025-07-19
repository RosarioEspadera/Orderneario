import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'; // 🔐 Replace securely
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  const statusEl = document.getElementById('authStatus');

  if (error || !userData?.user) {
    statusEl.innerHTML = `
      <p>👋 You're not signed in.</p>
      <button id="signInBtn">🔐 Sign in with Google</button>
    `;
    document.getElementById('signInBtn').addEventListener('click', async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) alert("❌ Sign-in error: " + error.message);
    });
    return;
  }

  const user = userData.user;
  const meta = user.user_metadata || {};

  // ✅ Fill in profile fields
  document.getElementById('profileName').textContent = meta.full_name || 'No name';
  document.getElementById('profileEmail').textContent = user.email || 'No email';
  document.getElementById('profileImage').src = meta.avatar_url || '';
  document.getElementById('profileRole').textContent = `Role: ${meta.role || 'customer'}`;

  // 🎉 Signed-in status
  if (statusEl) statusEl.textContent = `✅ Signed in as ${user.email}`;
})();

