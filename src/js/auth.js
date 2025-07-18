// src/js/auth.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://roqikwfaenwqipdydhwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcWlrd2ZhZW53cWlwZHlkaHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTYxMzksImV4cCI6MjA2ODE5MjEzOX0.CpUCA3X4bNIjOCtxrdOZ2kciXEHEogukBie9IOlHpno'; // truncated

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Handle login
document.getElementById('loginBtn').addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: location.origin + '/index.html'
    }
  });
  if (error) console.error("❌ Login error:", error.message);
});

// Show user info if signed in
(async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const user = userData.user;
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userName').textContent = `Signed in as ${user.email}`;
  }
})();

