import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient('https://neigxicrhalonnsaqkud.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo');

(async () => {
  const selectedRole = localStorage.getItem('selectedRole');
  if (!selectedRole) return;

  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;

  // ✅ Patch user_metadata
  await supabase.auth.updateUser({
    data: { role: selectedRole }
  });

  console.log(`🔐 Role "${selectedRole}" applied via post-login`);
  localStorage.removeItem('selectedRole');
})();
