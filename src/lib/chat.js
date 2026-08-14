import { supabase, isSupabaseConfigured, getMockDB, saveMockDB, getMockBroadcastChannel } from './supabase'

// Helper: generate UUID for mock
function mockId() {
  return 'msg_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ===== Sending =====
export async function sendMessage({ coupleId, senderId, messageType = 'text', content, metadata = {} }) {
  if (!content?.trim()) throw new Error('Empty message')
  if (!coupleId) throw new Error('No couple_id')

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        couple_id: coupleId,
        sender_id: senderId,
        message_type: messageType,
        content: content.trim(),
        metadata,
      })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    // Mock
    const db = getMockDB()
    const msg = {
      id: mockId(),
      couple_id: coupleId,
      sender_id: senderId,
      message_type: messageType,
      content: content.trim(),
      metadata,
      seen: false,
      created_at: new Date().toISOString(),
    }
    db.messages = db.messages || []
    db.messages.push(msg)
    saveMockDB(db)
    // Broadcast for realtime listeners
    const ch = getMockBroadcastChannel()
    if (ch) {
      ch.postMessage({ type: 'new_message', message: msg })
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('together_new_message', { detail: msg }))
    }
    return msg
  }
}

// ===== Subscriptions =====
export function subscribeToMessages(coupleId, callback) {
  if (!coupleId) return () => {}

  if (isSupabaseConfigured && supabase) {
    const channel = supabase
      .channel(`chat:${coupleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `couple_id=eq.${coupleId}`
      }, (payload) => {
        callback(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `couple_id=eq.${coupleId}`
      }, (payload) => {
        callback(payload.new, 'update')
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
        filter: `couple_id=eq.${coupleId}`
      }, (payload) => {
        // Trigger refresh of reactions via callback with special event
        callback(payload.new, 'reaction')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } else {
    // Mock: use BroadcastChannel + storage event
    const ch = getMockBroadcastChannel()
    const handler = (event) => {
      const data = event.data || event.detail
      if (!data) return
      if (data.type === 'new_message' && data.message?.couple_id === coupleId) {
        callback(data.message)
      } else if (data.type === 'update_message' && data.message?.couple_id === coupleId) {
        callback(data.message, 'update')
      } else if (data.type === 'new_reaction' && data.reaction?.couple_id === coupleId) {
        callback(data.reaction, 'reaction')
      } else if (data?.couple_id === coupleId) {
        // generic from CustomEvent
        callback(data)
      }
    }

    // For BroadcastChannel
    if (ch) ch.addEventListener('message', handler)

    // For same-tab CustomEvent fallback
    const customHandler = (e) => handler(e)
    if (typeof window !== 'undefined') {
      window.addEventListener('together_new_message', customHandler)
      window.addEventListener('together_update_message', customHandler)
      window.addEventListener('together_new_reaction', customHandler)
    }

    return () => {
      if (ch) ch.removeEventListener('message', handler)
      if (typeof window !== 'undefined') {
        window.removeEventListener('together_new_message', customHandler)
        window.removeEventListener('together_update_message', customHandler)
        window.removeEventListener('together_new_reaction', customHandler)
      }
    }
  }
}

export async function fetchMessages(coupleId, { limit = 100, searchQuery = '' } = {}) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (searchQuery) {
      query = query.ilike('content', `%${searchQuery}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    let msgs = (db.messages || []).filter(m => m.couple_id === coupleId)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      msgs = msgs.filter(m => m.content.toLowerCase().includes(q))
    }
    return msgs.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).slice(-limit)
  }
}

export async function markMessagesSeen(coupleId, userId) {
  if (!coupleId || !userId) return
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('messages')
      .update({ seen: true })
      .eq('couple_id', coupleId)
      .neq('sender_id', userId)
      .eq('seen', false)
    if (error) console.error('mark seen error', error)
  } else {
    const db = getMockDB()
    let changed = false
    ;(db.messages || []).forEach(m => {
      if (m.couple_id === coupleId && m.sender_id !== userId && !m.seen) {
        m.seen = true
        changed = true
        const ch = getMockBroadcastChannel()
        if (ch) ch.postMessage({ type: 'update_message', message: m })
        else window.dispatchEvent(new CustomEvent('together_update_message', { detail: m }))
      }
    })
    if (changed) saveMockDB(db)
  }
}

// ===== Reactions =====
export async function addReaction({ messageId, coupleId, userId, emoji }) {
  if (!messageId || !coupleId || !userId || !emoji) throw new Error('Missing reaction fields')

  if (isSupabaseConfigured && supabase) {
    // Upsert: if same user+emoji on same message exists, delete it (toggle)
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('message_reactions').delete().eq('id', existing.id)
      if (error) throw error
      return { removed: true }
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, couple_id: coupleId, user_id: userId, emoji })
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    db.reactions = db.reactions || []
    const existingIdx = db.reactions.findIndex(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji)
    if (existingIdx !== -1) {
      db.reactions.splice(existingIdx, 1)
      saveMockDB(db)
      return { removed: true }
    }
    const reaction = {
      id: mockId(),
      message_id: messageId,
      couple_id: coupleId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    }
    db.reactions.push(reaction)
    saveMockDB(db)
    const ch = getMockBroadcastChannel()
    if (ch) ch.postMessage({ type: 'new_reaction', reaction })
    else window.dispatchEvent(new CustomEvent('together_new_reaction', { detail: reaction }))
    return reaction
  }
}

export async function fetchReactions(coupleId) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('message_reactions').select('*').eq('couple_id', coupleId)
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.reactions || []).filter(r => r.couple_id === coupleId)
  }
}

