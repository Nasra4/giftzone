import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiUpload } from 'react-icons/fi';
import { adminService } from '../../services';
import { errMsg } from '../../services/api';
import useFetch from '../../hooks/useFetch';
import { PageHeader } from '../../components/admin';
import { ErrorBox, FieldError, PageLoader, Spinner } from '../../components/ui';
import SafeImage from '../../components/SafeImage';

const blank = { title: '', subtitle: '', image: '', link: '' };

export default function Settings() {
  const { data, loading, error, reload } = useFetch(() => adminService.settings(), []);
  const [banners, setBanners] = useState([blank, blank]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm();
  const hero = watch('hero_image');

  useEffect(() => {
    if (!data) return;
    reset({ store_name: data.store_name, store_email: data.store_email, store_phone: data.store_phone, store_address: data.store_address, delivery_fee: data.delivery_fee, free_delivery_threshold: data.free_delivery_threshold, announcement_text: data.announcement_text, hero_image: data.hero_image });
    try { const b = JSON.parse(data.promo_banners); setBanners([b[0] || blank, b[1] || blank]); } catch { setBanners([blank, blank]); }
  }, [data, reset]);

  const upload = async (file, apply) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    try { apply((await adminService.upload(file)).url); toast.success('Image uploaded'); } catch (e) { toast.error(errMsg(e)); }
  };
  const setBanner = (i, patch) => setBanners((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const onSubmit = async (d) => {
    try {
      await adminService.saveSettings({ ...d, promo_banners: JSON.stringify(banners.filter((b) => b.title || b.image)) });
      toast.success('Settings saved. The storefront updates immediately.');
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const card = 'card p-6';
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader title="Website settings" subtitle="Store information, delivery fees and homepage content" action={<button className="btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />} Save settings</button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="mb-4 font-display text-lg">Store information</h2>
          <div className="space-y-4">
            <div><label className="label">Store name</label><input className="input" {...register('store_name')} /></div>
            <div><label className="label">Email</label><input type="email" className={`input ${errors.store_email ? 'input-error' : ''}`} {...register('store_email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} /><FieldError error={errors.store_email} /></div>
            <div><label className="label">Phone</label><input className="input" {...register('store_phone')} /></div>
            <div><label className="label">Address</label><input className="input" {...register('store_address')} /></div>
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-lg">Delivery fees</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Standard delivery fee ($)</label><input type="number" step="0.01" min="0" className={`input ${errors.delivery_fee ? 'input-error' : ''}`} {...register('delivery_fee', { required: 'Required', min: { value: 0, message: 'Cannot be negative' } })} /><FieldError error={errors.delivery_fee} /></div>
            <div><label className="label">Free delivery from ($)</label><input type="number" step="0.01" min="0" className={`input ${errors.free_delivery_threshold ? 'input-error' : ''}`} {...register('free_delivery_threshold', { required: 'Required', min: { value: 0, message: 'Cannot be negative' } })} /><FieldError error={errors.free_delivery_threshold} /></div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">Orders at or above the free-delivery amount (after discounts) ship free. Checkout always recalculates this on the server.</p>
          <h2 className="mb-2 mt-6 font-display text-lg">Promotion bar</h2>
          <input className="input" placeholder="Announcement shown at the top of every page (leave empty to hide)" {...register('announcement_text')} />
        </section>

        <section className={`${card} xl:col-span-2`}>
          <h2 className="mb-4 font-display text-lg">Homepage hero banner</h2>
          <div className="flex flex-wrap items-start gap-5">
            <div className="aspect-[16/7] w-full max-w-sm overflow-hidden rounded-xl bg-brand-soft"><SafeImage src={hero} alt="Hero preview" width={700} /></div>
            <div className="min-w-[16rem] flex-1 space-y-3">
              <input className={`input ${errors.hero_image ? 'input-error' : ''}`} placeholder="https:// image URL" {...register('hero_image', { pattern: { value: /^(https:\/\/\S+|\/uploads\/\S+)$/, message: 'Use an https:// URL or upload an image' } })} />
              <FieldError error={errors.hero_image} />
              <label className="btn-outline btn-sm cursor-pointer"><FiUpload /> Upload image<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files?.[0], (u) => setValue('hero_image', u, { shouldDirty: true })); e.target.value = ''; }} /></label>
            </div>
          </div>
        </section>

        <section className={`${card} xl:col-span-2`}>
          <h2 className="mb-4 font-display text-lg">Promotional banners</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {banners.map((b, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Banner {i + 1}</p>
                <div className="aspect-[16/7] overflow-hidden rounded-lg bg-brand-soft"><SafeImage src={b.image} alt="" width={600} /></div>
                <input className="input" placeholder="Title" value={b.title} onChange={(e) => setBanner(i, { title: e.target.value })} />
                <input className="input" placeholder="Subtitle" value={b.subtitle} onChange={(e) => setBanner(i, { subtitle: e.target.value })} />
                <input className="input" placeholder="Link, e.g. /category/birthday-gifts" value={b.link} onChange={(e) => setBanner(i, { link: e.target.value })} />
                <input className="input" placeholder="https:// image URL" value={b.image} onChange={(e) => setBanner(i, { image: e.target.value })} />
                <label className="btn-outline btn-sm cursor-pointer"><FiUpload /> Upload<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files?.[0], (u) => setBanner(i, { image: u })); e.target.value = ''; }} /></label>
              </div>
            ))}
          </div>
        </section>
      </div>
      {isDirty && <p className="mt-4 text-sm text-amber-600">You have unsaved changes.</p>}
    </form>
  );
}
