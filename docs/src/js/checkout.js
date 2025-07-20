// 🔑 EmailJS v4 Setup
import emailjs from 'https://esm.sh/@emailjs/browser';
emailjs.init('AqvkFhQnxowOJda9J'); // Replace with your actual EmailJS public key

// 🔐 Supabase Client Setup
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo' // Replace with your real anon key
);

// ⚙️ Main flow wrapped in async IIFE
(async () => {
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (!currentUser) {
    alert('🔒 Please sign in first.');
    return;
  }

  // DOM
  const orderList = document.getElementById('orderList');
  const totalEl = document.getElementById('totalAmount');
  const checkoutForm = document.getElementById('checkoutForm');
  const userEmailInput = document.getElementById('userEmail');
  const userNameInput = document.getElementById('userName');
  const userAddressInput = document.getElementById('userAddress');
  const locateBtn = document.getElementById('locateBtn');
  const orderSummary = [];

  // 📍 Location button
  locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }

    locateBtn.textContent = "📡 Locating...";
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        userAddressInput.value = data.display_name || `${coords.latitude}, ${coords.longitude}`;
      } catch {
        alert("📡 Location lookup failed.");
      } finally {
        locateBtn.textContent = "📍 Use My Location";
      }
    }, () => {
      alert("Unable to retrieve location.");
      locateBtn.textContent = "📍 Use My Location";
    });
  });

  // 🧾 Fetch pending orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, foods(name, price)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  if (error || !orders) {
    console.error('❌ Order fetch error:', error?.message);
    return;
  }

  let total = 0;
  orders.forEach(order => {
    const dish = order.foods;
    const li = document.createElement('li');
    li.textContent = `${dish.name} – ₱${dish.price}`;
    orderList.appendChild(li);
    total += dish.price;
    orderSummary.push(`• ${dish.name} – ₱${dish.price}`);
  });

  totalEl.textContent = total.toFixed(2);
  const summary = orderSummary.join('\n');
  const timestamp = new Date().toLocaleString();

  // 📨 Form submission
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const buyerEmail = userEmailInput.value.trim();
  const buyerName = userNameInput.value.trim();
  const buyerAddress = userAddressInput.value.trim();
  const timestamp = new Date().toLocaleString();
  const mapLink = `https://www.google.com/maps/search/?q=${encodeURIComponent(buyerAddress)}`;

  if (!buyerEmail) {
    alert("📬 Email is required.");
    return;
  }

  try {
    // 💌 1. Send buyer receipt
    await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
      to_email: buyerEmail,
      buyer_name: buyerName,
      buyer_address: buyerAddress,
      order_summary: summary,
      order_total: total.toFixed(2),
      timestamp,
      map_link: mapLink
    });

    // 📬 2. Group orders by store
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('food_id')
      .eq('user_id', currentUser.id)
      .eq('status', 'pending');

    const grouped = new Map();

    for (const order of pendingOrders ?? []) {
      const { data: food } = await supabase
        .from('foods')
        .select('name, store_id')
        .eq('id', order.food_id)
        .single();
      if (!food) continue;

      const { data: store } = await supabase
  .from('stores')
  .select('owner_id')
  .eq('id', food.store_id)
  .single();

if (!store || !store.owner_id) continue;
const { data: owner } = await supabase
  .from('profiles')
  .select('email')
  .eq('id', store.owner_id)
  .single();

const storeEmail = owner?.email;
      
      const line = `• ${food.name}`;
      if (!grouped.has(storeEmail)) grouped.set(storeEmail, []);
      grouped.get(storeEmail).push(line);
    }

    // 💌 3. Send seller receipts
    for (const [storeEmail, dishes] of grouped.entries()) {
      await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
        to_email: storeEmail,
        message: `📦 New order:\n\n${dishes.join('\n')}\n\nTotal: ₱${total.toFixed(2)}\nDate: ${timestamp}\nFrom: ${buyerName || 'Unnamed'} (${buyerEmail})\n📍 ${buyerAddress || 'No address provided'}\n🗺️ ${mapLink}`
      });
    }

    // ✅ Final: Mark orders as confirmed
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('user_id', currentUser.id)
      .eq('status', 'pending');

    alert('✅ Receipts sent to buyer and store owner!');
  } catch (err) {
    console.error("Receipt send failed:", err);
    alert('❌ Failed to send receipt(s). Please try again.');
  }
});
