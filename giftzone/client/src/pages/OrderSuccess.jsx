import { Link, useParams } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import { orderService } from '../services';
import useFetch from '../hooks/useFetch';
import { ErrorBox, PageLoader, StatusBadge } from '../components/ui';
import { money, fmtDate, PAYMENT_LABELS } from '../utils/format';

export default function OrderSuccess() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch(() => orderService.one(id), [id]);
  if (loading) return <PageLoader />;
  if (error || !o) return <ErrorBox message={error || 'Order not found'} onRetry={reload} />;
  return (
    <div className="container-x py-14">
      <div className="card mx-auto max-w-xl p-8 text-center">
        <FiCheckCircle className="mx-auto text-6xl text-emerald-500" />
        <h1 className="mt-4 font-display text-3xl font-bold">Thank you, your order is in!</h1>
        <p className="mt-2 text-ink-soft">We've sent a confirmation to {o.customer_email}.</p>
        <dl className="mt-6 space-y-2 rounded-2xl bg-cream p-5 text-left text-sm">
          <div className="flex justify-between"><dt>Order number</dt><dd className="font-bold">{o.order_number}</dd></div>
          <div className="flex justify-between"><dt>Total</dt><dd className="font-bold text-brand">{money(o.total)}</dd></div>
          <div className="flex justify-between"><dt>Payment</dt><dd>{PAYMENT_LABELS[o.payment_method]} <StatusBadge status={o.payment_status} /></dd></div>
          <div className="flex justify-between"><dt>Status</dt><dd><StatusBadge status={o.status} /></dd></div>
          {o.gift?.preferred_delivery_date && <div className="flex justify-between"><dt>Delivery date</dt><dd>{fmtDate(o.gift.preferred_delivery_date)}</dd></div>}
        </dl>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/account/orders/${o.id}`} className="btn-primary">Track my order</Link>
          <Link to="/shop" className="btn-outline">Keep shopping</Link>
        </div>
      </div>
    </div>
  );
}
