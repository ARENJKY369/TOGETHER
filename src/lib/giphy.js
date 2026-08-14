// Giphy & Tenor search — free tier

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY
const TENOR_KEY = import.meta.env.VITE_TENOR_API_KEY

// Fallback: use Giphy public beta key if none provided (rate limited)
// Don't commit your key to repo — use .env
export async function searchGifs(query, limit = 12) {
  if (!query.trim()) return []

  // Prefer Giphy if key exists
  if (GIPHY_KEY) {
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g&lang=en&bundle=messaging_non_clipping`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Giphy error')
      const json = await res.json()
      return (json.data || []).map(g => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url,
        width: parseInt(g.images?.fixed_height?.width || '200', 10),
        height: parseInt(g.images?.fixed_height?.height || '200', 10),
        title: g.title,
        source: 'giphy'
      }))
    } catch (e) {
      console.error('Giphy search failed', e)
    }
  }

  if (TENOR_KEY) {
    try {
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=gif,tinygif`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Tenor error')
      const json = await res.json()
      return (json.results || []).map(g => ({
        id: g.id,
        url: g.media_formats?.gif?.url || g.media_formats?.tinygif?.url,
        preview: g.media_formats?.tinygif?.url,
        width: g.media_formats?.gif?.dims?.[0] || 200,
        height: g.media_formats?.gif?.dims?.[1] || 200,
        title: g.content_description,
        source: 'tenor'
      }))
    } catch (e) {
      console.error('Tenor search failed', e)
    }
  }

  // If no API keys, return cute mock GIFs using Giphy's public embed without key? We'll return static curated GIF URLs (free to use)
  // These are direct Giphy CDN URLs that don't require key — using known IDs
  if (!GIPHY_KEY && !TENOR_KEY) {
    // Mock curated list filtered by query roughly
    const mockGifs = [
      { id: 'mock1', url: 'https://media.giphy.com/media/3o6Zt8qE2T8743PySk/giphy.gif', preview: 'https://media.giphy.com/media/3o6Zt8qE2T8743PySk/giphy.gif', title: 'I love you', keywords: ['love','kiss','hug'] },
      { id: 'mock2', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', preview: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', title: 'Good morning', keywords: ['morning','good morning','sun'] },
      { id: 'mock3', url: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', preview: 'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', title: 'Miss you', keywords: ['miss','missing','you'] },
      { id: 'mock4', url: 'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif', preview: 'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif', title: 'Hug', keywords: ['hug'] },
      { id: 'mock5', url: 'https://media.giphy.com/media/3o6Zt7G2Jv3a3y2uUS4/giphy.gif', preview: 'https://media.giphy.com/media/3o6Zt7G2Jv3a3y2uUS4/giphy.gif', title: 'Goodnight', keywords: ['night','goodnight','sleep'] },
      { id: 'mock6', url: 'https://media.giphy.com/media/26tPplGWjN0xLybiX6/giphy.gif', preview: 'https://media.giphy.com/media/26tPplGWjN0xLybiX6/giphy.gif', title: 'Cute', keywords: ['cute','love'] },
    ]
    const q = query.toLowerCase()
    return mockGifs.filter(g => !q || g.keywords.some(k => q.includes(k) || k.includes(q)) || g.title.toLowerCase().includes(q))
  }

  return []
}

export const hasGifKeys = Boolean(GIPHY_KEY || TENOR_KEY)
