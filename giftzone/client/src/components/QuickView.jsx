import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingBag } from 'react-icons/fi';
import { Modal, QuantitySelector } from './ui';
import SafeImage from './SafeImage';
import Rating from './Rating';
import { useCart } from '../context/CartContext';
import { money, discountPercent } from '../utils/format';

export default function QuickView({ product, onClose }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  useEffect(() => setQty(1), [product?.id]);
  if (!product) return <Modal open={false} onClose={onClose} />;
  const off = discountPercent(product.price, product.final_price);
  const out = product.stock < 1;

  return (
    <Modal open={!!product} onClose={onClose} title="Quick view" wide>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-brand-soft"><SafeImage src={product.image} alt={product.name} width={800} /></div>
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{product.category_name}</p>
          <h3 className="mt-1 font-display text-2xl">{product.name}</h3>
          <div className="mt-2"><Rating value={product.rating} count={product.review_count} /></div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-brand">{money(product.final_price)}</span>
            {off > 0 && <><span className="text-gray-400 line-through">{money(product.price)}</span><span className="badge bg-brand-soft text-brand">Save {off}%</span></>}
          </div>
          <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-ink-soft">{product.description}</p>
          <p className={`mt-3 text-sm font-medium ${out ? 'text-red-500' : 'text-emerald-600'}`}>{out ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}</p>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
            <QuantitySelector value={qty} onChange={setQty} max={Math.min(product.stock || 1, 20)} />
            <button className="btn-primary flex-1" disabled={out} onClick={async () => { if (await add(product, qty)) onClose(); }}><FiShoppingBag /> Add to cart</button>
          </div>
          <Link to={`/product/${product.slug}`} onClick={onClose} className="mt-4 text-center text-sm font-semibold text-brand underline-offset-4 hover:underline">Personalise & view full details →</Link>
        </div>
      </div>
    </Modal>
  );
}
