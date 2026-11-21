import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FiHeart, FiShoppingBag, FiTruck, FiGift, FiCheck } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { productService } from '../services';
import { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import SafeImage from '../components/SafeImage';
import Rating, { RatingInput } from '../components/Rating';
import ProductCard from '../components/ProductCard';
import { ErrorBox, FieldError, PageLoader, QuantitySelector, Spinner } from '../components/ui';
import { money, discountPercent, fmtDate, todayISO, WRAP_STYLES } from '../utils/format';

function ReviewForm({ productId, onDone }) {
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const submit = async (d) => {
    if (!rating) return toast.error('Please choose a star rating');
    setBusy(true);
    try {
      const r = await productService.addReview(productId, { rating, comment: d.comment });
      toast.success(r.message);
      reset(); setRating(0); onDone?.();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="rounded-2xl bg-cream p-5" noValidate>
      <h4 className="font-semibold">Write a review</h4>
      <div className="mt-2"><RatingInput value={rating} onChange={setRating} /></div>
      <textarea rows={3} className="input mt-3" placeholder="Share your experience (optional)" {...register('comment', { maxLength: { value: 1000, message: 'Up to 1000 characters' } })} />
      <FieldError error={errors.comment} />
      <button className="btn-primary btn-sm mt-3" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Submit review</button>
    </form>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const wishlist = useWishlist();
  const { data: product, loading, error, reload } = useFetch(() => productService.one(slug), [slug]);
  const reviews = useFetch(() => productService.reviews(product.id), [product?.id], { enabled: !!product });

  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const [adding, setAdding] = useState(false);
  const { register, watch, getValues, formState: { errors }, trigger } = useForm({
    defaultValues: { recipient_name: '', personal_message: '', gift_wrap: false, wrap_style: 'classic', delivery_date: '' },
  });
  const wrap = watch('gift_wrap');
  const wrapStyle = watch('wrap_style');
  const message = watch('personal_message') || '';

  useEffect(() => { setActive(0); setQty(1); setTab('description'); }, [slug]);
  useEffect(() => { if (product) document.title = `${product.name} | GiftZone`; }, [product]);

  if (loading && !product) return <PageLoader />;
  if (error || !product) return <ErrorBox message={error || 'Product not found'} onRetry={reload} />;

  const off = discountPercent(product.price, product.final_price);
  const out = product.stock < 1;
  const saved = wishlist.has(product.id);
  const images = product.images?.length ? product.images : [null];

  const addToCart = async (buyNow = false) => {
    if (!(await trigger())) return;
    setAdding(true);
    const ok = await add(product, qty, getValues());
    setAdding(false);
    if (ok && buyNow) navigate('/cart');
  };

  return (
    <div className="container-x py-8">
      <nav className="mb-6 text-xs text-ink-soft" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand">Home</Link> / <Link to={`/category/${product.category_slug}`} className="hover:text-brand">{product.category_name}</Link> / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* GALLERY */}
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl bg-brand-soft shadow-card"><SafeImage key={active} src={images[active]} alt={product.name} width={1000} loading="eager" /></div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} className={`aspect-square overflow-hidden rounded-xl border-2 transition ${i === active ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}><SafeImage src={img} alt="" width={200} /></button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{product.category_name}{product.occasion && <span className="text-ink-soft"> · {product.occasion}</span>}</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3"><Rating value={product.rating} count={product.review_count} size={16} /><button onClick={() => setTab('reviews')} className="text-xs text-brand hover:underline">Read reviews</button></div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold text-brand">{money(product.final_price)}</span>
            {off > 0 && <><span className="text-lg text-gray-400 line-through">{money(product.price)}</span><span className="badge bg-brand text-white">Save {off}%</span></>}
          </div>
          <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${out ? 'text-red-500' : 'text-emerald-600'}`}>
            <FiCheck /> {out ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left, order soon` : 'In stock and ready to ship'}
          </p>
          <p className="mt-4 leading-relaxed text-ink-soft">{product.description}</p>

          {/* PERSONALISE */}
          <fieldset className="mt-6 rounded-2xl border border-brand-light/60 bg-white p-5" disabled={out}>
            <legend className="flex items-center gap-2 px-2 text-sm font-bold text-brand"><FiGift /> Personalise this gift</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="recipient">Recipient name</label>
                <input id="recipient" className="input" placeholder="Who is it for?" maxLength={120} {...register('recipient_name', { maxLength: 120 })} />
              </div>
              <div>
                <label className="label" htmlFor="ddate">Delivery date</label>
                <input id="ddate" type="date" min={todayISO()} className={`input ${errors.delivery_date ? 'input-error' : ''}`} {...register('delivery_date', { validate: (v) => !v || v >= todayISO() || 'Pick today or a future date' })} />
                <FieldError error={errors.delivery_date} />
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="pmsg">Personal message <span className="font-normal text-ink-soft">({message.length}/500)</span></label>
              <textarea id="pmsg" rows={3} className={`input ${errors.personal_message ? 'input-error' : ''}`} placeholder="Write a heartfelt note to include with the gift…" {...register('personal_message', { maxLength: { value: 500, message: 'Message can be up to 500 characters' } })} />
              <FieldError error={errors.personal_message} />
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-brand" {...register('gift_wrap')} /> Add gift wrapping <span className="text-ink-soft">(+$2.00 each)</span>
            </label>
            {wrap && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Wrapping style">
                {WRAP_STYLES.map((w) => (
                  <label key={w.id} className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center text-xs font-medium transition ${wrapStyle === w.id ? 'border-brand bg-brand-soft' : 'border-gray-200 hover:border-brand-light'}`}>
                    <input type="radio" value={w.id} className="sr-only" {...register('wrap_style')} />
                    <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: w.color }} />{w.label}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* ACTIONS */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} onChange={setQty} max={Math.min(product.stock || 1, 20)} />
            <button className="btn-primary flex-1 py-3.5" disabled={out || adding} onClick={() => addToCart(false)}>{adding ? <Spinner className="h-4 w-4" /> : <FiShoppingBag />} Add to cart</button>
            <button onClick={() => wishlist.toggle(product)} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand text-xl text-brand transition hover:bg-brand-soft">{saved ? <FaHeart /> : <FiHeart />}</button>
          </div>
          <button className="btn-outline mt-3 w-full" disabled={out || adding} onClick={() => addToCart(true)}>Add & go to cart</button>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-soft"><FiTruck /> Delivery fee calculated at checkout. Free above the store's free-delivery threshold.</p>
        </div>
      </div>

      {/* TABS */}
      <section className="mt-14">
        <div className="flex gap-1 border-b border-gray-200" role="tablist">
          {[['description', 'Description'], ['specs', 'Specifications'], ['reviews', `Reviews (${product.review_count})`]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition ${tab === id ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        <div className="card mt-6 p-6" role="tabpanel">
          {tab === 'description' && <p className="max-w-3xl whitespace-pre-line leading-relaxed text-ink-soft">{product.description || 'No description yet.'}</p>}
          {tab === 'specs' && (
            Object.keys(product.specifications || {}).length
              ? <dl className="grid max-w-2xl gap-px overflow-hidden rounded-xl bg-gray-100 sm:grid-cols-1">{Object.entries(product.specifications).map(([k, v]) => <div key={k} className="grid grid-cols-3 bg-white px-4 py-3 text-sm"><dt className="font-semibold">{k}</dt><dd className="col-span-2 text-ink-soft">{String(v)}</dd></div>)}</dl>
              : <p className="text-ink-soft">No specifications listed.</p>
          )}
          {tab === 'reviews' && (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                {reviews.loading && <Spinner />}
                {reviews.data?.length === 0 && <p className="text-ink-soft">No reviews yet. Be the first to share your experience.</p>}
                {reviews.data?.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
                    <div className="flex items-center justify-between"><p className="font-semibold">{r.author}</p><span className="text-xs text-ink-soft">{fmtDate(r.created_at)}</span></div>
                    <Rating value={r.rating} showCount={false} />
                    {r.comment && <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>}
                  </div>
                ))}
              </div>
              <div>{user?.role === 'customer' ? <ReviewForm productId={product.id} /> : <p className="rounded-2xl bg-cream p-5 text-sm text-ink-soft"><Link to="/login" state={{ from: `/product/${slug}` }} className="font-semibold text-brand hover:underline">Log in</Link> as a customer to leave a review.</p>}</div>
            </div>
          )}
        </div>
      </section>

      {product.related?.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-8">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{product.related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
