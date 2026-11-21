const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');

const customizationRules = [
  body('recipient_name').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Recipient name is too long'),
  body('personal_message').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Message can be up to 500 characters'),
  body('wrap_style').optional({ values: 'falsy' }).isIn(['classic', 'floral', 'luxury', 'kids']).withMessage('Unknown wrapping style'),
  body('delivery_date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid delivery date')
    .custom((v) => new Date(v) >= new Date(new Date().toDateString())).withMessage('Delivery date cannot be in the past'),
];
const addRules = [
  body('product_id').isInt({ min: 1 }).withMessage('Invalid product'),
  body('quantity').optional().isInt({ min: 1, max: 20 }).withMessage('Quantity must be between 1 and 20'),
  ...customizationRules,
];
const updateRules = [body('quantity').optional().isInt({ min: 1, max: 20 }).withMessage('Quantity must be between 1 and 20'), ...customizationRules];

async function getOrCreateCartId(userId) {
  const [c] = await query('SELECT id FROM carts WHERE user_id = ?', [userId]);
  if (c) return c.id;
  const r = await query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
  return r.insertId;
}

const ITEM_SELECT = `
  SELECT ci.id, ci.product_id, ci.quantity, ci.recipient_name, ci.personal_message, ci.gift_wrap, ci.wrap_style, ci.delivery_date,
         p.name, p.slug, p.price, p.discount_price, COALESCE(p.discount_price, p.price) AS final_price, p.stock,
         (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image
  FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN products p ON p.id = ci.product_id`;

async function loadCart(userId) {
  return query(`${ITEM_SELECT} WHERE c.user_id = ? ORDER BY ci.id`, [userId]);
}

const WRAP_FEE = 2; // flat gift-wrap fee per line, kept in one place so the cart and orders agree
const wrapFee = WRAP_FEE;

const getCart = asyncHandler(async (req, res) => res.json({ items: await loadCart(req.user.id), wrap_fee: wrapFee }));

const addItem = asyncHandler(async (req, res) => {
  const b = req.body;
  const quantity = Number(b.quantity || 1);
  const [product] = await query('SELECT id, stock FROM products WHERE id = ?', [Number(b.product_id)]);
  if (!product) throw ApiError.notFound('Product not found');
  if (product.stock < 1) throw ApiError.badRequest('Sorry, this gift is out of stock');

  const cartId = await getOrCreateCartId(req.user.id);
  const wrap = b.gift_wrap === true || b.gift_wrap === 'true' || b.gift_wrap === 1 ? 1 : 0;
  const custom = [b.recipient_name || null, b.personal_message || null, wrap, wrap ? (b.wrap_style || 'classic') : null, b.delivery_date || null];

  // Identical product + identical customization merges into one line; otherwise it's a separate line.
  const [same] = await query(
    `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?
       AND recipient_name <=> ? AND personal_message <=> ? AND gift_wrap = ? AND wrap_style <=> ? AND delivery_date <=> ?`,
    [cartId, product.id, ...custom]
  );
  if (same) {
    const q = Math.min(same.quantity + quantity, product.stock, 20);
    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [q, same.id]);
  } else {
    await query(
      'INSERT INTO cart_items (cart_id, product_id, quantity, recipient_name, personal_message, gift_wrap, wrap_style, delivery_date) VALUES (?,?,?,?,?,?,?,?)',
      [cartId, product.id, Math.min(quantity, product.stock), ...custom]
    );
  }
  res.status(201).json({ items: await loadCart(req.user.id), wrap_fee: wrapFee });
});

const updateItem = asyncHandler(async (req, res) => {
  const [item] = await query(
    `SELECT ci.id, p.stock FROM cart_items ci JOIN carts c ON c.id = ci.cart_id JOIN products p ON p.id = ci.product_id WHERE ci.id = ? AND c.user_id = ?`,
    [Number(req.params.id), req.user.id]
  );
  if (!item) throw ApiError.notFound('Cart item not found');
  const b = req.body;
  if (b.quantity !== undefined) {
    if (Number(b.quantity) > item.stock) throw ApiError.badRequest(`Only ${item.stock} left in stock`);
    await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [Number(b.quantity), item.id]);
  }
  if (b.recipient_name !== undefined || b.personal_message !== undefined || b.gift_wrap !== undefined) {
    const wrap = b.gift_wrap === true || b.gift_wrap === 'true' ? 1 : 0;
    await query('UPDATE cart_items SET recipient_name = ?, personal_message = ?, gift_wrap = ?, wrap_style = ?, delivery_date = ? WHERE id = ?',
      [b.recipient_name || null, b.personal_message || null, wrap, wrap ? (b.wrap_style || 'classic') : null, b.delivery_date || null, item.id]);
  }
  res.json({ items: await loadCart(req.user.id), wrap_fee: wrapFee });
});

const removeItem = asyncHandler(async (req, res) => {
  await query('DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE ci.id = ? AND c.user_id = ?', [Number(req.params.id), req.user.id]);
  res.json({ items: await loadCart(req.user.id), wrap_fee: wrapFee });
});

module.exports = { addRules, updateRules, getCart, addItem, updateItem, removeItem, loadCart, WRAP_FEE };
