import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend } from 'recharts';
import { Leaf, Recycle, IndianRupee, Trees, Users, Package, SearchCheck, HandHeart } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar, Spinner, Stat } from '../components/ui';
import { inr } from '../utils/helpers';

const PIE = ['#2E5E4E', '#F2C14E', '#2F5D8A', '#B4533A', '#5A4A9C'];
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #E1E2D9', fontSize: 13 } };

export default function Impact() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [mine, setMine] = useState(null);
  useEffect(() => {
    api.get('/impact/campus').then((r) => setData(r.data));
    api.get('/impact/me').then((r) => setMine(r.data));
  }, []);
  if (!data) return <Spinner />;
  const t = data.totals;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-moss-700 text-white">
        <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Campus circular economy</h1>
            <p className="mt-2 max-w-lg text-moss-100">Every item passed on instead of bought new keeps emissions out of the air and waste out of the bin.</p>
            <div className="mt-8 flex items-end gap-3">
              <span className="font-display text-7xl font-extrabold leading-none text-sun-400 sm:text-8xl">{t.co2}</span>
              <span className="pb-2 text-lg text-moss-100">kg CO₂e<br />avoided</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-white/10 p-4"><div className="font-display text-2xl font-bold">{t.itemsReused}</div>items reused</div>
            <div className="rounded-xl bg-white/10 p-4"><div className="font-display text-2xl font-bold">{t.waste} kg</div>waste diverted</div>
            <div className="rounded-xl bg-white/10 p-4"><div className="font-display text-2xl font-bold">{inr(t.moneySaved)}</div>saved by students</div>
            <div className="rounded-xl bg-white/10 p-4"><div className="font-display text-2xl font-bold">{t.treesEquivalent}</div>tree-years of CO₂</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Recycle} label="Completed exchanges" value={t.exchanges} />
        <Stat icon={HandHeart} tone="brick" label="Donations" value={t.donations} />
        <Stat icon={Package} tone="sky" label="Active listings" value={t.activeListings} />
        <Stat icon={SearchCheck} tone="sun" label="Lost items recovered" value={t.itemsRecovered} />
      </div>

      {mine && (
        <section className="card grid gap-6 p-6 md:grid-cols-[1fr_2fr] md:items-center">
          <div className="flex items-center gap-4">
            <Avatar user={user} size={56} />
            <div>
              <div className="text-sm text-muted">Your contribution</div>
              <div className="font-display text-2xl font-bold">Rank #{mine.rank}</div>
              <div className="text-sm text-moss-700">{mine.greenPoints} green points</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="font-display text-2xl font-bold">{mine.totals.co2}</div><div className="text-xs text-muted">kg CO₂ avoided</div></div>
            <div><div className="font-display text-2xl font-bold">{mine.totals.waste}</div><div className="text-xs text-muted">kg kept from landfill</div></div>
            <div><div className="font-display text-2xl font-bold">{inr(mine.totals.moneySaved)}</div><div className="text-xs text-muted">value kept in use</div></div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Monthly trend</h2>
          <p className="text-sm text-muted">Completed exchanges and CO₂ avoided, last 6 months</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E2D9" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="co2" name="kg CO₂" stroke="#2E5E4E" fill="#DCE8DF" strokeWidth={2} />
                <Area type="monotone" dataKey="exchanges" name="Exchanges" stroke="#B88A16" fill="#FCF1D2" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Impact by category</h2>
          <p className="text-sm text-muted">kg CO₂ avoided per category</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={data.byCategory} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E2D9" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} fontSize={12} width={95} />
                <Tooltip {...tip} />
                <Bar dataKey="co2" name="kg CO₂" fill="#2E5E4E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">How items move</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byType} dataKey="count" nameKey="type" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {data.byType.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Departments leading the way</h2>
          <ul className="mt-4 space-y-3">
            {data.departments.slice(0, 6).map((d, i) => {
              const max = data.departments[0]?.co2 || 1;
              return (
                <li key={d.department}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{i + 1}. {d.department}</span><span className="text-muted">{d.co2} kg · {d.exchanges} exchanges</span></div>
                  <div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-moss-500" style={{ width: `${(d.co2 / max) * 100}%` }} /></div>
                </li>
              );
            })}
            {data.departments.length === 0 && <li className="text-sm text-muted">No completed exchanges yet.</li>}
          </ul>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="section-title flex items-center gap-2"><Trees className="h-5 w-5 text-moss-600" /> Green points leaderboard</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 font-medium">#</th><th className="font-medium">Student</th><th className="font-medium">Department</th><th className="font-medium">Exchanges</th><th className="text-right font-medium">Points</th></tr></thead>
            <tbody>
              {data.leaders.map((l, i) => (
                <tr key={l._id} className={`border-b border-line last:border-0 ${l._id === user._id ? 'bg-moss-50' : ''}`}>
                  <td className="py-3 font-display font-bold">{i + 1}</td>
                  <td><span className="flex items-center gap-2"><Avatar user={l} size={28} />{l.name}</span></td>
                  <td className="text-muted">{l.department}</td>
                  <td>{l.completedExchanges}</td>
                  <td className="text-right font-semibold text-moss-700">{l.greenPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted">
          Points per completed exchange: Donate 30 · Swap 25 · Lend 20 · Rent 15 · Sell 10. CO₂ and waste figures are estimates using per-category reuse factors; lend and rent count at half weight.
        </p>
      </section>
    </div>
  );
}
