// Inline SVG shown whenever a product/category image is missing or fails to load.
// Data URI so the fallback itself can never 404.
export const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#FDE9EE"/><g transform="translate(200 210)"><rect x="-70" y="-20" width="140" height="90" rx="8" fill="#fff"/><rect x="-80" y="-48" width="160" height="34" rx="8" fill="#F4A7B9"/><rect x="-9" y="-48" width="18" height="118" fill="#E76F8A"/><path d="M0-48C-30-90-70-60-40-48zM0-48C30-90 70-60 40-48z" fill="#E9B872"/></g></svg>`);

const ASSET_BASE = import.meta.env.VITE_ASSET_URL || '';

// Uploaded files are stored as "/uploads/xyz.jpg"; external images are full https URLs.
export const resolveImg = (src) => {
  if (!src) return FALLBACK_IMG;
  if (src.startsWith('/uploads/')) return `${ASSET_BASE}${src}`;
  return src;
};

// Unsplash URLs accept a width parameter; use it to avoid downloading huge images for small cards.
export const sized = (src, w) => {
  const url = resolveImg(src);
  return url.includes('images.unsplash.com') ? url.replace(/([?&])w=\d+/, `$1w=${w}`) : url;
};
