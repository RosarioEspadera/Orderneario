// src/js/auth.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const roleSelect = document.getElementById('roleSelect');

document.getElementById('loginBtn').addEventListener('click', async () => {
  const selectedRole = roleSelect.value;
  localStorage.setItem('selectedRole', selectedRole); // 🔐 Save role for later

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://rosarioespadera.github.io/Orderneario/dashboard.html'
    }
  });

  if (error) {
    document.getElementById('statusMsg').textContent = `❌ Login error: ${error.message}`;
  }
});
document.getElementById('signInForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const { email, password, role } = Object.fromEntries(form.entries());

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("❌ Sign-in failed: " + error.message);

 // 🧠 Fetch role from JWT
const { data: userData } = await supabase.auth.getUser();
const user = userData.user;
const role = user.user_metadata?.role || 'consumer';

  alert(`✅ Signed in as ${role}`);
  // 🔄 Redirect based on role
if (role === 'store_owner') {
  location.href = 'dashboard.html';
} else {
  location.href = 'homepage.html';
}
});


