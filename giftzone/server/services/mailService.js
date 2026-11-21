const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const layout = (title, body) => `
<div style="font-family:Arial,sans-serif;background:#FFF8F6;padding:24px">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:32px;color:#333">
    <h1 style="color:#E76F8A;margin:0 0 4px">GiftZone</h1>
    <p style="margin:0 0 24px;color:#999;font-size:13px">Make Every Moment Special.</p>
    <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
    ${body}
  </div>
</div>`;

// Email must never break the request that triggered it: failures are logged and swallowed.
async function sendMail({ to, subject, html }) {
  try {
    const t = getTransporter();
    if (!t) {
      console.log(`[mail:dev] To: ${to} | Subject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
      return;
    }
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, html });
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

const sendPasswordReset = (to, name, link) =>
  sendMail({
    to,
    subject: 'Reset your GiftZone password',
    html: layout('Reset your password', `
      <p>Hi ${escapeHtml(name)}, we received a request to reset your password.</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#E76F8A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none">Choose a new password</a></p>
      <p style="color:#999;font-size:13px">This link expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>`),
  });

const sendOrderConfirmation = (order) =>
  sendMail({
    to: order.customer_email,
    subject: `GiftZone order ${order.order_number} received`,
    html: layout('Thank you for your order!', `
      <p>Hi ${escapeHtml(order.customer_name)}, we've received your order <b>${escapeHtml(order.order_number)}</b>.</p>
      <p>Total: <b>$${Number(order.total).toFixed(2)}</b> (${escapeHtml(order.payment_method)})</p>
      <p>You can follow its progress any time from your GiftZone account.</p>`),
  });

const sendOrderStatus = (order, status) =>
  sendMail({
    to: order.customer_email,
    subject: `Your GiftZone order ${order.order_number} is ${status}`,
    html: layout(`Order ${status}`, `<p>Hi ${escapeHtml(order.customer_name)}, your order <b>${escapeHtml(order.order_number)}</b> is now <b>${escapeHtml(status)}</b>.</p>`),
  });

const sendContactNotice = ({ name, email, subject, message }) =>
  sendMail({
    to: process.env.SMTP_USER || process.env.ADMIN_EMAIL,
    subject: `New contact message: ${subject || 'No subject'}`,
    html: layout('New contact message', `<p><b>${escapeHtml(name)}</b> (${escapeHtml(email)})</p><p>${escapeHtml(message)}</p>`),
  });

module.exports = { sendMail, sendPasswordReset, sendOrderConfirmation, sendOrderStatus, sendContactNotice };
