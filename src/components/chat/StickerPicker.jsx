import { STICKER_PACK, getSmartStickerSuggestion } from '../../lib/chat'

export default function StickerPicker({ onSelect, partnerTimezone, onClose }) {
  const smartId = getSmartStickerSuggestion(partnerTimezone)
  const sorted = [...STICKER_PACK].sort((a,b) => {
    if (a.id === smartId) return -1
    if (b.id === smartId) return 1
    return 0
  })

  return (
    <div className="animate-fadeIn" style={{
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px 24px 0 0',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
      maxHeight: '55vh',
      overflow: 'auto',
      padding: '16px 16px 20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '1.1rem' }}>💌 Cute stickers</h3>
        <button className="btn btn-ghost btn-small" onClick={onClose}>✕</button>
      </div>

      {smartId && (
        <div style={{ marginBottom: 12, background: '#FFF4E6', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>✨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Smart suggestion for {(() => {
              try {
                const h = parseInt(new Intl.DateTimeFormat('en',{hour:'numeric',hour12:false,timeZone:partnerTimezone}).format(new Date()),10)
                if (h>=5&&h<11) return "morning in their time"
                if (h>=22||h<5) return "night in their time"
                return "them right now"
              } catch { return 'them' }
            })()}</div>
            <div className="text-soft" style={{ fontSize: '0.8rem' }}>
              It's {smartId === 'goodmorning' ? 'morning' : smartId === 'goodnight' ? 'late' : 'a sweet moment'} where they are — {STICKER_PACK.find(s=>s.id===smartId)?.description}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {sorted.map(sticker => {
          const isSmart = sticker.id === smartId
          return (
            <button
              key={sticker.id}
              onClick={() => onSelect(sticker)}
              style={{
                border: isSmart ? '2px solid var(--color-dusty-rose)' : '1.5px solid rgba(0,0,0,0.06)',
                borderRadius: 20,
                padding: '14px 8px 10px',
                background: sticker.gradient,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'transform 0.18s cubic-bezier(0.34,1.32,0.64,1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isSmart && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', background: 'var(--color-dusty-rose)', color: 'white', padding: '2px 6px', borderRadius: 999 }}>✨ top</span>}
              <span style={{ fontSize: '2rem', lineHeight: 1 }}>{sticker.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.2 }}>{sticker.label}</span>
            </button>
          )
        })}
      </div>

      <p className="text-light" style={{ fontSize: '0.75rem', marginTop: 12, textAlign: 'center' }}>All stickers send instantly — warm, no pressure to reply 💕</p>
    </div>
  )
}
