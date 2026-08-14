import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { triggerConfetti } from '../components/Confetti'

export default function Pairing() {
  const { profile, pairWithCode, refresh, user } = useAuth()
  const navigate = useNavigate()
  const { code: codeFromUrl } = useParams()
  const [search] = useSearchParams()
  const codeFromQuery = search.get('code')
  const [inviteInput, setInviteInput] = useState(codeFromUrl || codeFromQuery || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login')
    if (profile?.couple_id) navigate('/') // already paired
  }, [profile, user])

  useEffect(() => {
    const c = codeFromUrl || codeFromQuery
    if (c) setInviteInput(c.toUpperCase())
  }, [codeFromUrl, codeFromQuery])

  async function handlePair(e) {
    e?.preventDefault()
    setError(''); setLoading(true)
    try {
      if (!inviteInput.trim()) throw new Error('Enter your partner’s invite code')
      await pairWithCode(inviteInput.trim())
      triggerConfetti()
      setTimeout(()=>navigate('/'), 800)
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  function copyLink() {
    if (!profile?.invite_code) return
    const link = `${window.location.origin}/invite/${profile.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  function copyCode() {
    if (!profile?.invite_code) return
    navigator.clipboard.writeText(profile.invite_code)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  if (!profile) return <div style={{ padding: 40, textAlign: 'center' }}><span className="loading-dots"><span></span><span></span><span></span></span></div>

  return (
    <div style={{ minHeight: '85vh', display: 'grid', placeItems: 'center', padding: '16px 0' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div className="text-center" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '3.5rem' }}>🔗</div>
          <h1 style={{ fontSize: '2rem' }}>Link your hearts</h1>
          <p className="text-soft" style={{ marginTop: 8 }}>One of you shares a code, the other enters it — then your private space unlocks.</p>
        </div>

        <div className="dashboard-grid">
          <div className="card glass-card" style={{ padding: 22 }}>
            <h3 style={{ marginBottom: 12 }}>✨ Your invite code</h3>
            <div className="invite-code" style={{ marginBottom: 14 }}>{profile.invite_code}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-small" onClick={copyCode}>{copied ? 'Copied! 💕' : 'Copy code'}</button>
              <button className="btn btn-secondary btn-small" onClick={copyLink}>{copied ? 'Link copied!' : 'Copy invite link'}</button>
            </div>
            <div style={{ marginTop: 14, background: '#FFF8F0', borderRadius: 12, padding: 12 }}>
              <div className="text-soft" style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                Invite link: <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{window.location.origin}/invite/{profile.invite_code}</span>
              </div>
            </div>
            <p className="text-light" style={{ fontSize: '0.8rem', marginTop: 12 }}>Share this with your partner. It expires after pairing for safety. Only one other person can use it.</p>
          </div>

          <div className="card glass-card" style={{ padding: 22 }}>
            <h3 style={{ marginBottom: 12 }}>💌 Enter partner’s code</h3>
            <form onSubmit={handlePair}>
              <div className="input-group">
                <input className="input" placeholder="e.g. AB3K9X" value={inviteInput} onChange={e=>setInviteInput(e.target.value.toUpperCase())} style={{ letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }} />
              </div>
              {error && <div style={{ background: '#FFF0F1', border: '1px solid #FFD6D9', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem', color: '#A85666', marginBottom: 12 }}>{error}</div>}
              <button className="btn btn-primary w-full" disabled={loading || !inviteInput.trim()}>
                {loading ? <span className="loading-dots"><span></span><span></span><span></span></span> : 'Pair together 💕'}
              </button>
            </form>
            <div style={{ marginTop: 16, padding: 12, background: '#FFF0F1', borderRadius: 12 }}>
              <p style={{ fontSize: '0.85rem' }}><strong>How it works:</strong> Your partner signs up separately, then enters your code. You’ll both be taken to your private dashboard. RLS guarantees no other couple can see your space.</p>
            </div>
          </div>
        </div>

        <div className="text-center" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={()=>navigate('/')}>I’ll pair later — take me to dashboard →</button>
        </div>
      </div>
    </div>
  )
}
