import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiSearch, FiGift } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { categoryService, productService } from '../services';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard';
import QuickView from '../components/QuickView';
import { EmptyState, ErrorBox, Pagination } from '../components/ui';
import SafeImage from '../components/SafeImage';

const SORTS = [['featured', 'Featured'], ['newest', 'Newest'], ['price_asc', 'Price: Low to High'], ['price_desc', 'Price: High to Low'], ['best_selling', 'Best Selling']];
const PRICE_PRESETS = [['', ''], ['0', '25'], ['25', '50'], ['50', '100'], ['100', '']];

function Filters({ params, set, categories, occasions, fixedCategory, onClear }) {
  const [min, setMin] = useState(params.get('minPrice') || '');
  const [max, setMax] = useState(params.get('maxPrice') || '');
  useEffect(() => { setMin(params.get('minPrice') || ''); setMax(params.get('maxPrice') || ''); }, [params]);
  const applyPrice = (e) => { e?.preventDefault(); set({ minPrice: min, maxPrice: max }); };
  const group = 'border-b border-gray-100 py-5 first:pt-0 last:border-0';
  const h = 'mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft';

  return (
    <div>
      {!fixedCategory && (
        <div className={group}>
          <h3 className={h}>Category</h3>
          <div className="space-y-1">
            <button onClick={() => set({ category: '' })} className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-brand-soft ${!params.get('category') ? 'bg-brand-soft font-semibold text-brand' : ''}`}>All gifts</button>
            {(categories || []).map((c) => (
              <button key={c.id} onClick={() => set({ category: c.slug })} className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-brand-soft ${params.get('category') === c.slug ? 'bg-brand-soft font-semibold text-brand' : ''}`}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className={group}>
        <h3 className={h}>Occasion</h3>
        <select className="input" value={params.get('occasion') || ''} onChange={(e) => set({ occasion: e.target.value })} aria-label="Occasion">
          <option value="">Any occasion</option>
          {(occasions || []).map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <form className={group} onSubmit={applyPrice}>
        <h3 className={h}>Price range (USD)</h3>
        <div className="flex items-center gap-2">
          <input type="number" min="0" inputMode="decimal" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="input px-3" aria-label="Minimum price" />
          <span className="text-gray-400">–</span>
          <input type="number" min="0" inputMode="decimal" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="input px-3" aria-label="Maximum price" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRICE_PRESETS.slice(1).map(([a, b]) => (
            <button type="button" key={a + b} onClick={() => set({ minPrice: a, maxPrice: b })} className="rounded-full border border-gray-200 px-3 py-1 text-xs transition hover:border-brand hover:text-brand">{b ? `$${a}–$${b}` : `$${a}+`}</button>
          ))}
        </div>
        <button className="btn-outline btn-sm mt-3 w-full">Apply</button>
      </form>
      <div className={group}>
        <h3 className={h}>Rating</h3>
        {[4, 3, 2].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
            <input type="radio" name="rating" className="accent-brand" checked={params.get('rating') === String(r)} onChange={() => set({ rating: String(r) })} />
            <span className="flex text-gold">{Array.from({ length: r }).map((_, i) => <FaStar key={i} />)}</span> & up
          </label>
        ))}
        {params.get('rating') && <button onClick={() => set({ rating: '' })} className="mt-1 text-xs text-brand hover:underline">Clear rating</button>}
      </div>
      <div className={group}>
        <h3 className={h}>Availability</h3>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={params.get('availability') === 'in_stock'} onChange={(e) => set({ availability: e.target.checked ? 'in_stock' : '' })} /> In stock only
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={params.get('onSale') === '1'} onChange={(e) => set({ onSale: e.target.checked ? '1' : '' })} /> On sale
        </label>
      </div>
      <button onClick={onClear} className="btn-ghost btn-sm w-full">Clear all filters</button>
    </div>
  );
}

