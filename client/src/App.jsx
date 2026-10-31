import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import ResourceDetail from './pages/ResourceDetail';
import ResourceForm from './pages/ResourceForm';
import MyListings from './pages/MyListings';
import Saved from './pages/Saved';
import Exchanges from './pages/Exchanges';
import Messages from './pages/Messages';
import LostFound from './pages/LostFound';
import Community from './pages/Community';
import Impact from './pages/Impact';
import Insights from './pages/Insights';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';

function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen items-center" />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen items-center" />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/resources/new" element={<ResourceForm />} />
        <Route path="/resources/:id/edit" element={<ResourceForm />} />
        <Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/exchanges" element={<Exchanges />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/community" element={<Community />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
