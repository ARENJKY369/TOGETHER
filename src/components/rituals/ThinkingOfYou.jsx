import { useState } from 'react'
import { PING_VARIANTS } from '../../lib/rituals'
import { triggerConfetti } from '../Confetti'

export default function ThinkingOfYou({ onSend, partnerName }) {
  const [selected, setSelected] = useState(null)
  const [sending, setSending] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  async function handleSend(variant) {
    setSending(true)
    try {
      await onSend(variant)
      triggerConfetti()
      setSelected(variant)
      setTimeout(()=>setSelected(null), 2000)
      setShowPicker(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 8 }}>💭 Thinking of you</h3>
      <p className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 12 }}>One tap sends a lightweight ping — no pressure to reply. Warm, optional, cozy.</p>

      {!showPicker ? (
        <button className="btn btn-primary w-full" onClick={()=>setShowPicker(true)}>Send a ping to {partnerName?.split(' ')[0] || 'your love'} ✨</button>
      ) : (
        <div className="animate-fadeIn">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {PING_VARIANTS.map(v => (
              <button key={v.id} className="btn" onClick={()=>handleSend(v)} disabled={sending}
                style={{ background: v.gradient, border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 84 }}>
                <span style={{ fontSize: '1.6rem' }}>{v.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{v.label}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-small w-full" onClick={()=>setShowPicker(false)}>Cancel</button>
        </div>
      )}

      {selected && (
        <div className="animate-fadeIn" style={{ marginTop: 12, background: '#FFF0F1', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
          Sent {selected.emoji} {selected.label} to {partnerName || 'them'}! 💕
        </div>
      )}
    </div>
  )
}