export default function Shop() {
  const { slug } = useParams(); // present on /category/:slug
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const debounced = useDebounce(search, 450);

  const category = slug || params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') || 'featured';

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Keep the URL's q in sync with the in-page search box (debounced).
  useEffect(() => { if ((params.get('q') || '') !== debounced) set({ q: debounced }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSearch(params.get('q') || ''); }, [params.get('q')]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useMemo(() => ({
    category, q: params.get('q') || '', occasion: params.get('occasion') || '', minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '',
    rating: params.get('rating') || '', availability: params.get('availability') || '', onSale: params.get('onSale') || '', sort, page, limit: 12,
  }), [params, category, sort, page]);

  const categories = useFetch(() => categoryService.list(), []);
  const occasions = useFetch(() => productService.occasions(), []);
  const catInfo = useFetch(() => categoryService.one(slug), [slug], { enabled: !!slug });
  const result = useFetch(() => productService.list(query), [JSON.stringify(query)]);

  useEffect(() => { document.title = `${slug && catInfo.data ? catInfo.data.name : 'Shop'} | GiftZone`; }, [slug, catInfo.data]);

  const clearAll = () => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); };
  const activeCount = ['occasion', 'minPrice', 'maxPrice', 'rating', 'availability', 'onSale', 'q', slug ? '' : 'category'].filter((k) => k && params.get(k)).length;
  const data = result.data;

  if (slug && catInfo.error) return <ErrorBox message="We couldn't find that category." onRetry={null} />;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-soft">
        {slug && catInfo.data?.image_url && <SafeImage src={catInfo.data.image_url} alt="" width={1400} className="absolute inset-0 -z-20 opacity-30" />}
        <div className="container-x py-12 text-center">
          <nav className="mb-3 text-xs text-ink-soft" aria-label="Breadcrumb"><Link to="/" className="hover:text-brand">Home</Link> / <Link to="/shop" className="hover:text-brand">Shop</Link>{slug && catInfo.data && <> / <span className="text-ink">{catInfo.data.name}</span></>}</nav>
          <h1 className="font-display text-4xl font-bold">{slug ? (catInfo.data?.name || 'Loading…') : params.get('q') ? `Results for “${params.get('q')}”` : 'All Gifts'}</h1>
          {slug && catInfo.data?.description && <p className="mx-auto mt-2 max-w-xl text-ink-soft">{catInfo.data.description}</p>}
        </div>
      </section>

      <div className="container-x py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button className="btn-outline btn-sm lg:hidden" onClick={() => setDrawer(true)}><FiFilter /> Filters{activeCount > 0 && ` (${activeCount})`}</button>
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gifts…" aria-label="Search gifts" className="input rounded-full py-2.5 pl-11" />
          </div>
          <p className="ml-auto hidden text-sm text-ink-soft sm:block">{data ? `${data.total} gift${data.total === 1 ? '' : 's'}` : ''}</p>
          <label className="flex items-center gap-2 text-sm"><span className="sr-only sm:not-sr-only">Sort by</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value })} className="input w-auto rounded-full py-2.5 pr-8">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block"><div className="card sticky top-28 p-5"><Filters params={params} set={set} categories={categories.data} occasions={occasions.data} fixedCategory={!!slug} onClear={clearAll} /></div></aside>

          <div className="min-w-0 flex-1">
            {result.loading && <ProductGridSkeleton count={12} />}
            {!result.loading && result.error && <ErrorBox message={result.error} onRetry={result.reload} />}
            {!result.loading && !result.error && data?.items.length === 0 && (
              <EmptyState icon={<FiGift />} title="No gifts found" text="Try removing a filter or searching for something else." action={<button className="btn-primary" onClick={clearAll}>Clear filters</button>} />
            )}
            {!result.loading && data?.items.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
                  {data.items.map((p) => <ProductCard key={p.id} product={p} onQuickView={setQuick} />)}
                </div>
                <Pagination page={data.page} pages={data.pages} onChange={(n) => { set({ page: String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </>
            )}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white">
            <div className="flex items-center justify-between border-b p-4"><h2 className="font-display text-xl">Filters</h2><button onClick={() => setDrawer(false)} aria-label="Close filters" className="rounded-full p-2 hover:bg-gray-100"><FiX /></button></div>
            <div className="flex-1 overflow-y-auto p-5"><Filters params={params} set={set} categories={categories.data} occasions={occasions.data} fixedCategory={!!slug} onClear={clearAll} /></div>
            <div className="border-t p-4"><button className="btn-primary w-full" onClick={() => setDrawer(false)}>Show {data?.total ?? ''} results</button></div>
          </div>
        </div>
      )}
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
