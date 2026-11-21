const { query } = require('../config/db');
const { toInt } = require('../utils/helpers');

const EFFECTIVE_PRICE = 'COALESCE(p.discount_price, p.price)';
const SORTS = {
  featured: 'p.is_featured DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
  price_asc: `${EFFECTIVE_PRICE} ASC`,
  price_desc: `${EFFECTIVE_PRICE} DESC`,
  best_selling: 'p.sold_count DESC, p.created_at DESC',
};

const BASE_SELECT = `
  SELECT p.id, p.category_id, p.name, p.slug, p.description, p.specifications, p.occasion,
         p.price, p.discount_price, ${EFFECTIVE_PRICE} AS final_price, p.stock, p.is_featured, p.sold_count, p.created_at,
         c.name AS category_name, c.slug AS category_slug,
         COALESCE(r.avg_rating, 0) AS rating, COALESCE(r.review_count, 0) AS review_count,
         (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
    FROM product_reviews WHERE is_approved = 1 GROUP BY product_id
  ) r ON r.product_id = p.id`;

const parseSpecs = (row) => {
  if (!row) return row;
  if (typeof row.specifications === 'string') {
    try { row.specifications = JSON.parse(row.specifications); } catch { row.specifications = {}; }
  }
  return row;
};

async function list(filters = {}) {
  const where = [];
  const params = [];

  if (filters.category) {
    if (/^\d+$/.test(String(filters.category))) { where.push('p.category_id = ?'); params.push(Number(filters.category)); }
    else { where.push('c.slug = ?'); params.push(String(filters.category)); }
  }
  if (filters.occasion) { where.push('p.occasion = ?'); params.push(String(filters.occasion)); }
  if (filters.q) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
    const like = `%${String(filters.q).replace(/[%_]/g, '\\$&')}%`;
    params.push(like, like, like);
  }
  if (filters.minPrice !== undefined && filters.minPrice !== '') { where.push(`${EFFECTIVE_PRICE} >= ?`); params.push(Number(filters.minPrice) || 0); }
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') { where.push(`${EFFECTIVE_PRICE} <= ?`); params.push(Number(filters.maxPrice) || 0); }
  if (filters.rating) { where.push('COALESCE(r.avg_rating, 0) >= ?'); params.push(Number(filters.rating) || 0); }
  if (filters.availability === 'in_stock') where.push('p.stock > 0');
  if (filters.availability === 'out_of_stock') where.push('p.stock = 0');
  if (filters.featured === 'true' || filters.featured === '1') where.push('p.is_featured = 1');
  if (filters.onSale === 'true' || filters.onSale === '1') where.push('p.discount_price IS NOT NULL');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[filters.sort] || SORTS.featured;
  const limit = Math.min(Math.max(toInt(filters.limit, 12), 1), 60);
  const page = Math.max(toInt(filters.page, 1), 1);

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id
     LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating FROM product_reviews WHERE is_approved = 1 GROUP BY product_id) r ON r.product_id = p.id
     ${whereSql}`,
    params
  );
  const items = await query(`${BASE_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  const total = countRows[0].total;
  return { items: items.map(parseSpecs), total, page, pages: Math.max(Math.ceil(total / limit), 1) };
}

async function findById(id) {
  const rows = await query(`${BASE_SELECT} WHERE p.id = ?`, [id]);
  if (!rows.length) return null;
  const product = parseSpecs(rows[0]);
  product.images = (await query('SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [id])).map((i) => i.image_url);
  return product;
}

async function findBySlug(slug) {
  const rows = await query('SELECT id FROM products WHERE slug = ?', [slug]);
  return rows.length ? findById(rows[0].id) : null;
}

async function related(product, limit = 4) {
  const rows = await query(
    `${BASE_SELECT} WHERE p.category_id = ? AND p.id <> ? ORDER BY p.is_featured DESC, p.sold_count DESC LIMIT ?`,
    [product.category_id, product.id, limit]
  );
  return rows.map(parseSpecs);
}

async function setImages(conn, productId, urls) {
  await conn.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
  for (let i = 0; i < urls.length; i += 1) {
    await conn.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)', [productId, urls[i], i]);
  }
}

async function create(conn, data, images) {
  const [res] = await conn.query(
    `INSERT INTO products (category_id, name, slug, description, specifications, occasion, price, discount_price, stock, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.name, data.slug, data.description, JSON.stringify(data.specifications || {}), data.occasion, data.price, data.discount_price, data.stock, data.is_featured]
  );
  await setImages(conn, res.insertId, images);
  return res.insertId;
}

async function update(conn, id, data, images) {
  await conn.query(
    `UPDATE products SET category_id = ?, name = ?, description = ?, specifications = ?, occasion = ?, price = ?, discount_price = ?, stock = ?, is_featured = ? WHERE id = ?`,
    [data.category_id, data.name, data.description, JSON.stringify(data.specifications || {}), data.occasion, data.price, data.discount_price, data.stock, data.is_featured, id]
  );
  if (images) await setImages(conn, id, images);
}

async function remove(id) {
  // Order history keeps its own copy of name/price/image, so deleting a product is safe.
  await query('DELETE FROM products WHERE id = ?', [id]);
}

async function slugExists(slug, exceptId = 0) {
  const rows = await query('SELECT id FROM products WHERE slug = ? AND id <> ?', [slug, exceptId]);
  return rows.length > 0;
}

module.exports = { list, findById, findBySlug, related, create, update, remove, slugExists, BASE_SELECT, parseSpecs };
