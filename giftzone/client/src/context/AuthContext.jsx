import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('gz_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('gz_token');
    setUser(null);
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!localStorage.getItem('gz_token')) return undefined;
    let alive = true;
    authService.me()
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && logout())
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [logout]);

  // The axios interceptor fires this when the server says the token is no longer valid.
  useEffect(() => {
    window.addEventListener('gz:logout', logout);
    return () => window.removeEventListener('gz:logout', logout);
  }, [logout]);

  const startSession = ({ token, user: u }) => {
    localStorage.setItem('gz_token', token);
    setUser(u);
    return u;
  };

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
    login: async (creds) => startSession(await authService.login(creds)),
    register: async (data) => startSession(await authService.register(data)),
    logout,
    updateUser: (patch) => setUser((u) => ({ ...u, ...patch })),
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
