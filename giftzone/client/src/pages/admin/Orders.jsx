import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';
import { adminService, orderService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { PageHeader, Table } from '../../components/admin';
import { ConfirmModal, ErrorBox, Modal, PageLoader, Pagination, Spinner, StatusBadge } from '../../components/ui';
import SafeImage from '../../components/SafeImage';
import { money, fmtDate, fmtDateTime, PAYMENT_LABELS, WRAP_STYLES } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderDetail({ id, onChanged }) {
  const { data: o, loading, error, reload } = useFetch(() => orderService.one(id), [id]);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelAsk, setCancelAsk] = useState(false);

  if (loading && !o) return <div className="p-10"><PageLoader /></div>;
  if (error || !o) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={reload} /></div>;

  const closed = ['delivered', 'cancelled'].includes(o.status);
  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); setNote(''); setStatus(''); await reload(); onChanged(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs text-ink-soft">Placed {fmtDateTime(o.created_at)}</p><p className="font-display text-xl font-bold">{o.order_number}</p></div>
        <div className="flex gap-2"><StatusBadge status={o.status} /><StatusBadge status={o.payment_status} /></div>
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-4"><p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-soft">Customer</p><p className="font-semibold">{o.customer_name}</p><p>{o.customer_email}</p><p>{o.customer_phone}</p><p className="text-ink-soft">{o.customer_address}, {o.customer_city}, {o.customer_country}</p></div>
        <div className="rounded-xl bg-gray-50 p-4"><p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-soft">Deliver to</p>
          {o.gift ? <><p className="font-semibold">{o.gift.recipient_name}</p><p>{o.gift.recipient_phone}</p><p className="text-ink-soft">{o.gift.recipient_address}</p>
            {o.gift.preferred_delivery_date && <p className="mt-1">Date: <b>{fmtDate(o.gift.preferred_delivery_date)}</b></p>}
            {o.gift.delivery_instructions && <p className="mt-1 text-ink-soft">Note: {o.gift.delivery_instructions}</p>}</> : '-'}</div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Items & personalisation</p>
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {o.items.map((i) => {
            const g = i.gift;
            const style = WRAP_STYLES.find((w) => w.id === g?.wrap_style);
            return (
              <li key={i.id} className="flex items-start gap-3 p-3 text-sm">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={i.product_image} alt="" width={120} /></span>
                <span className="min-w-0 flex-1"><b>{i.product_name}</b> × {i.quantity}
                  {g?.recipient_name && <span className="block text-xs text-ink-soft">For {g.recipient_name}{g.preferred_delivery_date ? ` · deliver ${fmtDate(g.preferred_delivery_date)}` : ''}</span>}
                  {g?.message && <span className="mt-1 block rounded-lg bg-brand-soft px-2 py-1 text-xs">💌 “{g.message}”</span>}
                  {g?.gift_wrap ? <span className="block text-xs text-ink-soft">🎁 Wrap: {style?.label || g.wrap_style}</span> : null}
                </span>
                <b>{money(i.line_total)}</b>
              </li>
            );
          })}
        </ul>
        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
          {o.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd>-{money(o.discount_amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{money(o.delivery_fee)}</dd></div>
          <div className="flex justify-between border-t pt-1 font-bold"><dt>Total ({PAYMENT_LABELS[o.payment_method]})</dt><dd className="text-brand">{money(o.total)}</dd></div>
        </dl>
      </div>

      {!closed && (
        <div className="rounded-xl border border-brand-light/60 p-4">
          <p className="mb-3 text-sm font-semibold">Update order</p>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="New status"><option value="">Change status…</option>{STATUSES.filter((s) => s !== o.status && s !== 'cancelled').map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</select>
            <input className="input min-w-[10rem] flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
            <button className="btn-primary btn-sm" disabled={!status || busy} onClick={() => run(() => adminService.setOrderStatus(o.id, status, note), 'Status updated')}>{busy && <Spinner className="h-4 w-4" />} Update</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.payment_status !== 'paid' && <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => adminService.confirmPayment(o.id), 'Payment confirmed')}>Confirm payment received</button>}
            <button className="btn btn-sm border-2 border-red-300 text-red-500 hover:bg-red-50" disabled={busy} onClick={() => setCancelAsk(true)}>Cancel order</button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Status history</p>
        <ol className="space-y-2 text-sm">{o.history.map((h, i) => <li key={i} className="flex gap-3"><StatusBadge status={h.status} /><span className="text-ink-soft">{fmtDateTime(h.changed_at)}{h.note && ` · ${h.note}`}</span></li>)}</ol>
      </div>
      <ConfirmModal open={cancelAsk} onClose={() => setCancelAsk(false)} title="Cancel this order?" message="Stock will be returned and the customer will be notified." confirmLabel="Cancel order" danger busy={busy} onConfirm={() => run(() => adminService.setOrderStatus(o.id, 'cancelled', 'Cancelled by admin'), 'Order cancelled').then(() => setCancelAsk(false))} />
    </div>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(params.get('open') ? Number(params.get('open')) : null);
  const list = useFetch(() => adminService.orders({ q: dq, status, payment_status: payment, page }), [dq, status, payment, page]);
  useEffect(() => setPage(1), [dq, status, payment]);

  const close = () => { setOpenId(null); if (params.get('open')) { params.delete('open'); setParams(params, { replace: true }); } };

  return (
    <>
      <PageHeader title="Orders" subtitle="Review, confirm and fulfil customer orders" />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-sm"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name or email…" aria-label="Search orders" className="input rounded-full pl-11" /></div>
        <select className="input w-auto rounded-full" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="input w-auto rounded-full" value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Filter by payment"><option value="">All payments</option>{['pending', 'paid', 'failed', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <>
          <Table head={['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date']} empty={list.data.items.length ? null : 'No orders match.'}>
            {list.data.items.map((o) => (
              <tr key={o.id} className="cursor-pointer transition hover:bg-brand-soft/40" onClick={() => setOpenId(o.id)}>
                <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                <td className="px-4 py-3">{o.customer_name}<br /><span className="text-xs text-ink-soft">{o.customer_email}</span></td>
                <td className="px-4 py-3">{o.item_count}</td>
                <td className="px-4 py-3 font-medium">{money(o.total)}</td>
                <td className="px-4 py-3"><span className="text-xs">{PAYMENT_LABELS[o.payment_method]}</span><br /><StatusBadge status={o.payment_status} /></td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-ink-soft">{fmtDate(o.created_at)}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={list.data.page} pages={list.data.pages} onChange={setPage} />
        </>
      )}
      <Modal open={!!openId} onClose={close} title="Order details" wide>{openId && <OrderDetail id={openId} onChanged={list.reload} />}</Modal>
    </>
  );
}
