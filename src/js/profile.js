// src/js/profile.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://roqikwfaenwqipdydhwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcWlrd2ZhZW53cWlwZHlkaHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTYxMzksImV4cCI6MjA2ODE5MjEzOX0.CpUCA3X4bNIjOCtxrdOZ2kciXEHEogukBie9IOlHpno'; // truncated

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    alert("You're not signed in.");
    return;
  }

  const user = userData.user;
  document.getElementById('profileName').textContent = user.user_metadata.full_name || 'No name';
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileImage').src = user.user_metadata.avatar_url || '';
  document.getElementById('profileRole').textContent = 'Role: customer'; // Optional: fetch from `users` table
})();

