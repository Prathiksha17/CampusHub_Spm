import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/axios';
import { CATEGORIES, DEPARTMENTS } from '../utils/helpers';

function Shell({ title, sub, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-moss-700 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <span className="font-display text-2xl font-extrabold">CampusHub</span>
        </Link>
        <p className="max-w-md font-display text-4xl font-bold leading-tight">
          Borrow the calculator. Lend the cycle. Pass the book on.
        </p>
        <p className="text-sm text-moss-100">Every exchange earns green points for you and your department.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-xl font-extrabold">CampusHub</span>
          </Link>
          <h1 className="page-title">{title}</h1>
          <p className="mt-1 text-muted">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      nav(u.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Sign in" sub="Use your campus email to continue.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-6 rounded-lg border border-dashed border-line bg-white p-3 text-xs text-muted">
        Demo accounts after seeding: <b>priya@campus.edu</b> / password123, admin: <b>admin@campushub.edu</b> / admin123
      </div>
      <p className="mt-6 text-sm text-muted">
        New here? <Link to="/register" className="font-semibold text-moss-600 hover:underline">Create an account</Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '', department: 'Computer Science', year: 1, interests: [] });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleInterest = (c) =>
    setForm((f) => ({ ...f, interests: f.interests.includes(c) ? f.interests.filter((x) => x !== c) : [...f.interests, c] }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success('Account created');
      nav('/dashboard');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Join CampusHub" sub="Campus emails (.edu, .ac.in) are verified automatically.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" value={form.name} onChange={set('name')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="remail">Email</label>
            <input id="remail" type="email" required className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label" htmlFor="rpw">Password</label>
            <input id="rpw" type="password" minLength={6} required className="input" value={form.password} onChange={set('password')} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="sid">Student ID</label>
            <input id="sid" className="input" value={form.studentId} onChange={set('studentId')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="dept">Department</label>
            <select id="dept" className="input" value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="yr">Year</label>
          <select id="yr" className="input" value={form.year} onChange={set('year')}>
            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <div>
          <span className="label">What are you looking for? <span className="font-normal text-muted">(improves recommendations)</span></span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleInterest(c)}
                className={`chip border py-1 ${form.interests.includes(c) ? 'border-moss-600 bg-moss-600 text-white' : 'border-line bg-white text-ink'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already registered? <Link to="/login" className="font-semibold text-moss-600 hover:underline">Sign in</Link>
      </p>
    </Shell>
  );
}
