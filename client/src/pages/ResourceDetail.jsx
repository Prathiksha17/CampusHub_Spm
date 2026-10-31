import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, MapPin, Eye, Flag, MessageCircle, Pencil, Trash2, Calendar, Tag } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ResourceCard from '../components/ResourceCard';
import { Avatar, CategoryArt, Modal, Spinner, Stars, TrustBadge, Chip } from '../components/ui';
import { imgUrl, priceLabel, TYPE_STYLE, STATUS_STYLE, timeAgo, inr, fmtDate } from '../utils/helpers';

const REPORT_REASONS = ['Prohibited item', 'Misleading description', 'Spam or duplicate', 'Suspected scam', 'Offensive content'];

function RequestPanel({ r, myRequest, onDone }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ offeredPrice: r.price || '', message: '', startDate: '', endDate: '', offeredResourceId: '', meetupLocation: '' });
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (r.listingType === 'Swap') api.get('/resources/mine').then((res) => setMine(res.data.filter((x) => x.status === 'Available')));
  }, [r.listingType]);

  const days = form.startDate && form.endDate ? Math.max(1, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 864e5) + 1) : 0;
  const today = new Date().toISOString().slice(0, 10);

  if (myRequest)
    return (
      <div className="rounded-xl bg-moss-50 p-4 text-sm">
        You've sent a request. Status: <b>{myRequest.status}</b>.{' '}
        <Link to="/exchanges" className="font-semibold text-moss-700 underline">Track it in Exchanges</Link>
      </div>
    );
  if (r.status !== 'Available')
    return <div className="rounded-xl bg-paper p-4 text-sm text-muted">This item is currently {r.status.toLowerCase()}. Save it and we'll keep it in your list.</div>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/exchanges', { resourceId: r._id, ...form });
      toast.success('Request sent to the owner');
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const cta = { Sell: 'Send offer', Rent: 'Request to rent', Lend: 'Request to borrow', Swap: 'Propose swap', Donate: 'Request this item' }[r.listingType];

  return (
    <form onSubmit={submit} className="space-y-3">
      {r.listingType === 'Sell' && (
        <div>
          <label className="label" htmlFor="op">Your offer (₹)</label>
          <input id="op" type="number" min="0" className="input" value={form.offeredPrice} onChange={set('offeredPrice')} />
          <p className="mt-1 text-xs text-muted">Asking price is {inr(r.price)}. You can also negotiate in chat.</p>
        </div>
      )}
      {['Rent', 'Lend'].includes(r.listingType) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="sd">From</label>
            <input id="sd" type="date" min={today} required className="input" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div>
            <label className="label" htmlFor="ed">Until</label>
            <input id="ed" type="date" min={form.startDate || today} required className="input" value={form.endDate} onChange={set('endDate')} />
          </div>
          {r.listingType === 'Rent' && days > 0 && (
            <p className="col-span-2 text-sm">{days} day{days > 1 ? 's' : ''} × {inr(r.rentPerDay)} = <b>{inr(days * r.rentPerDay)}</b></p>
          )}
        </div>
      )}
      {r.listingType === 'Swap' && (
        <div>
          <label className="label" htmlFor="sw">Offer one of your items</label>
          {mine.length ? (
            <select id="sw" required className="input" value={form.offeredResourceId} onChange={set('offeredResourceId')}>
              <option value="">Choose an item</option>
              {mine.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
            </select>
          ) : (
            <p className="text-sm text-muted">
              You need an available listing to swap. <button type="button" className="font-semibold text-moss-600 underline" onClick={() => nav('/resources/new')}>List one now</button>
            </p>
          )}
        </div>
      )}
      <div>
        <label className="label" htmlFor="mt">Preferred meetup spot</label>
        <input id="mt" className="input" placeholder="e.g. Library entrance" value={form.meetupLocation} onChange={set('meetupLocation')} />
      </div>
      <div>
        <label className="label" htmlFor="msg">Note to the owner</label>
        <textarea id="msg" rows={2} className="input" placeholder="When can you meet?" value={form.message} onChange={set('message')} />
      </div>
      <button className="btn-primary w-full" disabled={busy || (r.listingType === 'Swap' && !mine.length)}>{busy ? 'Sending…' : cta}</button>
    </form>
  );
}

