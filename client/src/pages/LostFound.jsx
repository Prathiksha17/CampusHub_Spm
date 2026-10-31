import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Plus, SearchCheck, Sparkles, Calendar } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar, CategoryArt, Chip, Empty, Modal, Spinner } from '../components/ui';
import { CATEGORIES, STATUS_STYLE, fmtDate, imgUrl, timeAgo } from '../utils/helpers';

function PostForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'Lost', title: '', description: '', category: 'Other', location: '', date: new Date().toISOString().slice(0, 10), contact: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('image', file);
    try {
      const { data } = await api.post('/lostfound', fd);
      toast.success(data.matches.length ? `Posted. We found ${data.matches.length} possible match${data.matches.length > 1 ? 'es' : ''}!` : 'Posted. We will notify you if a match appears.');
      onCreated(data.item._id);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Report a lost or found item" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {['Lost', 'Found'].map((t) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`rounded-lg border p-3 font-semibold ${form.type === t ? 'border-moss-600 bg-moss-50' : 'border-line'}`}>
              I {t.toLowerCase()} something
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="lt">What is it?</label>
          <input id="lt" required className="input" placeholder="e.g. Black Casio calculator" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="label" htmlFor="ld">Description</label>
          <textarea id="ld" required rows={3} className="input" placeholder="Colour, brand, stickers, anything that identifies it" value={form.description} onChange={set('description')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="lc">Category</label>
            <select id="lc" className="input" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="ll">Where</label>
            <input id="ll" required className="input" placeholder="e.g. Exam Hall B" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className="label" htmlFor="ldt">When</label>
            <input id="ldt" type="date" className="input" value={form.date} onChange={set('date')} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lcon">Contact preference</label>
            <input id="lcon" className="input" placeholder="Message on CampusHub" value={form.contact} onChange={set('contact')} />
          </div>
          <div>
            <label className="label" htmlFor="limg">Photo (optional)</label>
            <input id="limg" type="file" accept="image/*" className="input py-1.5" onChange={(e) => setFile(e.target.files[0])} />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Posting…' : 'Post and look for matches'}</button>
      </form>
    </Modal>
  );
}

