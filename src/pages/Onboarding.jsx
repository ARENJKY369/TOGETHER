import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { triggerConfetti } from '../components/Confetti'

const LOVE_LANGUAGES = [
  { id: 'words', label: 'Words of Affirmation', desc: 'Sweet texts, compliments, love notes', icon: '💬' },
  { id: 'quality_time', label: 'Quality Time', desc: 'Undivided attention, being present', icon: '⏰' },
  { id: 'acts', label: 'Acts of Service', desc: 'Helpful things, thoughtful actions', icon: '🤲' },
  { id: 'gifts', label: 'Gifts', desc: 'Surprises, keepsakes, little tokens', icon: '🎁' },
  { id: 'touch', label: 'Physical Touch', desc: 'Hugs, kisses — even virtual', icon: '🫂' },
]

const TIMEZONES = [
  'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Sao_Paulo','Europe/London','Europe/Berlin','Europe/Paris','Europe/Moscow',
  'Africa/Cairo','Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Singapore',
  'Asia/Tokyo','Asia/Seoul','Australia/Sydney','Pacific/Auckland'
]

export default function Onboarding() {
  const { user, profile, updateProfile, createProfileIfMissing, refresh, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    display_name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: '',
    relationship_start_date: '',
    ldr_start_date: '',
    love_languages: [],
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (profile) {
      setForm(f => ({
        display_name: f.display_name || profile.display_name || '',
        timezone: profile.timezone || f.timezone,
        location: f.location || profile.location || '',
        relationship_start_date: f.relationship_start_date || profile.relationship_start_date || '',
        ldr_start_date: f.ldr_start_date || profile.ldr_start_date || profile.relationship_start_date || '',
        love_languages: f.love_languages.length ? f.love_languages : (profile.love_languages || []),
        avatar_url: f.avatar_url || profile.avatar_url || '',
      }))
      if (profile.onboarding_completed) {
        // already done, go to pairing if not paired
        if (!profile.couple_id) navigate('/pair')
        else navigate('/')
      }
    } else if (user && !profile) {
      // try to create missing profile
      createProfileIfMissing().catch(()=>{})
    }
  }, [profile, user])

  function toggleLove(id) {
    setForm(f => {
      const has = f.love_languages.includes(id)
      if (has) return { ...f, love_languages: f.love_languages.filter(x=>x!==id) }
      if (f.love_languages.length >= 2) return { ...f, love_languages: [...f.love_languages.slice(1), id] }
      return { ...f, love_languages: [...f.love_languages, id] }
    })
  }

  async function handleNext() {
    if (step < 4) { setStep(s=>s+1); return }
    // final save
    setError(''); setSaving(true)
    try {
      if (!form.display_name.trim()) throw new Error('Please enter your name')
      if (form.love_languages.length === 0) throw new Error('Pick at least one love language')
      const payload = {
        display_name: form.display_name.trim(),
        avatar_url: form.avatar_url.trim() || null,
        timezone: form.timezone,
        location: form.location.trim(),
        relationship_start_date: form.relationship_start_date || null,
        ldr_start_date: form.ldr_start_date || form.relationship_start_date || null,
        love_languages: form.love_languages,
        onboarding_completed: true,
      }
      await updateProfile(payload)
      await refresh()
      triggerConfetti()
      setTimeout(() => navigate('/pair'), 600)
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  function handleBack() {
    if (step > 1) setStep(s=>s-1)
  }

  if (authLoading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="loading-dots"><span></span><span></span><span></span></span></div>

  return (
    <div style={{ minHeight: '85vh', display: 'grid', placeItems: 'center', padding: '16px 0' }}>
      <div className="card glass-card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="pill">{step} / 4</span>
          <span className="display-font" style={{ fontSize: '1.2rem' }}>
            {step===1 && 'Hello, lovely ✨'}
            {step===2 && 'Your time & place 🌍'}
            {step===3 && 'Your story 💕'}
            {step===4 && 'How you feel loved 💌'}
          </span>
        </div>

        <div style={{ height: 4, background: '#FFF0F1', borderRadius: 999, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ width: `${step*25}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-dusty-rose), var(--color-terracotta))', transition: 'width 0.4s ease', borderRadius: 999 }} />
        </div>

        {step===1 && (
          <div className="animate-fadeIn">
            <h2 style={{ marginBottom: 8 }}>What should we call you?</h2>
            <p className="text-soft" style={{ marginBottom: 16 }}>This is how your partner will see you in your private space.</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <div className="avatar avatar-xl">
                {form.avatar_url ? <img src={form.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (form.display_name?.[0] || '💕')}
              </div>
              <div style={{ flex: 1 }}>
                <div className="input-group" style={{ marginBottom: 8 }}>
                  <label className="input-label">Your name</label>
                  <input className="input" placeholder="e.g. Sam" value={form.display_name} onChange={e=>setForm({...form, display_name: e.target.value})} autoFocus />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Photo URL (optional)</label>
                  <input className="input" placeholder="https://… or leave blank for initials" value={form.avatar_url} onChange={e=>setForm({...form, avatar_url: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="card" style={{ background: '#FFF8F0', border: '1px dashed var(--color-peach)', padding: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>🫶</span>
                <p className="text-soft" style={{ fontSize: '0.9rem' }}>This app is cozy by design. No corporate vibes — just warm, soft corners and gentle animations. Your data is isolated per couple at the database level.</p>
              </div>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="animate-fadeIn">
            <h2 style={{ marginBottom: 8 }}>Where are you right now?</h2>
            <p className="text-soft" style={{ marginBottom: 16 }}>We’ll show both your local times side-by-side — perfect for long distance.</p>
            <div className="input-group">
              <label className="input-label">Timezone</label>
              <select className="input" value={form.timezone} onChange={e=>setForm({...form, timezone: e.target.value})}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>{Intl.DateTimeFormat().resolvedOptions().timeZone} (auto-detected)</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Location (optional)</label>
              <input className="input" placeholder="e.g. Berlin, or ‘home ☕’" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} />
            </div>
            <div className="card" style={{ background: '#FFF4E6', border: 'none', padding: 12 }}>
              <span style={{ fontSize: '0.85rem' }}>💡 Tip: Your partner’s time will appear next to yours on the dashboard, with a little sun/moon icon. The background gradient shifts based on both your times.</span>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="animate-fadeIn">
            <h2 style={{ marginBottom: 8 }}>When did your story begin?</h2>
            <p className="text-soft" style={{ marginBottom: 16 }}>We’ll celebrate anniversaries and count how long you’ve been navigating distance together — gently, never with guilt.</p>
            <div className="input-group">
              <label className="input-label">Relationship start date</label>
              <input className="input" type="date" value={form.relationship_start_date} onChange={e=>setForm({...form, relationship_start_date: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">When did long-distance start? (optional)</label>
              <input className="input" type="date" value={form.ldr_start_date} onChange={e=>setForm({...form, ldr_start_date: e.target.value})} />
            </div>
            <p className="text-light" style={{ fontSize: '0.85rem' }}>If left blank, we’ll use your relationship start date for the “days apart” counter.</p>
          </div>
        )}

        {step===4 && (
          <div className="animate-fadeIn">
            <h2 style={{ marginBottom: 8 }}>How do you feel most loved?</h2>
            <p className="text-soft" style={{ marginBottom: 16 }}>Pick up to 2. We’ll use this to make suggestions feel more “you”.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {LOVE_LANGUAGES.map(opt => {
                const selected = form.love_languages.includes(opt.id)
                return (
                  <div key={opt.id} className={`love-option ${selected ? 'selected' : ''}`} onClick={()=>toggleLove(opt.id)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: '1.6rem' }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{opt.label}</div>
                        <div className="text-soft" style={{ fontSize: '0.85rem' }}>{opt.desc}</div>
                      </div>
                      {selected && <span style={{ marginLeft: 'auto', color: 'var(--color-dusty-rose)' }}>♥</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <div style={{ marginTop: 16, background: '#FFF0F1', border: '1px solid #FFD6D9', borderRadius: 12, padding: '10px 14px', fontSize: '0.9rem', color: '#A85666' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {step>1 && <button className="btn btn-secondary" onClick={handleBack} disabled={saving}>Back</button>}
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleNext} disabled={saving || (step===1 && !form.display_name.trim())}>
            {saving ? <span className="loading-dots"><span></span><span></span><span></span></span> : step===4 ? 'Create my space 💕' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