export default function ResourceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isSaved, toggleSave } = useAuth();
  const [data, setData] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [active, setActive] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ reason: REPORT_REASONS[0], details: '' });

  const load = () => api.get(`/resources/${id}`).then((r) => setData(r.data)).catch(() => setData({ error: true }));
  useEffect(() => {
    setData(null);
    setActive(0);
    load();
    api.get(`/resources/${id}/similar`).then((r) => setSimilar(r.data)).catch(() => {});
  }, [id]);

  if (!data) return <Spinner />;
  if (data.error) return <p className="text-muted">This listing doesn't exist or was removed. <Link to="/browse" className="text-moss-600 underline">Back to browse</Link></p>;
  const { resource: r, myRequest } = data;
  const isOwner = r.owner?._id === user._id;

  const message = async () => {
    try {
      const { data: conv } = await api.post('/messages/start', { userId: r.owner._id, resourceId: r._id });
      nav(`/messages/${conv._id}`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const remove = async () => {
    if (!confirm('Delete this listing? Pending requests will be cancelled.')) return;
    try {
      await api.delete(`/resources/${r._id}`);
      toast.success('Listing deleted');
      nav('/my-listings');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const sendReport = async () => {
    try {
      await api.post(`/resources/${r._id}/report`, report);
      toast.success('Report sent to moderators');
      setReportOpen(false);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-white">
            {r.images?.length ? (
              <img src={imgUrl(r.images[active])} alt={r.title} className="h-full w-full object-contain" />
            ) : (
              <CategoryArt category={r.category} className="h-full w-full" />
            )}
          </div>
          {r.images?.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {r.images.map((img, i) => (
                <button key={img} onClick={() => setActive(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? 'border-moss-600' : 'border-transparent'}`}>
                  <img src={imgUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-8">
            <h2 className="section-title">About this item</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/90">{r.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Category</dt><dd className="font-medium">{r.category}</dd></div>
              <div><dt className="text-muted">Condition</dt><dd className="font-medium">{r.condition}</dd></div>
              <div><dt className="text-muted">Department</dt><dd className="font-medium">{r.department || '—'}</dd></div>
              <div><dt className="text-muted">Listed</dt><dd className="font-medium">{fmtDate(r.createdAt)}</dd></div>
            </dl>
            {r.listingType === 'Swap' && r.swapFor && (
              <p className="mt-4 rounded-lg bg-[#EDEAF6] px-4 py-3 text-sm"><b>Looking to swap for:</b> {r.swapFor}</p>
            )}
            {r.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <Link key={t} to={`/browse?q=${encodeURIComponent(t)}`} className="chip border border-line bg-white text-muted hover:border-moss-500">
                    <Tag className="h-3 w-3" /> {t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Chip className={TYPE_STYLE[r.listingType]}>{r.listingType}</Chip>
              <Chip className={STATUS_STYLE[r.status]}>{r.status}</Chip>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">{r.title}</h1>
            <div className="mt-2 font-display text-3xl font-extrabold text-moss-700">{priceLabel(r)}</div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{r.location}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{r.views} views</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{timeAgo(r.createdAt)}</span>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/resources/${r._id}/edit`} className="btn-primary"><Pencil className="h-4 w-4" /> Edit listing</Link>
                  <Link to="/exchanges" className="btn-outline">View requests</Link>
                  <button className="btn-ghost text-brick-500" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              ) : (
                <RequestPanel r={r} myRequest={myRequest} onDone={load} />
              )}
            </div>
            {!isOwner && (
              <div className="mt-4 flex gap-2">
                <button className="btn-outline flex-1" onClick={message}><MessageCircle className="h-4 w-4" /> Message owner</button>
                <button className="btn-outline" onClick={() => toggleSave(r._id)} aria-label="Save">
                  <Heart className={`h-4 w-4 ${isSaved(r._id) ? 'fill-brick-500 text-brick-500' : ''}`} />
                </button>
                <button className="btn-outline" onClick={() => setReportOpen(true)} aria-label="Report listing" title="Report">
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <Link to={`/profile/${r.owner._id}`} className="card flex items-center gap-4 p-5 hover:border-moss-500">
            <Avatar user={r.owner} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.owner.name}</div>
              <div className="text-sm text-muted">{r.owner.department}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <TrustBadge score={r.owner.trustScore} verified={r.owner.isVerified} />
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Stars value={r.owner.ratingAvg} size={12} /> ({r.owner.ratingCount})
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              <div className="font-display text-xl font-bold text-ink">{r.owner.completedExchanges}</div>exchanges
            </div>
          </Link>
        </div>
      </div>

      {similar.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Similar items on campus</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.slice(0, 4).map((s) => <ResourceCard key={s._id} r={s} saved={isSaved(s._id)} onToggleSave={toggleSave} />)}
          </div>
        </section>
      )}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this listing">
        <div className="space-y-3">
          <select className="input" value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })} aria-label="Reason">
            {REPORT_REASONS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <textarea className="input" rows={3} placeholder="Add details for the moderators (optional)" value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} />
          <button className="btn-danger w-full" onClick={sendReport}>Send report</button>
        </div>
      </Modal>
    </div>
  );
}
