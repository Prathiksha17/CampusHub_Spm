import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Lightbulb, TrendingUp, Search, Eye, Heart } from 'lucide-react';
import api from '../api/axios';
import { Spinner, Chip } from '../components/ui';
import { STATUS_STYLE } from '../utils/helpers';

const tip = { contentStyle: { borderRadius: 10, border: '1px solid #E1E2D9', fontSize: 13 } };

export default function Insights() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get('/ai/insights').then((r) => setD(r.data));
  }, []);
  if (!d) return <Spinner />;
  const maxInterest = Math.max(1, ...d.myInterests.map((i) => i.weight));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Insights</h1>
        <p className="mt-1 text-muted">What students are looking for, and how your listings are doing.</p>
      </div>

      <section className="card border-sun-400 p-6">
        <h2 className="section-title flex items-center gap-2"><Lightbulb className="h-5 w-5 text-sun-600" /> Suggestions for you</h2>
        <ul className="mt-3 space-y-2">
          {d.tips.map((t, i) => <li key={i} className="rounded-lg bg-sun-100/60 px-4 py-3 text-sm">{t}</li>)}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card p-6">
          <h2 className="section-title flex items-center gap-2"><TrendingUp className="h-5 w-5 text-moss-600" /> Demand vs supply, last 30 days</h2>
          <p className="text-sm text-muted">Requests and saves compared with items currently available</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={d.categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E2D9" vertical={false} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="demand" name="Requests + saves" fill="#F2C14E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#2E5E4E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title flex items-center gap-2"><Search className="h-5 w-5 text-sky-600" /> Top searches</h2>
          <ol className="mt-4 space-y-2">
            {d.topSearches.length === 0 && <li className="text-sm text-muted">No searches yet this month.</li>}
            {d.topSearches.map((s, i) => (
              <li key={s.query}>
                <Link to={`/browse?q=${encodeURIComponent(s.query)}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-paper">
                  <span><span className="mr-2 font-display font-bold text-muted">{i + 1}</span>{s.query}</span>
                  <span className="text-xs text-muted">{s.count}×</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">What we think you like</h2>
          <p className="text-sm text-muted">Learned from your views, saves, searches and requests. This shapes “Picked for you”.</p>
          <ul className="mt-4 space-y-3">
            {d.myInterests.length === 0 && <li className="text-sm text-muted">Browse a few items to build your profile.</li>}
            {d.myInterests.map((i) => (
              <li key={i.category}>
                <div className="flex justify-between text-sm"><span className="font-medium">{i.category}</span></div>
                <div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-sun-400" style={{ width: `${(i.weight / maxInterest) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {Object.entries(d.myExchanges).map(([k, v]) => <Chip key={k} className={STATUS_STYLE[k]}>{k}: {v}</Chip>)}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Your listing performance</h2>
          {d.myListings.length === 0 ? (
            <p className="mt-3 text-sm text-muted">You haven't listed anything yet. <Link to="/resources/new" className="font-semibold text-moss-600 underline">List an item</Link></p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {d.myListings.map((l) => (
                <li key={l._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link to={`/resources/${l._id}`} className="truncate hover:text-moss-700">{l.title}</Link>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{l.views}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{l.wishlistCount}</span>
                    <Chip className={STATUS_STYLE[l.status]}>{l.status}</Chip>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
