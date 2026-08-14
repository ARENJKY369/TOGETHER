import { useState } from 'react'
import { STICKER_PACK } from '../../lib/chat'

function formatTime(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch { return '' }
}

function getStickerById(id) {
  return STICKER_PACK.find(s => s.id === id || s.label === id || s.emoji === id)
}

export default function MessageBubble({ message, isOwn, reactions = [], onReact, onQuickReaction }) {
  const [showReactions, setShowReactions] = useState(false)
  const sticker = message.message_type === 'sticker' ? (getStickerById(message.metadata?.stickerId || message.content) || getStickerById(message.content)) : null

  const isSticker = message.message_type === 'sticker'
  const isGif = message.message_type === 'gif'
  const isText = message.message_type === 'text' || !message.message_type

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (r.message_id !== message.id) return acc
    acc[r.emoji] = acc[r.emoji] || { count: 0, users: [], emoji: r.emoji }
    acc[r.emoji].count++
    acc[r.emoji].users.push(r.user_id)
    return acc
  }, {})
  const groupedList = Object.values(grouped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: 6, padding: '0 12px' }}>
      <div style={{ maxWidth: '78%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>

        {/* Bubble */}
        {isSticker ? (
          <div
            onClick={() => setShowReactions(!showReactions)}
            style={{
              background: sticker?.gradient || 'linear-gradient(135deg,#FFF0F1,#FFDAB7)',
              borderRadius: 24,
              padding: '16px 20px',
              border: isOwn ? '1.5px solid rgba(200,107,122,0.15)' : '1.5px solid rgba(0,0,0,0.05)',
              boxShadow: isOwn ? '0 4px 16px rgba(200,107,122,0.15)' : '0 2px 12px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transform: showReactions ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minWidth: 110,
            }}
          >
            <span style={{ fontSize: '2.8rem', lineHeight: 1 }}>{sticker?.emoji || message.content || '💕'}</span>
            {sticker && <span style={{ fontWeight: 700, fontSize: '0.85rem', opacity: 0.9 }}>{sticker.label}</span>}
          </div>
        ) : isGif ? (
          <div
            onClick={() => setShowReactions(!showReactions)}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              border: '1.5px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              maxWidth: '100%',
              background: 'white',
            }}
          >
            <img src={message.metadata?.gifUrl || message.content} alt="gif" style={{ display: 'block', maxWidth: 220, maxHeight: 220, width: '100%', objectFit: 'cover' }} />
            {message.content && message.metadata?.gifUrl && message.content !== message.metadata?.gifUrl && (
              <div style={{ padding: '6px 10px', fontSize: '0.85rem', background: 'white' }}>{message.content}</div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setShowReactions(!showReactions)}
            style={{
              background: isOwn ? 'linear-gradient(135deg, var(--color-dusty-rose), var(--color-terracotta))' : 'white',
              color: isOwn ? 'white' : 'var(--color-text)',
              borderRadius: isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              padding: '12px 16px',
              boxShadow: isOwn ? '0 4px 16px rgba(200,107,122,0.25)' : '0 2px 12px rgba(0,0,0,0.06)',
              border: isOwn ? 'none' : '1px solid rgba(0,0,0,0.04)',
              cursor: 'pointer',
              wordBreak: 'break-word',
              fontSize: '0.97rem',
              lineHeight: 1.4,
            }}
          >
            {message.content}
          </div>
        )}

        {/* Reactions underneath */}
        {groupedList.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
            {groupedList.map(g => (
              <span key={g.emoji} style={{
                background: 'white',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: '0.8rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}>
                {g.emoji} {g.count>1 && <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{g.count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp + Seen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.7rem' }} className="text-light">
          <span>{formatTime(message.created_at)}</span>
          {isOwn && <span style={{ opacity: 0.8 }}>{message.seen ? '• seen 💕' : '• sent'}</span>}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="animate-fadeIn" style={{
            position: 'absolute',
            bottom: isSticker || isGif ? -38 : -40,
            left: isOwn ? 'auto' : 0,
            right: isOwn ? 0 : 'auto',
            background: 'white',
            borderRadius: 999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '6px',
            display: 'flex',
            gap: 4,
            zIndex: 10,
          }}>
            {['❤️','😂','🫂','😘','🥺','🎉','💕'].map(emoji => (
              <button key={emoji} onClick={() => { onReact(message, emoji); setShowReactions(false) }} style={{
                border: 'none',
                background: 'transparent',
                fontSize: '1.15rem',
                width: 32, height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}>{emoji}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
