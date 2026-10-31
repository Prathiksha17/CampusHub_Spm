import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(new Set());
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const refreshCounts = async () => {
    try {
      const [n, m] = await Promise.all([api.get('/notifications'), api.get('/messages/unread')]);
      setUnreadNotifs(n.data.unread);
      setUnreadMsgs(m.data.count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!user) return undefined;
    refreshCounts();
    const s = io(import.meta.env.VITE_SOCKET_URL || '/', { auth: { token: localStorage.getItem('ch_token') } });
    s.on('presence:list', (ids) => setOnline(new Set(ids)));
    s.on('presence', ({ userId, online: on }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        on ? next.add(userId) : next.delete(userId);
        return next;
      })
    );
    s.on('notification:new', (n) => {
      setUnreadNotifs((c) => c + 1);
      toast(n.message, { icon: '🔔' });
    });
    s.on('message:new', (m) => {
      const senderId = m.sender?._id || m.sender;
      if (senderId !== user._id && !location.pathname.includes(m.conversation)) setUnreadMsgs((c) => c + 1);
    });
    setSocket(s);
    return () => s.disconnect();
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, online, unreadNotifs, setUnreadNotifs, unreadMsgs, setUnreadMsgs, refreshCounts }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
