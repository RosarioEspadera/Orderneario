import emailjs from 'https://esm.sh/@emailjs/browser';
emailjs.init('AqvkFhQnxowOJda9J'); // 🔑 Your EmailJS public key

import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo' // 🔐 Replace with your actual anon key
);

// 👤 Auth
(async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user;
  if (!currentUser) {
    alert('🔒 Please sign in first.');
    return;
  }

// 📦 DOM Elements
const orderList = document.getElementById('orderList');
const totalEl = document.getElementById('totalAmount');
const checkoutForm = document.getElementById('checkoutForm');
const userEmailInput = document.getElementById('userEmail');

const orderSummary = [];

// 🧾 Load Pending Orders
const { data: orders, error } = await supabase
  .from('orders')
  .select('id, status, foods(name, price)')
  .eq('user_id', currentUser.id)
  .eq('status', 'pending');

if (error) return console.error('❌ Order fetch error:', error.message);

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

// 📨 Send Receipts on Submit
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const buyerEmail = userEmailInput.value;

  // 💌 Send to buyer
  await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
    to_email: buyerEmail,
    message: `✅ Your order:\n\n${summary}\n\nTotal: ₱${total}\nDate: ${timestamp}`
  });

  // 📬 Send to store owners
  const { data: sellerOrders } = await supabase
    .from('orders')
    .select('foods(name, store_id), foods.stores(email)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  const grouped = new Map();
  sellerOrders.forEach(({ foods }) => {
    const email = foods.stores?.email;
    const line = `• ${foods.name}`;
    if (!email) return;
    if (!grouped.has(email)) grouped.set(email, []);
    grouped.get(email).push(line);
  });

  for (const [storeEmail, dishes] of grouped.entries()) {
    const message = `📦 New order for your store:\n\n${dishes.join('\n')}\n\nTotal: ₱${total}\nDate: ${timestamp}`;
    await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
      to_email: storeEmail,
      message
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
