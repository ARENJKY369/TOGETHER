import { useState, useEffect } from 'react'
import { triggerConfetti } from '../Confetti'

export default function SyncMoment({ onTap, lastSync, partnerName }) {
  const [tapping, setTapping] = useState(false)
  const [result, setResult] = useState(null) // {synced:boolean}
  const [countdown, setCountdown] = useState(300) // 5 min window display when not synced?

  async function handleTap() {
    setTapping(true)
    setResult(null)
    try {
      const res = await onTap()
      setResult(res)
      if (res.synced) triggerConfetti()
    } finally {
      setTapping(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #FFF0F1, #FFF8F0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3>✨ Sync Moment</h3>
        <span className="pill pill-sun">5-min window</span>
      </div>
      <p className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
        Both tap within 5 minutes to log a “we synced” virtual high-five across distance. No streak, no pressure — just tiny magic.
      </p>

      <button className="btn btn-primary w-full btn-large" onClick={handleTap} disabled={tapping} style={{ borderRadius: 20 }}>
        {tapping ? <span className="loading-dots"><span></span><span></span><span></span></span> : 'Tap to sync 🙌'}
      </button>

      {result && (
        <div className="animate-fadeIn" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: result.synced ? 'linear-gradient(135deg,#FFDAB7,#FFB3BB)' : '#FFF4E6', textAlign: 'center' }}>
          {result.synced ? (
            <>
              <div style={{ fontSize: '1.4rem' }}>💫 You synced!</div>
              <div style={{ fontSize: '0.9rem', marginTop: 4 }}>You and {partnerName || 'your love'} tapped within 5 minutes — logged to Our Story ✨</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.1rem' }}>Tap recorded 💕</div>
              <div className="text-soft" style={{ fontSize: '0.85rem', marginTop: 4 }}>If {partnerName || 'they'} tap within 5 minutes, you’ll sync! We’ll notify them gently.</div>
            </>
          )}
        </div>
      )}

      {lastSync?.is_synced && (
        <p className="text-light" style={{ fontSize: '0.75rem', marginTop: 10, textAlign: 'center' }}>
          Last sync: {new Date(lastSync.tapped_at).toLocaleString()} • {lastSync.is_synced ? '✨ synced' : 'waiting'}
        </p>
      )}
    </div>
  )
}
