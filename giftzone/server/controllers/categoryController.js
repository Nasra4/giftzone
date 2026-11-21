const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { asyncHandler, slugify } = require('../utils/helpers');
const { publicUrl, UPLOAD_DIR } = require('../middleware/upload');

const categoryRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Category name is required'),
  body('description').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('Description is too long'),
];

const SELECT = `SELECT c.id, c.name, c.slug, c.description, c.image_url,
  (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c`;

const list = asyncHandler(async (req, res) => res.json(await query(`${SELECT} ORDER BY c.id`)));

const getOne = asyncHandler(async (req, res) => {
  const key = req.params.id;
  const rows = /^\d+$/.test(key)
    ? await query(`${SELECT} WHERE c.id = ?`, [Number(key)])
    : await query(`${SELECT} WHERE c.slug = ?`, [key]);
  if (!rows.length) throw ApiError.notFound('Category not found');
  res.json(rows[0]);
});

const imageFrom = (req, fallback) => (req.file ? publicUrl(req.file) : (req.body.image_url && /^https:\/\//i.test(req.body.image_url) ? req.body.image_url : fallback));

const create = asyncHandler(async (req, res) => {
  const slug = slugify(req.body.name);
  const result = await query('INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)', [
    req.body.name.trim(), slug, req.body.description || null, imageFrom(req, null),
  ]);
  const [row] = await query(`${SELECT} WHERE c.id = ?`, [result.insertId]);
  res.status(201).json(row);
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await query('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing) throw ApiError.notFound('Category not found');
  const image = imageFrom(req, existing.image_url);
  await query('UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ? WHERE id = ?', [
    req.body.name.trim(), slugify(req.body.name), req.body.description || null, image, id,
  ]);
  if (req.file && existing.image_url?.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(existing.image_url)), () => {});
  const [row] = await query(`${SELECT} WHERE c.id = ?`, [id]);
  res.json(row);
});

const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM products WHERE category_id = ?', [id]);
  if (n > 0) throw ApiError.conflict(`This category still has ${n} product(s). Move or delete them first.`);
  const result = await query('DELETE FROM categories WHERE id = ?', [id]);
  if (!result.affectedRows) throw ApiError.notFound('Category not found');
  res.json({ message: 'Category deleted' });
});

module.exports = { categoryRules, list, getOne, create, update, remove };
