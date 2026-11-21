import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiShoppingBag, FiEye } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import SafeImage from './SafeImage';
import Rating from './Rating';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { money, discountPercent } from '../utils/format';

function ProductCard({ product, onQuickView }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const off = discountPercent(product.price, product.final_price);
  const out = product.stock < 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }}
      className="group card overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-soft">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <SafeImage src={product.image} alt={product.name} width={600} className="transition duration-500 group-hover:scale-105" />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <span className="badge bg-brand text-white">-{off}%</span>}
          {out && <span className="badge bg-ink text-white">Sold out</span>}
          {!out && product.stock <= 5 && <span className="badge bg-gold text-ink">Only {product.stock} left</span>}
        </div>
        <button
          onClick={() => wishlist.toggle(product)}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={saved}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-brand shadow transition hover:scale-110"
        >
          {saved ? <FaHeart /> : <FiHeart />}
        </button>
        {onQuickView && (
          <button
            onClick={() => onQuickView(product)}
            className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 py-2 text-xs font-semibold opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 max-sm:hidden"
          >
            <FiEye /> Quick view
          </button>
        )}
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{product.category_name}</p>
        <Link to={`/product/${product.slug}`} className="mt-1 line-clamp-2 min-h-[2.75rem] font-semibold leading-snug transition hover:text-brand">{product.name}</Link>
        <div className="mt-1.5"><Rating value={product.rating} count={product.review_count} /></div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-brand">{money(product.final_price)}</span>
            {off > 0 && <span className="text-sm text-gray-400 line-through">{money(product.price)}</span>}
          </div>
          <button
            onClick={() => add(product, 1)} disabled={out} aria-label={`Add ${product.name} to cart`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-soft transition hover:bg-brand-dark disabled:bg-gray-300 disabled:shadow-none"
          >
            <FiShoppingBag />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default memo(ProductCard);

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-4"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-4/5" /><div className="skeleton h-4 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}
