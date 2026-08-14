import { useState, useEffect, useRef } from 'react'
import { searchGifs, hasGifKeys } from '../../lib/giphy'

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('love')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    handleSearch('love')
  }, [])

  async function handleSearch(q = query) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const results = await searchGifs(q, 12)
      setGifs(results)
    } finally { setLoading(false) }
  }

  return (
    <div className="animate-fadeIn" style={{
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px 24px 0 0',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
      maxHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '1.1rem' }}>🎞️ GIFs</h3>
        <button className="btn btn-ghost btn-small" onClick={onClose}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Search cute GIFs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter') handleSearch() }}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-small" onClick={() => handleSearch()} disabled={loading}>
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {!hasGifKeys && (
        <div style={{ background: '#FFF8F0', borderRadius: 12, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem' }} className="text-soft">
          💡 No GIPHY key set — showing curated cozy GIFs. Add <code>VITE_GIPHY_API_KEY</code> in .env for full search.
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, paddingBottom: 8 }}>
        {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20 }}><span className="loading-dots"><span></span><span></span><span></span></span></div>}
        {!loading && gifs.length===0 && <div className="text-soft" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, fontSize: '0.9rem' }}>No GIFs found — try “hug”, “kiss”, “miss you” 💌</div>}
        {gifs.map(g => (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            style={{
              border: '1.5px solid rgba(0,0,0,0.06)',
              borderRadius: 16,
              overflow: 'hidden',
              padding: 0,
              cursor: 'pointer',
              background: 'white',
              display: 'block',
            }}
          >
            <img src={g.preview || g.url} alt={g.title || 'gif'} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}
