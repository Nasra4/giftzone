import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiTrash2, FiShoppingBag, FiTag, FiArrowLeft, FiGift } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { couponService } from '../services';
import { errMsg } from '../services/api';
import SafeImage from '../components/SafeImage';
import { EmptyState, PageLoader, QuantitySelector, Spinner } from '../components/ui';
import { money, fmtDate, WRAP_STYLES } from '../utils/format';

export function OrderTotals({ totals, coupon, freeThreshold }) {
  const toFree = Math.max(freeThreshold - (totals.subtotal - totals.discount), 0);
  return (
    <>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-medium">{money(totals.subtotal)}</dd></div>
        {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount{coupon ? ` (${coupon.code})` : ''}</dt><dd>-{money(totals.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="font-medium">{totals.delivery_fee === 0 ? 'Free' : money(totals.delivery_fee)}</dd></div>
        <div className="flex justify-between border-t border-gray-100 pt-3 text-lg font-bold"><dt>Total</dt><dd className="text-brand">{money(totals.total)}</dd></div>
      </dl>
      {totals.delivery_fee > 0 && totals.subtotal > 0 && <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand-dark">Add {money(toFree)} more for free delivery.</p>}
    </>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = useSettings();
  const { items, loading, update, remove, totals, coupon, setCoupon, wrapFee } = useCart();
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (user?.role !== 'customer') { toast('Log in to apply a discount code', { icon: '🔑' }); return navigate('/login', { state: { from: '/cart' } }); }
    setApplying(true);
    try {
      const c = await couponService.validate(code.trim());
      setCoupon(c); setCode('');
      toast.success(`${c.code} applied: ${c.discount_percent}% off`);
    } catch (err) { toast.error(errMsg(err)); } finally { setApplying(false); }
  };

  if (loading) return <PageLoader />;
  if (!items.length) {
    return <EmptyState icon={<FiShoppingBag />} title="Your cart is empty" text="Find something special for someone you love." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />;
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-4xl font-bold">Shopping Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((i) => {
            const style = WRAP_STYLES.find((w) => w.id === i.wrap_style);
            const unavailable = i.stock < 1;
            return (
              <article key={i.id} className="card flex gap-4 p-4 sm:p-5">
                <Link to={`/product/${i.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-soft sm:h-28 sm:w-28"><SafeImage src={i.image} alt={i.name} width={300} /></Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/product/${i.slug}`} className="font-semibold leading-snug hover:text-brand">{i.name}</Link>
                    <button onClick={() => remove(i.id)} aria-label={`Remove ${i.name}`} className="rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"><FiTrash2 /></button>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{money(i.final_price)} each</p>
                  {(i.recipient_name || i.personal_message || i.gift_wrap || i.delivery_date) && (
                    <ul className="mt-2 space-y-0.5 rounded-lg bg-cream px-3 py-2 text-xs text-ink-soft">
                      {i.recipient_name && <li><FiGift className="mr-1 inline text-brand" /> For <b>{i.recipient_name}</b></li>}
                      {i.personal_message && <li className="line-clamp-2">“{i.personal_message}”</li>}
                      {i.gift_wrap && <li>Gift wrap: {style?.label || 'Classic'} (+{money(wrapFee)} each)</li>}
                      {i.delivery_date && <li>Deliver on {fmtDate(i.delivery_date)}</li>}
                    </ul>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {unavailable ? <span className="text-sm font-medium text-red-500">Out of stock</span> : <QuantitySelector size="sm" value={i.quantity} max={Math.min(i.stock, 20)} onChange={(q) => update(i.id, { quantity: q })} />}
                    <p className="font-bold text-brand">{money(i.final_price * i.quantity + (i.gift_wrap ? wrapFee * i.quantity : 0))}</p>
                  </div>
                </div>
              </article>
            );
          })}
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"><FiArrowLeft /> Continue shopping</Link>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display text-xl">Order summary</h2>
            <form onSubmit={applyCoupon} className="mt-4 flex gap-2">
              <div className="relative flex-1"><FiTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code" aria-label="Discount code" className="input pl-10 uppercase placeholder:normal-case" /></div>
              <button className="btn-outline btn-sm" disabled={applying}>{applying ? <Spinner className="h-4 w-4" /> : 'Apply'}</button>
            </form>
            {coupon && <p className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"><span><b>{coupon.code}</b> · {coupon.discount_percent}% off</span><button className="font-semibold underline" onClick={() => setCoupon(null)}>Remove</button></p>}
            <div className="mt-5"><OrderTotals totals={totals} coupon={coupon} freeThreshold={Number(settings.free_delivery_threshold)} /></div>
            <button className="btn-primary mt-6 w-full py-3.5" disabled={items.some((i) => i.stock < 1)} onClick={() => navigate('/checkout')}>Proceed to checkout</button>
            {items.some((i) => i.stock < 1) && <p className="mt-2 text-center text-xs text-red-500">Remove out-of-stock items to continue.</p>}
            {!user && <p className="mt-3 text-center text-xs text-ink-soft">You'll be asked to log in or register at checkout. Your cart is saved.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