// ===== Typing Indicator via Broadcast (no persistence needed) =====
let typingChannel = null
function getTypingChannel(coupleId) {
  if (isSupabaseConfigured && supabase) {
    if (!typingChannel) {
      typingChannel = supabase.channel(`typing:${coupleId}`)
      typingChannel.subscribe()
    }
    return typingChannel
  }
  return null
}

export function sendTypingIndicator(coupleId, userId, isTyping) {
  if (!coupleId || !userId) return
  if (isSupabaseConfigured && supabase) {
    const ch = getTypingChannel(coupleId)
    if (ch) {
      ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping, at: Date.now() }
      })
    }
  } else {
    const ch = getMockBroadcastChannel()
    if (ch) {
      ch.postMessage({ type: 'typing', couple_id: coupleId, user_id: userId, isTyping })
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('together_typing', { detail: { couple_id: coupleId, user_id: userId, isTyping } }))
    }
  }
}

export function subscribeToTyping(coupleId, currentUserId, callback) {
  if (!coupleId) return () => {}
  if (isSupabaseConfigured && supabase) {
    const channel = supabase.channel(`typing-indicator:${coupleId}`)
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          callback(payload.userId, payload.isTyping)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } else {
    const ch = getMockBroadcastChannel()
    const handler = (event) => {
      const data = event.data || event.detail
      if (!data) return
      if (data.type === 'typing' && data.couple_id === coupleId && data.user_id !== currentUserId) {
        callback(data.user_id, data.isTyping)
      } else if (data.couple_id === coupleId && data.user_id !== currentUserId && typeof data.isTyping === 'boolean') {
        callback(data.user_id, data.isTyping)
      }
    }
    if (ch) ch.addEventListener('message', handler)
    const customHandler = (e) => handler(e)
    if (typeof window !== 'undefined') window.addEventListener('together_typing', customHandler)

    return () => {
      if (ch) ch.removeEventListener('message', handler)
      if (typeof window !== 'undefined') window.removeEventListener('together_typing', customHandler)
    }
  }
}

// ===== Quick Reaction Bar Helpers =====
export const QUICK_REACTIONS = [
  { emoji: '❤️', label: 'love', stickerId: 'heart' },
  { emoji: '😂', label: 'laugh', stickerId: 'laugh' },
  { emoji: '🫂', label: 'hug', stickerId: 'hug' },
  { emoji: '😘', label: 'kiss', stickerId: 'kiss' },
]

// cute sticker pack definition
export const STICKER_PACK = [
  { id: 'hug', emoji: '🫂', label: 'hug', description: 'Big hug', color: '#FFD6D9', gradient: 'linear-gradient(135deg,#FFD6D9,#FFB3BB)' },
  { id: 'kiss', emoji: '😘', label: 'kiss', description: 'Kiss', color: '#FFB3BB', gradient: 'linear-gradient(135deg,#FFB3BB,#FF8FA0)' },
  { id: 'miss_you', emoji: '🥺', label: 'miss you', description: 'Miss you', color: '#FFDAB7', gradient: 'linear-gradient(135deg,#FFDAB7,#FFC8A9)' },
  { id: 'goodnight', emoji: '🌙', label: 'goodnight', description: 'Goodnight', color: '#C6B7D6', gradient: 'linear-gradient(135deg,#C6B7D6,#8E5A6B)' },
  { id: 'goodmorning', emoji: '☀️', label: 'good morning', description: 'Good morning', color: '#FFF0D6', gradient: 'linear-gradient(135deg,#FFF0D6,#FFDAB7)' },
  { id: 'thinking', emoji: '💭', label: 'thinking of you', description: 'Thinking of you', color: '#FFD6D9', gradient: 'linear-gradient(135deg,#FFD6D9,#FFF2E2)' },
  { id: 'videocall', emoji: '📹', label: 'video-call-me', description: 'Call me', color: '#B8E0D8', gradient: 'linear-gradient(135deg,#B8E0D8,#FFD6D9)' },
  { id: 'hungry', emoji: '🍜', label: "i'm hungry", description: "I'm hungry", color: '#FFDAB7', gradient: 'linear-gradient(135deg,#FFDAB7,#FFB88C)' },
  { id: 'love_you', emoji: '💕', label: 'love you', description: 'Love you', color: '#FF8FA0', gradient: 'linear-gradient(135deg,#FF8FA0,#C86B7A)' },
  { id: 'proud', emoji: '🥹', label: 'so proud', description: 'So proud of you', color: '#FFE4E6', gradient: 'linear-gradient(135deg,#FFE4E6,#FFD6D9)' },
  { id: 'sleepy', emoji: '😴', label: 'sleepy', description: 'Sleepy', color: '#D6E6FF', gradient: 'linear-gradient(135deg,#D6E6FF,#C6B7D6)' },
  { id: 'celebrate', emoji: '🎉', label: 'celebrate', description: 'Celebrate', color: '#FFF0D6', gradient: 'linear-gradient(135deg,#FFF0D6,#FFDAB7)' },
]

// Determine smart suggestion based on partner's local time
export function getSmartStickerSuggestion(partnerTimezone) {
  if (!partnerTimezone) return null
  try {
    const now = new Date()
    const hour = parseInt(new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: partnerTimezone }).format(now), 10)
    if (hour >= 5 && hour < 11) return 'goodmorning' // morning
    if (hour >= 11 && hour < 15) return 'thinking' // midday thinking of you
    if (hour >= 22 || hour < 5) return 'goodnight' // late night
    if (hour >= 18 && hour < 22) return 'miss_you'
    return null
  } catch {
    return null
  }
}
