export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

export const fmtDate = (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-US', opts) : '-';

export const fmtDateTime = (d) =>
  d ? new Date(String(d).replace(' ', 'T')).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const discountPercent = (price, finalPrice) =>
  price > finalPrice ? Math.round(((price - finalPrice) / price) * 100) : 0;

export const PAYMENT_LABELS = { cod: 'Cash on Delivery', card: 'Card Payment', evc_plus: 'EVC Plus', edahab: 'e-Dahab' };
export const WRAP_STYLES = [
  { id: 'classic', label: 'Classic Kraft', color: '#C9A27A' },
  { id: 'floral', label: 'Floral Blush', color: '#F4A7B9' },
  { id: 'luxury', label: 'Luxury Gold', color: '#E9B872' },
  { id: 'kids', label: 'Fun & Colourful', color: '#8FD3F4' },
];
export const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
export const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-gray-200 text-gray-700',
};

// Mirrors server/controllers/orderController.js computeTotals - the server is the source of truth at checkout.
export function computeTotals(items, couponPercent, settings, wrapFee = 2) {
  const subtotal = items.reduce((s, i) => s + i.final_price * i.quantity + (i.gift_wrap ? wrapFee * i.quantity : 0), 0);
  const discount = couponPercent ? Math.round(subtotal * couponPercent) / 100 : 0;
  const after = subtotal - discount;
  const threshold = Number(settings?.free_delivery_threshold ?? 75);
  const fee = items.length === 0 ? 0 : after >= threshold ? 0 : Number(settings?.delivery_fee ?? 3);
  return { subtotal, discount, delivery_fee: fee, total: Math.round((after + fee) * 100) / 100 };
}
