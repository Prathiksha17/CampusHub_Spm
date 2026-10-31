import { BookOpen, Cpu, FlaskConical, PenTool, Armchair, Shirt, Trophy, NotebookText, Package } from 'lucide-react';

export const CATEGORIES = ['Books', 'Electronics', 'Lab Equipment', 'Stationery', 'Furniture', 'Clothing', 'Sports', 'Notes', 'Other'];
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
export const LISTING_TYPES = ['Sell', 'Rent', 'Lend', 'Swap', 'Donate'];
export const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Information Technology', 'Biotechnology', 'Management', 'Arts & Science', 'Other'];
export const REVIEW_TAGS = ['Punctual', 'Item as described', 'Friendly', 'Fair price', 'Good communication'];

export const CATEGORY_META = {
  Books: { icon: BookOpen, bg: '#E9EEF7', fg: '#2F5D8A' },
  Electronics: { icon: Cpu, bg: '#EDEAF6', fg: '#5A4A9C' },
  'Lab Equipment': { icon: FlaskConical, bg: '#E4F1EC', fg: '#2E6E58' },
  Stationery: { icon: PenTool, bg: '#FBF0D6', fg: '#8C6A12' },
  Furniture: { icon: Armchair, bg: '#F3E9E1', fg: '#8A5532' },
  Clothing: { icon: Shirt, bg: '#F6E6EA', fg: '#9A3F57' },
  Sports: { icon: Trophy, bg: '#E6F2F4', fg: '#2C6C79' },
  Notes: { icon: NotebookText, bg: '#EFF1E2', fg: '#5F6B23' },
  Other: { icon: Package, bg: '#ECEDEA', fg: '#55605B' }
};

export const TYPE_STYLE = {
  Sell: 'bg-sky-50 text-sky-600',
  Rent: 'bg-sun-100 text-sun-600',
  Lend: 'bg-moss-50 text-moss-700',
  Swap: 'bg-[#EDEAF6] text-[#5A4A9C]',
  Donate: 'bg-brick-50 text-brick-600'
};

export const STATUS_STYLE = {
  Pending: 'bg-sun-100 text-sun-600',
  Accepted: 'bg-sky-50 text-sky-600',
  Completed: 'bg-moss-50 text-moss-700',
  Rejected: 'bg-brick-50 text-brick-600',
  Cancelled: 'bg-[#ECEDEA] text-muted',
  Available: 'bg-moss-50 text-moss-700',
  Reserved: 'bg-sun-100 text-sun-600',
  Exchanged: 'bg-[#ECEDEA] text-muted',
  Inactive: 'bg-[#ECEDEA] text-muted',
  Open: 'bg-sun-100 text-sun-600',
  Claimed: 'bg-sky-50 text-sky-600',
  Resolved: 'bg-moss-50 text-moss-700',
  Dismissed: 'bg-[#ECEDEA] text-muted'
};

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
export const imgUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_ORIGIN}${p}`);

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const priceLabel = (r) => {
  if (!r) return '';
  switch (r.listingType) {
    case 'Sell': return inr(r.price);
    case 'Rent': return `${inr(r.rentPerDay)}/day`;
    case 'Lend': return 'Free to borrow';
    case 'Swap': return 'Swap';
    case 'Donate': return 'Free';
    default: return '';
  }
};

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDate = (d, withTime) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) }) : '';

export const trustTone = (s) => (s >= 75 ? 'text-moss-600' : s >= 50 ? 'text-sun-600' : 'text-brick-500');
