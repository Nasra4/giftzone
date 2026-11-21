import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';
import { adminService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { PageHeader, Table } from '../../components/admin';
import { ConfirmModal, ErrorBox, Modal, PageLoader, StatusBadge } from '../../components/ui';
import { money, fmtDate } from '../../utils/format';

function CustomerDetail({ id, onChanged }) {
  const { data: c, loading, error, reload } = useFetch(() => adminService.customer(id), [id]);
  const [ask, setAsk] = useState(false);
  if (loading && !c) return <div className="p-10"><PageLoader /></div>;
  if (error || !c) return <div className="p-6"><ErrorBox message={error || 'Not found'} onRetry={reload} /></div>;
  const next = c.status === 'active' ? 'blocked' : 'active';
  const toggle = async () => {
    try { await adminService.setCustomerStatus(c.id, next); toast.success(next === 'blocked' ? 'Account blocked' : 'Account reactivated'); setAsk(false); reload(); onChanged(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-display text-xl font-bold">{c.full_name}</p><p className="text-sm text-ink-soft">{c.email}{c.phone && ` · ${c.phone}`}</p><p className="text-xs text-ink-soft">Joined {fmtDate(c.created_at)}</p></div>
        <div className="flex items-center gap-3"><span className={`badge ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{c.status}</span>
          <button className={`btn btn-sm ${c.status === 'active' ? 'border-2 border-red-300 text-red-500 hover:bg-red-50' : 'btn-primary'}`} onClick={() => setAsk(true)}>{c.status === 'active' ? 'Block account' : 'Reactivate'}</button></div>
      </div>
      {c.addresses.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Saved addresses</p><ul className="space-y-1 text-sm">{c.addresses.map((a) => <li key={a.id}><b>{a.label}:</b> {a.address_line}, {a.city}, {a.country}</li>)}</ul></div>}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Order history ({c.orders.length})</p>
        {c.orders.length === 0 ? <p className="text-sm text-ink-soft">No orders yet.</p> : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">{c.orders.map((o) => <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="font-semibold">{o.order_number}</span><span className="text-ink-soft">{fmtDate(o.created_at)}</span><span>{money(o.total)}</span><StatusBadge status={o.status} /></li>)}</ul>
        )}
      </div>
      <ConfirmModal open={ask} onClose={() => setAsk(false)} title={next === 'blocked' ? 'Block this customer?' : 'Reactivate this customer?'} message={next === 'blocked' ? 'They will be signed out and unable to log in or order until reactivated.' : 'They will be able to log in and order again.'} confirmLabel={next === 'blocked' ? 'Block' : 'Reactivate'} danger={next === 'blocked'} onConfirm={toggle} />
    </div>
  );
}

export default function Customers() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [openId, setOpenId] = useState(null);
  const list = useFetch(() => adminService.customers(dq), [dq]);
  return (
    <>
      <PageHeader title="Customers" subtitle="Profiles, order history and account access" />
      <div className="relative mb-4 max-w-sm"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" aria-label="Search customers" className="input rounded-full pl-11" /></div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <Table head={['Customer', 'Phone', 'Orders', 'Total spent', 'Joined', 'Status']} empty={list.data.length ? null : 'No customers found.'}>
          {list.data.map((c) => (
            <tr key={c.id} className="cursor-pointer transition hover:bg-brand-soft/40" onClick={() => setOpenId(c.id)}>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">{c.full_name[0]}</span><span><b className="block">{c.full_name}</b><span className="text-xs text-ink-soft">{c.email}</span></span></div></td>
              <td className="px-4 py-3 text-ink-soft">{c.phone || '-'}</td><td className="px-4 py-3">{c.order_count}</td><td className="px-4 py-3 font-medium">{money(c.total_spent)}</td><td className="px-4 py-3 text-ink-soft">{fmtDate(c.created_at)}</td>
              <td className="px-4 py-3"><span className={`badge ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{c.status}</span></td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Customer profile" wide>{openId && <CustomerDetail id={openId} onChanged={list.reload} />}</Modal>
    </>
  );
}
