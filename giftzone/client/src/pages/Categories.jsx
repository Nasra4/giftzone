import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categoryService } from '../services';
import useFetch from '../hooks/useFetch';
import SafeImage from '../components/SafeImage';
import { ErrorBox } from '../components/ui';

export default function Categories() {
  const { data, loading, error, reload } = useFetch(() => categoryService.list(), []);
  return (
    <div className="container-x py-12">
      <div className="mb-10 text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-brand">Browse</p>
        <h1 className="font-display text-4xl font-bold">Gift Categories</h1>
        <p className="mx-auto mt-2 max-w-xl text-ink-soft">Pick an occasion or a gift type and we'll show you the best of it.</p>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[16/10]" />)}
        {(data || []).map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }}>
            <Link to={`/category/${c.slug}`} className="group relative block aspect-[16/10] overflow-hidden rounded-3xl shadow-card">
              <SafeImage src={c.image_url} alt={c.name} width={800} className="transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 text-white">
                <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
                <p className="mt-1 text-sm text-white/80">{c.product_count} gift{c.product_count === 1 ? '' : 's'}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
