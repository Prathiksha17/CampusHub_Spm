import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ImagePlus, Sparkles, X } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { Spinner } from '../components/ui';
import { CATEGORIES, CONDITIONS, LISTING_TYPES, imgUrl, inr } from '../utils/helpers';

const TYPE_HELP = {
  Sell: 'Hand it over for a price.',
  Rent: 'Charge per day, get it back.',
  Lend: 'Free to borrow, get it back.',
  Swap: 'Trade for something you need.',
  Donate: 'Give it away. Earns the most green points.'
};

const EMPTY = { title: '', description: '', category: 'Books', condition: 'Good', listingType: 'Sell', price: '', rentPerDay: '', swapFor: '', location: '', tags: '' };

export default function ResourceForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [existing, setExisting] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/resources/${id}`).then(({ data }) => {
      const r = data.resource;
      setForm({ ...EMPTY, ...r, tags: (r.tags || []).join(', '), price: r.price || '', rentPerDay: r.rentPerDay || '' });
      setExisting(r.images || []);
      setLoading(false);
    });
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addFiles = (list) => {
    const incoming = [...list].filter((f) => f.type.startsWith('image/'));
    const room = 6 - existing.length - files.length;
    if (incoming.length > room) toast.error('You can attach up to 6 photos');
    setFiles((f) => [...f, ...incoming.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const suggest = async () => {
    try {
      const { data } = await api.get('/ai/price-suggest', { params: { category: form.category, condition: form.condition, title: form.title } });
      setSuggestion(data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    ['title', 'description', 'category', 'condition', 'listingType', 'swapFor', 'location'].forEach((k) => fd.append(k, form[k] || ''));
    fd.append('price', form.listingType === 'Sell' ? form.price || 0 : 0);
    fd.append('rentPerDay', form.listingType === 'Rent' ? form.rentPerDay || 0 : 0);
    fd.append('tags', JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean)));
    if (id) fd.append('keepImages', JSON.stringify(existing));
    files.forEach((f) => fd.append('images', f.file));
    try {
      const { data } = id ? await api.put(`/resources/${id}`, fd) : await api.post('/resources', fd);
      toast.success(id ? 'Listing updated' : 'Listing published');
      nav(`/resources/${data._id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">{id ? 'Edit listing' : 'List an item'}</h1>
      <p className="mt-1 text-muted">Clear photos and an honest condition get the fastest replies.</p>

      <form onSubmit={submit} className="mt-8 space-y-8">
        <section className="card space-y-5 p-6">
          <div>
            <span className="label">How do you want to offer it?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {LISTING_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setForm({ ...form, listingType: t })}
                  className={`rounded-lg border p-3 text-left transition-colors ${form.listingType === t ? 'border-moss-600 bg-moss-50' : 'border-line hover:border-moss-200'}`}
                >
                  <div className="font-semibold">{t}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted">{TYPE_HELP[t]}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" required maxLength={120} className="input" placeholder="e.g. Casio fx-991EX calculator" value={form.title} onChange={set('title')} />
          </div>
          <div>
            <label className="label" htmlFor="desc">Description</label>
            <textarea id="desc" required rows={5} className="input" placeholder="What's included, how long you've used it, any marks or missing parts" value={form.description} onChange={set('description')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cat">Category</label>
              <select id="cat" className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cond">Condition</label>
              <select id="cond" className="input" value={form.condition} onChange={set('condition')}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {form.listingType === 'Sell' && (
            <div>
              <label className="label" htmlFor="price">Price (₹)</label>
              <div className="flex gap-2">
                <input id="price" type="number" min="0" required className="input" value={form.price} onChange={set('price')} />
                <button type="button" className="btn-outline shrink-0" onClick={suggest}><Sparkles className="h-4 w-4 text-sun-600" /> Suggest a price</button>
              </div>
            </div>
          )}
          {form.listingType === 'Rent' && (
            <div>
              <label className="label" htmlFor="rent">Rent per day (₹)</label>
              <div className="flex gap-2">
                <input id="rent" type="number" min="1" required className="input" value={form.rentPerDay} onChange={set('rentPerDay')} />
                <button type="button" className="btn-outline shrink-0" onClick={suggest}><Sparkles className="h-4 w-4 text-sun-600" /> Suggest a rate</button>
              </div>
            </div>
          )}
          {suggestion && ['Sell', 'Rent'].includes(form.listingType) && (
            <div className="rounded-lg bg-sun-100 p-4 text-sm">
              {form.listingType === 'Sell' ? (
                <>Students usually price this at <b>{inr(suggestion.low)}–{inr(suggestion.high)}</b>. Suggested: <b>{inr(suggestion.suggested)}</b></>
              ) : (
                <>A fair daily rate is around <b>{inr(suggestion.rentPerDay)}</b></>
              )}
              <span className="text-muted"> · based on {suggestion.basis}</span>
              <button
                type="button"
                className="ml-3 font-semibold text-moss-700 underline"
                onClick={() => setForm({ ...form, ...(form.listingType === 'Sell' ? { price: suggestion.suggested } : { rentPerDay: suggestion.rentPerDay }) })}
              >
                Use it
              </button>
            </div>
          )}
          {form.listingType === 'Swap' && (
            <div>
              <label className="label" htmlFor="swap">What would you swap it for?</label>
              <input id="swap" className="input" placeholder="e.g. Any DSA book or a scientific calculator" value={form.swapFor} onChange={set('swapFor')} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="loc">Pickup spot</label>
              <input id="loc" required className="input" placeholder="e.g. Main Library, Kaveri Block" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label" htmlFor="tags">Tags</label>
              <input id="tags" className="input" placeholder="comma separated: dsa, cse, sem 3" value={form.tags} onChange={set('tags')} />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <span className="label">Photos <span className="font-normal text-muted">(up to 6)</span></span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {existing.map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                <img src={imgUrl(src)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setExisting((e) => e.filter((x) => x !== src))} className="absolute right-1 top-1 rounded-full bg-ink/70 p-0.5 text-white" aria-label="Remove photo">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {files.map((f) => (
              <div key={f.url} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                <img src={f.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))} className="absolute right-1 top-1 rounded-full bg-ink/70 p-0.5 text-white" aria-label="Remove photo">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {existing.length + files.length < 6 && (
              <label
                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-muted hover:border-moss-500 hover:text-moss-600"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <ImagePlus className="h-6 w-6" />
                <span className="mt-1 text-xs">Add</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn-primary px-6" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish listing'}</button>
        </div>
      </form>
    </div>
  );
}
