import api from './api';

const get = (url, params) => api.get(url, { params }).then((r) => r.data);
const post = (url, data, cfg) => api.post(url, data, cfg).then((r) => r.data);
const put = (url, data, cfg) => api.put(url, data, cfg).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

export const authService = {
  login: (d) => post('/auth/login', d),
  register: (d) => post('/auth/register', d),
  me: () => get('/auth/me'),
  forgot: (d) => post('/auth/forgot-password', d),
  reset: (d) => post('/auth/reset-password', d),
};

export const productService = {
  list: (params) => get('/products', params),
  one: (idOrSlug) => get(`/products/${idOrSlug}`),
  occasions: () => get('/products/occasions'),
  reviews: (id) => get(`/products/${id}/reviews`),
  addReview: (id, d) => post(`/products/${id}/reviews`, d),
  featuredReviews: () => get('/reviews/featured'),
  create: (formData) => post('/products', formData),
  update: (id, formData) => put(`/products/${id}`, formData),
  remove: (id) => del(`/products/${id}`),
};

export const categoryService = {
  list: () => get('/categories'),
  one: (slug) => get(`/categories/${slug}`),
  create: (formData) => post('/categories', formData),
  update: (id, formData) => put(`/categories/${id}`, formData),
  remove: (id) => del(`/categories/${id}`),
};

export const cartService = {
  get: () => get('/cart'),
  add: (d) => post('/cart', d),
  update: (id, d) => put(`/cart/${id}`, d),
  remove: (id) => del(`/cart/${id}`),
};

export const wishlistService = {
  get: () => get('/wishlist'),
  add: (productId) => post('/wishlist', { product_id: productId }),
  remove: (productId) => del(`/wishlist/${productId}`),
};

export const orderService = {
  preview: (coupon) => get('/orders/preview', coupon ? { coupon } : undefined),
  create: (d) => post('/orders', d),
  mine: () => get('/orders'),
  one: (id) => get(`/orders/${id}`),
  cancel: (id) => put(`/orders/${id}/cancel`),
  sandboxInfo: (number) => get(`/payments/sandbox/${number}`),
  sandboxComplete: (number, success) => post(`/payments/sandbox/${number}/complete`, { success }),
};

export const couponService = { validate: (code) => post('/coupons/validate', { code }) };

export const userService = {
  profile: () => get('/users/profile'),
  updateProfile: (d) => put('/users/profile', d),
  changePassword: (d) => put('/users/password', d),
  addresses: () => get('/users/addresses'),
  addAddress: (d) => post('/users/addresses', d),
  updateAddress: (id, d) => put(`/users/addresses/${id}`, d),
  removeAddress: (id) => del(`/users/addresses/${id}`),
  notifications: () => get('/users/notifications'),
  readNotifications: () => put('/users/notifications/read'),
};

export const siteService = {
  settings: () => get('/settings'),
  contact: (d) => post('/contact', d),
  subscribe: (email) => post('/newsletter', { email }),
};

export const adminService = {
  dashboard: () => get('/admin/dashboard'),
  analytics: (months = 12) => get('/admin/analytics', { months }),
  orders: (params) => get('/admin/orders', params),
  setOrderStatus: (id, status, note) => put(`/orders/${id}/status`, { status, note }),
  confirmPayment: (id) => put(`/admin/orders/${id}/payment`),
  customers: (q) => get('/admin/customers', q ? { q } : undefined),
  customer: (id) => get(`/admin/customers/${id}`),
  setCustomerStatus: (id, status) => put(`/admin/customers/${id}/status`, { status }),
  coupons: () => get('/admin/coupons'),
  createCoupon: (d) => post('/admin/coupons', d),
  updateCoupon: (id, d) => put(`/admin/coupons/${id}`, d),
  toggleCoupon: (id) => put(`/admin/coupons/${id}/toggle`),
  removeCoupon: (id) => del(`/admin/coupons/${id}`),
  reviews: (status) => get('/admin/reviews', status ? { status } : undefined),
  approveReview: (id) => put(`/admin/reviews/${id}/approve`),
  removeReview: (id) => del(`/admin/reviews/${id}`),
  messages: () => get('/admin/messages'),
  removeMessage: (id) => del(`/admin/messages/${id}`),
  subscribers: () => get('/admin/subscribers'),
  settings: () => get('/admin/settings'),
  saveSettings: (d) => put('/admin/settings', d),
  upload: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return post('/admin/upload', fd);
  },
};