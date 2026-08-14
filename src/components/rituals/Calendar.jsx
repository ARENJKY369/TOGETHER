import { useState } from 'react'

const TYPE_EMOJI = { visit: '✈️', call: '📹', anniversary: '💍', birthday: '🎂', date: '💕', custom: '📌' }

export default function SharedCalendar({ events, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', event_type: 'visit', event_date: '', event_time: '', description: '' })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date) return
    await onAdd(form)
    setForm({ title: '', event_type: 'visit', event_date: '', event_time: '', description: '' })
    setShowForm(false)
  }

  const sorted = [...events].sort((a,b) => new Date(a.event_date) - new Date(b.event_date))
  const upcoming = sorted.filter(ev => new Date(ev.event_date) >= new Date(new Date().setHours(0,0,0,0)))
  const past = sorted.filter(ev => new Date(ev.event_date) < new Date(new Date().setHours(0,0,0,0))).reverse()

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>📅 Shared calendar</h3>
        <button className="btn btn-secondary btn-small" onClick={()=>setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="animate-fadeIn" style={{ background: '#FFF8F0', borderRadius: 16, padding: 12, marginBottom: 12, display: 'grid', gap: 8 }}>
          <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select className="input" value={form.event_type} onChange={e=>setForm({...form, event_type: e.target.value})}>
              <option value="visit">Visit ✈️</option>
              <option value="call">Call 📹</option>
              <option value="anniversary">Anniversary 💍</option>
              <option value="birthday">Birthday 🎂</option>
              <option value="date">Date 💕</option>
              <option value="custom">Custom 📌</option>
            </select>
            <input className="input" type="date" value={form.event_date} onChange={e=>setForm({...form, event_date: e.target.value})} required />
          </div>
          <input className="input" type="time" value={form.event_time} onChange={e=>setForm({...form, event_time: e.target.value})} />
          <input className="input" placeholder="Note (optional)" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
          <button className="btn btn-primary btn-small" type="submit">Save 💾</button>
        </form>
      )}

      {upcoming.length===0 && past.length===0 && <p className="text-soft" style={{ fontSize: '0.9rem', textAlign: 'center', padding: 12 }}>No dates yet — add your next visit or call schedule ✨</p>}

      {upcoming.length>0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>Upcoming</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {upcoming.map(ev => (
              <div key={ev.id} style={{ background: 'white', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem' }}>{TYPE_EMOJI[ev.event_type] || '📌'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ev.title}</div>
                    <div className="text-soft" style={{ fontSize: '0.8rem' }}>{new Date(ev.event_date).toLocaleDateString()} {ev.event_time ? `• ${ev.event_time}` : ''} {ev.description ? `• ${ev.description}` : ''}</div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-small" onClick={()=>onDelete(ev.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length>0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, opacity: 0.7 }}>Past</div>
          <div style={{ display: 'grid', gap: 6, opacity: 0.7 }}>
            {past.slice(0,5).map(ev => (
              <div key={ev.id} style={{ background: '#FFF8F0', borderRadius: 12, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>{TYPE_EMOJI[ev.event_type]} {ev.title} • {new Date(ev.event_date).toLocaleDateString()}</span>
                <button className="btn btn-ghost btn-small" style={{ padding: '2px 6px' }} onClick={()=>onDelete(ev.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
