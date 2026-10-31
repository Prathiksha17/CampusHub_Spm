import { useEffect } from 'react';
import { Star, X, ShieldCheck, Loader2 } from 'lucide-react';
import { imgUrl, trustTone, CATEGORY_META } from '../utils/helpers';

export const Spinner = ({ className = '' }) => (
  <div className={`flex justify-center py-16 ${className}`}>
    <Loader2 className="h-6 w-6 animate-spin text-moss-500" aria-label="Loading" />
  </div>
);

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-moss-50 p-3">
          <Icon className="h-6 w-6 text-moss-600" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ user, size = 36, online }) {
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const hue = [...(user?.name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={imgUrl(user.avatar)} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full font-semibold"
          style={{ background: `hsl(${hue} 35% 88%)`, color: `hsl(${hue} 40% 28%)`, fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}
      {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-moss-500" />}
    </span>
  );
}

export function Stars({ value = 0, size = 14, onChange }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          aria-label={`${i} star`}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star style={{ width: size, height: size }} className={i <= Math.round(value) ? 'fill-sun-400 text-sun-400' : 'text-line'} />
        </button>
      ))}
    </span>
  );
}

export function TrustBadge({ score = 0, verified, compact }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trustTone(score)}`} title="Trust score (0-100)">
      <ShieldCheck className="h-3.5 w-3.5" />
      {compact ? score : `Trust ${score}`}
      {verified && <span className="ml-1 rounded bg-moss-50 px-1 text-[10px] text-moss-700">Verified</span>}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-paper" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CategoryArt({ category, className = '' }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.Other;
  const Icon = meta.icon;
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: meta.bg }}>
      <Icon className="h-1/3 w-1/3 max-h-16 max-w-16" style={{ color: meta.fg }} strokeWidth={1.4} />
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'moss' }) {
  const tones = { moss: 'bg-moss-50 text-moss-700', sun: 'bg-sun-100 text-sun-600', brick: 'bg-brick-50 text-brick-600', sky: 'bg-sky-50 text-sky-600' };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={`rounded-lg p-2 ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-sm text-muted">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const Chip = ({ className = '', children }) => <span className={`chip ${className}`}>{children}</span>;
