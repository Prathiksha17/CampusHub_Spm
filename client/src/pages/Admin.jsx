import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Users, Package, ArrowLeftRight, Flag, SearchCheck, MessageSquare, ShieldAlert, Megaphone } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { Avatar, Chip, Spinner, Stat } from '../components/ui';
import { STATUS_STYLE, TYPE_STYLE, fmtDate, timeAgo } from '../utils/helpers';

const PIE = ['#2E5E4E', '#F2C14E', '#2F5D8A', '#B4533A', '#5A4A9C'];
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #E1E2D9', fontSize: 13 } };
const TABS = ['Overview', 'Users', 'Listings', 'Reports', 'Exchanges', 'Broadcast'];

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get('/admin/stats').then((r) => setS(r.data));
  }, []);
  if (!s) return <Spinner />;
  const c = s.counts;
  const exTotal = Object.values(s.exchanges).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Students" value={c.users} hint={`${c.verified} verified · ${c.banned} suspended`} />
        <Stat icon={Package} tone="sky" label="Listings" value={c.resources} hint={`${c.available} available · ${c.flagged} flagged`} />
        <Stat icon={ArrowLeftRight} tone="sun" label="Exchanges" value={exTotal} hint={`${s.exchanges.Completed || 0} completed · ${s.exchanges.Pending || 0} pending`} />
        <Stat icon={Flag} tone="brick" label="Open reports" value={c.openReports} hint={`${c.lostOpen} open lost & found · ${c.posts} posts`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Growth, last 6 months</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={s.growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E2D9" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} allowDecimals={false} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="users" name="New users" stroke="#2F5D8A" strokeWidth={2} />
                <Line dataKey="listings" name="New listings" stroke="#2E5E4E" strokeWidth={2} />
                <Line dataKey="exchanges" name="Exchanges" stroke="#B88A16" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Listings by category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={s.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E2D9" vertical={false} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-25} textAnchor="end" height={55} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} allowDecimals={false} />
                <Tooltip {...tip} />
                <Bar dataKey="count" name="Listings" fill="#2E5E4E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Listing types</h2>
          <div className="mt-2 h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={s.byType} dataKey="count" nameKey="type" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {s.byType.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Newest members</h2>
          <ul className="mt-3 divide-y divide-line">
            {s.recentUsers.map((u) => (
              <li key={u._id} className="flex items-center gap-3 py-2.5 text-sm">
                <Avatar user={u} size={30} />
                <span className="flex-1"><Link to={`/profile/${u._id}`} className="font-medium hover:underline">{u.name}</Link><span className="block text-xs text-muted">{u.email}</span></span>
                <span className="text-xs text-muted">{timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState(null);
  const load = () => api.get('/admin/users', { params: { q: q || undefined, status: status || undefined } }).then((r) => setUsers(r.data));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, status]);
  const update = async (u, patch, msg) => {
    try {
      await api.patch(`/admin/users/${u._id}`, patch);
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="input sm:max-w-xs" placeholder="Search name, email or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter users">
          <option value="">Everyone</option>
          <option value="unverified">Unverified</option>
          <option value="banned">Suspended</option>
        </select>
      </div>
      {!users ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">User</th><th className="font-medium">Department</th><th className="font-medium">Trust</th><th className="font-medium">Exchanges</th><th className="font-medium">Status</th><th className="p-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-line last:border-0">
                  <td className="p-3"><span className="flex items-center gap-2"><Avatar user={u} size={30} /><span><Link to={`/profile/${u._id}`} className="font-medium hover:underline">{u.name}</Link><span className="block text-xs text-muted">{u.email}</span></span></span></td>
                  <td className="text-muted">{u.department}</td>
                  <td>{u.trustScore}</td>
                  <td>{u.completedExchanges}</td>
                  <td className="space-x-1">
                    {u.role === 'admin' && <Chip className="bg-ink text-white">Admin</Chip>}
                    {u.isVerified ? <Chip className="bg-moss-50 text-moss-700">Verified</Chip> : <Chip className="bg-sun-100 text-sun-600">Unverified</Chip>}
                    {u.isBanned && <Chip className="bg-brick-50 text-brick-600">Suspended</Chip>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {!u.isVerified && <button className="btn-outline btn-sm" onClick={() => update(u, { isVerified: true }, 'User verified')}>Verify</button>}
                      <button className="btn-outline btn-sm" onClick={() => update(u, { role: u.role === 'admin' ? 'student' : 'admin' }, 'Role updated')}>{u.role === 'admin' ? 'Make student' : 'Make admin'}</button>
                      <button className={`btn-sm btn ${u.isBanned ? 'btn-outline' : 'bg-brick-50 text-brick-600 hover:bg-brick-500 hover:text-white'}`} onClick={() => update(u, { isBanned: !u.isBanned }, u.isBanned ? 'Suspension lifted' : 'User suspended')}>
                        {u.isBanned ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ListingsTab() {
  const [q, setQ] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [items, setItems] = useState(null);
  const load = () => api.get('/admin/resources', { params: { q: q || undefined, flagged: flagged || undefined } }).then((r) => setItems(r.data));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, flagged]);
  const remove = async (r) => {
    if (!confirm(`Remove "${r.title}"? The owner will be notified.`)) return;
    await api.delete(`/admin/resources/${r._id}`);
    toast.success('Listing removed');
    load();
  };
  const unflag = async (r) => {
    await api.patch(`/admin/resources/${r._id}`, { isFlagged: !r.isFlagged });
    load();
  };
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="input sm:max-w-xs" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search listings" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-moss-600" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} /> Flagged only</label>
      </div>
      {!items ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">Listing</th><th className="font-medium">Owner</th><th className="font-medium">Type</th><th className="font-medium">Status</th><th className="font-medium">Listed</th><th className="p-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r._id} className="border-b border-line last:border-0">
                  <td className="p-3"><Link to={`/resources/${r._id}`} className="font-medium hover:underline">{r.title}</Link><span className="block text-xs text-muted">{r.category}</span></td>
                  <td className="text-muted">{r.owner?.name}</td>
                  <td><Chip className={TYPE_STYLE[r.listingType]}>{r.listingType}</Chip></td>
                  <td className="space-x-1"><Chip className={STATUS_STYLE[r.status]}>{r.status}</Chip>{r.isFlagged && <Chip className="bg-brick-50 text-brick-600">Flagged</Chip>}</td>
                  <td className="text-muted">{fmtDate(r.createdAt)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-outline btn-sm" onClick={() => unflag(r)}>{r.isFlagged ? 'Restore' : 'Hide'}</button>
                      <button className="btn-danger btn-sm" onClick={() => remove(r)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [status, setStatus] = useState('Open');
  const [items, setItems] = useState(null);
  const load = () => api.get('/admin/reports', { params: { status: status || undefined } }).then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, [status]);
  const resolve = async (r, newStatus, removeTarget) => {
    const actionNote = newStatus === 'Resolved' ? prompt('Note for the record (optional)') || '' : '';
    try {
      await api.patch(`/admin/reports/${r._id}`, { status: newStatus, actionNote, removeTarget });
      toast.success(`Report ${newStatus.toLowerCase()}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const targetLink = (r) => (!r.target ? null : r.targetType === 'Resource' ? `/resources/${r.target._id}` : r.targetType === 'User' ? `/profile/${r.target._id}` : r.targetType === 'Post' ? '/community' : '/lost-found');
  return (
    <div>
      <div className="mb-4 flex gap-1">
        {['Open', 'Resolved', 'Dismissed', ''].map((s) => <button key={s || 'all'} className={`tab ${status === s ? 'tab-active' : ''}`} onClick={() => setStatus(s)}>{s || 'All'}</button>)}
      </div>
      {!items ? <Spinner /> : items.length === 0 ? <p className="text-muted">No reports in this view.</p> : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r._id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <ShieldAlert className="h-5 w-5 shrink-0 text-brick-500" />
              <div className="flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip className="bg-paper text-ink">{r.targetType}</Chip>
                  {r.target ? <Link to={targetLink(r)} className="font-semibold hover:underline">{r.target.label}</Link> : <span className="text-muted">Target deleted</span>}
                  <Chip className={STATUS_STYLE[r.status]}>{r.status}</Chip>
                </div>
                <div className="mt-1"><b>{r.reason}</b>{r.details ? ` — ${r.details}` : ''}</div>
                <div className="text-xs text-muted">Reported by {r.reporter?.name} · {timeAgo(r.createdAt)}{r.actionNote ? ` · Note: ${r.actionNote}` : ''}</div>
              </div>
              {r.status === 'Open' && (
                <div className="flex flex-wrap gap-1">
                  {['Resource', 'Post'].includes(r.targetType) && r.target && <button className="btn-danger btn-sm" onClick={() => resolve(r, 'Resolved', true)}>Remove content</button>}
                  <button className="btn-outline btn-sm" onClick={() => resolve(r, 'Resolved', false)}>{r.targetType === 'User' ? 'Uphold' : 'Resolve'}</button>
                  <button className="btn-ghost btn-sm" onClick={() => resolve(r, 'Dismissed')}>Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExchangesTab() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    api.get('/admin/exchanges', { params: { status: status || undefined } }).then((r) => setItems(r.data));
  }, [status]);
  return (
    <div>
      <select className="input mb-4 w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
        <option value="">Any status</option>
        {['Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
      </select>
      {!items ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">Item</th><th className="font-medium">Owner</th><th className="font-medium">Requester</th><th className="font-medium">Type</th><th className="font-medium">Status</th><th className="p-3 font-medium">Updated</th></tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e._id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{e.resource?.title || 'Deleted listing'}</td>
                  <td>{e.owner?.name}</td>
                  <td>{e.requester?.name}</td>
                  <td><Chip className={TYPE_STYLE[e.type]}>{e.type}</Chip></td>
                  <td><Chip className={STATUS_STYLE[e.status]}>{e.status}</Chip></td>
                  <td className="p-3 text-muted">{timeAgo(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BroadcastTab() {
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const send = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/admin/broadcast', { message, link });
      toast.success(`Sent to ${data.sent} students`);
      setMessage('');
      setLink('');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  return (
    <form onSubmit={send} className="card max-w-xl space-y-4 p-6">
      <h2 className="section-title flex items-center gap-2"><Megaphone className="h-5 w-5 text-sun-600" /> Send a campus-wide notification</h2>
      <textarea required rows={3} className="input" placeholder="e.g. Swap Week starts Monday at the Main Library foyer" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
      <input className="input" placeholder="Optional link inside the app, e.g. /community" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link" />
      <button className="btn-primary">Send to everyone</button>
      <p className="text-xs text-muted">Tip: for longer announcements, post an Announcement in the Community and pin it.</p>
    </form>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  return (
    <div>
      <h1 className="page-title">Admin dashboard</h1>
      <p className="mt-1 text-muted">Moderate listings, manage students and watch platform health.</p>
      <div className="mt-6 flex flex-wrap gap-1 border-b border-line pb-3">
        {TABS.map((t) => <button key={t} className={`tab ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div className="mt-6">
        {tab === 'Overview' && <Overview />}
        {tab === 'Users' && <UsersTab />}
        {tab === 'Listings' && <ListingsTab />}
        {tab === 'Reports' && <ReportsTab />}
        {tab === 'Exchanges' && <ExchangesTab />}
        {tab === 'Broadcast' && <BroadcastTab />}
      </div>
    </div>
  );
}
