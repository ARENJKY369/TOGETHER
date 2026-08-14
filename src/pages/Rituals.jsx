import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchDailyQuestions, getTodayQuestion, fetchAnswersForQuestion, submitDailyAnswer, fetchAllAnswers, computeStreakFromAnswers,
  sendPing, fetchPings, PING_VARIANTS,
  tapSync, fetchSyncHistory,
  fetchBucketList, addBucketItem, toggleBucketItem,
  fetchCalendar, addCalendarEvent, deleteCalendarEvent,
  fetchStoryTimeline, checkMilestones
} from '../lib/rituals'
import DailyQuestionCard from '../components/rituals/DailyQuestionCard'
import ThinkingOfYou from '../components/rituals/ThinkingOfYou'
import SyncMoment from '../components/rituals/SyncMoment'
import BucketList from '../components/rituals/BucketList'
import SharedCalendar from '../components/rituals/Calendar'
import OurStoryTimeline from '../components/rituals/OurStoryTimeline'
import { triggerConfetti } from '../components/Confetti'
import { useNavigate } from 'react-router-dom'

export default function Rituals() {
  const { user, profile, couple, partnerProfile } = useAuth()
  const navigate = useNavigate()
  const coupleId = couple?.id || profile?.couple_id

  // Daily Question state
  const [questions, setQuestions] = useState([])
  const [todayQ, setTodayQ] = useState(null)
  const [answersToday, setAnswersToday] = useState([])
  const [allAnswers, setAllAnswers] = useState([])
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 })
  const [submitting, setSubmitting] = useState(false)

  // Other rituals
  const [pings, setPings] = useState([])
  const [syncHistory, setSyncHistory] = useState([])
  const [bucket, setBucket] = useState([])
  const [calendar, setCalendar] = useState([])
  const [timeline, setTimeline] = useState([])
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [milestones, setMilestones] = useState([])
  const [showMilestoneModal, setShowMilestoneModal] = useState(null)

  useEffect(() => {
    if (!coupleId) return
    fetchDailyQuestions().then(qs => {
      setQuestions(qs)
      setTodayQ(getTodayQuestion(qs))
    })
    fetchAllAnswers(coupleId).then(answers => {
      setAllAnswers(answers)
      setStreak(computeStreakFromAnswers(answers))
    })
    fetchBucketList(coupleId).then(setBucket)
    fetchCalendar(coupleId).then(setCalendar)
    fetchPings(coupleId).then(setPings)
    fetchSyncHistory(coupleId).then(setSyncHistory)
    fetchStoryTimeline(coupleId).then(setTimeline)
  }, [coupleId])

  useEffect(() => {
    if (!coupleId || !todayQ) return
    fetchAnswersForQuestion(coupleId, todayQ.id).then(setAnswersToday)
  }, [coupleId, todayQ])

  useEffect(() => {
    if (!profile) return
    const ms = checkMilestones({
      relationshipStartDate: profile.relationship_start_date,
      ldrStartDate: profile.ldr_start_date,
      currentStreak: streak.currentStreak,
      totalDays: streak.totalCompleted ? undefined : undefined // we could compute days together
    })
    // Also check days together for milestone
    if (profile.relationship_start_date) {
      const diff = Math.floor((new Date() - new Date(profile.relationship_start_date)) / (86400000))
      const more = checkMilestones({ relationshipStartDate: profile.relationship_start_date, ldrStartDate: profile.ldr_start_date, currentStreak: streak.currentStreak, totalDays: diff })
      setMilestones(more)
      if (more.length>0) {
        // Show celebration if today is milestone and not shown recently
        const lastShown = localStorage.getItem('together_last_milestone_shown')
        const today = new Date().toISOString().slice(0,10)
        if (lastShown !== today) {
          setShowMilestoneModal(more[0])
          localStorage.setItem('together_last_milestone_shown', today)
          setTimeout(()=>triggerConfetti(), 400)
        }
      }
    } else {
      setMilestones(ms)
    }
  }, [profile?.relationship_start_date, profile?.ldr_start_date, streak])

  const myAnswerToday = useMemo(() => answersToday.find(a => a.user_id === user?.id), [answersToday, user?.id])
  const partnerAnswerToday = useMemo(() => answersToday.find(a => a.user_id !== user?.id), [answersToday, user?.id])
  const bothAnsweredToday = !!myAnswerToday && !!partnerAnswerToday

  async function handleSubmitAnswer(text) {
    if (!todayQ || !coupleId) return
    setSubmitting(true)
    try {
      const ans = await submitDailyAnswer({ coupleId, questionId: todayQ.id, userId: user.id, answerText: text })
      const updatedToday = await fetchAnswersForQuestion(coupleId, todayQ.id)
      setAnswersToday(updatedToday)
      const all = await fetchAllAnswers(coupleId)
      setAllAnswers(all)
      setStreak(computeStreakFromAnswers(all))
      // Refresh timeline
      fetchStoryTimeline(coupleId).then(setTimeline)

      if (updatedToday.length >= 2) {
        triggerConfetti()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendPing(variant) {
    const ping = await sendPing({ coupleId, senderId: user.id, variant: variant.id })
    setPings(prev => [ping, ...prev].slice(0,20))
    // Also refresh timeline
    fetchStoryTimeline(coupleId).then(setTimeline)
  }

  async function handleSyncTap() {
    const res = await tapSync({ coupleId, userId: user.id })
    setSyncHistory(prev => [res.tap, ...prev].slice(0,20))
    fetchStoryTimeline(coupleId).then(setTimeline)
    return res
  }

  async function handleAddBucket({ title, description }) {
    const item = await addBucketItem({ coupleId, createdBy: user.id, title, description })
    setBucket(prev => [item, ...prev])
  }

  async function handleToggleBucket(item) {
    const updated = await toggleBucketItem(item.id, item.is_completed)
    setBucket(prev => prev.map(b => b.id===updated.id ? updated : b))
    fetchStoryTimeline(coupleId).then(setTimeline)
    if (updated.is_completed) triggerConfetti()
  }

  async function handleAddCalendar(form) {
    const ev = await addCalendarEvent({ coupleId, createdBy: user.id, ...form })
    setCalendar(prev => [...prev, ev].sort((a,b) => new Date(a.event_date) - new Date(b.event_date)))
  }

  async function handleDeleteCalendar(id) {
    await deleteCalendarEvent(id)
    setCalendar(prev => prev.filter(c => c.id !== id))
  }

  if (!coupleId) {
    return <div className="card text-center" style={{ padding: 32 }}><h3>Pair first to unlock rituals</h3><p className="text-soft">Daily questions, memory feed, sync moments are for you two only.</p></div>
  }

  return (
    <div style={{ padding: '12px 0', maxWidth: 720, margin: '0 auto', display: 'grid', gap: 16 }}>
      {/* Milestone celebration modal */}
      {showMilestoneModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }} onClick={()=>setShowMilestoneModal(null)}>
          <div className="card text-center" style={{ padding: 32, maxWidth: 400, width: '100%', background: 'linear-gradient(135deg, #FFF0F1, #FFDAB7)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize: '3rem' }}>{showMilestoneModal.emoji}</div>
            <h2 style={{ marginTop: 8 }}>{showMilestoneModal.title}</h2>
            <p className="text-soft" style={{ marginTop: 8 }}>A moment to celebrate — not just a counter. You’ve built this together, tiny ritual by tiny ritual 💕</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={()=>setShowMilestoneModal(null)}>Celebrate together 🎉</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>✨ Daily rituals & memories</h2>
        <span className="pill pill-rose">Phase 3 live</span>
      </div>

      {/* Streak banner gentle */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FFF0F1, #FFF4E6)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            {streak.currentStreak===0 ? '🌱 Fresh start — new streak begins with today' : `🔥 ${streak.currentStreak} day streak`}
          </div>
          <div className="text-soft" style={{ fontSize: '0.85rem' }}>
            {streak.currentStreak===0
              ? 'If you miss a day, we reframe gently as “new streak started” — no shame, just warmth.'
              : `Longest: ${streak.longestStreak} days • Total both-answered days: ${streak.totalCompleted || 0} • Last: ${streak.lastDate || '—'}`}
          </div>
        </div>
        {streak.currentStreak>=7 && <div style={{ fontSize: '1.8rem' }}>🎉</div>}
      </div>

      {/* Daily Question */}
      {todayQ && (
        <DailyQuestionCard
          question={todayQ}
          myAnswer={myAnswerToday}
          partnerAnswer={partnerAnswerToday}
          bothAnswered={bothAnsweredToday}
          partnerName={partnerProfile?.display_name}
          onSubmit={handleSubmitAnswer}
          submitting={submitting}
          streak={streak}
        />
      )}

      <div className="dashboard-grid">
        <ThinkingOfYou onSend={handleSendPing} partnerName={partnerProfile?.display_name} />
        <SyncMoment onTap={handleSyncTap} lastSync={syncHistory.find(s=>s.is_synced)} partnerName={partnerProfile?.display_name} />
      </div>

      {/* Feed preview link */}
      <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>📸 Private feed</h3>
          <p className="text-soft" style={{ fontSize: '0.85rem' }}>{timeline.filter(t=>t.type==='feed').length} posts • chronological, only you two</p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={()=>navigate('/feed')}>Open feed →</button>
      </div>

      <BucketList items={bucket} onAdd={handleAddBucket} onToggle={handleToggleBucket} />

      <SharedCalendar events={calendar} onAdd={handleAddCalendar} onDelete={handleDeleteCalendar} />

      <OurStoryTimeline items={timeline} showPinnedOnly={showPinnedOnly} setShowPinnedOnly={setShowPinnedOnly} />

      {milestones.length>0 && (
        <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #FFF0F1, #FFDAB7)' }}>
          <h3>🎉 Milestones</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {milestones.map((m,i) => (
              <span key={i} className="pill pill-rose" style={{ background: 'white' }}>{m.emoji} {m.title}</span>
            ))}
          </div>
          <p className="text-soft" style={{ fontSize: '0.85rem', marginTop: 8 }}>Auto-celebration, not just a counter — confetti when milestones hit ✨</p>
        </div>
      )}
    </div>
  )
}
