import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTruck, FiGift, FiShield, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { FaQuoteLeft, FaInstagram } from 'react-icons/fa';
import { categoryService, productService } from '../services';
import useFetch from '../hooks/useFetch';
import { useSettings } from '../context/SettingsContext';
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard';
import QuickView from '../components/QuickView';
import SafeImage from '../components/SafeImage';
import Rating from '../components/Rating';
import NewsletterForm from '../components/NewsletterForm';
import { SectionHeading } from '../components/ui';
import { SOCIALS } from '../components/Footer';
import { money } from '../utils/format';

const OCCASIONS = [
  ['Birthday', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80'],
  ['Anniversary', 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80'],
  ['Wedding', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80'],
  ['Graduation', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80'],
  ["Valentine's Day", 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=600&q=80'],
  ["Mother's Day", 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=80'],
];

const INSTA = [
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=500&q=80',
];

function ProductRow({ state, onQuickView, count = 4 }) {
  if (state.loading) return <ProductGridSkeleton count={count} />;
  if (state.error || !state.data?.items?.length) return <p className="py-8 text-center text-ink-soft">{state.error || 'Products are on their way. Check back soon!'}</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {state.data.items.map((p) => <ProductCard key={p.id} product={p} onQuickView={onQuickView} />)}
    </div>
  );
}

export default function Home() {
  const s = useSettings();
  const [quick, setQuick] = useState(null);
  const categories = useFetch(() => categoryService.list(), []);
  const best = useFetch(() => productService.list({ sort: 'best_selling', limit: 8 }), []);
  const fresh = useFetch(() => productService.list({ sort: 'newest', limit: 4 }), []);
  const offers = useFetch(() => productService.list({ onSale: 1, sort: 'featured', limit: 4 }), []);
  const reviews = useFetch(() => productService.featuredReviews(), []);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <SafeImage src={s.hero_image} alt="" width={1920} className="absolute inset-0 -z-20" fetchPriority="high" loading="eager" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/50 to-transparent" />
        <div className="container-x flex min-h-[70vh] items-center py-20 lg:min-h-[78vh]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl text-white">
            <span className="badge mb-5 bg-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.2em] backdrop-blur">Make Every Moment Special</span>
            <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">Find the Perfect Gift for Every Special Moment.</h1>
            <p className="mt-5 max-w-lg text-base text-white/85 sm:text-lg">Hand-picked gifts, personal touches and careful delivery, so the people you love feel truly remembered.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-8 py-4">Shop Now <FiArrowRight /></Link>
              <Link to="/categories" className="btn border-2 border-white/80 px-8 py-4 text-white hover:bg-white hover:text-ink">Explore Gifts</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-x grid grid-cols-2 gap-6 py-6 lg:grid-cols-4">
          {[
            [FiTruck, 'Free delivery', `On orders over ${money(s.free_delivery_threshold)}`],
            [FiGift, 'Personalised', 'Messages & gift wrapping'],
            [FiShield, 'Secure payments', 'Card, EVC Plus, e-Dahab or COD'],
            [FiMapPin, 'Order tracking', 'Follow every step to the door'],
          ].map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xl text-brand"><Icon /></span>
              <div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-ink-soft">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-x pt-16">
        <SectionHeading eyebrow="Browse" title="Shop by Category" subtitle="Whatever the occasion, start with the gift type." action={<Link to="/categories" className="text-sm font-semibold text-brand hover:underline">View all →</Link>} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[4/5]" />)}
          {(categories.data || []).slice(0, 12).map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.05 }}>
              <Link to={`/category/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl shadow-card">
                <SafeImage src={c.image_url} alt={c.name} width={500} className="transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute inset-x-3 bottom-3 text-sm font-semibold leading-tight text-white">{c.name}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="container-x pt-20">
        <SectionHeading eyebrow="Loved by customers" title="Best Sellers" action={<Link to="/shop?sort=best_selling" className="text-sm font-semibold text-brand hover:underline">Shop best sellers →</Link>} />
        <ProductRow state={best} onQuickView={setQuick} count={8} />
      </section>

      {/* PROMO BANNERS */}
      {s.promo_banners?.length > 0 && (
        <section className="container-x pt-20">
          <div className="grid gap-6 md:grid-cols-2">
            {s.promo_banners.map((b, i) => (
              <Link key={i} to={b.link || '/shop'} className="group relative block aspect-[16/8] overflow-hidden rounded-3xl shadow-card">
                <SafeImage src={b.image} alt={b.title} width={1000} className="transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/70 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center p-6 text-white sm:p-10">
                  <h3 className="font-display text-2xl font-bold sm:text-3xl">{b.title}</h3>
                  <p className="mt-1 text-sm text-white/85">{b.subtitle}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold">Shop now <FiArrowRight className="transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="container-x pt-20">
        <SectionHeading eyebrow="Just in" title="New Arrivals" action={<Link to="/shop?sort=newest" className="text-sm font-semibold text-brand hover:underline">See what's new →</Link>} />
        <ProductRow state={fresh} onQuickView={setQuick} />
      </section>

      {/* OFFERS */}
      <section className="mt-20 bg-brand-soft py-16">
        <div className="container-x">
          <SectionHeading eyebrow="Limited time" title="Special Offers & Discounts" subtitle={s.announcement_text} action={<Link to="/shop?onSale=1" className="text-sm font-semibold text-brand hover:underline">All offers →</Link>} />
          <ProductRow state={offers} onQuickView={setQuick} />
        </div>
      </section>

      {/* OCCASIONS */}
      <section className="container-x pt-20">
        <SectionHeading eyebrow="Celebrate" title="Gifts for Every Occasion" />
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {OCCASIONS.map(([name, img]) => (
            <Link key={name} to={`/shop?occasion=${encodeURIComponent(name)}`} className="group w-40 shrink-0 snap-start text-center sm:w-auto">
              <div className="mx-auto aspect-square w-full overflow-hidden rounded-full border-4 border-white shadow-soft"><SafeImage src={img} alt={name} width={400} className="transition duration-500 group-hover:scale-110" /></div>
              <p className="mt-3 text-sm font-semibold transition group-hover:text-brand">{name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS (real approved reviews) */}
      {reviews.data?.length > 0 && (
        <section className="container-x pt-20">
          <SectionHeading eyebrow="Kind words" title="What Our Customers Say" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.data.slice(0, 3).map((r) => (
              <figure key={r.id} className="card flex flex-col p-6">
                <FaQuoteLeft className="text-2xl text-brand-light" />
                <blockquote className="mt-3 flex-1 leading-relaxed text-ink-soft">{r.comment}</blockquote>
                <figcaption className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div><p className="font-semibold">{r.author}</p><Link to={`/product/${r.product_slug}`} className="text-xs text-brand hover:underline">{r.product_name}</Link></div>
                  <Rating value={r.rating} showCount={false} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* NEWSLETTER */}
      <section className="container-x pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-6 py-14 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Join the GiftZone Circle</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">Be first to hear about new arrivals, seasonal collections and subscriber-only offers.</p>
          <div className="mt-8 flex justify-center"><NewsletterForm dark /></div>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="container-x pt-20">
        <SectionHeading eyebrow="Follow us" title="@giftzone on Instagram" action={<a href={SOCIALS[0].href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">Follow →</a>} />
        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
          {INSTA.map((img, i) => (
            <a key={i} href={SOCIALS[0].href} target="_blank" rel="noopener noreferrer" aria-label="Open GiftZone on Instagram" className="group relative aspect-square overflow-hidden rounded-xl">
              <SafeImage src={img} alt="" width={400} className="transition duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-center justify-center bg-brand/70 text-3xl text-white opacity-0 transition group-hover:opacity-100"><FaInstagram /></span>
            </a>
          ))}
        </div>
      </section>

      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
