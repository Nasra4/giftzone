/*
 * Usage:  npm run seed            -> creates the admin, categories, products and coupons if the DB is empty
 *         npm run seed -- --reset -> wipes catalogue + orders first (development only)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { slugify } = require('./helpers');
const { pick, url } = require('./seedImages');

const categories = [
  ['Birthday Gifts', 'Cakes, hampers and surprises that make birthdays unforgettable.', url('1530103862676-de8c9debad1d', 800)],
  ['Anniversary Gifts', 'Celebrate every year together with something timeless.', url('1518895949257-7621c3c786d7', 800)],
  ['Wedding Gifts', 'Elegant presents for the happy couple.', url('1519225421980-715cb0215aed', 800)],
  ['Graduation Gifts', 'Honour the achievement and the road ahead.', url('1523050854058-8df90110c9f1', 800)],
  ["Valentine's Gifts", 'Romantic gifts that say it without words.', url('1518895949257-7621c3c786d7', 800)],
  ["Mother's Day Gifts", 'Thoughtful ways to thank the woman who gave you everything.', url('1490750967868-88aa4486c946', 800)],
  ["Father's Day Gifts", 'Gifts for the dads who deserve more than a mug.', url('1523275335684-37898b6baf30', 800)],
  ['Personalized Gifts', 'Made just for them, with their name or your message.', url('1514228742587-6b1558fcca3d', 800)],
  ['Flowers and Bouquets', 'Fresh, hand-tied bouquets for every mood.', url('1487530811176-3780de880c2d', 800)],
  ['Gift Hampers', 'Curated baskets and chocolate hampers, ready to give.', url('1549465220-1a8b9238cd48', 800)],
  ['Teddy Bears', 'Soft, huggable companions in every size.', url('1559454403-b8fb88521f11', 800)],
  ['Watches and Accessories', 'Watches, jewelry and fragrance gift sets.', url('1524592094714-0f0654e20314', 800)],
];

// [category, name, description, price, discount|null, stock, occasion, featured, theme, imageOffset, specs]
const P = (category, name, description, price, discount, stock, occasion, featured, theme, offset, specs) =>
  ({ category, name, description, price, discount, stock, occasion, featured, theme, offset, specs });

const products = [
  P('Birthday Gifts', 'Birthday Celebration Basket', 'A joyful basket of gourmet treats, a scented candle and a handwritten-style card, wrapped and ready to open.', 54, 44, 40, 'Birthday', 1, 'birthday', 0, { Contents: 'Cookies, chocolates, candle, card', Weight: '1.8 kg', Dimensions: '35 x 25 x 20 cm' }),
  P('Birthday Gifts', 'Party Surprise Gift Box', 'Balloons, confetti poppers and sweet treats packed in a luxury box that doubles as party decor.', 38, null, 55, 'Birthday', 0, 'giftbox', 1, { Contents: 'Balloons, treats, confetti', Weight: '1.2 kg', Dimensions: '30 x 22 x 15 cm' }),
  P('Birthday Gifts', 'Sweet Birthday Cake Hamper', 'A mini celebration cake paired with fruit juice, truffles and a "Happy Birthday" topper.', 62, 55, 25, 'Birthday', 1, 'birthday', 2, { Contents: 'Cake, truffles, juice', Weight: '2.1 kg', Serves: '4-6' }),

  P('Anniversary Gifts', 'Golden Memories Gift Box', 'A keepsake box with a gold-tone frame, scented candle and dark chocolates for a quiet celebration.', 69, null, 30, 'Anniversary', 1, 'anniversary', 0, { Contents: 'Frame, candle, chocolates', Material: 'Rigid gift box, gold foil', Dimensions: '28 x 28 x 12 cm' }),
  P('Anniversary Gifts', 'Forever Roses Bouquet', 'Two dozen long-stem red roses with eucalyptus and ribbon, hand-tied by our florists.', 79, 69, 20, 'Anniversary', 1, 'flowers', 3, { Stems: '24 roses', Height: '55 cm', Freshness: '7+ days with care' }),
  P('Anniversary Gifts', 'Love Story Jewelry Set', 'A delicate pendant and matching earrings presented in a velvet-lined box.', 95, 85, 18, 'Anniversary', 0, 'jewelry', 0, { Material: 'Stainless steel, gold plated', Includes: 'Pendant, earrings, box', Care: 'Wipe with soft cloth' }),

  P('Wedding Gifts', 'Elegant Wedding Gift Hamper', 'Premium tea, honey, chocolates and a champagne-style sparkling juice for the newlyweds.', 120, 105, 15, 'Wedding', 1, 'wedding', 0, { Contents: 'Tea, honey, chocolate, sparkling juice', Weight: '3 kg', Dimensions: '40 x 30 x 22 cm' }),
  P('Wedding Gifts', 'Ivory & Gold Keepsake Box', 'A hand-finished keepsake box for rings, letters and memories, with a satin-lined interior.', 58, null, 35, 'Wedding', 0, 'wedding', 1, { Material: 'Wood, satin lining', Dimensions: '20 x 15 x 8 cm', Colour: 'Ivory/gold' }),
  P('Wedding Gifts', 'Bride & Groom Mug Set', 'Two ceramic mugs with a gift ribbon, ready to personalise with their names.', 32, 27, 60, 'Wedding', 0, 'mug', 1, { Material: 'Ceramic', Capacity: '350 ml each', 'Dishwasher safe': 'Yes' }),

  P('Graduation Gifts', 'Graduation Celebration Box', 'A congratulatory box with a motivational journal, pen set, chocolates and graduation cap card.', 48, 42, 45, 'Graduation', 1, 'graduation', 0, { Contents: 'Journal, pen set, chocolates', Weight: '1.1 kg', Dimensions: '30 x 22 x 12 cm' }),
  P('Graduation Gifts', 'Achievement Watch', 'A clean minimalist watch with a leather strap, a first watch worth keeping for years.', 89, null, 22, 'Graduation', 0, 'watch', 1, { Movement: 'Quartz', Strap: 'Genuine leather', 'Water resistance': '30 m' }),
  P('Graduation Gifts', 'Cap & Diploma Teddy', 'A plush bear in a graduation cap and gown, holding a tiny diploma.', 28, 24, 70, 'Graduation', 0, 'teddy', 1, { Height: '30 cm', Material: 'Plush polyester', Age: 'All ages' }),

  P("Valentine's Gifts", 'Romance Chocolate Heart Box', 'Heart-shaped box of 16 handmade truffles in assorted flavours.', 36, 31, 80, "Valentine's Day", 1, 'chocolate', 0, { Pieces: '16 truffles', Weight: '320 g', Allergens: 'Milk, nuts, soy' }),
  P("Valentine's Gifts", 'Red Rose & Teddy Combo', 'A dozen red roses with a 25 cm teddy bear and a love note card.', 74, 64, 28, "Valentine's Day", 1, 'teddy', 1, { Roses: '12 stems', 'Bear height': '25 cm', Includes: 'Note card' }),
  P("Valentine's Gifts", 'Date Night Perfume Set', 'Two fragrances in travel sizes with a satin pouch, for evenings that deserve a signature scent.', 85, null, 26, "Valentine's Day", 0, 'perfume', 0, { Contents: '2 x 30 ml eau de parfum', Notes: 'Rose, amber, vanilla', Includes: 'Gift pouch' }),

  P("Mother's Day Gifts", 'Mom You Are Loved Bouquet', 'A soft pink and white bouquet of peonies, roses and lisianthus.', 59, 52, 30, "Mother's Day", 1, 'flowers', 1, { Stems: '18 mixed', Height: '50 cm', Colours: 'Pink & white' }),
  P("Mother's Day Gifts", 'Spa Relaxation Hamper', 'Bath salts, body butter, scented candle and herbal tea for a well-earned pause.', 66, 58, 32, "Mother's Day", 0, 'giftbox', 2, { Contents: 'Salts, butter, candle, tea', Weight: '1.6 kg', 'Skin type': 'All' }),
  P("Mother's Day Gifts", 'Pearl Charm Jewelry Box', 'A freshwater pearl necklace and bracelet in a keepsake jewelry box.', 98, null, 14, "Mother's Day", 1, 'jewelry', 1, { Material: 'Freshwater pearl, silver tone', Includes: 'Necklace, bracelet', Box: 'Velvet-lined' }),

  P("Father's Day Gifts", 'Classic Gentleman Watch', 'A timeless steel watch with a sunray dial and a link bracelet.', 129, 109, 16, "Father's Day", 1, 'watch', 1, { Movement: 'Japanese quartz', Case: '40 mm stainless steel', 'Water resistance': '50 m' }),
  P("Father's Day Gifts", 'Coffee Lover Gift Set', 'Specialty beans, a ceramic mug and a handy brew guide for the dad who lives on coffee.', 45, 39, 48, "Father's Day", 0, 'mug', 1, { Contents: 'Beans 250 g, mug, guide', Roast: 'Medium', Mug: '400 ml' }),
  P("Father's Day Gifts", 'Premium Cologne Gift Set', 'A woody, long-lasting cologne with a matching travel spray.', 92, 80, 24, "Father's Day", 0, 'perfume', 2, { Contents: '100 ml + 15 ml travel', Notes: 'Cedar, bergamot, musk', Type: 'Eau de toilette' }),

  P('Personalized Gifts', 'Custom Name Photo Mug', 'A glossy ceramic mug printed with a photo and a name of your choice.', 19, null, 120, 'Birthday', 1, 'mug', 0, { Material: 'Ceramic', Capacity: '330 ml', Personalisation: 'Name and photo' }),
  P('Personalized Gifts', 'Engraved Keepsake Box', 'A wooden box laser-engraved with initials and a short message.', 44, 38, 40, 'Anniversary', 0, 'wedding', 1, { Material: 'Solid wood', Engraving: 'Up to 3 lines', Dimensions: '18 x 12 x 7 cm' }),
  P('Personalized Gifts', 'Personalized Gift Hamper', 'Choose the treats, add a name tag and a printed card. Packed by hand for the recipient.', 72, 64, 30, 'Birthday', 1, 'giftbox', 3, { Contents: 'Chocolates, snacks, tag, card', Weight: '2 kg', Personalisation: 'Name tag + message' }),

  P('Flowers and Bouquets', 'Pink Dream Bouquet', 'Soft pink roses and carnations with greenery and satin ribbon.', 49, 42, 40, 'Birthday', 1, 'flowers', 1, { Stems: '15 mixed', Height: '45 cm', Colours: 'Pinks' }),
  P('Flowers and Bouquets', 'Sunshine Mixed Bouquet', 'Bright gerberas, sunflowers and daisies for a day that needs cheering up.', 42, null, 36, 'Get well', 0, 'flowers', 2, { Stems: '16 mixed', Height: '45 cm', Colours: 'Yellow & orange' }),
  P('Flowers and Bouquets', 'Luxury Red Roses', 'Fifty premium long-stem red roses presented in a hat box.', 149, 129, 10, "Valentine's Day", 1, 'flowers', 4, { Stems: '50 roses', Height: '60 cm', Packaging: 'Round hat box' }),

  P('Gift Hampers', 'Deluxe Chocolate Hamper', 'Belgian-style chocolates, truffles and a hot chocolate mix in a woven basket.', 64, 56, 38, 'Birthday', 1, 'chocolate', 1, { Contents: 'Chocolates 600 g, cocoa mix', Weight: '1.9 kg', Allergens: 'Milk, nuts' }),
  P('Gift Hampers', 'Gourmet Treats Basket', 'Biscuits, jam, honey, nuts and tea in a keepsake basket.', 58, null, 42, 'Thank you', 0, 'giftbox', 0, { Contents: '8 gourmet items', Weight: '2.3 kg', Basket: 'Reusable wicker' }),
  P('Gift Hampers', 'Luxury Celebration Hamper', 'Our largest hamper: sweets, savoury snacks, a candle and sparkling juice.', 135, 115, 12, 'Wedding', 1, 'giftbox', 1, { Contents: '14 premium items', Weight: '4.2 kg', Dimensions: '45 x 35 x 25 cm' }),

  P('Teddy Bears', 'Cuddly Brown Teddy (60 cm)', 'A super-soft, huggable classic with a satin bow.', 34, 29, 60, 'Birthday', 1, 'teddy', 0, { Height: '60 cm', Material: 'Plush polyester', Washable: 'Surface wash' }),
  P('Teddy Bears', 'Giant Love Teddy (120 cm)', 'A statement-sized bear holding a red heart.', 89, 79, 14, "Valentine's Day", 1, 'teddy', 1, { Height: '120 cm', Material: 'Plush polyester', Includes: 'Heart pillow' }),
  P('Teddy Bears', 'Mini Teddy Trio', 'Three pocket-sized bears in different colours.', 22, null, 90, 'Birthday', 0, 'teddy', 2, { Height: '15 cm each', Material: 'Plush', Age: '3+' }),

  P('Watches and Accessories', 'Rose Gold Ladies Watch', 'A slim rose-gold watch with a mesh strap and crystal markers.', 99, 85, 20, 'Birthday', 1, 'watch', 2, { Movement: 'Quartz', Case: '32 mm', 'Water resistance': '30 m' }),
  P('Watches and Accessories', 'Signature Perfume Gift Set', 'Eau de parfum with a body mist and a mini roll-on in a gift box.', 78, 68, 28, 'Anniversary', 1, 'perfume', 1, { Contents: '50 ml + 100 ml mist + 10 ml', Notes: 'Jasmine, vanilla, musk', Type: 'Eau de parfum' }),
  P('Watches and Accessories', 'Crystal Jewelry Gift Box', 'A bracelet, ring and necklace set with sparkling stones.', 65, null, 24, "Mother's Day", 0, 'jewelry', 2, { Material: 'Alloy, crystal', Includes: 'Bracelet, ring, necklace', Box: 'Gift box' }),
];

const coupons = [['WELCOME10', 10, null, null], ['GIFT15', 15, '2026-12-31', 200], ['EID20', 20, '2027-03-31', 100]];
const demoCustomers = [['Amina Yusuf', 'amina@example.com'], ['Hassan Ali', 'hassan@example.com'], ['Fatima Omar', 'fatima@example.com'], ['Abdi Warsame', 'abdi@example.com']];
const reviewTexts = [
  [5, 'Beautiful packaging and it arrived right on time. She loved it!'],
  [5, 'Exactly like the photos. The quality is excellent for the price.'],
  [4, 'Lovely gift. Delivery was a little late but the team kept me updated.'],
  [5, 'Third time ordering from GiftZone and it never disappoints.'],
];

async function main() {
  const reset = process.argv.includes('--reset');
  const prod = process.env.NODE_ENV === 'production';
  if (reset && prod) throw new Error('Refusing to --reset in production');

  if (reset) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['coupon_usage', 'gift_messages', 'payments', 'order_status_history', 'order_items', 'orders', 'cart_items', 'carts', 'wishlist_items', 'wishlists', 'product_reviews', 'product_images', 'products', 'categories', 'coupons', 'notifications']) {
      await pool.query(`TRUNCATE TABLE ${t}`);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Catalogue and orders cleared.');
  }

  // Admin
  const email = (process.env.ADMIN_EMAIL || 'admin@giftzone.com').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 10) throw new Error('Set ADMIN_PASSWORD (at least 10 characters) in server/.env before seeding.');
  const [admins] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
  if (!admins.length) {
    await pool.query('INSERT INTO admins (full_name, email, password_hash) VALUES (?,?,?)', ['GiftZone Admin', email, await bcrypt.hash(pw, 12)]);
    console.log(`Admin created: ${email}`);
  } else console.log(`Admin already exists: ${email}`);

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM categories');
  if (n > 0) { console.log('Catalogue already has data - skipping products (use -- --reset to rebuild).'); return; }

  const catId = {};
  for (const [name, desc, img] of categories) {
    const [r] = await pool.query('INSERT INTO categories (name, slug, description, image_url) VALUES (?,?,?,?)', [name, slugify(name), desc, img]);
    catId[name] = r.insertId;
  }

  const productIds = [];
  const slugs = new Set();
  for (const p of products) {
    let slug = slugify(p.name);
    while (slugs.has(slug)) slug += '-2';
    slugs.add(slug);
    const [r] = await pool.query(
      `INSERT INTO products (category_id, name, slug, description, specifications, occasion, price, discount_price, stock, is_featured, sold_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [catId[p.category], p.name, slug, p.description, JSON.stringify(p.specs), p.occasion, p.price, p.discount, p.stock, p.featured, p.featured ? 20 + Math.floor(Math.random() * 60) : Math.floor(Math.random() * 20)]);
    productIds.push(r.insertId);
    const imgs = pick(p.theme, p.offset, 3);
    for (let i = 0; i < imgs.length; i += 1) await pool.query('INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?,?,?)', [r.insertId, imgs[i], i]);
  }
  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);

  for (const [code, pct, exp, max] of coupons) {
    await pool.query('INSERT IGNORE INTO coupons (code, discount_percent, expires_at, max_uses) VALUES (?,?,?,?)', [code, pct, exp, max]);
  }
  console.log(`Coupons: ${coupons.map((c) => c[0]).join(', ')}`);

  if (!prod) {
    const hash = await bcrypt.hash('Demo1234', 12);
    const userIds = [];
    for (const [name, mail] of demoCustomers) {
      await pool.query('INSERT IGNORE INTO users (full_name, email, password_hash) VALUES (?,?,?)', [name, mail, hash]);
      const [[u]] = await pool.query('SELECT id FROM users WHERE email = ?', [mail]);
      userIds.push(u.id);
    }
    // A few approved reviews so ratings are visible on a fresh install.
    for (const pid of productIds.filter((_, i) => i % 2 === 0)) {
      const count = 1 + (pid % 3);
      for (let k = 0; k < count; k += 1) {
        const [rating, comment] = reviewTexts[(pid + k) % reviewTexts.length];
        await pool.query('INSERT IGNORE INTO product_reviews (product_id, user_id, rating, comment, is_approved) VALUES (?,?,?,?,1)', [pid, userIds[k], rating, comment]);
      }
    }
    console.log('Dev-only demo customers created (password: Demo1234): ' + demoCustomers.map((c) => c[1]).join(', '));
  }
}

main().then(() => pool.end()).catch((e) => { console.error(e.message); pool.end(); process.exit(1); });
