import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShield } from 'react-icons/fi';
import { orderService } from '../services';
import { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { ErrorBox, PageLoader, Spinner } from '../components/ui';
import { money, PAYMENT_LABELS } from '../utils/format';

// Development stand-in for the payment provider's hosted page. Only works while the server runs in PAYMENT_MODE=sandbox.
export default function SandboxPay() {
  const { number } = useParams();
  const navigate = useNavigate();
  const { data: info, loading, error } = useFetch(() => orderService.sandboxInfo(number), [number]);
  const [busy, setBusy] = useState(null);

  if (loading) return <PageLoader />;
  if (error || !info) return <ErrorBox message={error || 'Order not found'} />;

  const finish = async (success) => {
    setBusy(success ? 'ok' : 'fail');
    try {
      await orderService.sandboxComplete(number, success);
      if (success) { toast.success('Payment received'); navigate(`/order-success/${info.id}`, { replace: true }); }
      else { toast.error('Payment failed. You can retry from your order page.'); navigate(`/account/orders/${info.id}`, { replace: true }); }
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  const already = info.payment_status !== 'pending';

  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600"><FiShield /></span>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-600">Sandbox payment · no real money</p>
        <h1 className="mt-2 font-display text-2xl">{PAYMENT_LABELS[info.payment_method]}</h1>
        <p className="mt-1 text-sm text-ink-soft">Order {info.order_number}</p>
        <p className="my-5 text-4xl font-bold text-brand">{money(info.total)}</p>
        {!info.sandbox && <p className="text-sm text-red-500">Sandbox payments are disabled on this server.</p>}
        {info.sandbox && already && <><p className="text-sm text-ink-soft">This payment is already <b>{info.payment_status}</b>.</p><Link to={`/account/orders/${info.id}`} className="btn-primary mt-5">View order</Link></>}
        {info.sandbox && !already && (
          <div className="space-y-3">
            <button className="btn-primary w-full" disabled={!!busy} onClick={() => finish(true)}>{busy === 'ok' && <Spinner className="h-4 w-4" />} Simulate successful payment</button>
            <button className="btn-outline w-full" disabled={!!busy} onClick={() => finish(false)}>Simulate failed payment</button>
            <Link to={`/account/orders/${info.id}`} className="block pt-2 text-sm text-ink-soft hover:text-brand">Pay later from my orders</Link>
          </div>
        )}
      </div>
    </div>
  );
}
