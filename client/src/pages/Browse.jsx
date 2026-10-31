import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, SearchX, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ResourceCard from '../components/ResourceCard';
import { Spinner, Empty } from '../components/ui';
import { CATEGORIES, CONDITIONS, LISTING_TYPES } from '../utils/helpers';

const SORTS = [
  ['newest', 'Newest first'],
  ['relevance', 'Best match'],
  ['popular', 'Most viewed'],
  ['priceLow', 'Price: low to high'],
  ['priceHigh', 'Price: high to low']
];

function CheckGroup({ title, options, value, onChange }) {
  const selected = value ? value.split(',') : [];
  const toggle = (o) => {
    const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
    onChange(next.join(','));
  };
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="space-y-1.5">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-moss-600" checked={selected.includes(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const { isSaved, toggleSave } = useAuth();
  const [data, setData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(params.get('q') || '');

  const get = (k) => params.get(k) || '';
  const update = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  useEffect(() => setQ(params.get('q') || ''), [params]);
  useEffect(() => {
    setData(null);
    api.get('/resources', { params: Object.fromEntries(params) }).then((r) => setData(r.data)).catch(() => setData({ items: [], total: 0, pages: 0 }));
  }, [params]);

  const activeCount = ['category', 'listingType', 'condition', 'minPrice', 'maxPrice'].filter((k) => params.get(k)).length;

  const filters = (
    <div className="space-y-6">
      <CheckGroup title="Category" options={CATEGORIES} value={get('category')} onChange={(v) => update('category', v)} />
      <CheckGroup title="How it's offered" options={LISTING_TYPES} value={get('listingType')} onChange={(v) => update('listingType', v)} />
      <CheckGroup title="Condition" options={CONDITIONS} value={get('condition')} onChange={(v) => update('condition', v)} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price (₹)</legend>
        <div className="flex items-center gap-2">
          <input key={`min${get("minPrice")}`} className="input" type="number" min="0" placeholder="Min" defaultValue={get('minPrice')} onBlur={(e) => update('minPrice', e.target.value)} aria-label="Minimum price" />
          <span className="text-muted">–</span>
          <input key={`max${get("maxPrice")}`} className="input" type="number" min="0" placeholder="Max" defaultValue={get('maxPrice')} onBlur={(e) => update('maxPrice', e.target.value)} aria-label="Maximum price" />
        </div>
      </fieldset>
      {activeCount > 0 && (
        <button className="btn-ghost w-full" onClick={() => setParams(params.get('q') ? { q: params.get('q') } : {})}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{get('q') ? `Results for “${get('q')}”` : 'Browse campus listings'}</h1>
          <p className="mt-1 text-muted">{data ? `${data.total} item${data.total === 1 ? '' : 's'} available` : 'Searching…'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
          </button>
          <select className="input w-auto" value={get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)} aria-label="Sort">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          update('q', q.trim());
        }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “arduino”, “lab coat”, “cycle”…" aria-label="Search" />
        <button className="btn-primary">Search</button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setShowFilters(false)} />
            <div className="absolute inset-y-0 right-0 w-80 overflow-y-auto bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="section-title">Filters</h2>
                <button onClick={() => setShowFilters(false)} aria-label="Close filters"><X className="h-5 w-5" /></button>
              </div>
              {filters}
            </div>
          </div>
        )}
        <div>
          {!data ? (
            <Spinner />
          ) : data.items.length === 0 ? (
            <Empty icon={SearchX} title="Nothing matches yet" text="Try fewer filters or a broader word. You can also post a request in the community so owners can find you." />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((r) => <ResourceCard key={r._id} r={r} saved={isSaved(r._id)} onToggleSave={toggleSave} />)}
              </div>
              {data.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button className="btn-outline btn-sm" disabled={data.page <= 1} onClick={() => update('page', data.page - 1)}>Previous</button>
                  <span className="px-3 text-sm text-muted">Page {data.page} of {data.pages}</span>
                  <button className="btn-outline btn-sm" disabled={data.page >= data.pages} onClick={() => update('page', data.page + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
