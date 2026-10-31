import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, MessageSquare, Pin, Trash2, Users, CalendarDays } from 'lucide-react';
import api, { errMsg } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar, Chip, Empty, Spinner } from '../components/ui';
import { fmtDate, timeAgo } from '../utils/helpers';

const TYPES = ['Tip', 'Question', 'Event', 'Request', 'Announcement'];
const TYPE_TONE = {
  Tip: 'bg-moss-50 text-moss-700',
  Question: 'bg-sky-50 text-sky-600',
  Event: 'bg-[#EDEAF6] text-[#5A4A9C]',
  Request: 'bg-sun-100 text-sun-600',
  Announcement: 'bg-ink text-white'
};

function Composer({ onPosted }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'Tip', title: '', content: '', tags: '', eventDate: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/community', form);
      toast.success('Posted to the community');
      setForm({ type: 'Tip', title: '', content: '', tags: '', eventDate: '' });
      setOpen(false);
      onPosted();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const types = user.role === 'admin' ? TYPES : TYPES.filter((t) => t !== 'Announcement');
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 p-4 text-left text-muted hover:border-moss-500">
        <Avatar user={user} size={36} /> Share a tip, ask a question or post a request…
      </button>
    );
  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="flex flex-wrap gap-1">
        {types.map((t) => (
          <button type="button" key={t} onClick={() => setForm({ ...form, type: t })} className={`tab ${form.type === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>
      <input required className="input" placeholder="Title" value={form.title} onChange={set('title')} aria-label="Title" />
      <textarea required rows={4} className="input" placeholder="Write your post" value={form.content} onChange={set('content')} aria-label="Content" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Tags, comma separated" value={form.tags} onChange={set('tags')} aria-label="Tags" />
        {form.type === 'Event' && <input type="datetime-local" className="input" value={form.eventDate} onChange={set('eventDate')} aria-label="Event date" />}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button className="btn-primary">Publish post</button>
      </div>
    </form>
  );
}

function PostCard({ p, onChange }) {
  const { user } = useAuth();
  const [post, setPost] = useState(p);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  useEffect(() => setPost(p), [p]);
  const liked = post.likes?.includes(user._id);
  const canDelete = post.author?._id === user._id || user.role === 'admin';

  const like = async () => {
    const { data } = await api.post(`/community/${post._id}/like`);
    setPost({ ...post, likes: data.likes });
  };
  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/community/${post._id}/comments`, { text: comment });
      setPost(data);
      setComment('');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const delComment = async (cid) => {
    const { data } = await api.delete(`/community/${post._id}/comments/${cid}`);
    setPost(data);
  };
  const remove = async () => {
    if (!confirm('Delete this post?')) return;
    await api.delete(`/community/${post._id}`);
    toast.success('Post deleted');
    onChange();
  };
  const pin = async () => {
    await api.patch(`/community/${post._id}/pin`);
    onChange();
  };

  return (
    <article className={`card p-5 ${post.pinned ? 'border-sun-400' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar user={post.author} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link to={`/profile/${post.author?._id}`} className="font-semibold hover:underline">{post.author?.name}</Link>
            <span className="text-muted">{post.author?.department} · {timeAgo(post.createdAt)}</span>
            {post.pinned && <span className="flex items-center gap-1 text-xs font-semibold text-sun-600"><Pin className="h-3 w-3" /> Pinned</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip className={TYPE_TONE[post.type]}>{post.type}</Chip>
            <h3 className="font-display text-lg font-bold leading-snug">{post.title}</h3>
          </div>
          {post.type === 'Event' && post.eventDate && (
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#5A4A9C]"><CalendarDays className="h-4 w-4" />{fmtDate(post.eventDate, true)}</div>
          )}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/90">{post.content}</p>
          {post.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{post.tags.map((t) => <span key={t} className="text-xs text-moss-600">#{t}</span>)}</div>}
          <div className="mt-3 flex items-center gap-1">
            <button onClick={like} className={`btn-ghost btn-sm ${liked ? 'text-brick-500' : ''}`}><Heart className={`h-4 w-4 ${liked ? 'fill-brick-500' : ''}`} /> {post.likes?.length || 0}</button>
            <button onClick={() => setShowComments((s) => !s)} className="btn-ghost btn-sm"><MessageSquare className="h-4 w-4" /> {post.comments?.length || 0}</button>
            {user.role === 'admin' && <button onClick={pin} className="btn-ghost btn-sm"><Pin className="h-4 w-4" /> {post.pinned ? 'Unpin' : 'Pin'}</button>}
            {canDelete && <button onClick={remove} className="btn-ghost btn-sm ml-auto hover:text-brick-500" aria-label="Delete post"><Trash2 className="h-4 w-4" /></button>}
          </div>
          {showComments && (
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              {post.comments?.map((c) => (
                <div key={c._id} className="flex gap-2 text-sm">
                  <Avatar user={c.user} size={26} />
                  <div className="flex-1 rounded-lg bg-paper px-3 py-2">
                    <span className="font-semibold">{c.user?.name}</span> <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                    <div>{c.text}</div>
                  </div>
                  {((c.user?._id || c.user) === user._id || user.role === 'admin') && (
                    <button onClick={() => delComment(c._id)} className="self-start p-1 text-muted hover:text-brick-500" aria-label="Delete comment"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
              <form onSubmit={addComment} className="flex gap-2">
                <input className="input" placeholder="Write a comment" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
                <button className="btn-primary btn-sm shrink-0">Reply</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Community() {
  const [type, setType] = useState('');
  const [sort, setSort] = useState('new');
  const [q, setQ] = useState('');
  const [posts, setPosts] = useState(null);
  const load = () => api.get('/community', { params: { type: type || undefined, sort, q: q || undefined } }).then((r) => setPosts(r.data));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [type, sort, q]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Community</h1>
      <p className="mt-1 text-muted">Tips, questions, requests and campus events from fellow students.</p>
      <div className="mt-6"><Composer onPosted={load} /></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1">
          <button className={`tab ${!type ? 'tab-active' : ''}`} onClick={() => setType('')}>All</button>
          {TYPES.map((t) => <button key={t} className={`tab ${type === t ? 'tab-active' : ''}`} onClick={() => setType(t)}>{t}</button>)}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <input className="input w-40" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search posts" />
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort posts">
            <option value="new">Latest</option>
            <option value="top">Most liked</option>
          </select>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {!posts ? <Spinner /> : posts.length === 0 ? <Empty icon={Users} title="No posts yet" text="Start the conversation with a tip or question." /> : posts.map((p) => <PostCard key={p._id} p={p} onChange={load} />)}
      </div>
    </div>
  );
}
