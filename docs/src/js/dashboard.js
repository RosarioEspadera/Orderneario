// src/js/dashboard.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://neigxicrhalonnsaqkud.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcWlrd2ZhZW53cWlwZHlkaHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTYxMzksImV4cCI6MjA2ODE5MjEzOX0.CpUCA3X4bNIjOCtxrdOZ2kciXEHEogukBie9IOlHpno'; // truncated

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    alert("You're not signed in.");
    return;
  }

  const userId = userData.user.id;
const autoToggle = document.getElementById('autoLocationToggle');
const useLocationBtn = document.getElementById('useLocationBtn');
const locationDisplay = document.getElementById('locationDisplay');

function applyLocation(coords) {
  document.querySelector('[name=lat]').value = coords.latitude;
  document.querySelector('[name=lng]').value = coords.longitude;
  locationDisplay.textContent = `Coordinates: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

function getGeolocation() {
  navigator.geolocation.getCurrentPosition(
    (pos) => applyLocation(pos.coords),
    (err) => alert("Location error: " + err.message)
  );
}

autoToggle.addEventListener('change', () => {
  if (autoToggle.checked) getGeolocation();
});

useLocationBtn.addEventListener('click', () => getGeolocation());


  // Store registration
  document.getElementById('storeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const { name, address, lat, lng } = Object.fromEntries(form.entries());
  
    const { error } = await supabase.from('stores').insert([{
    name,
    address,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    owner_id: userId
    }]);


    if (error) alert("❌ Store insert failed: " + error.message);
    else alert("✅ Store registered!");
  });

  // Dish upload
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const file = form.get('image');
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const filePath = `public/${Date.now()}-${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dish-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("❌ Upload failed: " + uploadError.message);
      return;
    }

    const imageUrl = supabase.storage.from('dish-images').getPublicUrl(filePath).publicUrl;

    const { error: insertError } = await supabase.from('foods').insert([{
      name: form.get('name'),
      description: form.get('description'),
      price: parseFloat(form.get('price')),
      image_url: imageUrl,
      uploader_id: userId
    }]);

    if (insertError) alert("❌ Dish insert failed: " + insertError.message);
    else alert("✅ Dish uploaded!");
  });
})();
