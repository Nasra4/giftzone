const { body } = require('express-validator');
const { query, transaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler, orderNumber, round2 } = require('../utils/helpers');
const { loadCart, WRAP_FEE } = require('./cartController');
const { findValidCoupon } = require('./couponController');
const Settings = require('../models/settingModel');
const { createPaymentSession } = require('../services/paymentService');
const mail = require('../services/mailService');

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const phoneRe = /^[+\d][\d\s-]{6,20}$/;

const createRules = [
  body('customer_name').trim().isLength({ min: 2, max: 120 }).withMessage('Please enter your full name'),
  body('customer_email').trim().isEmail().withMessage('Please enter a valid email'),
  body('customer_phone').trim().matches(phoneRe).withMessage('Please enter a valid phone number'),
  body('customer_address').trim().isLength({ min: 3, max: 255 }).withMessage('Please enter your address'),
  body('customer_city').trim().notEmpty().withMessage('City is required'),
  body('customer_country').trim().notEmpty().withMessage('Country is required'),
  body('recipient_name').trim().isLength({ min: 2, max: 120 }).withMessage('Please enter the recipient name'),
  body('recipient_phone').trim().matches(phoneRe).withMessage('Please enter a valid recipient phone'),
  body('recipient_address').trim().isLength({ min: 3, max: 255 }).withMessage('Please enter the recipient address'),
  body('gift_message').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Gift message can be up to 500 characters'),
  body('delivery_instructions').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Instructions can be up to 500 characters'),
  body('preferred_delivery_date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid delivery date')
    .custom((v) => new Date(v) >= new Date(new Date().toDateString())).withMessage('Delivery date cannot be in the past'),
  body('payment_method').isIn(['cod', 'card', 'evc_plus', 'edahab']).withMessage('Choose a payment method'),
  body('coupon_code').optional({ values: 'falsy' }).isString(),
];

const statusRules = [
  body('status').isIn(STATUSES).withMessage('Unknown status'),
  body('note').optional({ values: 'falsy' }).isLength({ max: 255 }),
];

async function loadOrder(id, { userId } = {}) {
  const params = [id];
  let sql = 'SELECT * FROM orders WHERE id = ?';
  if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
  const [order] = await query(sql, params);
  if (!order) return null;
  order.items = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);
  const gifts = await query('SELECT * FROM gift_messages WHERE order_id = ? ORDER BY id', [id]);
  order.gifts = gifts; // one row per item: message, wrapping, per-item date
  order.gift = gifts[0] || null; // delivery details are the same on every row
  order.items.forEach((it) => { it.gift = gifts.find((g) => g.order_item_id === it.id) || null; });
  order.history = await query('SELECT status, note, changed_at FROM order_status_history WHERE order_id = ? ORDER BY id', [id]);
  order.payment = (await query('SELECT id, method, amount, status, provider_reference FROM payments WHERE order_id = ? LIMIT 1', [id]))[0] || null;
  return order;
}

// Prices, discounts and fees are always recomputed here from the database. The client sends none of them.
function computeTotals(items, coupon, settings) {
  const subtotal = round2(items.reduce((s, i) => s + i.final_price * i.quantity + (i.gift_wrap ? WRAP_FEE * i.quantity : 0), 0));
  const discount = coupon ? round2((subtotal * coupon.discount_percent) / 100) : 0;
  const after = subtotal - discount;
  const fee = after >= Number(settings.free_delivery_threshold) ? 0 : Number(settings.delivery_fee);
  return { subtotal, discount, delivery_fee: fee, total: round2(after + fee) };
}

const preview = asyncHandler(async (req, res) => {
  const items = await loadCart(req.user.id);
  const settings = await Settings.getAll();
  let coupon = null;
  if (req.query.coupon) coupon = await findValidCoupon(null, req.query.coupon, req.user.id);
  res.json({ ...computeTotals(items, coupon, settings), coupon: coupon ? { code: coupon.code, discount_percent: coupon.discount_percent } : null });
});

