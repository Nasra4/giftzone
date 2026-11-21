import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
          <WishlistProvider>
            <AppRoutes />
            <Toaster position="top-center" toastOptions={{ duration: 3500, style: { borderRadius: '999px', background: '#333', color: '#fff', fontSize: '14px' }, success: { iconTheme: { primary: '#E76F8A', secondary: '#fff' } } }} />
          </WishlistProvider>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
