const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler, toInt } = require('../utils/helpers');
const Settings = require('../models/settingModel');

const customerStatusRules = [body('status').isIn(['active', 'blocked']).withMessage('Invalid status')];
const settingsRules = [
  body('store_email').optional({ values: 'falsy' }).isEmail().withMessage('Store email is invalid'),
  body('delivery_fee').optional().isFloat({ min: 0 }).withMessage('Delivery fee must be 0 or more'),
  body('free_delivery_threshold').optional().isFloat({ min: 0 }).withMessage('Free-delivery threshold must be 0 or more'),
  body('hero_image').optional({ values: 'falsy' }).matches(/^(https:\/\/|\/uploads\/)/).withMessage('Hero image must be an https:// URL or an uploaded file'),
];

// Revenue counts only money actually received (payment_status = paid) on orders that weren't cancelled.
const REVENUE = "COALESCE(SUM(CASE WHEN payment_status = 'paid' AND status <> 'cancelled' THEN total END), 0)";

function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i -= 1) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const dashboard = asyncHandler(async (req, res) => {
  const [[orders]] = await Promise.all([query(
    `SELECT COUNT(*) AS total_orders, ${REVENUE} AS total_revenue,
            SUM(status = 'pending') AS pending_orders, SUM(status = 'delivered') AS delivered_orders FROM orders`)]);
  const [{ n: products }] = await query('SELECT COUNT(*) AS n FROM products');
  const [{ n: customers }] = await query('SELECT COUNT(*) AS n FROM users');
  const recent_orders = await query('SELECT id, order_number, customer_name, total, status, payment_status, created_at FROM orders ORDER BY id DESC LIMIT 8');
  const best_sellers = await query(
    `SELECT p.id, p.name, p.sold_count, COALESCE(p.discount_price, p.price) AS price,
            (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
     FROM products p WHERE p.sold_count > 0 ORDER BY p.sold_count DESC LIMIT 5`);
  const latest_customers = await query('SELECT id, full_name, email, created_at FROM users ORDER BY id DESC LIMIT 5');
  const low_stock = await query('SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock LIMIT 5');

  res.json({
    stats: {
      total_revenue: Number(orders.total_revenue || 0),
      total_orders: orders.total_orders,
      total_products: products,
      total_customers: customers,
      pending_orders: Number(orders.pending_orders || 0),
      delivered_orders: Number(orders.delivered_orders || 0),
    },
    recent_orders, best_sellers, latest_customers, low_stock,
  });
});

const analytics = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(toInt(req.query.months, 12), 3), 24);
  const keys = lastMonths(months);
  const rows = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS orders, ${REVENUE} AS revenue,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END), 0) AS booked
     FROM orders WHERE created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL ? MONTH) GROUP BY month`, [months - 1]);
  const byMonth = Object.fromEntries(rows.map((r) => [r.month, r]));
  const monthly = keys.map((k) => ({ month: k, orders: byMonth[k]?.orders || 0, revenue: Number(byMonth[k]?.revenue || 0), booked: Number(byMonth[k]?.booked || 0) }));

  const by_status = await query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
  const by_category = await query(
    `SELECT c.name, COALESCE(SUM(oi.line_total), 0) AS revenue FROM categories c
     LEFT JOIN products p ON p.category_id = c.id LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
     GROUP BY c.id, c.name HAVING revenue > 0 ORDER BY revenue DESC LIMIT 8`);
  const by_payment = await query("SELECT payment_method AS method, COUNT(*) AS count FROM orders WHERE status <> 'cancelled' GROUP BY payment_method");
  res.json({ monthly, by_status, by_category, by_payment });
});

const orders = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.status) { where.push('o.status = ?'); params.push(String(req.query.status)); }
  if (req.query.payment_status) { where.push('o.payment_status = ?'); params.push(String(req.query.payment_status)); }
  if (req.query.q) {
    const like = `%${String(req.query.q).replace(/[%_]/g, '\\$&')}%`;
    where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)');
    params.push(like, like, like);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(toInt(req.query.limit, 20), 1), 100);
  const page = Math.max(toInt(req.query.page, 1), 1);
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders o ${w}`, params);
  const items = await query(
    `SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.total, o.status, o.payment_method, o.payment_status, o.created_at,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o ${w} ORDER BY o.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

const customers = asyncHandler(async (req, res) => {
  const params = [];
  let w = '';
  if (req.query.q) {
    const like = `%${String(req.query.q).replace(/[%_]/g, '\\$&')}%`;
    w = 'WHERE u.full_name LIKE ? OR u.email LIKE ?';
    params.push(like, like);
  }
  res.json(await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
            COUNT(o.id) AS order_count, COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total END), 0) AS total_spent
     FROM users u LEFT JOIN orders o ON o.user_id = u.id ${w} GROUP BY u.id ORDER BY u.id DESC LIMIT 300`, params));
});

const customerDetail = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await query('SELECT id, full_name, email, phone, status, created_at FROM users WHERE id = ?', [id]);
  if (!user) throw ApiError.notFound('Customer not found');
  user.addresses = await query('SELECT * FROM addresses WHERE user_id = ?', [id]);
  user.orders = await query('SELECT id, order_number, total, status, payment_status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC', [id]);
  res.json(user);
});

const setCustomerStatus = asyncHandler(async (req, res) => {
  const r = await query('UPDATE users SET status = ? WHERE id = ?', [req.body.status, Number(req.params.id)]);
  if (!r.affectedRows) throw ApiError.notFound('Customer not found');
  res.json({ message: `Account ${req.body.status}` });
});

const getSettings = asyncHandler(async (req, res) => res.json(await Settings.getAll()));
const saveSettings = asyncHandler(async (req, res) => {
  await Settings.setMany(req.body);
  res.json(await Settings.getAll());
});

module.exports = { customerStatusRules, settingsRules, dashboard, analytics, orders, customers, customerDetail, setCustomerStatus, getSettings, saveSettings };