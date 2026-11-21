# GiftZone: Make Every Moment Special.

A full-stack online gift store: React + Vite + Tailwind storefront, Express REST API, MySQL database, JWT auth and an admin dashboard.

```
giftzone/
  client/   React storefront + admin UI (Vite, Tailwind, Router, Framer Motion, Chart.js)
  server/   Express API (MVC): config, controllers, middleware, models, routes, services, utils
```

## 1. Prerequisites
- Node.js 18+ (developed on 22)
- MySQL 8.0+ (uses `CHECK` constraints, `JSON` and `FULLTEXT`)

## 2. Setup

```bash
# Database
mysql -u root -p < server/config/schema.sql
mysql -u root -p -e "CREATE USER 'giftzone'@'localhost' IDENTIFIED BY 'a-strong-password'; GRANT ALL ON giftzone.* TO 'giftzone'@'localhost';"

# Server
cd server
cp .env.example .env          # fill in DB_*, JWT_SECRET, ADMIN_PASSWORD (min 10 chars)
npm install
npm run seed                  # admin account, 12 categories, 36 products, coupons (+ demo customers in dev)
npm run dev                   # http://localhost:5000

# Client (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api and /uploads to :5000)
```

Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to reach `/admin`.
Dev seed also creates customers like `amina@example.com` with password `Demo1234` (never created when `NODE_ENV=production`).
Seed coupons: `WELCOME10` (10%), `GIFT15` (15%), `EID20` (20%).

## 3. Key behaviours
- **Prices are never trusted from the browser.** Checkout recomputes subtotal, coupon discount, delivery fee and total on the server from database prices, inside a transaction that locks stock rows.
- **Cart:** guests use `localStorage`; on login it is merged into the database cart, which persists across devices.
- **Personalisation:** recipient, message, wrapping style, delivery date are stored per cart line, then copied to `gift_messages` per order item.
- **Order lifecycle:** pending → confirmed → processing → shipped → delivered / cancelled, with `order_status_history`, in-app notifications and emails. Cancelling restores stock and releases the coupon. Customers may cancel only while pending.
- **Revenue** in the dashboard counts only paid, non-cancelled orders. COD becomes paid when marked delivered (or when an admin confirms payment).
- **Reviews** are held for admin approval; the homepage testimonials show real approved reviews only.
- **Roles:** one login endpoint; role comes from the `users` vs `admins` table; all `/api/admin/*` and write endpoints require the admin role.

## 4. Payments
Card, EVC Plus and e-Dahab are implemented behind a provider-adapter (`server/services/paymentService.js`).
- `PAYMENT_MODE=sandbox` (default): the customer is sent to `/pay/:orderNumber`, a clearly labelled fake provider page with "simulate success / failure". No real money moves.
- `PAYMENT_MODE=live`: the adapters currently **throw "not configured"**. Real card/EVC Plus/e-Dahab integration needs your merchant account and the provider's API (session creation + webhook that marks the order paid). Implement `createSession` for each in `liveAdapters`, add a verified webhook route, and set the keys in `.env`.
- Card numbers, CVVs and wallet PINs are never collected, logged or stored; only a provider reference is kept.

## 5. Security checklist (implemented)
bcrypt hashing (cost 12, via `bcryptjs`) · JWT with expiry · role-based middleware · blocked-account enforcement on every request · express-validator on all inputs · parameterised SQL everywhere · sort columns whitelisted · helmet · CORS allow-list · login/forgot-password rate limiting · password-reset tokens stored as SHA-256 hashes, 1h expiry, same response whether or not the email exists · upload filter (JPG/PNG/WEBP, 5MB, random server-side filenames) · secrets only in `server/.env`.

## 6. Product images
Seed images are Unsplash photo IDs listed in `server/utils/seedImages.js`. They could not be verified from the build environment, so run:
```bash
cd server && npm run check-images
```
and replace any ID it reports as broken. Every image in the UI also has an inline SVG fallback, so a dead link never leaves an empty box. Admins can upload their own photos or paste https URLs per product.

## 7. Email
Set `SMTP_*` in `.env`. With `SMTP_HOST` empty, emails (order confirmation, status updates, password reset links) are printed to the server console, which is handy in development.

## 8. Deployment
```bash
cd client && npm run build            # outputs client/dist
cd ../server && NODE_ENV=production npm start
```
In production the Express server also serves `client/dist` and `/uploads`, so one process and one domain is enough. Behind nginx/Caddy, terminate HTTPS and proxy to port 5000. Before launch:
1. Strong `JWT_SECRET` (32+ chars; the server refuses to start otherwise) and unique DB password.
2. `CLIENT_URL` set to your real domain; HTTPS enabled.
3. `PAYMENT_MODE=live` only once real adapters are implemented.
4. Back up the database and the `server/uploads` folder.
5. If the API is on a different domain, set `VITE_API_URL` and `VITE_ASSET_URL` in `client/.env` before building.

## 9. API summary
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register · login · forgot-password · reset-password`, `GET /api/auth/me` |
| Products | `GET /api/products` (q, category, occasion, minPrice, maxPrice, rating, availability, onSale, sort, page, limit), `GET /api/products/:idOrSlug`, `POST/PUT/DELETE` (admin) |
| Categories | `GET /api/categories[/:idOrSlug]`, `POST/PUT/DELETE` (admin) |
| Cart | `GET/POST /api/cart`, `PUT/DELETE /api/cart/:id` |
| Wishlist | `GET/POST /api/wishlist`, `DELETE /api/wishlist/:productId` |
| Orders | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `PUT /api/orders/:id/cancel`, `PUT /api/orders/:id/status` (admin), `GET /api/orders/preview?coupon=` |
| Account | `/api/users/profile · password · addresses · notifications` |
| Reviews / coupons | `/api/products/:id/reviews`, `/api/reviews/featured`, `POST /api/coupons/validate` |
| Admin | `/api/admin/dashboard · analytics · orders · customers[/:id] · coupons · reviews · settings · upload`, `PUT /api/admin/orders/:id/payment` |
| Public | `GET /api/settings`, `POST /api/contact`, `POST /api/newsletter` |

## 10. Notes and known limits
- Added tables beyond the required list: `site_settings`, `contact_messages`, `newsletter_subscribers`.
- Gift wrapping is a flat $2.00 per unit (`WRAP_FEE` in `server/controllers/cartController.js` and `client/src/utils/format.js`; keep both in sync).
- Currency is USD throughout; change `money()` in `client/src/utils/format.js` for another currency.
- Admin accounts are created via `npm run seed` or directly in the `admins` table (there is no public admin sign-up, by design).
- The app has no automated test suite yet.
