import { QUICK_REACTIONS } from '../../lib/chat'

export default function QuickReactionBar({ onSend, partnerName }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      padding: '8px 12px',
      scrollbarWidth: 'none',
    }}>
      <span className="text-soft" style={{ fontSize: '0.75rem', alignSelf: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>Quick send to {partnerName || 'partner'}:</span>
      {QUICK_REACTIONS.map(q => (
        <button
          key={q.emoji}
          onClick={() => onSend(q)}
          className="pill"
          style={{
            cursor: 'pointer',
            flexShrink: 0,
            background: 'white',
            border: '1.5px solid rgba(0,0,0,0.06)',
            padding: '6px 14px',
            fontSize: '0.95rem',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '1.1rem' }}>{q.emoji}</span> {q.label}
        </button>
      ))}
    </div>
  )
}
