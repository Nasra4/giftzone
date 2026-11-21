import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import Logo from './Logo';
import NewsletterForm from './NewsletterForm';
import { useSettings } from '../context/SettingsContext';
import { categoryService } from '../services';
import useFetch from '../hooks/useFetch';

export const SOCIALS = [
  { icon: FaInstagram, label: 'Instagram', href: import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/' },
  { icon: FaFacebookF, label: 'Facebook', href: import.meta.env.VITE_FACEBOOK_URL || 'https://www.facebook.com/' },
  { icon: FaTiktok, label: 'TikTok', href: import.meta.env.VITE_TIKTOK_URL || 'https://www.tiktok.com/' },
];

export default function Footer() {
  const s = useSettings();
  const { data: categories } = useFetch(() => categoryService.list(), []);
  const wa = (s.store_phone || '').replace(/\D/g, '');

  return (
    <footer className="mt-20 bg-ink text-white/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed">Make Every Moment Special. Beautiful gifts, personal touches and reliable delivery, all in one place.</p>
          <div className="mt-5 flex gap-2">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-brand"><Icon /></a>
            ))}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-brand"><FaWhatsapp /></a>}
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-display text-lg text-white">Shop</h4>
          <ul className="space-y-2 text-sm">
            {(categories || []).slice(0, 7).map((c) => <li key={c.id}><Link className="transition hover:text-brand-light" to={`/category/${c.slug}`}>{c.name}</Link></li>)}
            <li><Link className="font-semibold text-brand-light" to="/categories">All categories →</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-lg text-white">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-brand-light" to="/account/orders">Track my order</Link></li>
            <li><Link className="hover:text-brand-light" to="/contact#faq">FAQs</Link></li>
            <li><Link className="hover:text-brand-light" to="/about">About GiftZone</Link></li>
            <li><Link className="hover:text-brand-light" to="/contact">Contact us</Link></li>
          </ul>
          <ul className="mt-5 space-y-2 text-sm">
            {s.store_email && <li className="flex items-center gap-2"><FiMail className="text-brand-light" /> {s.store_email}</li>}
            {s.store_phone && <li className="flex items-center gap-2"><FiPhone className="text-brand-light" /> {s.store_phone}</li>}
            {s.store_address && <li className="flex items-center gap-2"><FiMapPin className="text-brand-light" /> {s.store_address}</li>}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-lg text-white">Stay in the loop</h4>
          <p className="mb-4 text-sm">Gift ideas and exclusive offers, straight to your inbox.</p>
          <NewsletterForm dark />
          <p className="mt-5 text-xs text-white/60">We accept Cash on Delivery, Card, EVC Plus and e-Dahab.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">© {new Date().getFullYear()} GiftZone. All rights reserved.</div>
    </footer>
  );
}
