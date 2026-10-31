import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ResourceCard from '../components/ResourceCard';
import { Spinner, Empty } from '../components/ui';

export default function Saved() {
  const { isSaved, toggleSave, user } = useAuth();
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get('/users/wishlist').then((r) => setItems(r.data));
  }, [user.wishlist?.length]);
  if (!items) return <Spinner />;
  return (
    <div>
      <h1 className="page-title">Saved items</h1>
      <p className="mt-1 text-muted">Items you've saved. We'll use these to sharpen your recommendations.</p>
      <div className="mt-6">
        {items.length === 0 ? (
          <Empty icon={Heart} title="No saved items" text="Tap the heart on any listing to keep it here." action={<Link to="/browse" className="btn-primary">Browse listings</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((r) => <ResourceCard key={r._id} r={r} saved={isSaved(r._id)} onToggleSave={toggleSave} />)}
          </div>
        )}
      </div>
    </div>
  );
}
