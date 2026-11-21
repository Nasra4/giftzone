import { Link } from 'react-router-dom';

export default function Logo({ light = false, to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="GiftZone home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-soft">
        <svg viewBox="0 0 64 64" className="h-6 w-6"><rect x="14" y="26" width="36" height="24" rx="3" fill="#fff" /><rect x="11" y="20" width="42" height="9" rx="3" fill="#FFF8F6" /><rect x="29" y="20" width="6" height="30" fill="#E9B872" /><path d="M32 20c-6-9-14-4-9 0h9zm0 0c6-9 14-4 9 0h-9z" fill="#E9B872" /></svg>
      </span>
      <span className={`font-display text-2xl font-bold ${light ? 'text-white' : 'text-ink'}`}>Gift<span className="text-brand">Zone</span></span>
    </Link>
  );
}
