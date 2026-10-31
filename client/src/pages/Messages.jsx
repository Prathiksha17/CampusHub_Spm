import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, IndianRupee, MessageCircle, Send } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, CategoryArt, Empty, Spinner } from '../components/ui';
import { imgUrl, inr, priceLabel, timeAgo } from '../utils/helpers';

function Bubble({ m, mine, onRespond }) {
  if (m.kind === 'system')
    return <div className="my-3 text-center text-xs text-muted">{m.text}</div>;
  if (m.kind === 'offer') {
    const st = m.offer?.status;
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`w-64 rounded-xl border p-4 ${mine ? 'border-moss-200 bg-moss-50' : 'border-sun-400 bg-sun-100/60'}`}>
          <div className="text-xs text-muted">{mine ? 'You offered' : `${m.sender?.name?.split(' ')[0]} offered`}</div>
          <div className="font-display text-2xl font-bold">{inr(m.offer?.amount)}</div>
          {st === 'Pending' && !mine ? (
            <div className="mt-3 flex gap-2">
              <button className="btn-primary btn-sm flex-1" onClick={() => onRespond(m._id, 'Accepted')}>Accept</button>
              <button className="btn-outline btn-sm flex-1" onClick={() => onRespond(m._id, 'Declined')}>Decline</button>
            </div>
          ) : (
            <div className="mt-2 text-xs font-semibold">{st === 'Pending' ? 'Waiting for reply' : st}</div>
          )}
          <div className="mt-1 text-[11px] text-muted">{timeAgo(m.createdAt)}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-md bg-moss-600 text-white' : 'rounded-bl-md bg-white text-ink border border-line'}`}>
        <div className="whitespace-pre-wrap break-words">{m.text}</div>
        <div className={`mt-0.5 text-[11px] ${mine ? 'text-moss-100' : 'text-muted'}`}>{timeAgo(m.createdAt)}</div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { socket, online, refreshCounts } = useSocket();
  const [convs, setConvs] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [offerMode, setOfferMode] = useState(false);
  const [typing, setTyping] = useState(false);
  const endRef = useRef();
  const typingTimer = useRef();

  const loadConvs = () => api.get('/messages').then((r) => setConvs(r.data));
  useEffect(() => {
    loadConvs();
  }, []);

  useEffect(() => {
    if (!id) return;
    setMsgs([]);
    api.get(`/messages/${id}`).then((r) => {
      setMsgs(r.data);
      loadConvs();
      refreshCounts();
    });
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (m) => {
      if (m.conversation === id) {
        setMsgs((list) => (list.some((x) => x._id === m._id) ? list : [...list, m]));
        if ((m.sender?._id || m.sender) !== user._id) api.get(`/messages/${id}`).catch(() => {});
      }
      loadConvs();
    };
    const onUpdate = (m) => setMsgs((list) => list.map((x) => (x._id === m._id ? { ...x, offer: m.offer } : x)));
    const onTyping = (t) => t.conversationId === id && setTyping(t.typing);
    socket.on('message:new', onNew);
    socket.on('message:update', onUpdate);
    socket.on('typing', onTyping);
    return () => {
      socket.off('message:new', onNew);
      socket.off('message:update', onUpdate);
      socket.off('typing', onTyping);
    };
  }, [socket, id]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs.length, typing]);

  const conv = convs?.find((c) => c._id === id);
  const other = conv?.participants.find((p) => p._id !== user._id);

  const onType = (v) => {
    setText(v);
    if (!socket || !id) return;
    socket.emit('typing', { conversationId: id, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { conversationId: id, typing: false }), 1200);
  };

  const send = async (e) => {
    e.preventDefault();
    const val = text.trim();
    if (!val) return;
    if (offerMode && !(Number(val) > 0)) return toast.error('Enter an amount in rupees');
    try {
      const { data } = await api.post(`/messages/${id}`, offerMode ? { offerAmount: Number(val) } : { text: val });
      setMsgs((list) => (list.some((x) => x._id === data._id) ? list : [...list, data]));
      setText('');
      setOfferMode(false);
      socket?.emit('typing', { conversationId: id, typing: false });
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const respond = async (messageId, decision) => {
    try {
      const { data } = await api.patch(`/messages/offer/${messageId}`, { decision });
      setMsgs((list) => list.map((x) => (x._id === data._id ? { ...x, offer: data.offer } : x)));
      if (decision === 'Accepted') toast.success('Offer accepted. Send or accept the exchange request to lock it in.');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (!convs) return <Spinner />;

  return (
    <div>
      <h1 className="page-title mb-6">Messages</h1>
      {convs.length === 0 ? (
        <Empty icon={MessageCircle} title="No conversations yet" text="Message an owner from any listing to ask questions or negotiate a price." action={<Link to="/browse" className="btn-primary">Browse listings</Link>} />
      ) : (
        <div className="card grid h-[calc(100vh-210px)] min-h-[480px] overflow-hidden md:grid-cols-[300px_1fr]">
          <ul className={`overflow-y-auto border-r border-line scrollbar-thin ${id ? 'hidden md:block' : ''}`}>
            {convs.map((c) => {
              const o = c.participants.find((p) => p._id !== user._id);
              return (
                <li key={c._id}>
                  <button onClick={() => nav(`/messages/${c._id}`)} className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left hover:bg-paper ${c._id === id ? 'bg-moss-50' : ''}`}>
                    <Avatar user={o} size={40} online={online.has(o?._id)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{o?.name}</span>
                        <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      {c.resource && <div className="truncate text-xs text-moss-700">{c.resource.title}</div>}
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-muted">{c.lastMessage || 'Say hello'}</span>
                        {c.unread > 0 && <span className="rounded-full bg-sun-400 px-1.5 text-[11px] font-bold">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {!id || !conv ? (
            <div className="hidden items-center justify-center text-muted md:flex">Choose a conversation</div>
          ) : (
            <div className="flex min-h-0 flex-col">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button className="md:hidden" onClick={() => nav('/messages')} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
                <Avatar user={other} size={36} online={online.has(other?._id)} />
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${other?._id}`} className="font-semibold hover:underline">{other?.name}</Link>
                  <div className="text-xs text-muted">{online.has(other?._id) ? 'Online now' : `Active ${timeAgo(other?.lastActive)}`}</div>
                </div>
                {conv.resource && (
                  <Link to={`/resources/${conv.resource._id}`} className="hidden items-center gap-2 rounded-lg border border-line p-1.5 pr-3 hover:border-moss-500 sm:flex">
                    <span className="h-9 w-9 overflow-hidden rounded">
                      {conv.resource.images?.[0] ? <img src={imgUrl(conv.resource.images[0])} alt="" className="h-full w-full object-cover" /> : <CategoryArt category="Other" className="h-full w-full" />}
                    </span>
                    <span className="max-w-[160px]">
                      <span className="block truncate text-xs font-semibold">{conv.resource.title}</span>
                      <span className="text-xs text-moss-700">{priceLabel(conv.resource)}</span>
                    </span>
                  </Link>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-paper/60 p-4 scrollbar-thin">
                {msgs.map((m) => <Bubble key={m._id} m={m} mine={(m.sender?._id || m.sender) === user._id} onRespond={respond} />)}
                {typing && <div className="text-xs italic text-muted">{other?.name?.split(' ')[0]} is typing…</div>}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
                <button
                  type="button"
                  onClick={() => setOfferMode((o) => !o)}
                  className={`btn-sm btn shrink-0 ${offerMode ? 'bg-sun-400 text-ink' : 'border border-line text-muted hover:text-ink'}`}
                  title="Make a price offer"
                >
                  <IndianRupee className="h-4 w-4" /> Offer
                </button>
                <input
                  className="input"
                  type={offerMode ? 'number' : 'text'}
                  min="1"
                  placeholder={offerMode ? 'Amount in ₹' : 'Write a message'}
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  aria-label="Message"
                />
                <button className="btn-primary shrink-0" aria-label="Send"><Send className="h-4 w-4" /></button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
