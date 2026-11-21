import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiLock, FiLogOut, FiCheck, FiX, FiTruck, FiBell } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { orderService, userService } from '../services';
import { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import SafeImage from '../components/SafeImage';
import { ConfirmModal, EmptyState, ErrorBox, FieldError, Modal, PageLoader, Spinner, StatusBadge } from '../components/ui';
import Wishlist from './Wishlist';
import { money, fmtDate, fmtDateTime, ORDER_STEPS, PAYMENT_LABELS, WRAP_STYLES } from '../utils/format';

const NAV = [['/account', 'Profile', FiUser, true], ['/account/orders', 'Orders & Tracking', FiPackage], ['/account/wishlist', 'Wishlist', FiHeart], ['/account/addresses', 'Saved Addresses', FiMapPin], ['/account/password', 'Password', FiLock]];

export function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="container-x py-10">
      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{user.full_name[0].toUpperCase()}</span>
              <div className="min-w-0"><p className="truncate font-semibold">{user.full_name}</p><p className="truncate text-xs text-ink-soft">{user.email}</p></div>
            </div>
            <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto lg:flex-col">
              {NAV.map(([to, label, Icon, end]) => (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-soft text-brand' : 'hover:bg-gray-50'}`}><Icon /> {label}</NavLink>
              ))}
              <button onClick={() => { logout(); navigate('/'); toast.success('Logged out'); }} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"><FiLogOut /> Log out</button>
            </nav>
          </div>
        </aside>
        <section className="min-w-0 lg:col-span-3"><Outlet /></section>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, updateUser } = useAuth();
  const notes = useFetch(() => userService.notifications(), []);
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { full_name: user.full_name, phone: user.phone || '' } });
  const onSubmit = async (d) => {
    try { updateUser(await userService.updateProfile(d)); toast.success('Profile updated'); } catch (e) { toast.error(errMsg(e)); }
  };
  const unread = notes.data?.filter((n) => !n.is_read).length || 0;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="mb-5 font-display text-2xl font-bold">Profile information</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div><label className="label" htmlFor="pn">Full name</label><input id="pn" className={`input ${errors.full_name ? 'input-error' : ''}`} {...register('full_name', { required: 'Full name is required', minLength: { value: 2, message: 'Too short' } })} /><FieldError error={errors.full_name} /></div>
          <div><label className="label" htmlFor="pe">Email</label><input id="pe" className="input bg-gray-50" value={user.email} disabled readOnly /></div>
          <div><label className="label" htmlFor="pp">Phone</label><input id="pp" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} {...register('phone', { pattern: { value: /^[+\d][\d\s-]{6,20}$/, message: 'Enter a valid phone number' } })} /><FieldError error={errors.phone} /></div>
          <div className="flex items-end"><button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting && <Spinner className="h-4 w-4" />} Save changes</button></div>
        </form>
      </div>
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl"><FiBell className="text-brand" /> Notifications {unread > 0 && <span className="badge bg-brand text-white">{unread} new</span>}</h2>
          {unread > 0 && <button className="text-xs font-semibold text-brand hover:underline" onClick={async () => { await userService.readNotifications(); notes.reload(); }}>Mark all read</button>}</div>
        {notes.data?.length ? <ul className="divide-y divide-gray-100">{notes.data.slice(0, 6).map((n) => <li key={n.id} className="flex justify-between gap-4 py-3 text-sm"><span><b className={n.is_read ? 'font-medium' : ''}>{n.title}</b><br /><span className="text-ink-soft">{n.body}</span></span><span className="shrink-0 text-xs text-ink-soft">{fmtDate(n.created_at)}</span></li>)}</ul> : <p className="text-sm text-ink-soft">No notifications yet.</p>}
      </div>
    </div>
  );
}

