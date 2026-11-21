import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';
import { adminService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { PageHeader, Table } from '../../components/admin';
import { ConfirmModal, ErrorBox, FieldError, Modal, PageLoader, Spinner } from '../../components/ui';
import Rating from '../../components/Rating';
import { fmtDate } from '../../utils/format';

function CouponForm({ coupon, onSaved, onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { code: coupon?.code || '', discount_percent: coupon?.discount_percent || 10, expires_at: coupon?.expires_at || '', max_uses: coupon?.max_uses || '', is_active: coupon ? !!coupon.is_active : true },
  });
  const onSubmit = async (d) => {
    const body = { ...d, expires_at: d.expires_at || null, max_uses: d.max_uses ? Number(d.max_uses) : null, discount_percent: Number(d.discount_percent) };
    try { coupon ? await adminService.updateCoupon(coupon.id, body) : await adminService.createCoupon(body); toast.success('Coupon saved'); onSaved(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-6 sm:grid-cols-2" noValidate>
      <div><label className="label">Code</label><input className={`input uppercase ${errors.code ? 'input-error' : ''}`} {...register('code', { required: 'Code is required', pattern: { value: /^[A-Za-z0-9_-]{3,40}$/, message: '3-40 letters, numbers, - or _' } })} /><FieldError error={errors.code} /></div>
      <div><label className="label">Discount (%)</label><input type="number" className={`input ${errors.discount_percent ? 'input-error' : ''}`} {...register('discount_percent', { required: 'Required', min: { value: 1, message: 'Min 1%' }, max: { value: 90, message: 'Max 90%' } })} /><FieldError error={errors.discount_percent} /></div>
      <div><label className="label">Expires on</label><input type="date" className="input" {...register('expires_at')} /></div>
      <div><label className="label">Max uses (optional)</label><input type="number" min="1" className="input" {...register('max_uses')} /></div>
      <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-brand" {...register('is_active')} /> Active</label>
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Save coupon</button></div>
    </form>
  );
}

export function Coupons() {
  const { data, loading, error, reload } = useFetch(() => adminService.coupons(), []);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const expired = (c) => c.expires_at && new Date(`${c.expires_at}T23:59:59`) < new Date();
  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes customers can apply in their cart" action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}><FiPlus /> New coupon</button>} />
      <Table head={['Code', 'Discount', 'Expires', 'Used', 'Status', '']} empty={data.length ? null : 'No coupons yet.'}>
        {data.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-mono font-bold">{c.code}</td><td className="px-4 py-3">{c.discount_percent}%</td>
            <td className="px-4 py-3">{c.expires_at ? <span className={expired(c) ? 'text-red-500' : ''}>{fmtDate(c.expires_at)}{expired(c) && ' (expired)'}</span> : 'Never'}</td>
            <td className="px-4 py-3">{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
            <td className="px-4 py-3"><button role="switch" aria-checked={!!c.is_active} aria-label={`${c.code} active`} onClick={() => act(() => adminService.toggleCoupon(c.id), c.is_active ? 'Coupon deactivated' : 'Coupon activated')} className={`relative h-6 w-11 rounded-full transition ${c.is_active ? 'bg-brand' : 'bg-gray-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.is_active ? 'left-[22px]' : 'left-0.5'}`} /></button></td>
            <td className="px-4 py-3 text-right"><button aria-label={`Edit ${c.code}`} className="rounded-full p-2 hover:bg-brand-soft hover:text-brand" onClick={() => setEditing(c)}><FiEdit2 /></button><button aria-label={`Delete ${c.code}`} className="rounded-full p-2 hover:bg-red-50 hover:text-red-500" onClick={() => setToDelete(c)}><FiTrash2 /></button></td>
          </tr>
        ))}
      </Table>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New coupon' : 'Edit coupon'}>{editing && <CouponForm key={editing.id || 'new'} coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}</Modal>
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} message={`Delete coupon ${toDelete?.code}?`} confirmLabel="Delete" danger onConfirm={() => act(() => adminService.removeCoupon(toDelete.id), 'Coupon deleted').then(() => setToDelete(null))} />
    </>
  );
}

export function Reviews() {
  const [filter, setFilter] = useState('pending');
  const { data, loading, error, reload } = useFetch(() => adminService.reviews(filter), [filter]);
  const [toDelete, setToDelete] = useState(null);
  const act = async (fn, msg) => { try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <>
      <PageHeader title="Reviews" subtitle="Approve genuine feedback and remove anything inappropriate" />
      <div className="mb-4 flex gap-2">{[['pending', 'Pending'], ['approved', 'Approved'], ['', 'All']].map(([v, l]) => <button key={l} onClick={() => setFilter(v)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === v ? 'bg-brand text-white' : 'bg-white hover:bg-brand-soft'}`}>{l}</button>)}</div>
      {loading ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="space-y-3">
          {data.length === 0 && <p className="card p-8 text-center text-sm text-ink-soft">No reviews here.</p>}
          {data.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><b>{r.author}</b><Rating value={r.rating} showCount={false} /><span className="text-xs text-ink-soft">on {r.product_name} · {fmtDate(r.created_at)}</span></div>
                <p className="mt-2 text-sm text-ink-soft">{r.comment || <i>No comment</i>}</p></div>
              <div className="flex gap-2">{!r.is_approved && <button className="btn-primary btn-sm" onClick={() => act(() => adminService.approveReview(r.id), 'Review approved')}><FiCheck /> Approve</button>}<button className="btn btn-sm border-2 border-red-300 text-red-500 hover:bg-red-50" onClick={() => setToDelete(r)}><FiTrash2 /> Remove</button></div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} message="Remove this review permanently?" confirmLabel="Remove" danger onConfirm={() => act(() => adminService.removeReview(toDelete.id), 'Review removed').then(() => setToDelete(null))} />
    </>
  );
}
