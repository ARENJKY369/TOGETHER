import { useState } from 'react'

export function FeedComposer({ onCreate, currentUserDisplayName }) {
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [type, setType] = useState('note')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() && !imageUrl.trim()) return
    setSending(true)
    try {
      await onCreate({ contentText: text, imageUrl, contentType: type })
      setText(''); setImageUrl('')
    } finally { setSending(false) }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <h3 style={{ marginBottom: 12 }}>📸 Share a moment</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {['note','photo','memory'].map(t => (
            <button key={t} type="button" className={`pill ${type===t?'pill-rose':''}`} onClick={()=>setType(t)} style={{ cursor: 'pointer', border: type===t ? '1.5px solid var(--color-dusty-rose)' : '1px solid rgba(0,0,0,0.06)' }}>{t}</button>
          ))}
        </div>
        <textarea className="input" placeholder={type==='photo' ? 'Write a caption...' : type==='memory' ? 'A memory to save forever…' : 'What’s on your mind?'} value={text} onChange={e=>setText(e.target.value)} rows={3} style={{ borderRadius: 16, marginBottom: 8, resize: 'none' }} />
        <input className="input" placeholder="Image URL (optional) — e.g. https://…" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} style={{ marginBottom: 10 }} />
        <button className="btn btn-primary" type="submit" disabled={sending || (!text.trim() && !imageUrl.trim())}>{sending ? 'Posting…' : 'Post to our private feed 💕'}</button>
      </form>
    </div>
  )
}

export function FeedPost({ post, isOwn, onTogglePin, authorName }) {
  return (
    <div className="card" style={{ padding: 16, position: 'relative', overflow: 'hidden', border: post.is_pinned ? '1.5px solid var(--color-dusty-rose)' : '1px solid rgba(255,255,255,0.8)' }}>
      {post.is_pinned && <div className="pill pill-rose" style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.7rem' }}>📌 core memory</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{authorName?.[0] || '💕'}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{authorName || 'Partner'}</div>
          <div className="text-light" style={{ fontSize: '0.75rem' }}>{new Date(post.created_at).toLocaleString()} • {post.content_type}</div>
        </div>
      </div>
      {post.content_text && <div style={{ fontSize: '0.97rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: post.image_url ? 10 : 0 }}>{post.content_text}</div>}
      {post.image_url && <img src={post.image_url} alt="memory" style={{ width: '100%', borderRadius: 16, maxHeight: 360, objectFit: 'cover' }} />}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-ghost btn-small" onClick={()=>onTogglePin(post)}> {post.is_pinned ? 'Unpin' : '📌 Pin as core memory'}</button>
      </div>
    </div>
  )
}
