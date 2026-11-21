const { query } = require('../config/db');

const DEFAULTS = {
  store_name: 'GiftZone',
  store_email: 'hello@giftzone.com',
  store_phone: '+252 61 000 0000',
  store_address: 'Mogadishu, Somalia',
  delivery_fee: '3.00',
  free_delivery_threshold: '75.00',
  announcement_text: 'Free delivery on orders over $75 — use code WELCOME10 for 10% off your first order!',
  hero_image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1920&q=80',
  promo_banners: JSON.stringify([
    { title: 'Birthday Season', subtitle: 'Hampers & baskets from $19', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=80', link: '/category/birthday-gifts' },
    { title: 'Say it with Flowers', subtitle: 'Fresh bouquets, delivered', image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1000&q=80', link: '/category/flowers-and-bouquets' },
  ]),
};

async function getAll() {
  const rows = await query('SELECT setting_key, setting_value FROM site_settings');
  const out = { ...DEFAULTS };
  rows.forEach((r) => { out[r.setting_key] = r.setting_value; });
  return out;
}

const publicShape = (s) => ({
  store_name: s.store_name,
  store_email: s.store_email,
  store_phone: s.store_phone,
  store_address: s.store_address,
  delivery_fee: Number(s.delivery_fee),
  free_delivery_threshold: Number(s.free_delivery_threshold),
  announcement_text: s.announcement_text,
  hero_image: s.hero_image,
  promo_banners: (() => { try { return JSON.parse(s.promo_banners); } catch { return []; } })(),
});

async function setMany(values) {
  const keys = Object.keys(DEFAULTS);
  for (const [k, v] of Object.entries(values)) {
    if (!keys.includes(k)) continue;
    const val = typeof v === 'string' ? v : JSON.stringify(v);
    await query(
      'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [k, val]
    );
  }
}

module.exports = { getAll, publicShape, setMany, DEFAULTS };
