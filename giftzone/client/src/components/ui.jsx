import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiMinus, FiPlus, FiChevronLeft, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { STATUS_STYLES } from '../utils/format';

export const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" role="status" aria-label="Loading">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-brand"><Spinner className="h-9 w-9" /></div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="mx-auto my-10 max-w-md rounded-2xl bg-red-50 p-6 text-center text-red-600">
    <FiAlertCircle className="mx-auto mb-2 text-3xl" />
    <p className="text-sm">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn-outline btn-sm mt-4">Try again</button>}
  </div>
);

export const EmptyState = ({ icon, title, text, action }) => (
  <div className="mx-auto max-w-md py-16 text-center">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">{icon}</div>
    <h3 className="font-display text-2xl">{title}</h3>
    {text && <p className="mt-2 text-sm text-ink-soft">{text}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge capitalize ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>{String(status).replace('_', ' ')}</span>
);

export function QuantitySelector({ value, onChange, max = 20, size = 'md' }) {
  const pad = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white">
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)} className={`${pad} flex items-center justify-center rounded-full transition hover:bg-brand-soft disabled:opacity-30`}><FiMinus /></button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={`${pad} flex items-center justify-center rounded-full transition hover:bg-brand-soft disabled:opacity-30`}><FiPlus /></button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                <h3 className="font-display text-xl">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-gray-100"><FiX /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmModal({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-sm text-ink-soft">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'bg-red-500 text-white hover:bg-red-600' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
            {busy && <Spinner className="h-4 w-4" />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i += 1) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
  const withGaps = nums.reduce((acc, n, i) => { if (i && n - nums[i - 1] > 1) acc.push('…'); acc.push(n); return acc; }, []);
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-brand-soft disabled:opacity-30" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><FiChevronLeft /></button>
      {withGaps.map((n, i) => n === '…'
        ? <span key={`g${i}`} className="px-1 text-ink-soft">…</span>
        : <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} className={`h-10 w-10 rounded-full text-sm font-semibold transition ${n === page ? 'bg-brand text-white shadow-soft' : 'hover:bg-brand-soft'}`}>{n}</button>)}
      <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-brand-soft disabled:opacity-30" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><FiChevronRight /></button>
    </nav>
  );
}

export const SectionHeading = ({ eyebrow, title, subtitle, action }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-2 max-w-xl text-ink-soft">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const FieldError = ({ error }) => (error ? <p className="field-error" role="alert">{error.message}</p> : null);
