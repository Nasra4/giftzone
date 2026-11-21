import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

export default function Rating({ value = 0, count, size = 14, showCount = true }) {
  const stars = [1, 2, 3, 4, 5].map((i) => {
    if (value >= i - 0.25) return <FaStar key={i} />;
    if (value >= i - 0.75) return <FaStarHalfAlt key={i} />;
    return <FaRegStar key={i} className="text-gray-300" />;
  });
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${value} out of 5`}>
      <span className="flex gap-0.5 text-gold" style={{ fontSize: size }}>{stars}</span>
      {showCount && count !== undefined && <span className="text-xs text-ink-soft">{value > 0 ? value.toFixed(1) : 'New'} {count > 0 && `(${count})`}</span>}
    </span>
  );
}

export function RatingInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} className="text-2xl text-gold transition hover:scale-110">
          {i <= value ? <FaStar /> : <FaRegStar className="text-gray-300" />}
        </button>
      ))}
    </div>
  );
}
