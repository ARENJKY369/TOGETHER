import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handle(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (password.length < 6) throw new Error('Password must be at least 6 characters')
      await signUp(email, password)
      navigate('/onboarding')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '85vh', display: 'grid', placeItems: 'center', padding: '24px 0' }}>
      <div className="card glass-card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div className="text-center" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '3rem' }}>💌</div>
          <h2>Create your space</h2>
          <p className="text-soft" style={{ fontSize: '0.95rem', marginTop: 6 }}>Start your private world for two</p>
        </div>

        <form onSubmit={handle}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="at least 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <div style={{ background: '#FFF0F1', border: '1px solid #FFD6D9', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem', color: '#A85666', marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary w-full btn-large" disabled={loading}>
            {loading ? <span className="loading-dots"><span></span><span></span><span></span></span> : 'Continue 💫'}
          </button>

          <p className="text-center text-soft" style={{ fontSize: '0.9rem', marginTop: 16 }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>

        <div className="text-center text-light" style={{ fontSize: '0.75rem', marginTop: 18 }}>
          By signing up, you agree that your data is private and isolated per couple via RLS.
        </div>
      </div>
    </div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handle(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '85vh', display: 'grid', placeItems: 'center', padding: '24px 0' }}>
      <div className="card glass-card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div className="text-center" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '3rem' }}>🏠</div>
          <h2>Welcome back</h2>
          <p className="text-soft" style={{ fontSize: '0.95rem', marginTop: 6 }}>Your cozy corner is waiting</p>
        </div>

        <form onSubmit={handle}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>

          {error && <div style={{ background: '#FFF0F1', border: '1px solid #FFD6D9', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem', color: '#A85666', marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary w-full btn-large" disabled={loading}>
            {loading ? <span className="loading-dots"><span></span><span></span><span></span></span> : 'Log in ✨'}
          </button>

          <p className="text-center text-soft" style={{ fontSize: '0.9rem', marginTop: 16 }}>
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
