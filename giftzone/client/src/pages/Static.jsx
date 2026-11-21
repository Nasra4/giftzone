import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiMapPin, FiChevronDown, FiHeart, FiTruck, FiShield, FiStar } from 'react-icons/fi';
import { siteService } from '../services';
import { errMsg } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import SafeImage from '../components/SafeImage';
import { FieldError, Spinner } from '../components/ui';
import { SOCIALS } from '../components/Footer';

export function About() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <SafeImage src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1800&q=80" alt="" width={1800} className="absolute inset-0 -z-20" />
        <div className="absolute inset-0 -z-10 bg-ink/60" />
        <div className="container-x py-24 text-center text-white"><h1 className="font-display text-4xl font-bold sm:text-5xl">About GiftZone</h1><p className="mx-auto mt-3 max-w-xl text-white/85">Make Every Moment Special.</p></div>
      </section>
      <div className="container-x py-16">
        <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-ink-soft">
          <h2 className="font-display text-3xl font-semibold text-ink">Our story</h2>
          <p>GiftZone began with a simple frustration: sending a thoughtful gift to someone far away was harder than it should be. Too many shops, too little personality, and no easy way to add a real message.</p>
          <p>We built GiftZone to change that. Browse by occasion, personalise with a note and wrapping, choose the delivery date and pay the way that suits you. We take care of the rest.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="card p-8"><h3 className="font-display text-2xl">Our mission</h3><p className="mt-3 text-ink-soft">To make giving effortless and meaningful, so no one misses a moment that matters.</p></div>
          <div className="card p-8"><h3 className="font-display text-2xl">Our vision</h3><p className="mt-3 text-ink-soft">To be the most trusted place to find, personalise and send gifts across the region.</p></div>
        </div>
        <h2 className="mb-8 mt-20 text-center font-display text-3xl font-semibold">Why choose GiftZone</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[[FiHeart, 'Personal touches', 'Messages, wrapping styles and chosen delivery dates.'], [FiTruck, 'Reliable delivery', 'Track every order from confirmation to your recipient’s door.'], [FiShield, 'Safe payments', 'Card, EVC Plus, e-Dahab or cash on delivery, and we never store payment details.'], [FiStar, 'Quality you can see', 'Carefully selected products with honest reviews from real customers.']].map(([Icon, t, d]) => (
            <div key={t} className="card p-6 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand"><Icon /></span><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-2 text-sm text-ink-soft">{d}</p></div>
          ))}
        </div>
        <div className="mt-14 text-center"><Link to="/shop" className="btn-primary px-8 py-4">Start gifting</Link></div>
      </div>
    </>
  );
}

const FAQS = [
  ['How long does delivery take?', 'Delivery time depends on your location and the delivery date you choose at checkout. You can follow every step under My Orders.'],
  ['Can I add a personal message?', 'Yes. Add a message and gift wrapping on the product page, or a general gift message at checkout.'],
  ['Which payment methods do you accept?', 'Cash on Delivery, Card, EVC Plus and e-Dahab. Card and wallet payments are completed with the payment provider; we never store your payment details.'],
  ['Can I cancel an order?', 'You can cancel from My Orders while the order is still Pending. After that, please contact us and we will do our best to help.'],
  ['How do discount codes work?', 'Enter your code in the cart. Each code can be used once per account and may have an expiry date.'],
];

export function Contact() {
  const s = useSettings();
  const [open, setOpen] = useState(0);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (d) => {
    try { const r = await siteService.contact(d); toast.success(r.message); reset(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="container-x py-14">
      <div className="mb-10 text-center"><h1 className="font-display text-4xl font-bold">Contact Us</h1><p className="mt-2 text-ink-soft">Questions about an order or a gift idea? We'd love to help.</p></div>
      <div className="grid gap-8 lg:grid-cols-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6 lg:col-span-3" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="cn">Name</label><input id="cn" className={`input ${errors.name ? 'input-error' : ''}`} {...register('name', { required: 'Please enter your name' })} /><FieldError error={errors.name} /></div>
            <div><label className="label" htmlFor="ce">Email</label><input id="ce" type="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} /><FieldError error={errors.email} /></div>
          </div>
          <div><label className="label" htmlFor="cs">Subject</label><input id="cs" className="input" {...register('subject')} /></div>
          <div><label className="label" htmlFor="cm">Message</label><textarea id="cm" rows={5} className={`input ${errors.message ? 'input-error' : ''}`} {...register('message', { required: 'Please write a message', minLength: { value: 10, message: 'At least 10 characters' } })} /><FieldError error={errors.message} /></div>
          <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Send message</button>
        </form>
        <aside className="space-y-4 lg:col-span-2">
          <div className="card space-y-4 p-6 text-sm">
            {s.store_email && <p className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><FiMail /></span><a href={`mailto:${s.store_email}`} className="hover:text-brand">{s.store_email}</a></p>}
            {s.store_phone && <p className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><FiPhone /></span><a href={`tel:${s.store_phone.replace(/\s/g, '')}`} className="hover:text-brand">{s.store_phone}</a></p>}
            {s.store_address && <p className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><FiMapPin /></span>{s.store_address}</p>}
          </div>
          <div className="card flex items-center gap-3 p-6">{SOCIALS.map(({ icon: Icon, label, href }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand transition hover:bg-brand hover:text-white"><Icon /></a>)}<span className="ml-2 text-sm text-ink-soft">Follow GiftZone</span></div>
        </aside>
      </div>
      <section id="faq" className="mx-auto mt-16 max-w-3xl">
        <h2 className="mb-6 text-center font-display text-3xl font-semibold">Frequently asked questions</h2>
        <div className="space-y-3">{FAQS.map(([q, a], i) => (
          <div key={q} className="card overflow-hidden">
            <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<FiChevronDown className={`shrink-0 transition ${open === i ? 'rotate-180 text-brand' : ''}`} /></button>
            {open === i && <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{a}</p>}
          </div>))}</div>
      </section>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="font-display text-7xl font-bold text-brand">404</p>
      <h1 className="mt-4 font-display text-3xl">We couldn't find that page</h1>
      <p className="mt-2 text-ink-soft">It may have moved, or the gift has already been unwrapped.</p>
      <Link to="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
