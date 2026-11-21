const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const couponRules = [
  body('code').trim().matches(/^[A-Za-z0-9_-]{3,40}$/).withMessage('Code must be 3-40 letters, numbers, - or _'),
  body('discount_percent').isInt({ min: 1, max: 90 }).withMessage('Discount must be between 1% and 90%'),
  body('expires_at').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid expiry date'),
  body('max_uses').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Max uses must be at least 1'),
];

// Shared by the cart preview and by order creation, so both apply exactly the same rules.
async function findValidCoupon(conn, code, userId) {
  const run = conn ? (sql, p) => conn.query(sql, p).then(([r]) => r) : query;
  const [coupon] = await run('SELECT * FROM coupons WHERE code = ?', [String(code || '').trim().toUpperCase()]);
  if (!coupon || !coupon.is_active) throw ApiError.badRequest('That coupon code is not valid');
  if (coupon.expires_at && new Date(coupon.expires_at + 'T23:59:59') < new Date()) throw ApiError.badRequest('That coupon has expired');
  const [{ used }] = await run('SELECT COUNT(*) AS used FROM coupon_usage WHERE coupon_id = ?', [coupon.id]);
  if (coupon.max_uses && used >= coupon.max_uses) throw ApiError.badRequest('That coupon has reached its usage limit');
  const [mine] = await run('SELECT id FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, userId]);
  if (mine) throw ApiError.badRequest('You have already used this coupon');
  return coupon;
}

const validateCode = asyncHandler(async (req, res) => {
  const coupon = await findValidCoupon(null, req.body.code, req.user.id);
  res.json({ code: coupon.code, discount_percent: coupon.discount_percent });
});

const list = asyncHandler(async (req, res) =>
  res.json(await query('SELECT c.*, (SELECT COUNT(*) FROM coupon_usage u WHERE u.coupon_id = c.id) AS times_used FROM coupons c ORDER BY c.id DESC')));

const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await query('INSERT INTO coupons (code, discount_percent, expires_at, max_uses, is_active) VALUES (?,?,?,?,?)',
    [b.code.trim().toUpperCase(), Number(b.discount_percent), b.expires_at || null, b.max_uses || null, b.is_active === false ? 0 : 1]);
  const [row] = await query('SELECT * FROM coupons WHERE id = ?', [r.insertId]);
  res.status(201).json(row);
});

const update = asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await query('UPDATE coupons SET code = ?, discount_percent = ?, expires_at = ?, max_uses = ?, is_active = ? WHERE id = ?',
    [b.code.trim().toUpperCase(), Number(b.discount_percent), b.expires_at || null, b.max_uses || null, b.is_active === false || b.is_active === 0 ? 0 : 1, Number(req.params.id)]);
  if (!r.affectedRows) throw ApiError.notFound('Coupon not found');
  const [row] = await query('SELECT * FROM coupons WHERE id = ?', [Number(req.params.id)]);
  res.json(row);
});

const toggle = asyncHandler(async (req, res) => {
  const r = await query('UPDATE coupons SET is_active = NOT is_active WHERE id = ?', [Number(req.params.id)]);
  if (!r.affectedRows) throw ApiError.notFound('Coupon not found');
  const [row] = await query('SELECT * FROM coupons WHERE id = ?', [Number(req.params.id)]);
  res.json(row);
});

const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM coupons WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Coupon deleted' });
});

module.exports = { couponRules, findValidCoupon, validateCode, list, create, update, toggle, remove };