const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const settings = await Settings.getAll();

  const created = await transaction(async (conn) => {
    const [cartItems] = await conn.query(
      `SELECT ci.*, p.name, p.stock, COALESCE(p.discount_price, p.price) AS final_price,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image
       FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = ? FOR UPDATE`, [req.user.id]);
    if (!cartItems.length) throw ApiError.badRequest('Your cart is empty');

    // Lock the product rows and make sure there is enough stock for every line (summed per product).
    const need = {};
    cartItems.forEach((i) => { need[i.product_id] = (need[i.product_id] || 0) + i.quantity; });
    for (const [pid, qty] of Object.entries(need)) {
      const [[p]] = await conn.query('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [pid]);
      if (!p || p.stock < qty) throw ApiError.badRequest(`Sorry, only ${p ? p.stock : 0} of "${p ? p.name : 'an item'}" left in stock`);
    }

    const coupon = b.coupon_code ? await findValidCoupon(conn, b.coupon_code, req.user.id) : null;
    const totals = computeTotals(cartItems, coupon, settings);
    const number = orderNumber();

    const [orderRes] = await conn.query(
      `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_country,
         subtotal, discount_amount, delivery_fee, total, coupon_id, payment_method) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [number, req.user.id, b.customer_name, b.customer_email, b.customer_phone, b.customer_address, b.customer_city, b.customer_country,
        totals.subtotal, totals.discount, totals.delivery_fee, totals.total, coupon ? coupon.id : null, b.payment_method]);
    const orderId = orderRes.insertId;

    for (const i of cartItems) {
      const line = round2(i.final_price * i.quantity + (i.gift_wrap ? WRAP_FEE * i.quantity : 0));
      const [oi] = await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, line_total) VALUES (?,?,?,?,?,?,?)',
        [orderId, i.product_id, i.name, i.image, i.final_price, i.quantity, line]);
      // Per-item personalisation chosen on the product page, falling back to the checkout gift message.
      await conn.query(
        `INSERT INTO gift_messages (order_id, order_item_id, recipient_name, recipient_phone, recipient_address, message, gift_wrap, wrap_style, delivery_instructions, preferred_delivery_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [orderId, oi.insertId, i.recipient_name || b.recipient_name, b.recipient_phone, b.recipient_address,
          i.personal_message || b.gift_message || null, i.gift_wrap, i.wrap_style, b.delivery_instructions || null, i.delivery_date || b.preferred_delivery_date || null]);
      await conn.query('UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?', [i.quantity, i.quantity, i.product_id]);
    }

    await conn.query('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'pending', 'Order placed']);
    if (coupon) await conn.query('INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (?,?,?)', [coupon.id, req.user.id, orderId]);
    await conn.query('DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = ?', [req.user.id]);

    const order = { id: orderId, order_number: number, ...totals, payment_method: b.payment_method, customer_name: b.customer_name, customer_email: b.customer_email };
    const session = await createPaymentSession(order, b.payment_method); // throws before commit if the provider is unavailable
    await conn.query('INSERT INTO payments (order_id, method, amount, status, provider_reference) VALUES (?,?,?,?,?)',
      [orderId, b.payment_method, totals.total, 'pending', session.reference]);
    await conn.query('INSERT INTO notifications (user_id, title, body) VALUES (?,?,?)',
      [req.user.id, 'Order placed', `Your order ${number} has been received.`]);
    return { order, checkoutUrl: session.checkoutUrl };
  });

  mail.sendOrderConfirmation(created.order);
  res.status(201).json({ id: created.order.id, order_number: created.order.order_number, total: created.order.total, checkout_url: created.checkoutUrl });
});

const myOrders = asyncHandler(async (req, res) =>
  res.json(await query(
    `SELECT o.id, o.order_number, o.total, o.status, o.payment_method, o.payment_status, o.created_at,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
            (SELECT product_image FROM order_items WHERE order_id = o.id ORDER BY id LIMIT 1) AS image
     FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC`, [req.user.id])));

const getOne = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = await loadOrder(id, req.user.role === 'admin' ? {} : { userId: req.user.id });
  if (!order) throw ApiError.notFound('Order not found');
  res.json(order);
});

