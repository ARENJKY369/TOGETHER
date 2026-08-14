import { useState, useEffect } from 'react'
import { triggerConfetti } from '../Confetti'

export default function DailyQuestionCard({ question, myAnswer, partnerAnswer, bothAnswered, partnerName, onSubmit, submitting, streak }) {
  const [answer, setAnswer] = useState(myAnswer?.answer_text || '')
  const [revealed, setRevealed] = useState(bothAnswered)

  useEffect(() => {
    if (bothAnswered && !revealed) {
      // auto reveal after short delay with confetti
      const t = setTimeout(() => {
        setRevealed(true)
        triggerConfetti()
      }, 800)
      return () => clearTimeout(t)
    }
  }, [bothAnswered])

  useEffect(() => {
    setAnswer(myAnswer?.answer_text || '')
  }, [myAnswer])

  if (!question) return null

  return (
    <div className="card glass-card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div className="pill pill-rose" style={{ marginBottom: 8 }}>❓ Daily Question • {question.category || 'love'}</div>
          <h3 style={{ fontSize: '1.25rem', lineHeight: 1.3, maxWidth: 480 }}>{question.question_text}</h3>
        </div>
        {streak?.currentStreak > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#FFDAB7,#FF8FA0)', borderRadius: 16, padding: '8px 12px', textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{streak.currentStreak}🔥</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>day streak</div>
          </div>
        )}
      </div>

      {!myAnswer && !bothAnswered ? (
        <>
          <p className="text-soft" style={{ fontSize: '0.9rem', marginBottom: 12 }}>Answer privately — your partner won’t see until they’ve answered too. That unlock-together moment is the ritual ✨</p>
          <textarea
            className="input"
            placeholder={`What’s on your heart, today?`}
            value={answer}
            onChange={e=>setAnswer(e.target.value)}
            rows={3}
            style={{ resize: 'none', borderRadius: 16, marginBottom: 10 }}
          />
          <button className="btn btn-primary" disabled={!answer.trim() || submitting} onClick={()=>onSubmit(answer)}>
            {submitting ? 'Saving…' : 'Save my answer 💌'}
          </button>
          {streak?.lastDate && <p className="text-light" style={{ fontSize: '0.8rem', marginTop: 8 }}>Last both-answered: {streak.lastDate} • Total: {streak.totalCompleted} days</p>}
        </>
      ) : myAnswer && !bothAnswered ? (
        <div className="animate-fadeIn" style={{ background: '#FFF8F0', borderRadius: 16, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
          <h4>Your answer is saved 💕</h4>
          <p className="text-soft" style={{ fontSize: '0.9rem', marginTop: 6 }}>“{myAnswer.answer_text}”</p>
          <p className="text-soft" style={{ fontSize: '0.85rem', marginTop: 12 }}>Waiting for {partnerName || 'your partner'} to answer. You’ll both unlock together — no peeking! ✨</p>
          <div style={{ marginTop: 12 }} className="loading-dots"><span></span><span></span><span></span></div>
        </div>
      ) : bothAnswered && revealed ? (
        <div className="animate-fadeIn">
          <div style={{ background: 'linear-gradient(135deg,#FFF0F1,#FFDAB7)', borderRadius: 20, padding: 16, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem' }}>🎉 You both answered today!</div>
            <p className="text-soft" style={{ fontSize: '0.85rem' }}>This unlock-together moment is logged to Your Story.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#FFF8F0', borderRadius: 16, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>You</div>
              <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{myAnswer?.answer_text}</div>
            </div>
            <div style={{ background: '#FFF0F1', borderRadius: 16, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{partnerName || 'Partner'}</div>
              <div style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{partnerAnswer?.answer_text}</div>
            </div>
          </div>
          {streak?.currentStreak >= 7 && <div className="pill pill-rose" style={{ marginTop: 12 }}>🔥 {streak.currentStreak} day streak — {streak.currentStreak>=100 ? '100 days! Incredible!' : streak.currentStreak>=30 ? '30 days strong!' : 'Week+ together!'}</div>}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div className="loading-dots"><span></span><span></span><span></span></div>
          <p className="text-soft" style={{ marginTop: 8 }}>Unlocking your shared moment…</p>
        </div>
      )}
    </div>
  )
}
