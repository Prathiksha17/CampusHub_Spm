import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, BookOpen, HandHeart, Repeat2, ShieldCheck, Sparkles, SearchCheck } from 'lucide-react';
import api from '../api/axios';

const WAYS = [
  { icon: BookOpen, t: 'Sell', d: 'Pass on textbooks and gear at student prices.' },
  { icon: ArrowLeftRight, t: 'Rent or lend', d: 'Calculators, cycles and blazers for the days you need them.' },
  { icon: Repeat2, t: 'Swap', d: 'Trade a cricket bat for a racquet. No cash needed.' },
  { icon: HandHeart, t: 'Donate', d: 'Leaving hostel? Hand essentials to first-years.' }
];

export default function Landing() {
  const [impact, setImpact] = useState(null);
  useEffect(() => {
    api.get('/impact/campus').then((r) => setImpact(r.data.totals)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-extrabold">CampusHub</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Join your campus</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:pt-16">
        <div>
          <h1 className="font-display text-[42px] font-extrabold leading-[1.02] tracking-tight sm:text-[64px]">
            Your senior's textbook is someone's next semester.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            CampusHub is where students sell, rent, lend, swap and donate the things they already own, so fewer things get bought new and fewer get thrown out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">Create a free account</Link>
            <Link to="/login" className="btn-outline px-6 py-3 text-base">I already have one</Link>
          </div>
        </div>

        <div className="relative rounded-2xl bg-moss-700 p-7 text-white">
          <div className="text-sm text-moss-100">Kept in use on this campus so far</div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="font-display text-5xl font-extrabold text-sun-400">{impact ? impact.itemsReused : '—'}</div>
              <div className="mt-1 text-sm text-moss-100">items reused</div>
            </div>
            <div>
              <div className="font-display text-5xl font-extrabold">{impact ? `${impact.co2}` : '—'}</div>
              <div className="mt-1 text-sm text-moss-100">kg CO₂ avoided</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{impact ? `₹${impact.moneySaved.toLocaleString('en-IN')}` : '—'}</div>
              <div className="mt-1 text-sm text-moss-100">saved by students</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{impact ? `${impact.waste} kg` : '—'}</div>
              <div className="mt-1 text-sm text-moss-100">kept from landfill</div>
            </div>
          </div>
          <div className="mt-7 rounded-xl bg-white/10 p-4 text-sm leading-relaxed">
            “Got a drafter for my ED exam the same evening from someone two blocks away.” <span className="text-moss-100">— 2nd year, Mechanical</span>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {WAYS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-white p-7">
              <Icon className="h-6 w-6 text-moss-600" />
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
        {[
          { icon: Sparkles, t: 'Picks that fit your course', d: 'Recommendations learn from what you browse, save and request, plus your department.' },
          { icon: ShieldCheck, t: 'Trade with people you can trust', d: 'Verified student emails, two-way reviews and a trust score on every profile.' },
          { icon: SearchCheck, t: 'Lost something? We match it', d: 'Lost and found posts are matched automatically and both sides are notified.' }
        ].map(({ icon: Icon, t, d }) => (
          <div key={t}>
            <Icon className="h-5 w-5 text-sun-600" />
            <h3 className="mt-3 text-lg font-bold">{t}</h3>
            <p className="mt-1 text-muted">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">CampusHub — built for students, by students.</footer>
    </div>
  );
}
