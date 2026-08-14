import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
      <div className="text-center animate-fadeIn" style={{ padding: '20px 0' }}>
        <div style={{ fontSize: '5rem', marginBottom: 16 }} className="animate-float">💕</div>
        <h1 style={{ marginBottom: 12 }}>A cozy space<br/>for <span style={{ color: 'var(--color-dusty-rose)' }}>you two</span></h1>
        <p className="text-soft" style={{ fontSize: '1.1rem', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.5 }}>
          Together is a daily companion for long-distance love — small rituals, tiny celebrations, and a private world that’s just yours.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/" className="btn btn-primary btn-large">Go to Dashboard 💫</Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary btn-large">Create your space ✨</Link>
              <Link to="/login" className="btn btn-secondary btn-large">Log in</Link>
            </>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card glass-card">
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🌅🌙</div>
          <h3>Dual time, one heart</h3>
          <p className="text-soft" style={{ fontSize: '0.95rem', marginTop: 6 }}>See both your times at a glance. The background gently shifts to reflect whether you’re both in daylight, both under stars, or somewhere in between.</p>
        </div>
        <div className="card glass-card">
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>💌</div>
          <h3>Small rituals, not streaks</h3>
          <p className="text-soft" style={{ fontSize: '0.95rem', marginTop: 6 }}>Daily questions, thinking-of-you pings, and memory timelines — designed to lower anxiety, not add guilt.</p>
        </div>
        <div className="card glass-card full">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ marginBottom: 6 }}>🔒 Private by design</h3>
              <p className="text-soft" style={{ fontSize: '0.95rem' }}>Every couple gets an isolated space enforced at the database level (Row Level Security). Not just hidden in UI — truly impossible to cross-read via API. Your intimate data stays yours.</p>
            </div>
            <div className="pill pill-rose" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>RLS • Postgres • Supabase</div>
          </div>
        </div>
      </div>

      <div className="text-center text-light" style={{ fontSize: '0.85rem', paddingBottom: 20 }}>
        Built warm, soft, and cozy — like a blanket, not a corporate dashboard.
      </div>
    </div>
  )
}
