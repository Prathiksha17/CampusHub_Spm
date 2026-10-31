import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { Empty, Spinner } from '../components/ui';
import { timeAgo } from '../utils/helpers';

export default function Notifications() {
  const nav = useNavigate();
  const { setUnreadNotifs } = useSocket();
  const [items, setItems] = useState(null);
  const load = () => api.get('/notifications').then((r) => { setItems(r.data.items); setUnreadNotifs(r.data.unread); });
  useEffect(() => {
    load();
  }, []);
  const readAll = async () => { await api.patch('/notifications/read-all'); load(); };
  const clear = async () => { await api.delete('/notifications'); load(); };
  const open = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n._id}/read`);
    if (n.link) nav(n.link);
    else load();
  };
  if (!items) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between">
        <h1 className="page-title">Notifications</h1>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={readAll}>Mark all read</button>
          <button className="btn-ghost btn-sm" onClick={clear}>Clear read</button>
        </div>
      </div>
      <div className="mt-6">
        {items.length === 0 ? (
          <Empty icon={Bell} title="No notifications" text="Requests, messages, matches and reviews will show up here." />
        ) : (
          <ul className="card divide-y divide-line">
            {items.map((n) => (
              <li key={n._id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-paper ${n.read ? '' : 'bg-moss-50/60'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-moss-500'}`} />
                  <span className="flex-1">
                    <span className="block text-sm">{n.message}</span>
                    <span className="text-xs text-muted">{timeAgo(n.createdAt)} · {n.type}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
