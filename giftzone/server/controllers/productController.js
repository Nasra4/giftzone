const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const { transaction, query } = require('../config/db');
const Product = require('../models/productModel');
const ApiError = require('../utils/ApiError');
const { asyncHandler, slugify } = require('../utils/helpers');
const { publicUrl, UPLOAD_DIR } = require('../middleware/upload');

const isSafeImageUrl = (u) => /^https:\/\/[^\s]+$/i.test(u) || /^\/uploads\/[\w.-]+$/.test(u);

const productRules = [
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('Product name is required (2-160 characters)'),
  body('category_id').isInt({ min: 1 }).withMessage('Choose a category'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discount_price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
    .custom((v, { req }) => Number(v) <= Number(req.body.price)).withMessage('Discount price cannot exceed the regular price'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or more'),
];

// Combine images kept from before, newly uploaded files and pasted https:// URLs.
function collectImages(req, { editing }) {
  const parseList = (v) => {
    if (!v) return [];
    try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : []; } catch { return []; }
  };
  const kept = parseList(req.body.existing_images).filter(isSafeImageUrl);
  const urls = parseList(req.body.image_urls).filter(isSafeImageUrl);
  const uploaded = (req.files || []).map(publicUrl);
  const all = [...kept, ...urls, ...uploaded].slice(0, 8);
  if (!editing && !all.length) throw ApiError.badRequest('Add at least one product image');
  if (editing && !all.length && req.body.existing_images === undefined && req.body.image_urls === undefined && !uploaded.length) return null; // untouched
  if (!all.length) throw ApiError.badRequest('A product needs at least one image');
  return all;
}

function readFields(req) {
  const b = req.body;
  let specifications = {};
  if (b.specifications) {
    try { specifications = typeof b.specifications === 'string' ? JSON.parse(b.specifications) : b.specifications; } catch { throw ApiError.badRequest('Specifications must be valid JSON'); }
  }
  return {
    category_id: Number(b.category_id),
    name: String(b.name).trim(),
    description: b.description ? String(b.description) : null,
    specifications,
    occasion: b.occasion ? String(b.occasion).trim() : null,
    price: Number(b.price),
    discount_price: b.discount_price !== undefined && b.discount_price !== '' && b.discount_price !== null ? Number(b.discount_price) : null,
    stock: Number(b.stock),
    is_featured: b.is_featured === true || b.is_featured === 'true' || b.is_featured === '1' || b.is_featured === 1 ? 1 : 0,
  };
}

async function uniqueSlug(name, exceptId = 0) {
  const base = slugify(name) || 'product';
  let slug = base;
  let n = 2;
  while (await Product.slugExists(slug, exceptId)) { slug = `${base}-${n}`; n += 1; }
  return slug;
}

const list = asyncHandler(async (req, res) => res.json(await Product.list(req.query)));

const getOne = asyncHandler(async (req, res) => {
  const key = req.params.id;
  const product = /^\d+$/.test(key) ? await Product.findById(Number(key)) : await Product.findBySlug(key);
  if (!product) throw ApiError.notFound('Product not found');
  product.related = await Product.related(product);
  res.json(product);
});

const create = asyncHandler(async (req, res) => {
  const data = readFields(req);
  const images = collectImages(req, { editing: false });
  data.slug = await uniqueSlug(data.name);
  const id = await transaction((conn) => Product.create(conn, data, images));
  res.status(201).json(await Product.findById(id));
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await Product.findById(id);
  if (!existing) throw ApiError.notFound('Product not found');
  const data = readFields(req);
  const images = collectImages(req, { editing: true });
  await transaction((conn) => Product.update(conn, id, data, images));

  // Remove uploaded files that are no longer referenced.
  if (images) {
    existing.images.filter((u) => u.startsWith('/uploads/') && !images.includes(u)).forEach((u) => {
      fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {});
    });
  }
  res.json(await Product.findById(id));
});

const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await Product.findById(id);
  if (!existing) throw ApiError.notFound('Product not found');
  await Product.remove(id);
  existing.images.filter((u) => u.startsWith('/uploads/')).forEach((u) => fs.unlink(path.join(UPLOAD_DIR, path.basename(u)), () => {}));
  res.json({ message: 'Product deleted' });
});

const occasions = asyncHandler(async (req, res) => {
  const rows = await query("SELECT DISTINCT occasion FROM products WHERE occasion IS NOT NULL AND occasion <> '' ORDER BY occasion");
  res.json(rows.map((r) => r.occasion));
});

module.exports = { productRules, list, getOne, create, update, remove, occasions };
