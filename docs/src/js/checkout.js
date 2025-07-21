import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import emailjs from 'https://cdn.skypack.dev/@emailjs/browser';

// 📦 Init services
const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'
);
emailjs.init('AqvkFhQnxowOJda9J');

// 🎯 DOM Elements
const checkoutForm = document.getElementById('checkoutForm');
const orderList = document.getElementById('orderList');
const totalEl = document.getElementById('total');
const receiptPreview = document.getElementById('receiptPreview');
const toast = document.getElementById('toast');
const userEmailInput = document.getElementById('userEmail');
const userNameInput = document.getElementById('userName');
const userAddressInput = document.getElementById('userAddress');

let orderSummary = [], summary = "", total = 0;

// 🍭 Toast Helper
function showToast(msg, success = true) {
  toast.textContent = msg;
  toast.style.background = success ? '#28a745' : '#dc3545';
  toast.style.opacity = '1';
  setTimeout(() => (toast.style.opacity = '0'), 3000);
}

// 📍 Geolocation autofill
navigator.geolocation.getCurrentPosition(
  ({ coords }) => {
    userAddressInput.value = `${coords.latitude}, ${coords.longitude}`;
  },
  err => console.warn("Location denied:", err.message)
);

// 🧾 Order render function
async function renderOrders(currentUser) {
  orderSummary = [];
  total = 0;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, foods(name, price)')
    .eq('user_id', currentUser.id)
    .in('status', ['pending', 'confirmed']);

  orderList.innerHTML = '';
  if (error || !orders?.length) {
    orderList.innerHTML = '<li>No recent orders found.</li>';
    totalEl.textContent = '0.00';
    receiptPreview.textContent = '';
    return;
  }

  orders.forEach(order => {
    const dish = order.foods;
    const label = order.status === 'confirmed' ? '✅ Confirmed' : '🕒 Pending';
    const li = document.createElement('li');
    li.innerHTML = `${dish.name} – ₱${dish.price} ${label}
      <button data-id="${order.id}" class="delete-btn">🗑️</button>`;
    orderList.appendChild(li);
    total += dish.price;
    orderSummary.push(`• ${dish.name} – ₱${dish.price}`);
  });

  summary = orderSummary.join('\n');
  totalEl.textContent = total.toFixed(2);
  receiptPreview.textContent = `${summary}\n\nTotal: ₱${total.toFixed(2)}`;

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm("Remove this item?")) return;

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      if (error) return showToast("❌ Couldn't delete item", false);

      showToast("✅ Item deleted");
      await renderOrders(currentUser);
    });
  });
}

// 🔓 DOM ready flow
window.addEventListener('DOMContentLoaded', async () => {
  const { data: authData } = await supabase.auth.getUser();
  const currentUser = authData?.user;
  if (!currentUser) {
    showToast("🔒 Not logged in", false);
    location.href = 'profile.html';
    return;
  }

  await renderOrders(currentUser);

  // 📨 Form submission
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const buyerEmail = userEmailInput.value.trim();
    const buyerName = userNameInput.value.trim();
    const buyerAddress = userAddressInput.value.trim();
    const timestamp = new Date().toLocaleString();
    const mapLink = `https://www.google.com/maps/search/?q=${encodeURIComponent(buyerAddress)}`;

    if (!buyerEmail) return showToast("📬 Email is required", false);

    try {
      // 💌 Send buyer email
      await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
        to_email: buyerEmail,
        buyer_name: buyerName,
        message: summary,
        total_amount: `₱${total.toFixed(2)}`,
        buyer_address: buyerAddress,
        map_link: mapLink,
        subject_line: "🧾 Your Order Receipt – Thank You!"
      });

      // 📬 Seller receipts + notifications
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
          .select('owner_id, name')
          .eq('id', food.store_id)
          .single();
        if (!store?.owner_id) continue;

        const { data: owner } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', store.owner_id)
          .single();
        if (!owner?.email) continue;

        const key = `${store.owner_id}|${owner.email}|${store.name}`;
        const line = `• ${food.name}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(line);
      }

      await Promise.all(
        Array.from(grouped.entries()).map(async ([key, dishes]) => {
          const [ownerId, storeEmail, storeName] = key.split('|');

          await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
            to_email: storeEmail,
            store_name: storeName,
            buyer_name: buyerName,
            message: dishes.join('\n'),
            total_amount: `₱${total.toFixed(2)}`,
            subject_line: `📦 New Order Received – ${storeName}`
          });

          await supabase
            .from('notifications')
            .insert({
              recipient_id: ownerId,
              message: `🧾 Order from ${buyerName || 'Unnamed'}:\n${dishes.join('\n')}\nTotal: ₱${total.toFixed(2)}`,
              read: false
            });
        })
      );

      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('user_id', currentUser.id)
        .eq('status', 'pending');

      showToast("✅ Order placed & confirmed!");
      await renderOrders(currentUser);
    } catch (err) {
      console.error("❌ Receipt error:", err);
      showToast("❌ Send failed. Try again.", false);
    }
  });
});
