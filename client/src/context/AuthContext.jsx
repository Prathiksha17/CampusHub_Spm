import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('ch_token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('ch_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ch_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('ch_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ch_token');
    setUser(null);
  };

  const isSaved = (id) => !!user?.wishlist?.some((w) => (w._id || w) === id);

  const toggleSave = async (id) => {
    if (!user) return toast.error('Sign in to save items');
    try {
      const { data } = await api.post(`/users/wishlist/${id}`);
      setUser((u) => ({ ...u, wishlist: data.wishlist }));
      toast.success(data.saved ? 'Saved to your list' : 'Removed from saved');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh, isSaved, toggleSave }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
