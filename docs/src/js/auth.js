import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'; // Shortened for clarity
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const roleSelect = document.getElementById('roleSelect');

// 🔐 Email/password login
document.getElementById('signInForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const { email, password, role: selectedRole } = Object.fromEntries(form.entries());

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert("❌ Sign-in failed: " + error.message);

  // 🎯 Update user_metadata with selected role
  await supabase.auth.updateUser({ data: { role: selectedRole } });

  alert(`✅ Signed in as ${selectedRole}`);
  redirectByRole(selectedRole);
});

// 🔑 Google OAuth login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const selectedRole = roleSelect?.value || 'consumer';
  localStorage.setItem('selectedRole', selectedRole); // Save role for post-login

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://rosarioespadera.github.io/Orderneario/postAuth.html'
    }
  });

  if (error) {
    document.getElementById('statusMsg').textContent = `❌ Login error: ${error.message}`;
  }
});

// 🔄 Role-based redirect
function redirectByRole(role) {
  if (role === 'store_owner') {
    location.href = 'dashboard.html';
  } else {
    location.href = 'homepage.html';
  }
}