export function Orders() {
  const { data, loading, error, reload } = useFetch(() => orderService.mine(), []);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold">My Orders</h1>
      {!data.length
        ? <EmptyState icon={<FiPackage />} title="No orders yet" text="When you place an order it will show up here." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />
        : <div className="space-y-4">{data.map((o) => (
          <Link key={o.id} to={`/account/orders/${o.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-soft">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-soft"><SafeImage src={o.image} alt="" width={200} /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{o.order_number}</p><p className="text-xs text-ink-soft">{fmtDate(o.created_at)} · {o.item_count} item{o.item_count > 1 ? 's' : ''}</p></div>
            <div className="text-right"><p className="font-bold text-brand">{money(o.total)}</p><StatusBadge status={o.status} /></div>
          </Link>))}</div>}
    </div>
  );
}

function Tracker({ order }) {
  if (order.status === 'cancelled') return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">This order was cancelled.</p>;
  const idx = ORDER_STEPS.indexOf(order.status);
  return (
    <ol className="flex items-start" aria-label="Order progress">
      {ORDER_STEPS.map((s, i) => (
        <li key={s} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= idx ? 'bg-brand' : 'bg-gray-200'}`} />}
          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm ${i <= idx ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'}`}>{i < idx ? <FiCheck /> : i === idx && s === 'shipped' ? <FiTruck /> : i + 1}</span>
          <span className={`mt-2 text-[11px] font-semibold capitalize sm:text-xs ${i <= idx ? 'text-ink' : 'text-gray-400'}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch(() => orderService.one(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  if (error || !o) return <ErrorBox message={error || 'Order not found'} onRetry={reload} />;

  const cancel = async () => {
    setBusy(true);
    try { await orderService.cancel(o.id); toast.success('Order cancelled'); setConfirm(false); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const canPay = o.payment_method !== 'cod' && ['pending', 'failed'].includes(o.payment_status) && o.status !== 'cancelled';

  return (
    <div className="space-y-6">
      <Link to="/account/orders" className="text-sm font-semibold text-brand hover:underline">← All orders</Link>
      <div className="card p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="font-display text-2xl font-bold">Order {o.order_number}</h1><p className="text-sm text-ink-soft">Placed {fmtDateTime(o.created_at)}</p></div>
          <StatusBadge status={o.status} />
        </div>
        <Tracker order={o} />
        <div className="mt-6 flex flex-wrap gap-3">
          {canPay && <Link to={`/pay/${o.order_number}`} className="btn-primary btn-sm">Pay now</Link>}
          {o.status === 'pending' && <button className="btn-outline btn-sm" onClick={() => setConfirm(true)}><FiX /> Cancel order</button>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 font-display text-lg">Status history</h2>
          <ol className="space-y-4 border-l-2 border-brand-soft pl-5">
            {o.history.map((h, i) => (
              <li key={i} className="relative"><span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full bg-brand" /><p className="text-sm font-semibold capitalize">{h.status}</p><p className="text-xs text-ink-soft">{fmtDateTime(h.changed_at)}{h.note && ` · ${h.note}`}</p></li>
            ))}
          </ol>
        </div>
        <div className="card p-6 text-sm">
          <h2 className="mb-3 font-display text-lg">Delivery</h2>
          {o.gift && <>
            <p className="font-semibold">{o.gift.recipient_name}</p><p className="text-ink-soft">{o.gift.recipient_phone}</p><p className="text-ink-soft">{o.gift.recipient_address}</p>
            {o.gift.preferred_delivery_date && <p className="mt-2">Preferred date: <b>{fmtDate(o.gift.preferred_delivery_date)}</b></p>}
            {o.gift.delivery_instructions && <p className="mt-2 text-ink-soft">Note: {o.gift.delivery_instructions}</p>}
          </>}
          <p className="mt-4 text-ink-soft">Payment: {PAYMENT_LABELS[o.payment_method]} <StatusBadge status={o.payment_status} /></p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg">Items</h2>
        <ul className="divide-y divide-gray-100">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={i.product_image} alt="" width={150} /></span>
              <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{i.product_name}</span><br /><span className="text-ink-soft">{money(i.unit_price)} × {i.quantity}</span></span>
              <span className="font-semibold">{money(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
          {o.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd>-{money(o.discount_amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{o.delivery_fee ? money(o.delivery_fee) : 'Free'}</dd></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd className="text-brand">{money(o.total)}</dd></div>
        </dl>
      </div>
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} title="Cancel this order?" message="Your items will be released and any discount code returned. This can't be undone." confirmLabel="Yes, cancel order" danger busy={busy} onConfirm={cancel} />
    </div>
  );
}

export function WishlistTab() { return <Wishlist embedded />; }

function AddressForm({ initial, onSaved, onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial || { label: 'Home', country: 'Somalia', is_default: false } });
  const onSubmit = async (d) => {
    try {
      initial?.id ? await userService.updateAddress(initial.id, d) : await userService.addAddress(d);
      toast.success('Address saved'); onSaved();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const f = (name, label, rules, props = {}) => (
    <div className={props.full ? 'sm:col-span-2' : ''}><label className="label">{label}</label><input className={`input ${errors[name] ? 'input-error' : ''}`} {...props} {...register(name, rules)} /><FieldError error={errors[name]} /></div>
  );
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-6 sm:grid-cols-2" noValidate>
      {f('label', 'Label (Home, Work…)', { required: 'Give it a label' })}
      {f('full_name', 'Full name', { required: 'Name is required' })}
      {f('phone', 'Phone', { required: 'Phone is required', pattern: { value: /^[+\d][\d\s-]{6,20}$/, message: 'Enter a valid phone number' } }, { type: 'tel' })}
      {f('city', 'City', { required: 'City is required' })}
      {f('address_line', 'Address', { required: 'Address is required' }, { full: true })}
      {f('country', 'Country', { required: 'Country is required' })}
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" className="accent-brand" {...register('is_default')} /> Make default</label>
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Save address</button></div>
    </form>
  );
}

export function Addresses() {
  const { data, loading, error, reload } = useFetch(() => userService.addresses(), []);
  const [editing, setEditing] = useState(null); // null | {} (new) | address
  const [toDelete, setToDelete] = useState(null);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const remove = async () => { try { await userService.removeAddress(toDelete.id); toast.success('Address removed'); setToDelete(null); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div>
      <div className="mb-6 flex items-center justify-between"><h1 className="font-display text-3xl font-bold">Saved Addresses</h1><button className="btn-primary btn-sm" onClick={() => setEditing({})}>Add address</button></div>
      {!data.length ? <EmptyState icon={<FiMapPin />} title="No saved addresses" text="Save one to speed up checkout." />
        : <div className="grid gap-4 sm:grid-cols-2">{data.map((a) => (
          <div key={a.id} className="card p-5 text-sm">
            <div className="mb-2 flex items-center gap-2"><b>{a.label}</b>{a.is_default ? <span className="badge bg-brand-soft text-brand">Default</span> : null}</div>
            <p>{a.full_name} · {a.phone}</p><p className="text-ink-soft">{a.address_line}, {a.city}, {a.country}</p>
            <div className="mt-3 flex gap-4"><button className="font-semibold text-brand hover:underline" onClick={() => setEditing(a)}>Edit</button><button className="font-semibold text-red-500 hover:underline" onClick={() => setToDelete(a)}>Delete</button></div>
          </div>))}</div>}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit address' : 'New address'}>{editing && <AddressForm key={editing.id || 'new'} initial={editing.id ? { ...editing, is_default: !!editing.is_default } : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}</Modal>
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} message="Remove this address?" confirmLabel="Delete" danger onConfirm={remove} />
    </div>
  );
}

export function PasswordSettings() {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (d) => {
    try { await userService.changePassword({ current_password: d.current_password, new_password: d.new_password }); toast.success('Password changed'); reset(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="card max-w-lg p-6">
      <h1 className="mb-5 font-display text-2xl font-bold">Password settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div><label className="label">Current password</label><input type="password" autoComplete="current-password" className={`input ${errors.current_password ? 'input-error' : ''}`} {...register('current_password', { required: 'Enter your current password' })} /><FieldError error={errors.current_password} /></div>
        <div><label className="label">New password</label><input type="password" autoComplete="new-password" className={`input ${errors.new_password ? 'input-error' : ''}`} {...register('new_password', { required: 'Enter a new password', minLength: { value: 8, message: 'At least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} /><FieldError error={errors.new_password} /></div>
        <div><label className="label">Confirm new password</label><input type="password" autoComplete="new-password" className={`input ${errors.confirm ? 'input-error' : ''}`} {...register('confirm', { validate: (v) => v === watch('new_password') || 'Passwords do not match' })} /><FieldError error={errors.confirm} /></div>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Change password</button>
      </form>
    </div>
  );
}
