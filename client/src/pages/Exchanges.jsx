import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftRight, CalendarClock, MapPin, MessageCircle, CheckCircle2, Repeat2, ChevronDown } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar, CategoryArt, Chip, Empty, Modal, Spinner, Stars, TrustBadge } from '../components/ui';
import { fmtDate, imgUrl, inr, REVIEW_TAGS, STATUS_STYLE, TYPE_STYLE, timeAgo } from '../utils/helpers';

function ReviewModal({ ex, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reviews', { exchangeId: ex._id, rating, tags, comment });
      toast.success('Review posted');
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="How did it go?">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Stars value={rating} size={28} onChange={setRating} />
          <span className="text-sm text-muted">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}
              className={`chip border py-1 ${tags.includes(t) ? 'border-moss-600 bg-moss-600 text-white' : 'border-line'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea className="input" rows={3} placeholder="Share a few words for other students (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>Post review</button>
      </div>
    </Modal>
  );
}

function MeetupModal({ ex, mode, onClose, onDone }) {
  const [loc, setLoc] = useState(ex.meetupLocation || '');
  const [time, setTime] = useState(ex.meetupTime ? new Date(ex.meetupTime).toISOString().slice(0, 16) : '');
  const submit = async () => {
    try {
      await api.patch(`/exchanges/${ex._id}/status`, { action: mode, meetupLocation: loc, meetupTime: time || undefined });
      toast.success(mode === 'accept' ? 'Request accepted' : 'Meetup updated');
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <Modal open onClose={onClose} title={mode === 'accept' ? 'Accept and set a meetup' : 'Update meetup'}>
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="ml">Meetup spot</label>
          <input id="ml" className="input" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Library entrance" />
        </div>
        <div>
          <label className="label" htmlFor="mtm">Date and time</label>
          <input id="mtm" type="datetime-local" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={submit}>{mode === 'accept' ? 'Accept request' : 'Save meetup'}</button>
      </div>
    </Modal>
  );
}

function ExchangeCard({ ex, me, onChange }) {
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const isOwner = ex.owner?._id === me;
  const other = isOwner ? ex.requester : ex.owner;
  const r = ex.resource;
  const myConfirmed = isOwner ? ex.ownerConfirmed : ex.requesterConfirmed;
  const otherConfirmed = isOwner ? ex.requesterConfirmed : ex.ownerConfirmed;
  const reviewed = ex.reviewedBy?.includes(me);

  const act = async (action) => {
    if (action === 'cancel' && !confirm('Cancel this exchange?')) return;
    try {
      await api.patch(`/exchanges/${ex._id}/status`, { action });
      toast.success(action === 'reject' ? 'Request declined' : 'Exchange cancelled');
      onChange();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const confirmHandover = async () => {
    try {
      const { data } = await api.patch(`/exchanges/${ex._id}/confirm`);
      toast.success(data.status === 'Completed' ? 'Exchange completed. Green points added!' : 'Confirmed. Waiting for the other side.');
      onChange();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const chat = async () => {
    const { data } = await api.post('/messages/start', { userId: other._id, resourceId: r?._id });
    nav(`/messages/${data._id}`);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link to={r ? `/resources/${r._id}` : '#'} className="h-24 w-full shrink-0 overflow-hidden rounded-lg sm:w-28">
          {r?.images?.[0] ? <img src={imgUrl(r.images[0])} alt="" className="h-full w-full object-cover" /> : <CategoryArt category={r?.category || ex.category} className="h-full w-full" />}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className={STATUS_STYLE[ex.status]}>{ex.status}</Chip>
            <Chip className={TYPE_STYLE[ex.type]}>{ex.type}</Chip>
            <span className="text-xs text-muted">{isOwner ? 'Incoming' : 'Outgoing'} · {timeAgo(ex.createdAt)}</span>
          </div>
          <div className="mt-1.5 font-semibold">{r?.title || 'Deleted listing'}</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Avatar user={other} size={22} />
            <Link to={`/profile/${other?._id}`} className="font-medium hover:underline">{other?.name}</Link>
            <TrustBadge score={other?.trustScore} compact />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {ex.offeredPrice > 0 && <span>Amount: <b className="text-ink">{inr(ex.offeredPrice)}</b></span>}
            {ex.startDate && <span>{fmtDate(ex.startDate)} → {fmtDate(ex.endDate)}</span>}
            {ex.offeredResource && <span className="flex items-center gap-1"><Repeat2 className="h-3.5 w-3.5" /> Offers: <b className="text-ink">{ex.offeredResource.title}</b></span>}
            {ex.meetupLocation && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ex.meetupLocation}</span>}
            {ex.meetupTime && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{fmtDate(ex.meetupTime, true)}</span>}
          </div>
          {ex.message && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-sm">“{ex.message}”</p>}
          {ex.status === 'Accepted' && (
            <p className="mt-2 text-xs text-muted">
              {myConfirmed ? 'You confirmed the hand-over.' : 'Confirm once you have handed over or received the item.'}{' '}
              {otherConfirmed ? `${other?.name?.split(' ')[0]} has confirmed.` : `Waiting on ${other?.name?.split(' ')[0]}.`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {ex.status === 'Pending' && isOwner && (
          <>
            <button className="btn-primary btn-sm" onClick={() => setModal('accept')}>Accept</button>
            <button className="btn-outline btn-sm" onClick={() => act('reject')}>Decline</button>
          </>
        )}
        {ex.status === 'Pending' && !isOwner && <button className="btn-outline btn-sm" onClick={() => act('cancel')}>Withdraw request</button>}
        {ex.status === 'Accepted' && (
          <>
            {!myConfirmed && (
              <button className="btn-primary btn-sm" onClick={confirmHandover}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {['Rent', 'Lend'].includes(ex.type) ? 'Confirm returned' : 'Confirm hand-over'}
              </button>
            )}
            <button className="btn-outline btn-sm" onClick={() => setModal('schedule')}>Meetup details</button>
            <button className="btn-ghost btn-sm text-brick-500" onClick={() => act('cancel')}>Cancel</button>
          </>
        )}
        {ex.status === 'Completed' && !reviewed && (
          <button className="btn-sun btn-sm" onClick={() => setModal('review')}>Rate {other?.name?.split(' ')[0]}</button>
        )}
        {ex.status === 'Completed' && reviewed && <span className="text-xs text-muted">You reviewed this exchange.</span>}
        <button className="btn-ghost btn-sm" onClick={chat}><MessageCircle className="h-3.5 w-3.5" /> Message</button>
        <button className="btn-ghost btn-sm ml-auto" onClick={() => setShowHistory((s) => !s)}>
          Timeline <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {showHistory && (
        <ol className="mt-3 space-y-2 border-l-2 border-moss-100 pl-4 text-sm">
          {ex.history?.map((h, i) => (
            <li key={i}>
              <span className="font-medium">{h.status}</span> <span className="text-muted">— {h.note} · {fmtDate(h.at, true)}</span>
            </li>
          ))}
        </ol>
      )}

      {modal === 'review' && <ReviewModal ex={ex} onClose={() => setModal(null)} onDone={() => { setModal(null); onChange(); }} />}
      {(modal === 'accept' || modal === 'schedule') && <MeetupModal ex={ex} mode={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); onChange(); }} />}
    </div>
  );
}

export default function Exchanges() {
  const { user, refresh } = useAuth();
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState(null);
  const load = () => api.get('/exchanges', { params: { role, status: status || undefined } }).then((r) => setItems(r.data));
  useEffect(() => {
    setItems(null);
    load();
  }, [role, status]);
  const onChange = () => {
    load();
    refresh();
  };

  return (
    <div>
      <h1 className="page-title">Exchanges</h1>
      <p className="mt-1 text-muted">Requests you've sent and received, from first message to hand-over.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {[['all', 'All'], ['incoming', 'Received'], ['outgoing', 'Sent']].map(([v, l]) => (
            <button key={v} className={`tab ${role === v ? 'tab-active' : ''}`} onClick={() => setRole(v)}>{l}</button>
          ))}
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          {['Pending', 'Accepted', 'Completed', 'Rejected', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="mt-6 space-y-4">
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty icon={ArrowLeftRight} title="No exchanges here" text="When you request an item or someone requests yours, it shows up here." action={<Link to="/browse" className="btn-primary">Find something</Link>} />
        ) : (
          items.map((ex) => <ExchangeCard key={ex._id} ex={ex} me={user._id} onChange={onChange} />)
        )}
      </div>
    </div>
  );
}
