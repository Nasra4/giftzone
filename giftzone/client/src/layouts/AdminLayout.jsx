import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { FiGrid, FiBox, FiTag, FiShoppingBag, FiUsers, FiPercent, FiStar, FiSettings, FiMenu, FiX, FiLogOut, FiExternalLink, FiLayers, FiMail } from 'react-icons/fi';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  ['/admin', 'Dashboard', FiGrid, true], ['/admin/products', 'Products', FiBox], ['/admin/categories', 'Categories', FiLayers],
  ['/admin/orders', 'Orders', FiShoppingBag], ['/admin/customers', 'Customers', FiUsers], ['/admin/coupons', 'Coupons', FiPercent],
  ['/admin/reviews', 'Reviews', FiStar], ['/admin/messages', 'Messages', FiMail], ['/admin/settings', 'Settings', FiSettings],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {LINKS.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand text-white shadow-soft' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon className="text-lg" /> {label}</NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"><FiExternalLink /> View store</Link>
        <button onClick={() => { logout(); navigate('/login'); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"><FiLogOut /> Log out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink lg:flex">
        <div className="border-b border-white/10 p-5"><Logo light to="/admin" /><p className="mt-1 pl-11 text-[10px] uppercase tracking-widest text-white/50">Admin</p></div>
        {nav}
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 p-5"><Logo light to="/admin" /><button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white"><FiX /></button></div>
        {nav}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-8">
          <button className="rounded-full p-2 hover:bg-gray-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><FiMenu className="text-xl" /></button>
          <p className="ml-auto text-sm text-ink-soft">Signed in as <b className="text-ink">{user.full_name}</b></p>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}