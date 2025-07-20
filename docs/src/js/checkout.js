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

  // 🧩 DOM
  const orderList = document.getElementById('orderList');
  const totalEl = document.getElementById('totalAmount');
  const checkoutForm = document.getElementById('checkoutForm');
  const userEmailInput = document.getElementById('userEmail');
  const userNameInput = document.getElementById('userName');
  const userAddressInput = document.getElementById('userAddress');
  const orderSummary = [];

  // 🧾 Fetch orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, foods(name, price)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  if (error) {
    console.error('❌ Order fetch error:', error.message);
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

  // 💬 Submit handler
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = userEmailInput.value.trim();
    const name = userNameInput.value.trim();
    const address = userAddressInput.value.trim();

    // ✅ Buyer email payload
    const buyerMessage = `✅ Your order:\n\n${summary}\n\nTotal: ₱${total}\nDate: ${timestamp}\n\nName: ${name || '—'}\nAddress: ${address || '—'}`;

const mapLink = `https://www.google.com/maps/search/?q=${encodeURIComponent(address)}`;

await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
  to_email: email,
  buyer_name: name,
  buyer_address: address,
  order_summary: summary,
  order_total: total.toFixed(2),
  timestamp,
  map_link: mapLink
});



    // 📬 Seller lookup
    const { data: sellerOrders } = await supabase
      .from('orders')
      .select('foods(name, store_id), foods.stores(email)')
      .eq('user_id', currentUser.id)
      .eq('status', 'pending');

    if (!sellerOrders || sellerOrders.length === 0) {
      console.error('❌ No seller orders found.');
      return;
    }

    const grouped = new Map();
    sellerOrders.forEach(({ foods }) => {
      const storeEmail = foods.stores?.email;
      if (!storeEmail) return;
      const line = `• ${foods.name}`;
      if (!grouped.has(storeEmail)) grouped.set(storeEmail, []);
      grouped.get(storeEmail).push(line);
    });

    for (const [storeEmail, dishes] of grouped.entries()) {
      const sellerMessage = `📦 New order:\n\n${dishes.join('\n')}\n\nTotal: ₱${total}\nDate: ${timestamp}\nFrom: ${name || 'Unnamed'} (${email})\n📍 ${address || 'No address provided'}`;
      await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
        to_email: storeEmail,
        message: sellerMessage
      });
    }

    alert('✅ Receipts sent to buyer and store owner!');

    // ✅ Confirm orders
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('user_id', currentUser.id)
      .eq('status', 'pending');
  });
})();
