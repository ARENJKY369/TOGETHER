import { useState } from 'react'

function TimelineItem({ item, isPinned }) {
  const date = new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = new Date(item.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (item.type === 'feed') {
    const post = item.data
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isPinned ? 'linear-gradient(135deg,var(--color-dusty-rose),var(--color-terracotta))' : 'white', border: '1.5px solid rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {isPinned ? '📌' : post.content_type === 'photo' ? '📸' : post.content_type === 'memory' ? '💎' : '📝'}
        </div>
        <div className="card" style={{ flex: 1, padding: 14, background: isPinned ? '#FFF0F1' : 'white', border: isPinned ? '1.5px solid var(--color-blush-light)' : '1px solid rgba(0,0,0,0.04)' }}>
          {isPinned && <span className="pill pill-rose" style={{ fontSize: '0.7rem', marginBottom: 6 }}>core memory</span>}
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{post.content_type} {isPinned ? '• pinned' : ''}</div>
          <div className="text-light" style={{ fontSize: '0.75rem', marginBottom: 6 }}>{date} • {time}</div>
          {post.content_text && <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{post.content_text}</div>}
          {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginTop: 8, maxHeight: 240, objectFit: 'cover' }} />}
        </div>
      </div>
    )
  }

  if (item.type === 'daily_question') {
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FFF0D6,#FFDAB7)', border: '1.5px solid rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>❓</div>
        <div className="card" style={{ flex: 1, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Daily question answered together</div>
          <div className="text-light" style={{ fontSize: '0.75rem', marginBottom: 6 }}>{date}</div>
          <div className="text-soft" style={{ fontSize: '0.85rem' }}>{item.data.answers.length} answers • Both unlocked</div>
        </div>
      </div>
    )
  }

  if (item.type === 'ping') {
    const p = item.data
    const emojiMap = { wave: '👋', heart: '💖', hug: '🫂', kiss: '😘', sparkle: '✨' }
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FFD6D9,#FFF2E2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{emojiMap[p.variant] || '💕'}</div>
        <div className="card" style={{ flex: 1, padding: 12, background: '#FFF8F0' }}>
          <div style={{ fontSize: '0.9rem' }}><strong>Thinking of you:</strong> {p.variant} {p.message ? `• “${p.message}”` : ''}</div>
          <div className="text-light" style={{ fontSize: '0.75rem' }}>{date} • {time}</div>
        </div>
      </div>
    )
  }

  if (item.type === 'sync') {
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#B8E0D8,#FFDAB7)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>🙌</div>
        <div className="card" style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg,#FFF0F1,#FFDAB7)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>✨ We synced!</div>
          <div className="text-soft" style={{ fontSize: '0.85rem' }}>Both tapped within 5 minutes — virtual high-five!</div>
          <div className="text-light" style={{ fontSize: '0.75rem' }}>{date} • {time}</div>
        </div>
      </div>
    )
  }

  if (item.type === 'bucket') {
    const b = item.data
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#FFF0D6,#FFDAB7)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>🎒</div>
        <div className="card" style={{ flex: 1, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>Completed bucket: {b.title}</div>
          <div className="text-light" style={{ fontSize: '0.75rem' }}>{date}</div>
        </div>
      </div>
    )
  }

  return null
}

export default function OurStoryTimeline({ items, showPinnedOnly, setShowPinnedOnly }) {
  const filtered = showPinnedOnly ? items.filter(i => i.isPinned) : items

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ flex: 1 }}>📚 Our Story</h3>
        <button className={`btn btn-small ${showPinnedOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={()=>setShowPinnedOnly(!showPinnedOnly)}>
          {showPinnedOnly ? 'Showing pinned' : 'All • Filter pinned'}
        </button>
      </div>

      {filtered.length===0 && (
        <div className="card text-center" style={{ padding: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌱</div>
          <h4>Your story grows with tiny moments</h4>
          <p className="text-soft" style={{ fontSize: '0.9rem', marginTop: 6 }}>Feed posts, answered questions, syncs, and pings will appear here automatically. Pin favorites as core memories 💎</p>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {/* vertical line */}
        {filtered.length>0 && <div style={{ position: 'absolute', left: 18, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg,#FFD6D9,#FFDAB7)', opacity: 0.5, borderRadius: 999 }} />}
        {filtered.map(item => <TimelineItem key={item.id} item={item} isPinned={item.isPinned} />)}
      </div>
    </div>
  )
}
