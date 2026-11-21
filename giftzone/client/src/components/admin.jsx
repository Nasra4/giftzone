import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
Chart.defaults.font.family = '"DM Sans", system-ui, sans-serif';
Chart.defaults.color = '#6B6B6B';

// Thin wrapper: creates the chart once per config change and destroys it on unmount (no leaks).
export function ChartCanvas({ config, height = 280 }) {
  const ref = useRef(null);
  useEffect(() => {
    const chart = new Chart(ref.current, { ...config, options: { responsive: true, maintainAspectRatio: false, ...config.options } });
    return () => chart.destroy();
  }, [config]);
  return <div style={{ height }}><canvas ref={ref} role="img" aria-label="Chart" /></div>;
}

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="font-display text-3xl font-bold">{title}</h1>{subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}</div>
    {action}
  </div>
);

export const StatCard = ({ icon: Icon, label, value, tone = 'brand' }) => {
  const tones = { brand: 'bg-brand-soft text-brand', gold: 'bg-amber-100 text-amber-600', green: 'bg-emerald-100 text-emerald-600', blue: 'bg-sky-100 text-sky-600', violet: 'bg-violet-100 text-violet-600', red: 'bg-red-100 text-red-500' };
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${tones[tone]}`}><Icon /></span>
      <div className="min-w-0"><p className="truncate text-2xl font-bold">{value}</p><p className="text-xs text-ink-soft">{label}</p></div>
    </div>
  );
};

export const Table = ({ head, children, empty }) => (
  <div className="card overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wider text-ink-soft"><tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    </table>
    {empty && <p className="p-8 text-center text-sm text-ink-soft">{empty}</p>}
  </div>
);
