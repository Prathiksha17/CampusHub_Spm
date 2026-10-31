import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Home, Search, PlusCircle, Package, Heart, ArrowLeftRight, MessageCircle, SearchCheck, Users, Leaf,
  Sparkles, UserRound, LayoutDashboard, Bell, Menu, X, LogOut
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar } from './ui';
import { timeAgo } from '../utils/helpers';

const NAV = [
  { group: 'Marketplace', items: [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/browse', label: 'Browse', icon: Search },
    { to: '/resources/new', label: 'List an item', icon: PlusCircle },
    { to: '/my-listings', label: 'My listings', icon: Package },
    { to: '/saved', label: 'Saved', icon: Heart }
  ] },
  { group: 'Activity', items: [
    { to: '/exchanges', label: 'Exchanges', icon: ArrowLeftRight },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: 'msgs' }
  ] },
  { group: 'Campus', items: [
    { to: '/lost-found', label: 'Lost & found', icon: SearchCheck },
    { to: '/community', label: 'Community', icon: Users },
    { to: '/impact', label: 'Campus impact', icon: Leaf }
  ] },
  { group: 'You', items: [
    { to: '/insights', label: 'Insights', icon: Sparkles },
    { to: '/profile', label: 'Profile', icon: UserRound }
  ] }
];

function SearchBox() {
  const [q, setQ] = useState('');
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (q.trim().length < 2) return setSugs([]);
    const t = setTimeout(() => api.get('/resources/suggest', { params: { q } }).then((r) => setSugs(r.data)).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);
  const go = (term) => {
    setOpen(false);
    nav(`/browse?q=${encodeURIComponent(term)}`);
  };
  return (
    <form
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) go(q.trim());
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        className="input pl-9"
        placeholder="Search books, calculators, lab coats…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Search listings"
      />
      {open && sugs.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lift">
          {sugs.map((s) => (
            <li key={s._id}>
              <button type="button" onMouseDown={() => nav(`/resources/${s._id}`)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper">
                <span className="truncate">{s.title}</span>
                <span className="ml-3 shrink-0 text-xs text-muted">{s.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function NotificationBell() {
  const { unreadNotifs, setUnreadNotifs } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef();
  const nav = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = async () => {
    setOpen((o) => !o);
    if (!open) {
      const { data } = await api.get('/notifications');
      setItems(data.items.slice(0, 8));
    }
  };
  const readAll = async () => {
    await api.patch('/notifications/read-all');
    setItems((i) => i.map((n) => ({ ...n, read: true })));
    setUnreadNotifs(0);
  };
  const openItem = async (n) => {
    if (!n.read) {
      api.patch(`/notifications/${n._id}/read`);
      setUnreadNotifs((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) nav(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-lg p-2 text-muted hover:bg-moss-50 hover:text-moss-700" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unreadNotifs > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick-500 px-1 text-[10px] font-bold text-white">
            {unreadNotifs > 9 ? '9+' : unreadNotifs}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-semibold">Notifications</span>
            <button onClick={readAll} className="text-xs font-medium text-moss-600 hover:underline">Mark all read</button>
          </div>
          <ul className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</li>}
            {items.map((n) => (
              <li key={n._id}>
                <button onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-paper ${n.read ? '' : 'bg-moss-50/60'}`}>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss-500" />}
                  <span className={n.read ? 'pl-5' : ''}>
                    <span className="block leading-snug">{n.message}</span>
                    <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-line py-2.5 text-center text-sm font-medium text-moss-600 hover:bg-paper">
            See all
          </Link>
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const { unreadMsgs } = useSocket();
  const nav = useNavigate();
  const groups = user?.role === 'admin' ? [...NAV, { group: 'Admin', items: [{ to: '/admin', label: 'Admin dashboard', icon: LayoutDashboard }] }] : NAV;
  return (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <span className="font-display text-xl font-extrabold tracking-tight">CampusHub</span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-1.5 text-xs font-semibold text-muted">{g.group}</div>
            {g.items.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/profile'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-moss-600 text-white' : 'text-ink/80 hover:bg-moss-50 hover:text-moss-700'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {badge === 'msgs' && unreadMsgs > 0 && <span className="rounded-full bg-sun-400 px-1.5 text-[11px] font-bold text-ink">{unreadMsgs}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar user={user} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-muted">{user?.greenPoints || 0} green points</div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/');
            }}
            className="rounded-lg p-2 text-muted hover:bg-brick-50 hover:text-brick-500"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const loc = useLocation();
  useEffect(() => setMobileOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white">
            <button className="absolute right-3 top-5 rounded-lg p-1 text-muted" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-8">
        <button className="rounded-lg p-2 text-muted hover:bg-moss-50 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <SearchBox />
        <div className="ml-auto flex items-center gap-2">
          <Link to="/resources/new" className="btn-primary hidden sm:inline-flex">
            <PlusCircle className="h-4 w-4" /> List an item
          </Link>
          <NotificationBell />
          <Link to="/profile" aria-label="Your profile">
            <Avatar user={user} size={34} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
