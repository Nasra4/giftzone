import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiHeart, FiShoppingBag, FiUser, FiMenu, FiX, FiChevronDown, FiLogOut, FiPackage, FiGrid, FiX as FiClear } from 'react-icons/fi';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useSettings } from '../context/SettingsContext';
import { categoryService } from '../services';
import useFetch from '../hooks/useFetch';

export function AnnouncementBar() {
  const { announcement_text: text } = useSettings();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('gz_ann') === text);
  if (!text || hidden) return null;
  return (
    <div className="relative bg-ink px-10 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span className="text-gold">✦</span> {text} <span className="text-gold">✦</span>
      <button aria-label="Dismiss announcement" onClick={() => { sessionStorage.setItem('gz_ann', text); setHidden(true); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/20"><FiClear /></button>
    </div>
  );
}

const iconBtn = 'relative flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-brand-soft hover:text-brand';
const Count = ({ n }) => (n > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{n > 99 ? '99+' : n}</span> : null);

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { count: cartCount } = useCart();
  const wishlist = useWishlist();
  const { data: categories } = useFetch(() => categoryService.list(), []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const catRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); setCatOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const close = (e) => {
      if (!catRef.current?.contains(e.target)) setCatOpen(false);
      if (!userRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { document.body.style.overflow = mobileOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mobileOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/shop?q=${encodeURIComponent(term)}`);
  };

  const linkCls = ({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition hover:text-brand ${isActive ? 'text-brand' : ''}`;

  return (
    <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-shadow ${scrolled ? 'shadow-card' : ''}`}>
      <div className="container-x flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
        <button className={`${iconBtn} lg:hidden`} onClick={() => setMobileOpen(true)} aria-label="Open menu"><FiMenu /></button>
        <Logo />

        <nav className="ml-4 hidden items-center lg:flex">
          <NavLink to="/" end className={linkCls}>Home</NavLink>
          <NavLink to="/shop" className={linkCls}>Shop</NavLink>
          <div className="relative" ref={catRef}>
            <button onClick={() => setCatOpen((o) => !o)} aria-expanded={catOpen} className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition hover:text-brand">
              Categories <FiChevronDown className={`transition ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute left-0 top-full z-50 mt-2 w-[34rem] rounded-2xl bg-white p-4 shadow-soft">
                  <div className="grid grid-cols-2 gap-1">
                    {(categories || []).map((c) => (
                      <Link key={c.id} to={`/category/${c.slug}`} className="rounded-xl px-3 py-2 text-sm transition hover:bg-brand-soft hover:text-brand">{c.name}</Link>
                    ))}
                  </div>
                  <Link to="/categories" className="mt-2 block rounded-xl bg-brand-soft px-3 py-2 text-center text-sm font-semibold text-brand">Browse all categories</Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <NavLink to="/about" className={linkCls}>About</NavLink>
          <NavLink to="/contact" className={linkCls}>Contact</NavLink>
        </nav>

        <form onSubmit={submitSearch} role="search" className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search gifts" placeholder="Search gifts…" className="w-full rounded-full border border-gray-200 bg-cream py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20" />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link to="/wishlist" className={`${iconBtn} hidden sm:flex`} aria-label={`Wishlist, ${wishlist.count} items`}><FiHeart /><Count n={wishlist.count} /></Link>
          <Link to="/cart" className={iconBtn} aria-label={`Cart, ${cartCount} items`}><FiShoppingBag /><Count n={cartCount} /></Link>

          {user ? (
            <div className="relative" ref={userRef}>
              <button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} className="ml-1 flex items-center gap-2 rounded-full bg-brand-soft py-1 pl-1 pr-3 text-sm font-semibold transition hover:bg-brand/20">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">{user.full_name?.[0]?.toUpperCase()}</span>
                <span className="hidden max-w-[6rem] truncate sm:block">{user.full_name.split(' ')[0]}</span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl bg-white p-2 shadow-soft">
                    <p className="truncate px-3 py-2 text-xs text-ink-soft">{user.email}</p>
                    {isAdmin
                      ? <Link to="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-brand-soft"><FiGrid /> Admin dashboard</Link>
                      : <>
                        <Link to="/account" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-brand-soft"><FiUser /> My account</Link>
                        <Link to="/account/orders" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-brand-soft"><FiPackage /> My orders</Link>
                        <Link to="/wishlist" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-brand-soft"><FiHeart /> Wishlist</Link>
                      </>}
                    <button onClick={() => { logout(); navigate('/'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50"><FiLogOut /> Log out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <Link to="/login" state={{ from: location.pathname + location.search }} className="btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-[61] flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.25 }}>
              <div className="mb-5 flex items-center justify-between"><Logo /><button className={iconBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu"><FiX /></button></div>
              <form onSubmit={(e) => { submitSearch(e); setMobileOpen(false); }} role="search" className="relative mb-5">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search gifts" placeholder="Search gifts…" className="input pl-11" />
              </form>
              <nav className="flex flex-col text-base font-semibold">
                {[['/', 'Home'], ['/shop', 'Shop all gifts'], ['/categories', 'Categories'], ['/wishlist', 'Wishlist'], ['/about', 'About'], ['/contact', 'Contact']].map(([to, label]) => (
                  <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `rounded-xl px-3 py-3 ${isActive ? 'bg-brand-soft text-brand' : ''}`}>{label}</NavLink>
                ))}
              </nav>
              <p className="mb-2 mt-5 px-3 text-xs font-bold uppercase tracking-wider text-ink-soft">Shop by category</p>
              <div className="flex flex-col text-sm">
                {(categories || []).map((c) => <Link key={c.id} to={`/category/${c.slug}`} className="rounded-xl px-3 py-2 hover:bg-brand-soft">{c.name}</Link>)}
              </div>
              <div className="mt-auto flex gap-2 pt-6">
                {user
                  ? <button className="btn-outline flex-1" onClick={() => { logout(); navigate('/'); }}>Log out</button>
                  : <><Link to="/login" className="btn-outline flex-1">Log in</Link><Link to="/register" className="btn-primary flex-1">Register</Link></>}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
