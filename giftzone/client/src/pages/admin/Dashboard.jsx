import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiClock, FiCheckCircle } from 'react-icons/fi';
import { adminService } from '../../services';
import useFetch from '../../hooks/useFetch';
import { ChartCanvas, PageHeader, StatCard, Table } from '../../components/admin';
import { ErrorBox, PageLoader, StatusBadge } from '../../components/ui';
import SafeImage from '../../components/SafeImage';
import { money, fmtDate } from '../../utils/format';

const BRAND = '#E76F8A';
const GOLD = '#E9B872';
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' });

export default function Dashboard() {
  const dash = useFetch(() => adminService.dashboard(), []);
  const analytics = useFetch(() => adminService.analytics(12), []);

  const revenueCfg = useMemo(() => analytics.data && ({
    type: 'line',
    data: { labels: analytics.data.monthly.map((m) => monthLabel(m.month)), datasets: [{ label: 'Revenue received ($)', data: analytics.data.monthly.map((m) => m.revenue), borderColor: BRAND, backgroundColor: 'rgba(231,111,138,.15)', fill: true, tension: 0.35, pointRadius: 3 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f1f1' } }, x: { grid: { display: false } } } },
  }), [analytics.data]);

  const salesCfg = useMemo(() => analytics.data && ({
    type: 'bar',
    data: { labels: analytics.data.monthly.map((m) => monthLabel(m.month)), datasets: [{ label: 'Orders', data: analytics.data.monthly.map((m) => m.orders), backgroundColor: GOLD, borderRadius: 8 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f1f1' } }, x: { grid: { display: false } } } },
  }), [analytics.data]);

  const statusCfg = useMemo(() => analytics.data && ({
    type: 'doughnut',
    data: { labels: analytics.data.by_status.map((s) => s.status), datasets: [{ data: analytics.data.by_status.map((s) => s.count), backgroundColor: ['#F5B942', '#5BB4E5', '#7C83E8', '#A77BE0', '#4CC38A', '#EF6B6B'], borderWidth: 0 }] },
    options: { cutout: '65%', plugins: { legend: { position: 'bottom' } } },
  }), [analytics.data]);

  if (dash.loading) return <PageLoader />;
  if (dash.error) return <ErrorBox message={dash.error} onRetry={dash.reload} />;
  const { stats, recent_orders, best_sellers, latest_customers, low_stock } = dash.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="How GiftZone is doing" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={FiDollarSign} label="Total revenue (paid orders)" value={money(stats.total_revenue)} />
        <StatCard icon={FiShoppingBag} label="Total orders" value={stats.total_orders} tone="blue" />
        <StatCard icon={FiBox} label="Total products" value={stats.total_products} tone="gold" />
        <StatCard icon={FiUsers} label="Total customers" value={stats.total_customers} tone="violet" />
        <StatCard icon={FiClock} label="Pending orders" value={stats.pending_orders} tone="red" />
        <StatCard icon={FiCheckCircle} label="Delivered orders" value={stats.delivered_orders} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><h2 className="mb-4 font-display text-lg">Revenue analytics (12 months)</h2>{revenueCfg ? <ChartCanvas config={revenueCfg} /> : <div className="skeleton h-64" />}</div>
        <div className="card p-5"><h2 className="mb-4 font-display text-lg">Orders by status</h2>{statusCfg ? <ChartCanvas config={statusCfg} /> : <div className="skeleton h-64" />}</div>
        <div className="card p-5 lg:col-span-3"><h2 className="mb-4 font-display text-lg">Monthly sales (orders)</h2>{salesCfg ? <ChartCanvas config={salesCfg} height={240} /> : <div className="skeleton h-56" />}</div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-brand hover:underline">View all</Link></div>
          <Table head={['Order', 'Customer', 'Total', 'Status', 'Date']} empty={recent_orders.length ? null : 'No orders yet.'}>
            {recent_orders.map((o) => (
              <tr key={o.id}><td className="px-4 py-3 font-semibold"><Link className="hover:text-brand" to={`/admin/orders?open=${o.id}`}>{o.order_number}</Link></td><td className="px-4 py-3">{o.customer_name}</td><td className="px-4 py-3">{money(o.total)}</td><td className="px-4 py-3"><StatusBadge status={o.status} /></td><td className="px-4 py-3 text-ink-soft">{fmtDate(o.created_at)}</td></tr>
            ))}
          </Table>
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-display text-lg">Best-selling products</h2>
            {best_sellers.length === 0 && <p className="text-sm text-ink-soft">No sales yet.</p>}
            <ul className="space-y-3">{best_sellers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm"><span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={p.image} alt="" width={120} /></span><span className="min-w-0 flex-1 truncate font-medium">{p.name}</span><span className="badge bg-brand-soft text-brand">{p.sold_count} sold</span></li>
            ))}</ul>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-display text-lg">Latest customers</h2>
            {latest_customers.length === 0 && <p className="text-sm text-ink-soft">No customers yet.</p>}
            <ul className="space-y-3">{latest_customers.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">{c.full_name[0]}</span><span className="min-w-0 flex-1"><b className="block truncate">{c.full_name}</b><span className="block truncate text-xs text-ink-soft">{c.email}</span></span><span className="text-xs text-ink-soft">{fmtDate(c.created_at)}</span></li>
            ))}</ul>
          </div>
          {low_stock.length > 0 && (
            <div className="card border border-amber-200 bg-amber-50 p-5"><h2 className="mb-2 font-display text-lg">Low stock</h2>
              <ul className="space-y-1 text-sm">{low_stock.map((p) => <li key={p.id} className="flex justify-between"><span className="truncate">{p.name}</span><b className={p.stock === 0 ? 'text-red-500' : 'text-amber-600'}>{p.stock} left</b></li>)}</ul></div>
          )}
        </div>
      </div>
    </>
  );
}
