import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { wishlistService } from '../services';
import { errMsg } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (authLoading) return;
    if (!isCustomer) { setItems([]); return; }
    setLoading(true);
    wishlistService.get().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id, isCustomer, authLoading]);

  const ids = useMemo(() => new Set(items.map((p) => p.id)), [items]);
  const has = (id) => ids.has(id);

  const toggle = async (product) => {
    if (!isCustomer) {
      toast('Log in to save your favourites', { icon: '💝' });
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    try {
      if (ids.has(product.id)) {
        setItems(await wishlistService.remove(product.id));
        toast.success('Removed from wishlist');
      } else {
        setItems(await wishlistService.add(product.id));
        toast.success('Saved to wishlist');
      }
    } catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async (id) => {
    try { setItems(await wishlistService.remove(id)); } catch (e) { toast.error(errMsg(e)); }
  };

  return <WishlistContext.Provider value={{ items, count: items.length, loading, has, toggle, remove }}>{children}</WishlistContext.Provider>;
}
