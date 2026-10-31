import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Award, Camera, Flag, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ResourceCard from '../components/ResourceCard';
import { Avatar, Modal, Spinner, Stars, Chip } from '../components/ui';
import { CATEGORIES, DEPARTMENTS, fmtDate, timeAgo, trustTone } from '../utils/helpers';

function TrustRing({ score }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#2E5E4E' : score >= 50 ? '#B88A16' : '#B4533A';
  return (
    <svg viewBox="0 0 110 110" className="h-28 w-28" role="img" aria-label={`Trust score ${score} out of 100`}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E1E2D9" strokeWidth="9" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 55 55)" />
      <text x="55" y="57" textAnchor="middle" fontSize="28" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif" fill="#1A2421">{score}</text>
      <text x="55" y="75" textAnchor="middle" fontSize="10" fill="#5F6B66">trust</text>
    </svg>
  );
}

function EditProfile({ user, onSaved }) {
  const [form, setForm] = useState({
    name: user.name, department: user.department, year: user.year, phone: user.phone || '', bio: user.bio || '', hostel: user.hostel || '', studentId: user.studentId || '',
    interests: (user.interests || []).join(', ')
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean) };
      const { data } = await api.put('/auth/profile', payload);
      onSaved(data);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password updated');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <form onSubmit={save} className="card space-y-4 p-6">
        <h2 className="section-title">Profile details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={form.name} onChange={set('name')} /></div>
          <div><label className="label" htmlFor="psid">Student ID</label><input id="psid" className="input" value={form.studentId} onChange={set('studentId')} /></div>
          <div>
            <label className="label" htmlFor="pd">Department</label>
            <select id="pd" className="input" value={form.department} onChange={set('department')}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="py">Year</label>
            <select id="py" className="input" value={form.year} onChange={set('year')}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
          </div>
          <div><label className="label" htmlFor="pp">Phone</label><input id="pp" className="input" value={form.phone} onChange={set('phone')} /></div>
          <div><label className="label" htmlFor="ph">Hostel / block</label><input id="ph" className="input" value={form.hostel} onChange={set('hostel')} /></div>
        </div>
        <div><label className="label" htmlFor="pb">Bio</label><textarea id="pb" rows={3} maxLength={300} className="input" value={form.bio} onChange={set('bio')} /></div>
        <div>
          <label className="label" htmlFor="pi">Interests</label>
          <input id="pi" className="input" value={form.interests} onChange={set('interests')} placeholder={`e.g. ${CATEGORIES.slice(0, 3).join(', ')}, arduino`} />
          <p className="mt-1 text-xs text-muted">Comma separated. Used to tune your recommendations.</p>
        </div>
        <div className="flex justify-end"><button className="btn-primary">Save profile</button></div>
      </form>
      <form onSubmit={changePw} className="card h-fit space-y-4 p-6">
        <h2 className="section-title">Change password</h2>
        <div><label className="label" htmlFor="cp">Current password</label><input id="cp" type="password" required className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
        <div><label className="label" htmlFor="np">New password</label><input id="np" type="password" minLength={6} required className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        <button className="btn-outline w-full">Update password</button>
      </form>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me, setUser, isSaved, toggleSave } = useAuth();
  const targetId = id || me._id;
  const own = targetId === me._id;
  const [data, setData] = useState(null);
  const [revStats, setRevStats] = useState(null);
  const [tab, setTab] = useState('listings');
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setData(null);
    setTab('listings');
    api.get(`/users/${targetId}`).then((r) => setData(r.data));
    api.get(`/reviews/user/${targetId}`).then((r) => setRevStats(r.data));
  }, [targetId]);

  if (!data) return <Spinner />;
  const u = own ? { ...data.user, ...me } : data.user;

  const uploadAvatar = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data: updated } = await api.put('/auth/profile', fd);
      setUser(updated);
      toast.success('Photo updated');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const message = async () => {
    const { data: conv } = await api.post('/messages/start', { userId: u._id });
    nav(`/messages/${conv._id}`);
  };
  const report = async () => {
    try {
      await api.post('/reports', { targetType: 'User', targetId: u._id, reason });
      toast.success('Report sent to moderators');
      setReportOpen(false);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const total = revStats?.reviews.length || 0;

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative w-fit">
            <Avatar user={u} size={96} />
            {own && (
              <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border-2 border-white bg-moss-600 p-1.5 text-white" title="Change photo">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadAvatar(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{u.name}</h1>
              {u.isVerified && <Chip className="bg-moss-50 text-moss-700"><ShieldCheck className="h-3 w-3" /> Verified student</Chip>}
              {u.role === 'admin' && <Chip className="bg-ink text-white">Admin</Chip>}
            </div>
            <p className="text-muted">{u.department} · Year {u.year}{u.hostel ? ` · ${u.hostel}` : ''} · Joined {fmtDate(u.createdAt)}</p>
            {u.bio && <p className="mt-2 max-w-xl">{u.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><Stars value={u.ratingAvg} /> {u.ratingAvg || '—'} ({u.ratingCount} reviews)</span>
              <span><b>{u.completedExchanges}</b> exchanges</span>
              <span className="text-moss-700"><b>{u.greenPoints}</b> green points</span>
            </div>
            {!own && (
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" onClick={message}><MessageCircle className="h-4 w-4" /> Message</button>
                <button className="btn-ghost" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" /> Report</button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <TrustRing score={u.trustScore} />
            <span className={`text-xs font-semibold ${trustTone(u.trustScore)}`}>{u.trustScore >= 75 ? 'Highly trusted' : u.trustScore >= 50 ? 'Building trust' : 'New or low trust'}</span>
          </div>
        </div>
        {u.badges?.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {u.badges.map((b) => (
              <span key={b} className="chip border border-sun-400 bg-sun-100 py-1 text-sun-600"><Award className="h-3.5 w-3.5" /> {b}</span>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-1">
        {[['listings', `Listings (${data.listings.length})`], ['reviews', `Reviews (${total})`], ...(own ? [['edit', 'Edit profile']] : [])].map(([v, l]) => (
          <button key={v} className={`tab ${tab === v ? 'tab-active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === 'listings' &&
        (data.listings.length === 0 ? (
          <p className="text-muted">No active listings. {own && <Link to="/resources/new" className="font-semibold text-moss-600 underline">List an item</Link>}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.listings.map((r) => <ResourceCard key={r._id} r={{ ...r, owner: undefined }} saved={isSaved(r._id)} onToggleSave={own ? undefined : toggleSave} />)}
          </div>
        ))}

      {tab === 'reviews' && revStats && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="card h-fit p-6">
            <div className="font-display text-4xl font-bold">{u.ratingAvg || '—'}</div>
            <Stars value={u.ratingAvg} size={18} />
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{s}</span><Star className="h-3 w-3 fill-sun-400 text-sun-400" />
                  <div className="h-2 flex-1 rounded-full bg-paper"><div className="h-2 rounded-full bg-sun-400" style={{ width: `${total ? (revStats.distribution[s - 1] / total) * 100 : 0}%` }} /></div>
                  <span className="w-5 text-right text-muted">{revStats.distribution[s - 1]}</span>
                </div>
              ))}
            </div>
            {Object.keys(revStats.tags).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {Object.entries(revStats.tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => <Chip key={t} className="bg-moss-50 text-moss-700">{t} · {n}</Chip>)}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {revStats.reviews.length === 0 && <p className="text-muted">No reviews yet.</p>}
            {revStats.reviews.map((r) => (
              <div key={r._id} className="card p-5">
                <div className="flex items-center gap-3">
                  <Avatar user={r.reviewer} size={32} />
                  <div className="flex-1">
                    <Link to={`/profile/${r.reviewer?._id}`} className="font-semibold hover:underline">{r.reviewer?.name}</Link>
                    <div className="text-xs text-muted">{timeAgo(r.createdAt)}</div>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="mt-3 text-sm">{r.comment}</p>}
                {r.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{r.tags.map((t) => <Chip key={t} className="bg-paper text-muted">{t}</Chip>)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'edit' && own && <EditProfile user={me} onSaved={setUser} />}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={`Report ${u.name}`}>
        <textarea className="input" rows={4} placeholder="What happened? Moderators will review this privately." value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn-danger mt-3 w-full" disabled={!reason.trim()} onClick={report}>Send report</button>
      </Modal>
    </div>
  );
}
