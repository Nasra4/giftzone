import { createContext, useContext, useEffect, useState } from 'react';
import { siteService } from '../services';

const DEFAULTS = {
  store_name: 'GiftZone',
  store_email: 'hello@giftzone.com',
  store_phone: '',
  store_address: '',
  delivery_fee: 3,
  free_delivery_threshold: 75,
  announcement_text: '',
  hero_image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1920&q=80',
  promo_banners: [],
};

const SettingsContext = createContext(DEFAULTS);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  useEffect(() => {
    siteService.settings().then((s) => setSettings({ ...DEFAULTS, ...s })).catch(() => {}); // defaults keep the site usable
  }, []);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
