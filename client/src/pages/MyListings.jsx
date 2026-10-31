import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Package, Eye, Heart, Pencil, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { Spinner, Empty, CategoryArt, Chip } from '../components/ui';
import { imgUrl, priceLabel, STATUS_STYLE, TYPE_STYLE } from '../utils/helpers';

const TABS = ['All', 'Available', 'Reserved', 'Exchanged', 'Inactive'];

export default function MyListings() {
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState('All');
  const load = () => api.get('/resources/mine').then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (r) => {
    try {
      await api.put(`/resources/${r._id}`, { status: r.status === 'Inactive' ? 'Available' : 'Inactive' });
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const remove = async (r) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try {
      await api.delete(`/resources/${r._id}`);
      toast.success('Listing deleted');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!items) return <Spinner />;
  const shown = tab === 'All' ? items : items.filter((i) => i.status === tab);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">My listings</h1>
          <p className="mt-1 text-muted">{items.length} item{items.length === 1 ? '' : 's'} listed</p>
        </div>
        <Link to="/resources/new" className="btn-primary self-start">List an item</Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>
            {t} <span className="opacity-60">{t === 'All' ? items.length : items.filter((i) => i.status === t).length}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        {shown.length === 0 ? (
          <Empty icon={Package} title="Nothing here yet" text="Items you list will show here with their views and requests." action={<Link to="/resources/new" className="btn-primary">List your first item</Link>} />
        ) : (
          <div className="card divide-y divide-line">
            {shown.map((r) => (
              <div key={r._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link to={`/resources/${r._id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                  {r.images?.[0] ? <img src={imgUrl(r.images[0])} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={r.category} className="h-full w-full" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/resources/${r._id}`} className="font-semibold hover:text-moss-700">{r.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Chip className={TYPE_STYLE[r.listingType]}>{r.listingType}</Chip>
                    <Chip className={STATUS_STYLE[r.status]}>{r.status}</Chip>
                    <span className="font-semibold text-moss-700">{priceLabel(r)}</span>
                  </div>
                  <div className="mt-1.5 flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{r.views} views</span>
                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{r.wishlistCount} saves</span>
                    {r.pendingRequests > 0 && <Link to="/exchanges" className="font-semibold text-sun-600">{r.pendingRequests} pending request{r.pendingRequests > 1 ? 's' : ''}</Link>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {['Available', 'Inactive'].includes(r.status) && (
                    <button className="btn-outline btn-sm" onClick={() => toggleActive(r)}>{r.status === 'Inactive' ? 'Reactivate' : 'Pause'}</button>
                  )}
                  <Link to={`/resources/${r._id}/edit`} className="btn-outline btn-sm" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Link>
                  <button className="btn-outline btn-sm hover:border-brick-500 hover:text-brick-500" onClick={() => remove(r)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
