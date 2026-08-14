import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchFeed, createFeedPost, togglePinFeedPost } from '../lib/rituals'
import { FeedComposer, FeedPost } from '../components/rituals/Feed'
import { triggerConfetti } from '../components/Confetti'

export default function Feed() {
  const { user, couple, profile, partnerProfile } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)

  const coupleId = couple?.id || profile?.couple_id

  useEffect(() => {
    if (!coupleId) { setLoading(false); return }
    setLoading(true)
    fetchFeed(coupleId).then(setFeed).finally(()=>setLoading(false))
  }, [coupleId])

  async function handleCreate({ contentText, imageUrl, contentType }) {
    const post = await createFeedPost({ coupleId, authorId: user.id, contentType, contentText, imageUrl })
    setFeed(prev => [post, ...prev])
    triggerConfetti()
  }

  async function handleTogglePin(post) {
    const updated = await togglePinFeedPost(post.id, post.is_pinned)
    setFeed(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  if (!coupleId) {
    return <div className="card text-center" style={{ padding: 32 }}><h3>Pair to see your private feed</h3></div>
  }

  return (
    <div style={{ padding: '12px 0', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2>📸 Memories</h2>
        <span className="pill pill-rose">{feed.length} moments</span>
      </div>

      <FeedComposer onCreate={handleCreate} currentUserDisplayName={profile?.display_name} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="loading-dots"><span></span><span></span><span></span></span></div>
      ) : feed.length===0 ? (
        <div className="card text-center" style={{ padding: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💌</div>
          <h3>Your private feed is empty</h3>
          <p className="text-soft" style={{ fontSize: '0.9rem', marginTop: 8 }}>Share photos, notes, and tiny moments — only you two will ever see them. Pin favorites as core memories.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {feed.map(post => (
            <FeedPost key={post.id} post={post} isOwn={post.author_id === user.id} onTogglePin={handleTogglePin} authorName={post.author_id === user.id ? profile?.display_name : partnerProfile?.display_name} />
          ))}
        </div>
      )}
    </div>
  )
}
