import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiLock, FiTruck, FiUser, FiGift, FiCreditCard } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { orderService, userService } from '../services';
import { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import SafeImage from '../components/SafeImage';
import { FieldError, PageLoader, Spinner } from '../components/ui';
import { OrderTotals } from './Cart';
import { money, todayISO, PAYMENT_LABELS } from '../utils/format';

const PHONE = { required: 'Phone number is required', pattern: { value: /^[+\d][\d\s-]{6,20}$/, message: 'Enter a valid phone number' } };
const req = (label) => ({ required: `${label} is required` });

const PAYMENTS = [
  ['cod', 'Pay with cash when your gift arrives.'],
  ['card', "You'll finish payment on the provider's secure page. We never see your card details."],
  ['evc_plus', 'Approve the EVC Plus payment request on your phone.'],
  ['edahab', 'Approve the e-Dahab payment request on your phone.'],
];

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-xl"><Icon className="text-brand" /> {title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, error, children, full }) {
  return <div className={full ? 'sm:col-span-2' : ''}><label className="label">{label}</label>{children}<FieldError error={error} /></div>;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = useSettings();
  const { items, loading: cartLoading, coupon, setCoupon, clearLocal } = useCart();
  const [busy, setBusy] = useState(false);
  const addresses = useFetch(() => userService.addresses(), []);
  const preview = useFetch(() => orderService.preview(coupon?.code), [coupon?.code, items.length]);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm({
    defaultValues: { customer_name: user?.full_name || '', customer_email: user?.email || '', customer_phone: user?.phone || '', customer_country: 'Somalia', payment_method: 'cod' },
  });
  const method = watch('payment_method');
  const sameAsMe = watch('same_as_me');

  // Pre-fill from the default saved address once it loads.
  useEffect(() => {
    const a = addresses.data?.find((x) => x.is_default) || addresses.data?.[0];
    if (a && !getValues('customer_address')) {
      setValue('customer_address', a.address_line); setValue('customer_city', a.city); setValue('customer_country', a.country);
      if (!getValues('customer_phone')) setValue('customer_phone', a.phone);
    }
  }, [addresses.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Deliver to me" copies the buyer's details into the recipient fields.
  useEffect(() => {
    if (!sameAsMe) return;
    const g = getValues();
    setValue('recipient_name', g.customer_name); setValue('recipient_phone', g.customer_phone);
    setValue('recipient_address', [g.customer_address, g.customer_city, g.customer_country].filter(Boolean).join(', '));
  }, [sameAsMe]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cartLoading) return <PageLoader />;
  if (!items.length) {
    return (
      <div className="py-20 text-center"><p className="text-ink-soft">Your cart is empty.</p><Link to="/shop" className="btn-primary mt-4">Browse gifts</Link></div>
    );
  }

  const totals = preview.data || null;

  const onSubmit = async (d) => {
    setBusy(true);
    try {
      const payload = { ...d, coupon_code: coupon?.code || undefined };
      delete payload.same_as_me;
      const order = await orderService.create(payload);
      clearLocal();
      if (d.payment_method === 'cod') navigate(`/order-success/${order.id}`, { replace: true });
      else navigate(`/pay/${order.order_number}`, { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      toast.error(msg);
      if (/coupon/i.test(msg)) setCoupon(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-4xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section icon={FiUser} title="Your details">
            <Field label="Full name" error={errors.customer_name}><input className={`input ${errors.customer_name ? 'input-error' : ''}`} autoComplete="name" {...register('customer_name', req('Full name'))} /></Field>
            <Field label="Email" error={errors.customer_email}><input type="email" className={`input ${errors.customer_email ? 'input-error' : ''}`} autoComplete="email" {...register('customer_email', { ...req('Email'), pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} /></Field>
            <Field label="Phone number" error={errors.customer_phone}><input type="tel" className={`input ${errors.customer_phone ? 'input-error' : ''}`} autoComplete="tel" {...register('customer_phone', PHONE)} /></Field>
            <Field label="City" error={errors.customer_city}><input className={`input ${errors.customer_city ? 'input-error' : ''}`} autoComplete="address-level2" {...register('customer_city', req('City'))} /></Field>
            <Field label="Address" error={errors.customer_address} full>
              <input className={`input ${errors.customer_address ? 'input-error' : ''}`} autoComplete="street-address" {...register('customer_address', req('Address'))} />
              {addresses.data?.length > 0 && (
                <select className="input mt-2 text-xs" defaultValue="" onChange={(e) => { const a = addresses.data.find((x) => String(x.id) === e.target.value); if (a) { setValue('customer_address', a.address_line); setValue('customer_city', a.city); setValue('customer_country', a.country); } }} aria-label="Use a saved address">
                  <option value="">Use a saved address…</option>
                  {addresses.data.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.address_line}, {a.city}</option>)}
                </select>
              )}
            </Field>
            <Field label="Country" error={errors.customer_country}><input className={`input ${errors.customer_country ? 'input-error' : ''}`} autoComplete="country-name" {...register('customer_country', req('Country'))} /></Field>
          </Section>

          <Section icon={FiGift} title="Gift delivery">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-brand" {...register('same_as_me')} /> Deliver to me (same as my details)</label>
            <Field label="Recipient name" error={errors.recipient_name}><input className={`input ${errors.recipient_name ? 'input-error' : ''}`} {...register('recipient_name', req('Recipient name'))} /></Field>
            <Field label="Recipient phone" error={errors.recipient_phone}><input type="tel" className={`input ${errors.recipient_phone ? 'input-error' : ''}`} {...register('recipient_phone', PHONE)} /></Field>
            <Field label="Recipient address" error={errors.recipient_address} full><input className={`input ${errors.recipient_address ? 'input-error' : ''}`} placeholder="Street, area, city" {...register('recipient_address', req('Recipient address'))} /></Field>
            <Field label="Gift message (optional)" error={errors.gift_message} full><textarea rows={3} className="input" placeholder="Used for items without their own personal message" {...register('gift_message', { maxLength: { value: 500, message: 'Up to 500 characters' } })} /></Field>
            <Field label="Delivery instructions (optional)" error={errors.delivery_instructions} full><input className="input" placeholder="e.g. Call on arrival, leave with reception" {...register('delivery_instructions', { maxLength: { value: 500, message: 'Up to 500 characters' } })} /></Field>
            <Field label="Preferred delivery date (optional)" error={errors.preferred_delivery_date}><input type="date" min={todayISO()} className="input" {...register('preferred_delivery_date', { validate: (v) => !v || v >= todayISO() || 'Pick today or a future date' })} /></Field>
          </Section>

          <section className="card p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-xl"><FiCreditCard className="text-brand" /> Payment method</h2>
            <div className="space-y-3" role="radiogroup">
              {PAYMENTS.map(([id, hint]) => (
                <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${method === id ? 'border-brand bg-brand-soft' : 'border-gray-200 hover:border-brand-light'}`}>
                  <input type="radio" value={id} className="mt-1 accent-brand" {...register('payment_method')} />
                  <span><span className="block font-semibold">{PAYMENT_LABELS[id]}</span><span className="text-xs text-ink-soft">{hint}</span></span>
                </label>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft"><FiLock /> Payment details are handled by the payment provider and are never stored by GiftZone.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display text-xl">Order summary</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={i.image} alt="" width={120} /><span className="absolute right-0 top-0 rounded-bl-lg bg-brand px-1.5 text-[10px] font-bold text-white">{i.quantity}</span></span>
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="font-medium">{money(i.final_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-gray-100 pt-5">
              {preview.loading && !totals ? <Spinner className="mx-auto h-5 w-5 text-brand" /> : totals
                ? <OrderTotals totals={totals} coupon={totals.coupon} freeThreshold={Number(settings.free_delivery_threshold)} />
                : <p className="text-sm text-red-500">{preview.error || 'Could not calculate totals'}</p>}
            </div>
            <button className="btn-primary mt-6 w-full py-3.5" disabled={busy || !totals}>{busy ? <Spinner className="h-4 w-4" /> : <FiLock />} {method === 'cod' ? 'Place order' : 'Continue to payment'}</button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-soft"><FiTruck /> Delivery fee is shown above and added at checkout.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
