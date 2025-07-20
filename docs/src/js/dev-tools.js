// src/js/dev-tools.js
import { supabase } from './supabaseClient.js';

// 🌍 Expose for debugging only in dev mode
window.supabaseDev = supabase;
window.fetchAllDishes = async () => {
  const { data, error } = await supabase.from('foods').select('*');
  if (error) return console.error("❌ Fetch error:", error.message);
  console.log("🍽️ All dishes:", data);
};
