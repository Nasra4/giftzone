import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { cartService } from '../services';
import { errMsg } from '../services/api';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { computeTotals } from '../utils/format';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const GUEST_KEY = 'gz_guest_cart';
const COUPON_KEY = 'gz_coupon';
const readGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || []; } catch { return []; } };
const readCoupon = () => { try { return JSON.parse(localStorage.getItem(COUPON_KEY)); } catch { return null; } };

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const settings = useSettings();
  const [items, setItems] = useState(readGuest);
  const [wrapFee, setWrapFee] = useState(2);
  const [loading, setLoading] = useState(false);
  const [coupon, setCouponState] = useState(readCoupon); // { code, discount_percent }

  const isCustomer = user?.role === 'customer';

  const setCoupon = (c) => {
    setCouponState(c);
    if (c) localStorage.setItem(COUPON_KEY, JSON.stringify(c)); else localStorage.removeItem(COUPON_KEY);
  };

  const applyServer = (data) => { setItems(data.items); if (data.wrap_fee != null) setWrapFee(data.wrap_fee); };

  // Guests: cart lives in localStorage. Logged-in customers: cart lives in the database.
  useEffect(() => {
    if (authLoading) return undefined;
    let alive = true;
    (async () => {
      if (!isCustomer) { if (user?.role === 'admin') setItems([]); else setItems(readGuest()); return; }
      setLoading(true);
      try {
        const guest = readGuest();
        // Merge anything added before login into the account cart.
        for (const g of guest) {
          try {
            await cartService.add({ product_id: g.product_id, quantity: g.quantity, recipient_name: g.recipient_name, personal_message: g.personal_message, gift_wrap: g.gift_wrap, wrap_style: g.wrap_style, delivery_date: g.delivery_date });
          } catch { /* skip items that are no longer available */ }
        }
        if (guest.length) localStorage.removeItem(GUEST_KEY);
        const data = await cartService.get();
        if (alive) applyServer(data);
      } catch (e) {
        if (alive) toast.error(errMsg(e, 'Could not load your cart'));
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?.id, user?.role, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!isCustomer && user?.role !== 'admin') localStorage.setItem(GUEST_KEY, JSON.stringify(items)); }, [items, isCustomer, user?.role]);

  const add = useCallback(async (product, quantity = 1, custom = {}) => {
    if (product.stock < 1) { toast.error('Sorry, this gift is out of stock'); return false; }
    const payload = {
      recipient_name: custom.recipient_name || null,
      personal_message: custom.personal_message || null,
      gift_wrap: !!custom.gift_wrap,
      wrap_style: custom.gift_wrap ? custom.wrap_style || 'classic' : null,
      delivery_date: custom.delivery_date || null,
    };
    if (isCustomer) {
      try {
        applyServer(await cartService.add({ product_id: product.id, quantity, ...payload }));
        toast.success(`${product.name} added to cart`);
        return true;
      } catch (e) { toast.error(errMsg(e)); return false; }
    }
    if (user?.role === 'admin') { toast.error('Admin accounts cannot shop. Please use a customer account.'); return false; }
    setItems((prev) => {
      const same = prev.find((i) => i.product_id === product.id && JSON.stringify([i.recipient_name, i.personal_message, i.gift_wrap, i.wrap_style, i.delivery_date]) === JSON.stringify([payload.recipient_name, payload.personal_message, payload.gift_wrap, payload.wrap_style, payload.delivery_date]));
      if (same) return prev.map((i) => (i === same ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock, 20) } : i));
      return [...prev, {
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: product.id, name: product.name, slug: product.slug, image: product.image || product.images?.[0],
        price: product.price, discount_price: product.discount_price, final_price: product.final_price ?? product.discount_price ?? product.price,
        stock: product.stock, quantity: Math.min(quantity, product.stock), ...payload,
      }];
    });
    toast.success(`${product.name} added to cart`);
    return true;
  }, [isCustomer, user?.role]);

  const update = useCallback(async (id, patch) => {
    if (isCustomer) {
      try { applyServer(await cartService.update(id, patch)); } catch (e) { toast.error(errMsg(e)); }
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, quantity: Math.min(Math.max(patch.quantity ?? i.quantity, 1), i.stock) } : i)));
  }, [isCustomer]);

  const remove = useCallback(async (id) => {
    if (isCustomer) {
      try { applyServer(await cartService.remove(id)); } catch (e) { toast.error(errMsg(e)); }
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, [isCustomer]);

  // After an order is placed the server has emptied the cart; mirror that here.
  const clearLocal = useCallback(() => { setItems([]); setCoupon(null); localStorage.removeItem(GUEST_KEY); }, []);

  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const totals = useMemo(() => computeTotals(items, coupon?.discount_percent, settings, wrapFee), [items, coupon, settings, wrapFee]);

  const value = { items, count, loading, coupon, setCoupon, totals, wrapFee, add, update, remove, clearLocal };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