async function applyStatus(orderId, status, note) {
  return transaction(async (conn) => {
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status === status) throw ApiError.badRequest(`Order is already ${status}`);
    if (['delivered', 'cancelled'].includes(order.status)) throw ApiError.badRequest(`A ${order.status} order cannot be changed`);

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    await conn.query('INSERT INTO order_status_history (order_id, status, note) VALUES (?,?,?)', [orderId, status, note || null]);

    if (status === 'cancelled') {
      const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', [orderId]);
      for (const i of items) await conn.query('UPDATE products SET stock = stock + ?, sold_count = GREATEST(sold_count - ?, 0) WHERE id = ?', [i.quantity, i.quantity, i.product_id]);
      await conn.query('DELETE FROM coupon_usage WHERE order_id = ?', [orderId]);
      if (order.payment_status === 'paid') {
        await conn.query("UPDATE orders SET payment_status = 'refunded' WHERE id = ?", [orderId]);
        await conn.query("UPDATE payments SET status = 'refunded' WHERE order_id = ?", [orderId]);
      }
    }
    if (status === 'delivered' && order.payment_method === 'cod') {
      await conn.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);
      await conn.query("UPDATE payments SET status = 'paid' WHERE order_id = ?", [orderId]);
    }
    await conn.query('INSERT INTO notifications (user_id, title, body) VALUES (?,?,?)',
      [order.user_id, `Order ${status}`, `Your order ${order.order_number} is now ${status}.`]);
    return order;
  });
}

const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = await applyStatus(id, req.body.status, req.body.note);
  mail.sendOrderStatus(order, req.body.status);
  res.json(await loadOrder(id));
});

// Customers may cancel their own order only while it is still pending.
const cancelMine = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [o] = await query('SELECT id, status FROM orders WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!o) throw ApiError.notFound('Order not found');
  if (o.status !== 'pending') throw ApiError.badRequest('This order is already being prepared. Please contact support to cancel it.');
  const order = await applyStatus(id, 'cancelled', 'Cancelled by customer');
  mail.sendOrderStatus(order, 'cancelled');
  res.json(await loadOrder(id, { userId: req.user.id }));
});

// Admin: mark payment received (e.g. confirm a mobile-money transfer or cash collected).
const confirmPayment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [o] = await query('SELECT id, status, payment_status FROM orders WHERE id = ?', [id]);
  if (!o) throw ApiError.notFound('Order not found');
  if (o.status === 'cancelled') throw ApiError.badRequest('Cannot confirm payment on a cancelled order');
  await transaction(async (conn) => {
    await conn.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [id]);
    await conn.query("UPDATE payments SET status = 'paid', confirmed_by_admin = ? WHERE order_id = ?", [req.user.id, id]);
    if (o.status === 'pending') {
      await conn.query("UPDATE orders SET status = 'confirmed' WHERE id = ?", [id]);
      await conn.query("INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'confirmed', 'Payment confirmed')", [id]);
    }
  });
  res.json(await loadOrder(id));
});

// Sandbox only: lets a developer complete or fail the fake hosted payment page.
const sandboxComplete = asyncHandler(async (req, res) => {
  if (process.env.PAYMENT_MODE === 'live') throw ApiError.notFound();
  const [o] = await query('SELECT id, status, payment_method, payment_status FROM orders WHERE order_number = ? AND user_id = ?', [req.params.number, req.user.id]);
  if (!o || o.payment_method === 'cod') throw ApiError.notFound('Order not found');
  if (o.payment_status !== 'pending') throw ApiError.badRequest('This payment has already been processed');
  const ok = req.body.success !== false;
  await transaction(async (conn) => {
    await conn.query('UPDATE orders SET payment_status = ? WHERE id = ?', [ok ? 'paid' : 'failed', o.id]);
    await conn.query('UPDATE payments SET status = ? WHERE order_id = ?', [ok ? 'paid' : 'failed', o.id]);
    if (ok && o.status === 'pending') {
      await conn.query("UPDATE orders SET status = 'confirmed' WHERE id = ?", [o.id]);
      await conn.query("INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'confirmed', 'Payment received (sandbox)')", [o.id]);
    }
  });
  res.json({ order_id: o.id, payment_status: ok ? 'paid' : 'failed' });
});

const sandboxInfo = asyncHandler(async (req, res) => {
  const [o] = await query('SELECT id, order_number, total, payment_method, payment_status FROM orders WHERE order_number = ? AND user_id = ?', [req.params.number, req.user.id]);
  if (!o) throw ApiError.notFound('Order not found');
  res.json({ ...o, sandbox: process.env.PAYMENT_MODE !== 'live' });
});

module.exports = { STATUSES, createRules, statusRules, preview, create, myOrders, getOne, updateStatus, cancelMine, confirmPayment, sandboxComplete, sandboxInfo, loadOrder };
