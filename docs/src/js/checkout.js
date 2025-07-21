import { createClient } from 'https://esm.sh/@supabase/supabase-js';
const supabase = createClient('https://neigxicrhalonnsaqkud.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'); // Replace with your actual anon key

const checkoutForm = document.getElementById('checkoutForm');
const orderList = document.getElementById('orderList');
const totalEl = document.getElementById('total');
const userEmailInput = document.getElementById('userEmail');
const userNameInput = document.getElementById('userName');
const userAddressInput = document.getElementById('userAddress');

navigator.geolocation.getCurrentPosition((position) => {
  const { latitude, longitude } = position.coords;
  const geoLink = `https://www.google.com/maps/search/?q=${latitude},${longitude}`;
  userAddressInput.value = `${latitude}, ${longitude}`;
  console.log("🗺️ Auto-detected address:", geoLink);
}, (error) => {
  console.warn("📵 Location access denied:", error.message);
});


let orderSummary = [];

const { data: authData } = await supabase.auth.getUser();
const currentUser = authData?.user;
if (!currentUser) {
  alert("🔒 You must be logged in to view checkout.");
  location.href = 'profile.html';
}

// 🧾 Load orders for the current user (pending + confirmed)
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('id, status, foods(name, price)')
  .eq('user_id', currentUser.id)
  .in('status', ['pending', 'confirmed']);

if (ordersError || !orders?.length) {
  console.warn('No orders found or fetch failed:', ordersError?.message);
  orderList.innerHTML = '<li>No recent orders found.</li>';
}

let total = 0;
orderList.innerHTML = '';
orderSummary.length = 0;

orders?.forEach(order => {
  const dish = order.foods;
  const statusLabel = order.status === 'confirmed' ? '✅ Confirmed' : '🕒 Pending';
  const li = document.createElement('li');
  li.innerHTML = `
    ${dish.name} – ₱${dish.price} ${statusLabel}
    <button data-id="${order.id}" class="delete-btn">🗑️ Delete</button>
  `;
  orderList.appendChild(li);
  total += dish.price;
  orderSummary.push(`• ${dish.name} – ₱${dish.price}`);
});

document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const orderId = btn.getAttribute('data-id');
    const confirmDelete = confirm("Remove this item from your order?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('❌ Delete failed:', error.message);
      alert("Oops! Couldn’t delete the item.");
      return;
    }

    // 🔃 Re-render updated order list
    location.reload(); // Or manually re-fetch and re-render
  });
});

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
    // 💌 Send buyer receipt
    const buyerMessage = `🧾 Your order:\n\n${summary}\n\nTotal: ₱${total.toFixed(2)}\nDate: ${timestamp}\n📍 ${buyerAddress}\n🗺️ ${mapLink}`;
    await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
      to_email: buyerEmail,
      message: buyerMessage
    });

    // 📬 Fetch pending orders again for seller receipts
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
      const ownerId = store.owner_id;
      if (!storeEmail) continue;

      const key = `${ownerId}|${storeEmail}`;
      const line = `• ${food.name}`;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(line);
    }

    await Promise.all(
      Array.from(grouped.entries()).map(async ([key, dishes]) => {
        const [ownerId, storeEmail] = key.split('|');

        // Send to owner's email
        await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
          to_email: storeEmail,
          message: `📦 New order:\n\n${dishes.join('\n')}\n\nTotal: ₱${total.toFixed(2)}\nDate: ${timestamp}\nFrom: ${buyerName || 'Unnamed'} (${buyerEmail})\n📍 ${buyerAddress || 'No address provided'}\n🗺️ ${mapLink}`
        });

        // Insert chat notification
        await supabase
          .from('notifications')
          .insert({
            recipient_id: ownerId,
            message: `🧾 New order from ${buyerName || 'Unnamed'}:\n${dishes.join('\n')}\nTotal: ₱${total.toFixed(2)}`
          });
      })
    );

    // ✅ Mark orders as confirmed
    await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('user_id', currentUser.id)
      .eq('status', 'pending');

    alert('✅ Receipts sent and store owners notified!');
  } catch (err) {
    console.error("❌ Receipt send failed:", err);
    alert('❌ Failed to send receipt(s). Please try again.');
  }
});
