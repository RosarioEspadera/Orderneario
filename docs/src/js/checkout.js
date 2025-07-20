import { createClient } from 'https://esm.sh/@supabase/supabase-js';
const supabase = createClient('https://neigxicrhalonnsaqkud.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo');

emailjs.init('AqvkFhQnxowOJda9J'); // Replace with your EmailJS user ID

const orderList = document.getElementById('orderList');
const totalEl = document.getElementById('totalAmount');
const checkoutForm = document.getElementById('checkoutForm');
const userEmailInput = document.getElementById('userEmail');

let currentUser = null;
let orderSummary = [];

(async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user;
  if (!currentUser) return alert('🔒 Please sign in first.');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, foods(name, price)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  if (error) return console.error('❌ Order fetch error:', error.message);
  let total = 0;

  orders.forEach(order => {
    const li = document.createElement('li');
    const dish = order.foods;
    li.textContent = `${dish.name} – ₱${dish.price}`;
    orderList.appendChild(li);
    total += dish.price;
    orderSummary.push(`• ${dish.name} – ₱${dish.price}`);
  });

  totalEl.textContent = total.toFixed(2);
})();

// 🧾 Send receipt via EmailJS
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = userEmailInput.value;
  const summary = orderSummary.join('\n');
  const total = totalEl.textContent;
  const timestamp = new Date().toLocaleString();

  // Send to buyer
  const buyerParams = {
    to_email: email,
    message: `✅ Your order:\n\n${summary}\n\nTotal: ₱${total}\nDate: ${timestamp}`,
  };
  await emailjs.send('service_epydqmi', 'template_6d3ltu9', buyerParams);

  // Lookup store owners
  const { data: orders } = await supabase
    .from('orders')
    .select('foods(name, store_id), foods.stores(email)')
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');

  const storeEmails = [...new Set(orders.map(o => o.foods.stores.email))]; // unique owners

  // Send to each store owner
  for (const storeEmail of storeEmails) {
    const sellerParams = {
      to_email: storeEmail,
      message: `📦 New order placed!\n\n${summary}\n\nTotal: ₱${total}\nDate: ${timestamp}`,
    };
    await emailjs.send('service_epydqmi', 'template_6d3ltu9', sellerParams);
  }

  alert('✅ Receipts sent to buyer and store owner!');
  await supabase
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('user_id', currentUser.id)
    .eq('status', 'pending');
});
