const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler, sha256 } = require('../utils/helpers');
const { signToken } = require('../middleware/auth');
const mail = require('../services/mailService');

const passwordRule = (field = 'password') =>
  body(field)
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must include a letter')
    .matches(/\d/).withMessage('Password must include a number');

const registerRules = [
  body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('Please enter your full name'),
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[+\d][\d\s-]{6,20}$/).withMessage('Please enter a valid phone number'),
  passwordRule(),
];
const loginRules = [
  body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];
const forgotRules = [body('email').trim().isEmail().withMessage('Please enter a valid email').normalizeEmail()];
const resetRules = [
  body('email').trim().isEmail().normalizeEmail(),
  body('token').isLength({ min: 32 }).withMessage('Invalid reset link'),
  passwordRule(),
];

const userShape = (u, role = 'customer') => ({ id: u.id, full_name: u.full_name, email: u.email, phone: u.phone || null, role });

const register = asyncHandler(async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  const exists = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) throw ApiError.conflict('An account with this email already exists');
  const hash = await bcrypt.hash(password, 12);
  const result = await query('INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [full_name, email, phone || null, hash]);
  const user = { id: result.insertId, full_name, email, phone };
  res.status(201).json({ token: signToken(user.id, 'customer'), user: userShape(user) });
});

// One login endpoint for both customers and staff; the role comes from which table matched.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const invalid = ApiError.unauthorized('Incorrect email or password');

  const [user] = await query('SELECT * FROM users WHERE email = ?', [email]);
  if (user) {
    if (!(await bcrypt.compare(password, user.password_hash))) throw invalid;
    if (user.status === 'blocked') throw ApiError.forbidden('This account has been blocked. Please contact support.');
    return res.json({ token: signToken(user.id, 'customer'), user: userShape(user) });
  }
  const [admin] = await query('SELECT * FROM admins WHERE email = ?', [email]);
  if (admin && (await bcrypt.compare(password, admin.password_hash))) {
    return res.json({ token: signToken(admin.id, 'admin'), user: userShape(admin, 'admin') });
  }
  // Run a dummy compare so response time doesn't reveal whether the email exists.
  await bcrypt.compare(password, '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5J5nNmQJ0YbQ2m0m4yYkQy3f3P3JqBu');
  throw invalid;
});

const me = asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') {
    const [a] = await query('SELECT id, full_name, email FROM admins WHERE id = ?', [req.user.id]);
    return res.json({ user: userShape(a, 'admin') });
  }
  const [u] = await query('SELECT id, full_name, email, phone FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: userShape(u) });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT id, full_name, email FROM users WHERE email = ?', [req.body.email]);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await query('UPDATE users SET reset_token_hash = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [sha256(token), user.id]);
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    await mail.sendPasswordReset(user.email, user.full_name, link);
  }
  // Same answer whether or not the email exists, so this can't be used to discover accounts.
  res.json({ message: 'If that email is registered, a reset link is on its way.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  const [user] = await query('SELECT id FROM users WHERE email = ? AND reset_token_hash = ? AND reset_token_expires > NOW()', [email, sha256(token)]);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');
  const hash = await bcrypt.hash(password, 12);
  await query('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);
  res.json({ message: 'Password updated. You can now log in.' });
});

module.exports = { registerRules, loginRules, forgotRules, resetRules, passwordRule, register, login, me, forgotPassword, resetPassword };
