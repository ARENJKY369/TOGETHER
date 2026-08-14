import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendMessage, fetchMessages, subscribeToMessages, markMessagesSeen, fetchReactions, addReaction, sendTypingIndicator, subscribeToTyping, QUICK_REACTIONS, STICKER_PACK } from '../lib/chat'
import MessageBubble from '../components/chat/MessageBubble'
import StickerPicker from '../components/chat/StickerPicker'
import GifPicker from '../components/chat/GifPicker'
import QuickReactionBar from '../components/chat/QuickReactionBar'
import { triggerConfetti } from '../components/Confetti'

export default function Chat() {
  const { user, profile, couple, partnerProfile, loading, initialized } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showStickers, setShowStickers] = useState(false)
  const [showGifs, setShowGifs] = useState(false)
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const [toast, setToast] = useState(null) // warm notification

  const messagesEndRef = useRef(null)
  const listRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Redirects
  useEffect(() => {
    if (!loading && initialized) {
      if (!user) navigate('/login')
      else if (profile && !profile.onboarding_completed) navigate('/onboarding')
      else if (profile && !profile.couple_id) navigate('/pair')
    }
  }, [user, profile, loading, initialized])

  const coupleId = couple?.id || profile?.couple_id

  // Fetch initial messages + reactions
  useEffect(() => {
    if (!coupleId) return
    let mounted = true
    fetchMessages(coupleId).then(ms => { if (mounted) setMessages(ms) })
    fetchReactions(coupleId).then(rs => { if (mounted) setReactions(rs) })
    return () => { mounted = false }
  }, [coupleId])

  // Real-time subscription
  useEffect(() => {
    if (!coupleId) return
    const unsub = subscribeToMessages(coupleId, (newMsg, eventType) => {
      if (eventType === 'reaction') {
        // refetch reactions
        fetchReactions(coupleId).then(setReactions)
        return
      }
      if (eventType === 'update') {
        setMessages(prev => prev.map(m => m.id === newMsg.id ? newMsg : m))
        return
      }
      // INSERT
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        const next = [...prev, newMsg].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
        return next
      })
      // Show warm notification if not own and not focused
      if (newMsg.sender_id !== user?.id) {
        if (document.hidden) {
          setToast(`New message from ${partnerProfile?.display_name || 'your love'} 💌`)
          setTimeout(() => setToast(null), 3000)
        }
      }
    })
    return unsub
  }, [coupleId, user?.id, partnerProfile?.display_name])

  // Mark seen when chat open & messages change
  useEffect(() => {
    if (!coupleId || !user?.id) return
    if (messages.some(m => m.sender_id !== user.id && !m.seen)) {
      markMessagesSeen(coupleId, user.id)
    }
  }, [messages, coupleId, user?.id])

  // Typing subscription
  useEffect(() => {
    if (!coupleId || !user?.id) return
    const unsub = subscribeToTyping(coupleId, user.id, (typingUserId, isTyping) => {
      setIsPartnerTyping(isTyping)
    })
    return unsub
  }, [coupleId, user?.id])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPartnerTyping])

  // Search filter
  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages
    const q = search.toLowerCase()
    return messages.filter(m => m.content.toLowerCase().includes(q) || (m.metadata?.stickerId && m.metadata.stickerId.toLowerCase().includes(q)))
  }, [messages, search])

  // Handlers
  async function handleSendText(e) {
    e?.preventDefault()
    if (!input.trim() || !coupleId || !user?.id || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    // stop typing indicator
    sendTypingIndicator(coupleId, user.id, false)
    try {
      await sendMessage({ coupleId, senderId: user.id, messageType: 'text', content })
    } catch (err) {
      alert(err.message)
      setInput(content) // restore
    } finally {
      setSending(false)
    }
  }

  async function handleSendSticker(sticker) {
    if (!coupleId || !user?.id) return
    setShowStickers(false)
    try {
      await sendMessage({
        coupleId,
        senderId: user.id,
        messageType: 'sticker',
        content: sticker.id,
        metadata: { stickerId: sticker.id, emoji: sticker.emoji, label: sticker.label }
      })
      triggerConfetti()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleSendGif(gif) {
    if (!coupleId || !user?.id) return
    setShowGifs(false)
    try {
      await sendMessage({
        coupleId,
        senderId: user.id,
        messageType: 'gif',
        content: gif.url,
        metadata: { gifUrl: gif.url, preview: gif.preview, title: gif.title }
      })
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleQuickReaction(q) {
    if (!coupleId || !user?.id) return
    const sticker = STICKER_PACK.find(s => s.id === q.stickerId) || q
    try {
      await sendMessage({
        coupleId,
        senderId: user.id,
        messageType: 'sticker',
        content: sticker.id || q.emoji,
        metadata: { stickerId: sticker.id || q.stickerId, emoji: q.emoji, label: q.label, quick: true }
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function handleMessageReaction(message, emoji) {
    if (!coupleId || !user?.id) return
    try {
      await addReaction({ messageId: message.id, coupleId, userId: user.id, emoji })
      // Optimistically update locally + refetch
      const rs = await fetchReactions(coupleId)
      setReactions(rs)
    } catch (err) {
      console.error(err)
    }
  }

  function handleTyping(e) {
    setInput(e.target.value)
    if (!coupleId || !user?.id) return
    sendTypingIndicator(coupleId, user.id, true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(coupleId, user.id, false)
    }, 1500)
  }

  if (loading || !profile) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
  }

  if (!coupleId) {
    return (
      <div className="card text-center" style={{ padding: 32 }}>
        <div style={{ fontSize: '2rem' }}>🔗</div>
        <h3>Pair first to chat</h3>
        <p className="text-soft" style={{ marginTop: 8 }}>Your private chat unlocks once you’ve linked with your partner.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)', margin: '0 -20px', width: 'calc(100% + 40px)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ width: 38, height: 38 }}>
            {partnerProfile?.avatar_url ? <img src={partnerProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (partnerProfile?.display_name?.[0] || '💖')}
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: '#6EDB8A', borderRadius: '50%', border: '2px solid white', display: partnerProfile ? 'block' : 'none' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{partnerProfile?.display_name || 'Your partner'} <span style={{ fontSize: '0.9rem' }}>💕</span></div>
            <div className="text-soft" style={{ fontSize: '0.75rem' }}>
              {isPartnerTyping ? 'typing… 💬' : partnerProfile ? `${partnerProfile.timezone?.split('/').pop()?.replace('_',' ')} • private chat` : 'private thread'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input className="input" placeholder="Search history…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width: 140, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 999 }} />
            {search && <button onClick={()=>setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>}
          </div>
        </div>
      </div>

      {/* Warm toast */}
      {toast && (
        <div className="animate-fadeIn" style={{
          position: 'absolute',
          top: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, var(--color-dusty-rose), var(--color-terracotta))',
          color: 'white',
          padding: '10px 18px',
          borderRadius: 999,
          boxShadow: '0 8px 24px rgba(200,107,122,0.35)',
          zIndex: 30,
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {toast}
        </div>
      )}

      {/* Message list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 0', background: 'linear-gradient(180deg, rgba(255,247,238,0.5), rgba(255,240,241,0.5))' }}>
        {filteredMessages.length===0 && (
          <div className="text-center" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>💌</div>
            <h3>Start your chat thread</h3>
            <p className="text-soft" style={{ fontSize: '0.9rem', maxWidth: 360, margin: '8px auto 0' }}>
              This is the beginning of your private conversation. Only you two can see it — ever. Send a sticker to break the ice?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              {STICKER_PACK.slice(0,4).map(s => (
                <button key={s.id} className="btn btn-secondary btn-small" onClick={()=>handleSendSticker(s)}>{s.emoji} {s.label}</button>
              ))}
            </div>
          </div>
        )}

        {filteredMessages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user.id}
            reactions={reactions}
            onReact={handleMessageReaction}
          />
        ))}

        {isPartnerTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px' }}>
            <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{partnerProfile?.display_name?.[0] || '💖'}</div>
            <div className="card" style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 4 }}>
              <span className="loading-dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick reaction bar */}
      <QuickReactionBar onSend={handleQuickReaction} partnerName={partnerProfile?.display_name?.split(' ')[0]} />

      {/* Input area */}
      <div style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Tray overlay */}
        {showStickers && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 25 }}>
            <StickerPicker onSelect={handleSendSticker} partnerTimezone={partnerProfile?.timezone} onClose={()=>setShowStickers(false)} />
          </div>
        )}
        {showGifs && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 25 }}>
            <GifPicker onSelect={handleSendGif} onClose={()=>setShowGifs(false)} />
          </div>
        )}

        <form onSubmit={handleSendText} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-secondary btn-icon" style={{ width: 42, height: 42 }} onClick={()=>{ setShowStickers(!showStickers); setShowGifs(false) }} title="Stickers">
              {showStickers ? '✕' : '💖'}
            </button>
            <button type="button" className="btn btn-secondary btn-icon" style={{ width: 42, height: 42 }} onClick={()=>{ setShowGifs(!showGifs); setShowStickers(false) }} title="GIFs">
              {showGifs ? '✕' : '🎞️'}
            </button>
          </div>
          <input
            className="input"
            placeholder={`Message ${partnerProfile?.display_name?.split(' ')[0] || 'your love'}…`}
            value={input}
            onChange={handleTyping}
            onKeyDown={e => {
              if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSendText() }
            }}
            style={{ flex: 1, borderRadius: 24, padding: '12px 18px', minHeight: 46 }}
          />
          <button type="submit" className="btn btn-primary btn-icon" style={{ width: 46, height: 46 }} disabled={!input.trim() || sending} title="Send">
            {sending ? '…' : '➤'}
          </button>
        </form>
        <div className="text-light" style={{ fontSize: '0.7rem', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8 }}>
          <span>🔒 End-to-end private via RLS • only you two</span>
          <span>• {messages.length} messages</span>
        </div>
      </div>
    </div>
  )
}
