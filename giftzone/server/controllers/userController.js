const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const { passwordRule } = require('./authController');

const profileRules = [
  body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('Please enter your full name'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[+\d][\d\s-]{6,20}$/).withMessage('Please enter a valid phone number'),
];
const passwordRules = [body('current_password').notEmpty().withMessage('Enter your current password'), passwordRule('new_password')];
const addressRules = [
  body('label').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('full_name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().matches(/^[+\d][\d\s-]{6,20}$/).withMessage('Please enter a valid phone number'),
  body('address_line').trim().isLength({ min: 3, max: 255 }).withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
];

const getProfile = asyncHandler(async (req, res) => {
  const [u] = await query('SELECT id, full_name, email, phone, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json(u);
});

const updateProfile = asyncHandler(async (req, res) => {
  await query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [req.body.full_name, req.body.phone || null, req.user.id]);
  const [u] = await query('SELECT id, full_name, email, phone FROM users WHERE id = ?', [req.user.id]);
  res.json({ ...u, role: 'customer' });
});

const changePassword = asyncHandler(async (req, res) => {
  const [u] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(req.body.current_password, u.password_hash))) throw ApiError.badRequest('Your current password is incorrect');
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(req.body.new_password, 12), req.user.id]);
  res.json({ message: 'Password changed' });
});

const listAddresses = asyncHandler(async (req, res) =>
  res.json(await query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.user.id])));

const saveAddress = (isNew) => asyncHandler(async (req, res) => {
  const b = req.body;
  const makeDefault = b.is_default === true || b.is_default === 'true' ? 1 : 0;
  if (makeDefault) await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
  if (isNew) {
    const r = await query('INSERT INTO addresses (user_id, label, full_name, phone, address_line, city, country, is_default) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, b.label || 'Home', b.full_name, b.phone, b.address_line, b.city, b.country, makeDefault]);
    const [row] = await query('SELECT * FROM addresses WHERE id = ?', [r.insertId]);
    return res.status(201).json(row);
  }
  const r = await query('UPDATE addresses SET label=?, full_name=?, phone=?, address_line=?, city=?, country=?, is_default=? WHERE id = ? AND user_id = ?',
    [b.label || 'Home', b.full_name, b.phone, b.address_line, b.city, b.country, makeDefault, Number(req.params.id), req.user.id]);
  if (!r.affectedRows) throw ApiError.notFound('Address not found');
  const [row] = await query('SELECT * FROM addresses WHERE id = ?', [Number(req.params.id)]);
  res.json(row);
});

const deleteAddress = asyncHandler(async (req, res) => {
  const r = await query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (!r.affectedRows) throw ApiError.notFound('Address not found');
  res.json({ message: 'Address removed' });
});

const listNotifications = asyncHandler(async (req, res) =>
  res.json(await query('SELECT id, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30', [req.user.id])));

const readNotifications = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'ok' });
});

module.exports = {
  profileRules, passwordRules, addressRules,
  getProfile, updateProfile, changePassword,
  listAddresses, createAddress: saveAddress(true), updateAddress: saveAddress(false), deleteAddress,
  listNotifications, readNotifications,
};
