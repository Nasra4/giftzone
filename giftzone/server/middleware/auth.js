const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const { query } = require('../config/db');

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Requires a valid JWT. Blocked customers are rejected even if their token is still valid.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please log in again.');
  }

  if (payload.role === 'admin') {
    const rows = await query('SELECT id FROM admins WHERE id = ?', [payload.id]);
    if (!rows.length) throw ApiError.unauthorized();
  } else {
    const rows = await query('SELECT id, status FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) throw ApiError.unauthorized();
    if (rows[0].status === 'blocked') throw ApiError.forbidden('This account has been blocked. Please contact support.');
  }
  req.user = { id: payload.id, role: payload.role };
  next();
});

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return next(ApiError.forbidden('Admin access required'));
  next();
};

const customerOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') return next(ApiError.forbidden('Customer account required'));
  next();
};

module.exports = { signToken, protect, adminOnly, customerOnly };
