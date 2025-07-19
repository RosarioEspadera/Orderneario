import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient('https://neigxicrhalonnsaqkud.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo');

(async () => {
  // Get user's geolocation
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    const { data: stores, error } = await supabase
      .from('stores')
      .select('*');

    if (error) {
      console.error("❌ Store fetch failed:", error);
      return;
    }

    // Sort by distance (basic approximation)
    const nearby = stores
      .map(store => {
        const dx = latitude - store.lat;
        const dy = longitude - store.lng;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { ...store, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 10);

    const list = document.getElementById('storeList');
    list.innerHTML = nearby.map(s => `
      <li>
        <strong>${s.name}</strong><br/>
        📍 ${s.address}<br/>
        <a href="dashboard.html?name=${encodeURIComponent(s.name)}&address=${encodeURIComponent(s.address)}&lat=${s.lat}&lng=${s.lng}">Open store</a>
      </li>
    `).join('');
  }, err => {
    console.warn("📵 Geolocation blocked:", err.message);
  });
})();
