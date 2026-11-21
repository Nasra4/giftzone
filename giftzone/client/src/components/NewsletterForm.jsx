import { useState } from 'react';
import toast from 'react-hot-toast';
import { siteService } from '../services';
import { errMsg } from '../services/api';
import { Spinner } from './ui';

export default function NewsletterForm({ dark = false }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Please enter a valid email address');
    setBusy(true);
    try {
      const r = await siteService.subscribe(email.trim());
      toast.success(r.message);
      setEmail('');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row" noValidate>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input id="newsletter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" className={`input flex-1 ${dark ? 'border-white/20 bg-white/10 text-white placeholder:text-white/60' : ''}`} />
      <button className="btn-primary whitespace-nowrap" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Subscribe</button>
    </form>
  );
}
