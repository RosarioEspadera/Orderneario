export async function sendReceipt(to, message) {
  try {
    await emailjs.send('service_epydqmi', 'template_6d3ltu9', {
      to_email: to,
      message
    });
    return true;
  } catch (err) {
    console.error("EmailJS send failed:", err);
    return false;
  }
}
