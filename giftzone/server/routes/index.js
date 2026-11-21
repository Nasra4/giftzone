const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { protect, adminOnly, customerOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const products = require('../controllers/productController');
const categories = require('../controllers/categoryController');
const cart = require('../controllers/cartController');
const wishlist = require('../controllers/wishlistController');
const orders = require('../controllers/orderController');
const coupons = require('../controllers/couponController');
const reviews = require('../controllers/reviewController');
const admin = require('../controllers/adminController');
const misc = require('../controllers/miscController');

const router = express.Router();

// Brute-force protection on the endpoints attackers like most.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again in a few minutes.' } });

// ---------- Public ----------
router.get('/settings', misc.publicSettings);
router.post('/contact', validate(misc.contactRules), misc.contact);
router.post('/newsletter', validate(misc.newsletterRules), misc.subscribe);

// ---------- Auth ----------
router.post('/auth/register', authLimiter, validate(auth.registerRules), auth.register);
router.post('/auth/login', authLimiter, validate(auth.loginRules), auth.login);
router.post('/auth/forgot-password', authLimiter, validate(auth.forgotRules), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(auth.resetRules), auth.resetPassword);
router.get('/auth/me', protect, auth.me);

// ---------- Catalogue (public reads, admin writes) ----------
router.get('/products', products.list);
router.get('/products/occasions', products.occasions);
router.get('/products/:id', products.getOne);
router.post('/products', protect, adminOnly, upload.array('images', 8), validate(products.productRules), products.create);
router.put('/products/:id', protect, adminOnly, upload.array('images', 8), validate(products.productRules), products.update);
router.delete('/products/:id', protect, adminOnly, products.remove);

router.get('/reviews/featured', reviews.featured);
router.get('/products/:id/reviews', reviews.forProduct);
router.post('/products/:id/reviews', protect, customerOnly, validate(reviews.reviewRules), reviews.add);

router.get('/categories', categories.list);
router.get('/categories/:id', categories.getOne);
router.post('/categories', protect, adminOnly, upload.single('image'), validate(categories.categoryRules), categories.create);
router.put('/categories/:id', protect, adminOnly, upload.single('image'), validate(categories.categoryRules), categories.update);
router.delete('/categories/:id', protect, adminOnly, categories.remove);

// ---------- Customer ----------
router.get('/users/profile', protect, customerOnly, users.getProfile);
router.put('/users/profile', protect, customerOnly, validate(users.profileRules), users.updateProfile);
router.put('/users/password', protect, customerOnly, validate(users.passwordRules), users.changePassword);
router.get('/users/addresses', protect, customerOnly, users.listAddresses);
router.post('/users/addresses', protect, customerOnly, validate(users.addressRules), users.createAddress);
router.put('/users/addresses/:id', protect, customerOnly, validate(users.addressRules), users.updateAddress);
router.delete('/users/addresses/:id', protect, customerOnly, users.deleteAddress);
router.get('/users/notifications', protect, customerOnly, users.listNotifications);
router.put('/users/notifications/read', protect, customerOnly, users.readNotifications);

router.get('/cart', protect, customerOnly, cart.getCart);
router.post('/cart', protect, customerOnly, validate(cart.addRules), cart.addItem);
router.put('/cart/:id', protect, customerOnly, validate(cart.updateRules), cart.updateItem);
router.delete('/cart/:id', protect, customerOnly, cart.removeItem);

router.get('/wishlist', protect, customerOnly, wishlist.get);
router.post('/wishlist', protect, customerOnly, validate(wishlist.addRules), wishlist.add);
router.delete('/wishlist/:id', protect, customerOnly, wishlist.remove);

router.post('/coupons/validate', protect, customerOnly, coupons.validateCode);

router.get('/orders/preview', protect, customerOnly, orders.preview);
router.post('/orders', protect, customerOnly, validate(orders.createRules), orders.create);
router.get('/orders', protect, customerOnly, orders.myOrders);
router.get('/orders/:id', protect, orders.getOne); // owner or admin (enforced in controller)
router.put('/orders/:id/cancel', protect, customerOnly, orders.cancelMine);
router.put('/orders/:id/status', protect, adminOnly, validate(orders.statusRules), orders.updateStatus);

router.get('/payments/sandbox/:number', protect, customerOnly, orders.sandboxInfo);
router.post('/payments/sandbox/:number/complete', protect, customerOnly, orders.sandboxComplete);

// ---------- Admin ----------
const adminRouter = express.Router();
adminRouter.use(protect, adminOnly);
adminRouter.get('/dashboard', admin.dashboard);
adminRouter.get('/analytics', admin.analytics);
adminRouter.get('/orders', admin.orders);
adminRouter.put('/orders/:id/payment', orders.confirmPayment);
adminRouter.get('/customers', admin.customers);
adminRouter.get('/customers/:id', admin.customerDetail);
adminRouter.put('/customers/:id/status', validate(admin.customerStatusRules), admin.setCustomerStatus);
adminRouter.get('/coupons', coupons.list);
adminRouter.post('/coupons', validate(coupons.couponRules), coupons.create);
adminRouter.put('/coupons/:id', validate(coupons.couponRules), coupons.update);
adminRouter.put('/coupons/:id/toggle', coupons.toggle);
adminRouter.delete('/coupons/:id', coupons.remove);
adminRouter.get('/reviews', reviews.adminList);
adminRouter.put('/reviews/:id/approve', reviews.approve);
adminRouter.delete('/reviews/:id', reviews.remove);
adminRouter.get('/messages', misc.listMessages);
adminRouter.delete('/messages/:id', misc.deleteMessage);
adminRouter.get('/subscribers', misc.listSubscribers);
adminRouter.get('/settings', admin.getSettings);
adminRouter.put('/settings', validate(admin.settingsRules), admin.saveSettings);
adminRouter.post('/upload', upload.single('image'), (req, res) => res.status(201).json({ url: `/uploads/${req.file.filename}` }));
router.use('/admin', adminRouter);

module.exports = router;
