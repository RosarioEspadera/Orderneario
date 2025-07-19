import { supabase } from './supabaseClient.js';

document.getElementById('signUpBtn')?.addEventListener('click', async () => {
  const email = prompt("Enter your email:");
  const password = prompt("Create a password (min 6 chars):");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      redirectTo: 'https://rosarioespadera.github.io/Orderneario/profile.html'
    }
  });

  if (error) {
    alert("❌ Sign-up failed: " + error.message);
  } else {
    alert("✅ Sign-up email sent! Please check your inbox to confirm.");
  }
});


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
      redirectTo: 'https://rosarioespadera.github.io/Orderneario/homepage.html'
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


