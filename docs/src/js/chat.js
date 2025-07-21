import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
  'https://neigxicrhalonnsaqkud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5laWd4aWNyaGFsb25uc2Fxa3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDQ3NjcsImV4cCI6MjA2ODQyMDc2N30.43DDOz-38NSc0nUejfTGOMD4xYBfzNvy4n0NFZWEfeo'
);

const roleInfo = document.getElementById('roleInfo');
const notificationList = document.getElementById('notificationList');
const orderList = document.getElementById('orderList');

const { data: authData } = await supabase.auth.getUser();
const currentUser = authData?.user;

if (!currentUser) {
  roleInfo.textContent = '🔒 Please sign in first.';
  return;
}

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', currentUser.id)
  .single();

if (profileError || !profile) {
  roleInfo.textContent = '⚠️ Cannot retrieve user role.';
  return;
}

const role = profile.role;
roleInfo.textContent = `Signed in as ${currentUser.email} (${role})`;

// 🔔 Fetch existing notifications
const { data: notes, error: notesError } = await supabase
  .from('notifications')
  .select('id, message, created_at, read')
  .eq('recipient_id', currentUser.id)
  .order('created_at', { ascending: false });

if (notesError || !notes.length) {
  notificationList.innerHTML = '<li>No recent alerts.</li>';
} else {
  notificationList.innerHTML = notes.map(note => `
    <li style="border-left:4px solid ${note.read ? '#ccc' : '#007bff'}; padding-left:10px;">
      ${note.message}<br><small>${new Date(note.created_at).toLocaleString()}</small>
      ${!note.read ? `<button data-id="${note.id}" class="mark-read">👁️ Mark as read</button>` : ''}
    </li>
  `).join('');
}

// 👁️ Read notification handler
document.querySelectorAll('.mark-read').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    btn.remove();
  });
});

// 🔁 Realtime notifications
supabase
  .channel('owner-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${currentUser.id}`
  }, payload => {
    const note = payload.new;
    const li = document.createElement('li');
    li.innerHTML = `${note.message}<br><small>${new Date(note.created_at).toLocaleString()}</small>`;
    li.style.borderLeft = '4px solid #007bff';
    li.style.paddingLeft = '10px';
    notificationList.prepend(li);
    new Audio('/assets/ding.mp3').play();
  })
  .subscribe();

// 📦 Live Order Feed for store owners (past 10 mins)
if (role === 'store_owner') {
  const cutoff = new Date(Date.now() - 10 * 60000).toISOString();
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('timestamp, food_id, user_id')
    .gt('timestamp', cutoff);

  for (const order of recentOrders ?? []) {
    const { data: dish } = await supabase
      .from('foods')
      .select('name, store_id')
      .eq('id', order.food_id)
      .single();
    if (!dish) continue;

    const { data: store } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', dish.store_id)
      .single();
    if (!store || store.owner_id !== currentUser.id) continue;

    const { data: buyer } = await supabase
      .from('profiles')
      .select('name, email, address')
      .eq('id', order.user_id)
      .single();

    const time = new Date(order.timestamp).toLocaleTimeString();
    const msg = `📦 ${dish.name} ordered by ${buyer?.name ?? 'Unnamed'} (${buyer?.email ?? 'No email'})<br>📍 ${buyer?.address ?? 'No address'} @ ${time}`;
    const li = document.createElement('li');
    li.innerHTML = msg;
    orderList.appendChild(li);
  }
}
