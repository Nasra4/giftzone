const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const Product = require('../models/productModel');

const addRules = [body('product_id').isInt({ min: 1 }).withMessage('Invalid product')];

async function getOrCreateWishlistId(userId) {
  const [w] = await query('SELECT id FROM wishlists WHERE user_id = ?', [userId]);
  if (w) return w.id;
  return (await query('INSERT INTO wishlists (user_id) VALUES (?)', [userId])).insertId;
}

async function load(userId) {
  return query(
    `${Product.BASE_SELECT} JOIN wishlist_items wi ON wi.product_id = p.id JOIN wishlists w ON w.id = wi.wishlist_id
     WHERE w.user_id = ? ORDER BY wi.id DESC`,
    [userId]
  ).then((rows) => rows.map(Product.parseSpecs));
}

const get = asyncHandler(async (req, res) => res.json(await load(req.user.id)));

const add = asyncHandler(async (req, res) => {
  const [p] = await query('SELECT id FROM products WHERE id = ?', [Number(req.body.product_id)]);
  if (!p) throw ApiError.notFound('Product not found');
  const wid = await getOrCreateWishlistId(req.user.id);
  await query('INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)', [wid, p.id]);
  res.status(201).json(await load(req.user.id));
});

// :id is the product id, which is what the UI has on hand.
const remove = asyncHandler(async (req, res) => {
  await query(
    'DELETE wi FROM wishlist_items wi JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = ? AND wi.product_id = ?',
    [req.user.id, Number(req.params.id)]
  );
  res.json(await load(req.user.id));
});

module.exports = { addRules, get, add, remove };
