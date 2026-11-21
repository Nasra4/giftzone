import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import SafeImage from '../components/SafeImage';
import Rating from '../components/Rating';
import { EmptyState, PageLoader } from '../components/ui';
import { money } from '../utils/format';

export default function Wishlist({ embedded = false }) {
  const { user } = useAuth();
  const { items, loading, remove } = useWishlist();
  const { add } = useCart();

  if (!user) return <EmptyState icon={<FiHeart />} title="Your wishlist is waiting" text="Log in to save the gifts you love." action={<Link to="/login" state={{ from: '/wishlist' }} className="btn-primary">Log in</Link>} />;
  if (user.role !== 'customer') return <EmptyState icon={<FiHeart />} title="Wishlists are for customers" text="Admin accounts don't have a wishlist." />;
  if (loading) return <PageLoader />;

  const moveToCart = async (p) => { if (await add(p, 1)) remove(p.id); };

  return (
    <div className={embedded ? '' : 'container-x py-10'}>
      <h1 className="font-display text-3xl font-bold">My Wishlist {items.length > 0 && <span className="text-lg text-ink-soft">({items.length})</span>}</h1>
      {items.length === 0
        ? <EmptyState icon={<FiHeart />} title="Nothing saved yet" text="Tap the heart on any gift to keep it here." action={<Link to="/shop" className="btn-primary">Discover gifts</Link>} />
        : <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article key={p.id} className="card flex gap-4 p-4">
              <Link to={`/product/${p.slug}`} className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-brand-soft"><SafeImage src={p.image} alt={p.name} width={300} /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/product/${p.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand">{p.name}</Link>
                <Rating value={p.rating} count={p.review_count} />
                <p className="mt-1 font-bold text-brand">{money(p.final_price)}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <button className="btn-primary btn-sm flex-1" disabled={p.stock < 1} onClick={() => moveToCart(p)}><FiShoppingBag /> {p.stock < 1 ? 'Sold out' : 'Move to cart'}</button>
                  <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from wishlist`} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><FiTrash2 /></button>
                </div>
              </div>
            </article>
          ))}
        </div>}
    </div>
  );
}
