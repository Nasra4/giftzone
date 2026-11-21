import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gz_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid token while logged in -> clear it and tell the app to log out.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('gz_token')) {
      localStorage.removeItem('gz_token');
      window.dispatchEvent(new Event('gz:logout'));
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || (e?.request && !e?.response ? 'Cannot reach the server. Please check your connection.' : fallback);

export default api;
