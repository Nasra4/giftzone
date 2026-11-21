import { useEffect, useState } from 'react';
import { FALLBACK_IMG, sized } from '../utils/images';

// Always renders something: missing src or a failed load swaps to the inline fallback illustration.
export default function SafeImage({ src, alt = '', width = 800, className = '', ...rest }) {
  const [url, setUrl] = useState(sized(src, width));
  useEffect(() => { setUrl(sized(src, width)); }, [src, width]);
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => url !== FALLBACK_IMG && setUrl(FALLBACK_IMG)}
      className={`h-full w-full object-cover ${className}`}
      {...rest}
    />
  );
}
