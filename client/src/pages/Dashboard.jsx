import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Leaf, ShieldCheck, ArrowLeftRight, Trophy, Inbox } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ResourceCard from '../components/ResourceCard';
import { Spinner, Stat, Empty } from '../components/ui';
import { timeAgo } from '../utils/helpers';

export default function Dashboard() {
  const { user, isSaved, toggleSave } = useAuth();
  const [recs, setRecs] = useState(null);
  const [latest, setLatest] = useState([]);
  const [pending, setPending] = useState([]);
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    api.get('/ai/recommendations', { params: { limit: 8 } }).then((r) => setRecs(r.data)).catch(() => setRecs([]));
    api.get('/resources', { params: { limit: 4 } }).then((r) => setLatest(r.data.items));
    api.get('/exchanges', { params: { role: 'incoming', status: 'Pending' } }).then((r) => setPending(r.data));
    api.get('/impact/me').then((r) => setImpact(r.data));
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">{greet}, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-muted">Here's what's moving around campus today.</p>
        </div>
        <Link to="/resources/new" className="btn-sun self-start">List something you no longer use</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Leaf} label="Green points" value={user.greenPoints} hint={impact ? `Rank #${impact.rank} on campus` : ' '} />
        <Stat icon={ShieldCheck} tone="sky" label="Trust score" value={`${user.trustScore}/100`} hint={`${user.ratingCount} reviews`} />
        <Stat icon={ArrowLeftRight} tone="sun" label="Exchanges done" value={user.completedExchanges} hint={impact ? `${impact.totals.co2} kg CO₂ avoided` : ' '} />
        <Stat icon={Trophy} tone="brick" label="Badges" value={user.badges?.length || 0} hint={user.badges?.[0] || 'Complete an exchange to start'} />
      </div>

      {pending.length > 0 && (
        <section className="card border-sun-400 bg-sun-100/50 p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Inbox className="h-4 w-4 text-sun-600" /> {pending.length} request{pending.length > 1 ? 's' : ''} waiting for your reply
          </div>
          <ul className="mt-3 space-y-2">
            {pending.slice(0, 3).map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <b>{p.requester?.name}</b> wants <b>{p.resource?.title}</b> <span className="text-muted">· {timeAgo(p.createdAt)}</span>
                </span>
                <Link to="/exchanges" className="btn-outline btn-sm shrink-0">Review</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="section-title flex items-center gap-2"><Sparkles className="h-4 w-4 text-sun-600" /> Picked for you</h2>
            <p className="text-sm text-muted">Based on what you browse, save and your department.</p>
          </div>
          <Link to="/insights" className="text-sm font-semibold text-moss-600 hover:underline">Why these?</Link>
        </div>
        {!recs ? (
          <Spinner />
        ) : recs.length === 0 ? (
          <Empty icon={Sparkles} title="No picks yet" text="Browse a few listings or add interests to your profile and we'll start suggesting items." action={<Link to="/browse" className="btn-primary">Browse listings</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recs.map(({ resource, reason }) => (
              <ResourceCard key={resource._id} r={resource} reason={reason} saved={isSaved(resource._id)} onToggleSave={toggleSave} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="section-title">Just listed</h2>
          <Link to="/browse" className="text-sm font-semibold text-moss-600 hover:underline">See everything</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((r) => (
            <ResourceCard key={r._id} r={r} saved={isSaved(r._id)} onToggleSave={toggleSave} />
          ))}
        </div>
      </section>
    </div>
  );
}
