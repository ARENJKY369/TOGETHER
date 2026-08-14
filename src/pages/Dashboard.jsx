import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { triggerConfetti } from '../components/Confetti'

function formatTimeInTimezone(timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch { return '--:--' }
}
function formatDateInTimezone(timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date())
  } catch { return '' }
}
function getHourInTimezone(timezone) {
  try {
    const f = new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: timezone })
    return parseInt(f.format(new Date()), 10)
  } catch { return new Date().getHours() }
}
function timeIcon(hour) {
  if (hour >= 5 && hour < 8) return '🌅'
  if (hour >= 8 && hour < 17) return '☀️'
  if (hour >= 17 && hour < 20) return '🌇'
  return '🌙'
}
function daysDiff(a, b) {
  if (!a || !b) return null
  const d1 = new Date(a), d2 = new Date(b)
  return Math.floor((d2 - d1) / (1000*60*60*24))
}

export default function Dashboard() {
  const { user, profile, couple, partnerProfile, loading, initialized } = useAuth()
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [showVisitPicker, setShowVisitPicker] = useState(false)
  const [nextVisit, setNextVisit] = useState('')
  const [savingVisit, setSavingVisit] = useState(false)

  useEffect(() => {
    const id = setInterval(()=>setNow(new Date()), 60*1000)
    return ()=>clearInterval(id)
  }, [])

  useEffect(() => {
    if (!loading && initialized && !user) navigate('/landing')
    else if (profile && !profile.onboarding_completed) navigate('/onboarding')
  }, [user, profile, loading, initialized])

  useEffect(() => {
    if (couple?.next_visit_date) setNextVisit(couple.next_visit_date)
  }, [couple])

  const myHour = useMemo(() => getHourInTimezone(profile?.timezone || 'UTC'), [profile?.timezone, now])
  const partnerHour = useMemo(() => partnerProfile ? getHourInTimezone(partnerProfile.timezone || 'UTC') : null, [partnerProfile?.timezone, now])

  const daysTogether = useMemo(() => {
    const start = profile?.relationship_start_date
    if (!start) return null
    return daysDiff(start, new Date())
  }, [profile?.relationship_start_date, now])

  const daysLDR = useMemo(() => {
    const start = profile?.ldr_start_date || profile?.relationship_start_date
    if (!start) return null
    return daysDiff(start, new Date())
  }, [profile?.ldr_start_date, profile?.relationship_start_date, now])

  const countdown = useMemo(() => {
    if (!nextVisit) return null
    const diff = daysDiff(new Date(), nextVisit)
    if (diff === null) return null
    if (diff < 0) return { days: 0, past: true, text: 'Your visit was today! 🎉' }
    if (diff === 0) return { days: 0, text: 'Today! 🎉✨', isToday: true }
    if (diff === 1) return { days: 1, text: 'Tomorrow 💕' }
    return { days: diff, text: `${diff} days` }
  }, [nextVisit, now])

  async function saveVisit() {
    setSavingVisit(true)
    try {
      const { supabase, isSupabaseConfigured } = await import('../lib/supabase')
      if (isSupabaseConfigured && supabase && couple) {
        const { error } = await supabase.from('couples').update({ next_visit_date: nextVisit || null }).eq('id', couple.id)
        if (error) throw error
        setShowVisitPicker(false)
        triggerConfetti()
      } else {
        // mock
        const { getMockDB, saveMockDB } = await import('../lib/supabase')
        const db = getMockDB()
        const idx = db.couples.findIndex(c=>c.id===couple?.id)
        if (idx!==-1) { db.couples[idx].next_visit_date = nextVisit || null; saveMockDB(db) }
        setShowVisitPicker(false)
      }
    } catch (e) {
      alert(e.message)
    } finally { setSavingVisit(false) }
  }

  if (loading || !initialized) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
  }

  if (!user) return null

  // Not paired state
  if (profile && !profile.couple_id) {
    return (
      <div style={{ padding: '24px 0' }}>
        <div className="card glass-card text-center" style={{ padding: 32, maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💌</div>
          <h2>Your space is ready — now link with your partner</h2>
          <p className="text-soft" style={{ marginTop: 8, marginBottom: 20 }}>Share your invite code and create your private world together. Everything from here on is just for you two.</p>
          <div className="invite-code" style={{ marginBottom: 20 }}>{profile.invite_code}</div>
          <Link to="/pair" className="btn btn-primary btn-large">Go to pairing →</Link>
          <p className="text-light" style={{ fontSize: '0.8rem', marginTop: 16 }}>Invite link: {window.location.origin}/invite/{profile.invite_code}</p>
        </div>

        <div className="dashboard-grid" style={{ marginTop: 20, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="card">
            <h3>🌙 {formatTimeInTimezone(profile.timezone)}</h3>
            <p className="text-soft" style={{ fontSize: '0.9rem' }}>{formatDateInTimezone(profile.timezone)} • {profile.timezone}</p>
            <p className="text-light" style={{ fontSize: '0.85rem', marginTop: 8 }}>{profile.location ? `📍 ${profile.location}` : 'Add your location in settings'}</p>
          </div>
          <div className="card">
            <h3>💕 {daysTogether !== null ? `${daysTogether} days together` : 'Your timeline'}</h3>
            <p className="text-soft" style={{ fontSize: '0.9rem' }}>{profile.relationship_start_date ? `Since ${new Date(profile.relationship_start_date).toLocaleDateString()}` : 'Set your start date in onboarding'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0 24px' }}>
      {/* Header with paired avatars */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>
            Hi, {profile?.display_name?.split(' ')[0] || 'lovely'} <span className="animate-float" style={{ display: 'inline-block' }}>💕</span>
          </h1>
          <p className="text-soft" style={{ fontSize: '1rem' }}>
            {partnerProfile ? `You & ${partnerProfile.display_name} • ${daysLDR!==null ? `${daysLDR} days of love across distance` : 'together across time zones'}` : 'Your cozy dashboard'}
          </p>
        </div>
        <div className="avatar-pair">
          <div className="avatar avatar-lg" title={profile?.display_name}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (profile?.display_name?.[0] || '💕')}
          </div>
          {partnerProfile && (
            <div className="avatar avatar-lg" title={partnerProfile.display_name}>
              {partnerProfile.avatar_url ? <img src={partnerProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (partnerProfile.display_name?.[0] || '💖')}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Dual timezone */}
        <div className="card time-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <h3>🕰️ Your times</h3>
            <span className="pill pill-sun">live • updates each minute</span>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF8F0', borderRadius: 16, padding: '12px 16px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{profile?.display_name || 'You'} {timeIcon(myHour)}</div>
                <div className="text-soft" style={{ fontSize: '0.85rem' }}>{profile?.location || profile?.timezone}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{formatTimeInTimezone(profile?.timezone || 'UTC')}</div>
                <div className="text-soft" style={{ fontSize: '0.8rem' }}>{formatDateInTimezone(profile?.timezone || 'UTC')}</div>
              </div>
            </div>
            {partnerProfile ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF0F1', borderRadius: 16, padding: '12px 16px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{partnerProfile.display_name} {timeIcon(partnerHour)}</div>
                  <div className="text-soft" style={{ fontSize: '0.85rem' }}>{partnerProfile.location || partnerProfile.timezone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{formatTimeInTimezone(partnerProfile.timezone || 'UTC')}</div>
                  <div className="text-soft" style={{ fontSize: '0.8rem' }}>{formatDateInTimezone(partnerProfile.timezone || 'UTC')}</div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ background: '#FFF8F0', borderStyle: 'dashed', textAlign: 'center', padding: 16 }}>
                <p className="text-soft" style={{ fontSize: '0.9rem' }}>Partner time will appear here once you’re paired 💌</p>
              </div>
            )}
          </div>
          {partnerHour !== null && (
            <div style={{ marginTop: 12, fontSize: '0.85rem' }} className="text-soft">
              {Math.abs(myHour - partnerHour) <= 1 ? '✨ You’re in sync right now — perfect time for a quick “thinking of you” tap!' :
               Math.abs(myHour - partnerHour) >= 8 ? '🌙☀️ Big time gap — leave a sweet note for them to wake up to.' :
               '💕 A little time apart, but close at heart.'}
            </div>
          )}
        </div>

        {/* Countdown & days */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>📅 Next visit</h3>
            <button className="btn btn-secondary btn-small" onClick={()=>setShowVisitPicker(!showVisitPicker)}>{couple?.next_visit_date ? 'Edit' : 'Set date'}</button>
          </div>

          {showVisitPicker ? (
            <div className="animate-fadeIn" style={{ background: '#FFF8F0', borderRadius: 16, padding: 14 }}>
              <input className="input" type="date" value={nextVisit} onChange={e=>setNextVisit(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-small" onClick={()=>setShowVisitPicker(false)}>Cancel</button>
                <button className="btn btn-primary btn-small" onClick={saveVisit} disabled={savingVisit}>{savingVisit ? 'Saving…' : 'Save 💫'}</button>
              </div>
            </div>
          ) : countdown ? (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: countdown.isToday ? 'var(--color-dusty-rose)' : 'var(--color-text)' }}>
                {countdown.isToday ? 'TODAY!' : countdown.text}
              </div>
              {countdown.days>1 && <div className="text-soft" style={{ marginTop: 4 }}>{new Date(nextVisit).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>}
              {countdown.days>7 && <div style={{ marginTop: 8 }} className="text-soft">You’ve got this. Small rituals keep you close till then 💕</div>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>✈️</div>
              <p className="text-soft">When will you see each other next?</p>
              <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={()=>setShowVisitPicker(true)}>Set countdown</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #FFF0F1, #FFDAB7)', borderRadius: 16, padding: 14, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{daysTogether !== null ? daysTogether : '—'}</div>
              <div className="text-soft" style={{ fontSize: '0.8rem' }}>days together</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #FFF4E6, #FFD6D9)', borderRadius: 16, padding: 14, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>{daysLDR !== null ? daysLDR : '—'}</div>
              <div className="text-soft" style={{ fontSize: '0.8rem' }}>days strong across distance</div>
            </div>
          </div>
        </div>

        {/* Phase 3 now live: rituals */}
        <div className="card full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,240,241,0.9))' }}>
          <h3 style={{ marginBottom: 14 }}>Today’s tiny rituals ✨</h3>
          <div className="dashboard-grid">
            <div style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 16px rgba(200,107,122,0.08)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>💭</div>
              <div style={{ fontWeight: 700 }}>Thinking of you — live!</div>
              <div className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 10 }}>One tap sends wave/heart/hug to partner, with animation. Optional opens chat.</div>
              <button className="btn btn-primary btn-small" onClick={()=>navigate('/rituals')}>Send a ping ✨ →</button>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 16px rgba(200,107,122,0.08)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>❓</div>
              <div style={{ fontWeight: 700 }}>Daily Question — live!</div>
              <div className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 10 }}>Same question each day, unlock together after both answer. Streaks without shame.</div>
              <button className="btn btn-primary btn-small" onClick={()=>navigate('/rituals')}>Answer today’s →</button>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>💬</div>
              <div style={{ fontWeight: 700 }}>Chat</div>
              <div className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 10 }}>Real-time chat with stickers, GIFs, quick reactions. Only you two, ever.</div>
              <button className="btn btn-secondary btn-small" onClick={()=>navigate('/chat')}>Open chat 💌 →</button>
            </div>
            <div style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 16px rgba(200,107,122,0.08)' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📚</div>
              <div style={{ fontWeight: 700 }}>Our Story + Feed — live!</div>
              <div className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 10 }}>Auto timeline from feed, questions, syncs, pings. Pin core memories, bucket list, calendar.</div>
              <button className="btn btn-primary btn-small" onClick={()=>navigate('/rituals')}>View story →</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={()=>navigate('/feed')}>📸 Private feed</button>
            <button className="btn btn-secondary" onClick={()=>navigate('/rituals')}>✨ Daily rituals</button>
          </div>
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#FFF8F0', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <span className="text-soft" style={{ fontSize: '0.85rem' }}>
              <strong>Privacy check:</strong> All Phase 3 tables (daily_answers, feed, pings, sync, bucket, calendar) filtered by <code>couple_id = get_my_couple_id()</code>. No cross-couple reads possible.
            </span>
          </div>
        </div>

        {/* Love languages */}
        {(profile?.love_languages?.length || partnerProfile?.love_languages?.length) && (
          <div className="card full">
            <h3 style={{ marginBottom: 12 }}>💌 How you feel loved</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#FFF8F0', borderRadius: 16, padding: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{profile?.display_name || 'You'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(profile?.love_languages || []).map(l => <span key={l} className="pill pill-rose">{l.replace('_',' ')}</span>)}
                  {!profile?.love_languages?.length && <span className="text-light" style={{ fontSize: '0.85rem' }}>Set in onboarding</span>}
                </div>
              </div>
              {partnerProfile && (
                <div style={{ background: '#FFF0F1', borderRadius: 16, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{partnerProfile.display_name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(partnerProfile.love_languages || []).map(l => <span key={l} className="pill pill-rose">{l.replace('_',' ')}</span>)}
                    {!partnerProfile.love_languages?.length && <span className="text-light" style={{ fontSize: '0.85rem' }}>Not set yet</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
