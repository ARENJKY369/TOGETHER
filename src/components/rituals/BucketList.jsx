import { useState } from 'react'

export default function BucketList({ items, onAdd, onToggle }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    await onAdd({ title, description: desc })
    setTitle(''); setDesc(''); setShowForm(false)
  }

  const pending = items.filter(i => !i.is_completed)
  const done = items.filter(i => i.is_completed)

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>🎒 Bucket list — things for next visit</h3>
        <button className="btn btn-secondary btn-small" onClick={()=>setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="animate-fadeIn" style={{ background: '#FFF8F0', borderRadius: 16, padding: 12, marginBottom: 12 }}>
          <input className="input" placeholder="e.g. Cook pasta together 🍝" value={title} onChange={e=>setTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Details (optional)" value={desc} onChange={e=>setDesc(e.target.value)} style={{ marginBottom: 8 }} />
          <button className="btn btn-primary btn-small" type="submit" disabled={!title.trim()}>Add 💫</button>
        </form>
      )}

      {items.length===0 && <p className="text-soft" style={{ fontSize: '0.9rem', textAlign: 'center', padding: 12 }}>No bucket list yet — add your first dream for next time you’re together ✨</p>}

      {pending.length>0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {pending.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'white', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <button onClick={()=>onToggle(item)} style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--color-dusty-rose)', background: 'white', cursor: 'pointer', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</div>
                {item.description && <div className="text-soft" style={{ fontSize: '0.85rem' }}>{item.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length>0 && (
        <div>
          <div className="text-soft" style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>✓ Completed ({done.length})</div>
          {done.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', opacity: 0.7, background: '#FFF0F1', borderRadius: 12, padding: '8px 12px', marginBottom: 6 }}>
              <button onClick={()=>onToggle(item)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--color-dusty-rose)', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '0.8rem' }}>✓</button>
              <div style={{ textDecoration: 'line-through', fontSize: '0.9rem' }}>{item.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
