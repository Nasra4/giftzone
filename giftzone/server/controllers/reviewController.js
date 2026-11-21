const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Choose a rating from 1 to 5'),
  body('comment').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Review can be up to 1000 characters'),
];

const forProduct = asyncHandler(async (req, res) =>
  res.json(await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS author
     FROM product_reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.id DESC`, [Number(req.params.id)])));

const add = asyncHandler(async (req, res) => {
  const pid = Number(req.params.id);
  const [p] = await query('SELECT id FROM products WHERE id = ?', [pid]);
  if (!p) throw ApiError.notFound('Product not found');
  const [dup] = await query('SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ?', [pid, req.user.id]);
  if (dup) throw ApiError.conflict('You have already reviewed this product');
  await query('INSERT INTO product_reviews (product_id, user_id, rating, comment, is_approved) VALUES (?,?,?,?,0)',
    [pid, req.user.id, Number(req.body.rating), req.body.comment || null]);
  res.status(201).json({ message: 'Thanks! Your review will appear once it has been approved.' });
});

// Real approved reviews for the homepage testimonials section.
const featured = asyncHandler(async (req, res) =>
  res.json(await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS author, p.name AS product_name, p.slug AS product_slug
     FROM product_reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
     WHERE r.is_approved = 1 AND r.rating >= 4 AND r.comment IS NOT NULL AND r.comment <> ''
     ORDER BY r.rating DESC, r.id DESC LIMIT 6`)));

// ---- admin ----
const adminList = asyncHandler(async (req, res) => {
  const where = req.query.status === 'pending' ? 'WHERE r.is_approved = 0' : req.query.status === 'approved' ? 'WHERE r.is_approved = 1' : '';
  res.json(await query(
    `SELECT r.id, r.rating, r.comment, r.is_approved, r.created_at, p.name AS product_name, u.full_name AS author
     FROM product_reviews r JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id ${where} ORDER BY r.id DESC LIMIT 200`));
});

const approve = asyncHandler(async (req, res) => {
  const r = await query('UPDATE product_reviews SET is_approved = 1 WHERE id = ?', [Number(req.params.id)]);
  if (!r.affectedRows) throw ApiError.notFound('Review not found');
  res.json({ message: 'Review approved' });
});

const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM product_reviews WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Review removed' });
});

module.exports = { reviewRules, forProduct, featured, add, adminList, approve, remove };
