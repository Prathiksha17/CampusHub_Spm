import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import { CategoryArt, TrustBadge } from './ui';
import { imgUrl, priceLabel, TYPE_STYLE, timeAgo } from '../utils/helpers';

export default function ResourceCard({ r, reason, saved, onToggleSave }) {
  return (
    <article className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <Link to={`/resources/${r._id}`} className="relative block aspect-[4/3] overflow-hidden">
        {r.images?.[0] ? (
          <img src={imgUrl(r.images[0])} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <CategoryArt category={r.category} className="h-full w-full" />
        )}
        <span className={`chip absolute left-3 top-3 ${TYPE_STYLE[r.listingType]}`}>{r.listingType}</span>
        {r.status !== 'Available' && <span className="chip absolute bottom-3 left-3 bg-ink text-white">{r.status}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/resources/${r._id}`} className="line-clamp-2 font-semibold leading-snug hover:text-moss-700">
            {r.title}
          </Link>
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(r._id)}
              className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted hover:bg-brick-50 hover:text-brick-500"
              aria-label={saved ? 'Remove from saved' : 'Save item'}
            >
              <Heart className={`h-4 w-4 ${saved ? 'fill-brick-500 text-brick-500' : ''}`} />
            </button>
          )}
        </div>
        <div className="mt-1 font-display text-lg font-bold text-moss-700">{priceLabel(r)}</div>
        {reason && <div className="mt-1 text-xs font-medium text-sun-600">{reason}</div>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{r.location}</span>
          </span>
          <span className="shrink-0">{timeAgo(r.createdAt)}</span>
        </div>
        {r.owner?.name && (
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs">
            <span className="truncate text-muted">{r.owner.name}</span>
            <TrustBadge score={r.owner.trustScore} compact />
          </div>
        )}
      </div>
    </article>
  );
}