function Detail({ id, onClose, onChanged }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api.get(`/lostfound/${id}`).then((r) => setData(r.data));
  useEffect(() => {
    load();
  }, [id]);
  if (!data) return <Modal open onClose={onClose} title="Loading"><Spinner /></Modal>;
  const { item, matches } = data;
  const mine = item.reporter?._id === user._id;
  const claimed = item.claims?.some((c) => (c.user?._id || c.user) === user._id);

  const claim = async () => {
    try {
      await api.post(`/lostfound/${id}/claim`, { message: msg });
      toast.success('The reporter has been notified');
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const setStatus = async (status) => {
    await api.patch(`/lostfound/${id}/status`, { status });
    toast.success(`Marked as ${status.toLowerCase()}`);
    load();
    onChanged();
  };
  const startChat = async (uid) => {
    const { data: conv } = await api.post('/messages/start', { userId: uid });
    nav(`/messages/${conv._id}`);
  };

  return (
    <Modal open onClose={onClose} title={item.title} wide>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <div className="aspect-square overflow-hidden rounded-lg">
          {item.image ? <img src={imgUrl(item.image)} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={item.category} className="h-full w-full" />}
        </div>
        <div>
          <div className="flex gap-2">
            <Chip className={item.type === 'Lost' ? 'bg-brick-50 text-brick-600' : 'bg-moss-50 text-moss-700'}>{item.type}</Chip>
            <Chip className={STATUS_STYLE[item.status]}>{item.status}</Chip>
          </div>
          <p className="mt-3 text-sm">{item.description}</p>
          <div className="mt-3 space-y-1 text-sm text-muted">
            <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{item.location}</div>
            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(item.date)}</div>
            <div className="flex items-center gap-1.5"><Avatar user={item.reporter} size={18} /> {item.reporter?.name}{item.contact ? ` · ${item.contact}` : ''}</div>
          </div>
        </div>
      </div>

      {mine ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {item.status !== 'Resolved' && <button className="btn-primary btn-sm" onClick={() => setStatus('Resolved')}>Mark resolved</button>}
            {item.status === 'Open' && <button className="btn-outline btn-sm" onClick={() => setStatus('Claimed')}>Mark claimed</button>}
            {item.status !== 'Open' && <button className="btn-outline btn-sm" onClick={() => setStatus('Open')}>Reopen</button>}
          </div>
          {item.claims?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Responses</h3>
              <ul className="space-y-2">
                {item.claims.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-paper p-3 text-sm">
                    <span><b>{c.user?.name}</b>: {c.message || 'No message'} <span className="text-muted">· {timeAgo(c.at)}</span></span>
                    <button className="btn-outline btn-sm shrink-0" onClick={() => startChat(c.user?._id)}>Message</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : item.status === 'Open' && !claimed ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <input className="input" placeholder={item.type === 'Found' ? 'Describe something only the owner would know' : 'Where did you find it?'} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={claim}>{item.type === 'Found' ? 'This is mine' : 'I found this'}</button>
        </div>
      ) : (
        claimed && <p className="mt-6 rounded-lg bg-moss-50 p-3 text-sm">You responded to this post. The reporter will reach out.</p>
      )}

      {matches.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-sun-600" /> Possible matches</h3>
          <ul className="mt-3 space-y-2">
            {matches.map((m) => (
              <li key={m.item._id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{m.item.title}</span>
                  <span className="block truncate text-xs text-muted">{m.item.type} at {m.item.location} · {m.item.reporter?.name}</span>
                </span>
                <span className="shrink-0 rounded-full bg-sun-100 px-2 py-0.5 text-xs font-bold text-sun-600">{m.score}% match</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

export default function LostFound() {
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('Open');
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const openId = params.get('item');

  const load = () => api.get('/lostfound', { params: { type: type || undefined, status, q: q || undefined } }).then((r) => setItems(r.data));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [type, status, q]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Lost & found</h1>
          <p className="mt-1 text-muted">Post what you lost or found. New posts are matched automatically and both people are notified.</p>
        </div>
        <button className="btn-primary self-start" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Report an item</button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1">
          {[['', 'All'], ['Lost', 'Lost'], ['Found', 'Found']].map(([v, l]) => (
            <button key={l} className={`tab ${type === v ? 'tab-active' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <input className="input sm:max-w-xs" placeholder="Search by item or place" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lost and found" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="Open">Open</option>
          <option value="Claimed">Claimed</option>
          <option value="Resolved">Resolved</option>
          <option value="all">Any status</option>
        </select>
      </div>

      <div className="mt-6">
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty icon={SearchCheck} title="No posts match" text="Nothing reported here yet. If you've lost something, post it so finders can reach you." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <button key={it._id} onClick={() => setParams({ item: it._id })} className="card flex gap-4 p-4 text-left hover:border-moss-500">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  {it.image ? <img src={imgUrl(it.image)} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={it.category} className="h-full w-full" />}
                </div>
                <div className="min-w-0">
                  <div className="flex gap-1.5">
                    <Chip className={it.type === 'Lost' ? 'bg-brick-50 text-brick-600' : 'bg-moss-50 text-moss-700'}>{it.type}</Chip>
                    {it.status !== 'Open' && <Chip className={STATUS_STYLE[it.status]}>{it.status}</Chip>}
                  </div>
                  <div className="mt-1 truncate font-semibold">{it.title}</div>
                  <div className="flex items-center gap-1 truncate text-xs text-muted"><MapPin className="h-3 w-3 shrink-0" />{it.location}</div>
                  <div className="text-xs text-muted">{timeAgo(it.createdAt)} · {it.reporter?.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {creating && <PostForm onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); load(); setParams({ item: id }); }} />}
      {openId && <Detail id={openId} onClose={() => setParams({})} onChanged={load} />}
    </div>
  );
}
