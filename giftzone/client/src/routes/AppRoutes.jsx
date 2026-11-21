import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import { PageLoader } from '../components/ui';

import Home from '../pages/Home';
import Shop from '../pages/Shop';
import ProductDetails from '../pages/ProductDetails';
import Categories from '../pages/Categories';
import Cart from '../pages/Cart';
import Wishlist from '../pages/Wishlist';
import { Login, Register, ForgotPassword, ResetPassword } from '../pages/Auth';
import { About, Contact, NotFound } from '../pages/Static';

// Rarely-visited, heavier areas are split out so the storefront loads fast.
const Checkout = lazy(() => import('../pages/Checkout'));
const OrderSuccess = lazy(() => import('../pages/OrderSuccess'));
const SandboxPay = lazy(() => import('../pages/SandboxPay'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('../pages/admin/Products'));
const AdminCategories = lazy(() => import('../pages/admin/Categories'));
const AdminOrders = lazy(() => import('../pages/admin/Orders'));
const AdminCustomers = lazy(() => import('../pages/admin/Customers'));
const AdminMarketing = lazy(() => import('../pages/admin/Marketing'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));
const AdminMessages = lazy(() => import('../pages/admin/Messages'));

const pick = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const AccountLayout = pick(() => import('../pages/Account'), 'AccountLayout');
const Profile = pick(() => import('../pages/Account'), 'Profile');
const Orders = pick(() => import('../pages/Account'), 'Orders');
const OrderDetail = pick(() => import('../pages/Account'), 'OrderDetail');
const WishlistTab = pick(() => import('../pages/Account'), 'WishlistTab');
const Addresses = pick(() => import('../pages/Account'), 'Addresses');
const PasswordSettings = pick(() => import('../pages/Account'), 'PasswordSettings');
const Coupons = pick(() => import('../pages/admin/Marketing'), 'Coupons');
const Reviews = pick(() => import('../pages/admin/Marketing'), 'Reviews');

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="categories" element={<Categories />} />
          <Route path="category/:slug" element={<Shop />} />
          <Route path="product/:slug" element={<ProductDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="order-success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="pay/:number" element={<ProtectedRoute><SandboxPay /></ProtectedRoute>} />

          <Route path="account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="wishlist" element={<WishlistTab />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="password" element={<PasswordSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}