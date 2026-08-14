import { supabase, isSupabaseConfigured, getMockDB, saveMockDB, getMockBroadcastChannel } from './supabase'

// Helper IDs
function mockId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2,9)}${Date.now().toString(36)}`
}

// ==================== Daily Questions ====================
const DEFAULT_QUESTIONS = [
  { id: 'q1', question_text: 'What little moment today made you think of us?', category: 'reflective' },
  { id: 'q2', question_text: 'If we could teleport anywhere for a 1-hour coffee date, where would we go?', category: 'playful' },
  { id: 'q3', question_text: 'What is one small thing I do that always makes you feel loved?', category: 'love' },
  { id: 'q4', question_text: 'What song reminds you of us right now?', category: 'playful' },
  { id: 'q5', question_text: 'What are you most looking forward to about our next visit?', category: 'future' },
  { id: 'q6', question_text: 'What is your favorite memory of us laughing together?', category: 'memory' },
  { id: 'q7', question_text: 'If our love had a scent, what would it smell like?', category: 'playful' },
  { id: 'q8', question_text: 'What is one thing you appreciated about me this week?', category: 'appreciation' },
  { id: 'q9', question_text: 'What is a tiny ritual you want us to have every day?', category: 'ritual' },
  { id: 'q10', question_text: 'What would be our perfect lazy Sunday together?', category: 'future' },
  { id: 'q11', question_text: 'What is one thing you’ve learned about love from being long-distance?', category: 'reflective' },
  { id: 'q12', question_text: 'If we had a shared playlist for this week, what 3 songs would be on it?', category: 'playful' },
  { id: 'q13', question_text: 'What is a silly habit of mine you secretly adore?', category: 'love' },
  { id: 'q14', question_text: 'What would our future home smell like?', category: 'future' },
  { id: 'q15', question_text: 'What is one worry you want me to hold gently for you this week?', category: 'support' },
]

export async function fetchDailyQuestions() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('daily_questions').select('*').order('created_at', { ascending: true }).limit(100)
    if (error) throw error
    return data.length ? data : DEFAULT_QUESTIONS
  } else {
    const db = getMockDB()
    if (db.daily_questions && db.daily_questions.length) return db.daily_questions
    // seed mock
    db.daily_questions = DEFAULT_QUESTIONS
    saveMockDB(db)
    return DEFAULT_QUESTIONS
  }
}

export function getTodayQuestion(questions) {
  if (!questions || questions.length === 0) return DEFAULT_QUESTIONS[0]
  // deterministic rotation: days since epoch % length
  const days = Math.floor(Date.now() / (1000*60*60*24))
  return questions[days % questions.length]
}

export async function fetchAnswersForQuestion(coupleId, questionId) {
  if (!coupleId || !questionId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('daily_answers').select('*').eq('couple_id', coupleId).eq('question_id', questionId)
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.daily_answers || []).filter(a => a.couple_id === coupleId && a.question_id === questionId)
  }
}

export async function submitDailyAnswer({ coupleId, questionId, userId, answerText }) {
  if (!answerText.trim()) throw new Error('Answer cannot be empty')
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('daily_answers').upsert({
      couple_id: coupleId,
      question_id: questionId,
      user_id: userId,
      answer_text: answerText.trim(),
      answered_at: new Date().toISOString(),
    }, { onConflict: 'couple_id,question_id,user_id' }).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    db.daily_answers = db.daily_answers || []
    const existingIdx = db.daily_answers.findIndex(a => a.couple_id === coupleId && a.question_id === questionId && a.user_id === userId)
    const record = {
      id: existingIdx !== -1 ? db.daily_answers[existingIdx].id : mockId('ans'),
      couple_id: coupleId,
      question_id: questionId,
      user_id: userId,
      answer_text: answerText.trim(),
      answered_at: new Date().toISOString(),
      created_at: existingIdx !== -1 ? db.daily_answers[existingIdx].created_at : new Date().toISOString(),
    }
    if (existingIdx !== -1) db.daily_answers[existingIdx] = record
    else db.daily_answers.push(record)
    saveMockDB(db)
    const ch = getMockBroadcastChannel()
    if (ch) ch.postMessage({ type: 'daily_answer', answer: record })
    return record
  }
}

export async function fetchAllAnswers(coupleId) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('daily_answers').select('*').eq('couple_id', coupleId).order('answered_at', { ascending: false })
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.daily_answers || []).filter(a => a.couple_id === coupleId).sort((a,b) => new Date(b.answered_at) - new Date(a.answered_at))
  }
}

// Streak computation: consecutive days where both answered
export function computeStreakFromAnswers(answers, coupleId) {
  // answers: array of {question_id, user_id, answered_at}
  // Group by date string YYYY-MM-DD where both users answered same day (at least one answer per user that day)
  if (!answers || answers.length === 0) return { currentStreak: 0, longestStreak: 0, lastDate: null, history: [] }

  // Get unique dates and map to set of userIds
  const byDate = {}
  answers.forEach(a => {
    const date = new Date(a.answered_at).toISOString().slice(0,10)
    if (!byDate[date]) byDate[date] = new Set()
    byDate[date].add(a.user_id)
  })
  // Dates where both answered: size >=2 (assuming 2 users per couple)
  const completedDates = Object.entries(byDate)
    .filter(([_, users]) => users.size >= 2)
    .map(([date]) => date)
    .sort() // asc

  if (completedDates.length === 0) return { currentStreak: 0, longestStreak: 0, lastDate: null, history: [] }

  // Compute current streak: check consecutive from most recent backwards
  const sortedDesc = [...completedDates].sort().reverse()
  let currentStreak = 1
  let last = new Date(sortedDesc[0])
  for (let i = 1; i < sortedDesc.length; i++) {
    const d = new Date(sortedDesc[i])
    const diff = Math.floor((last - d) / (1000*60*60*24))
    if (diff === 1) {
      currentStreak++
      last = d
    } else if (diff === 0) {
      continue
    } else {
      break
    }
  }

  // Check if last completed date is today or yesterday, otherwise streak is broken? But spec says gentle reframing
  // For currentStreak, if most recent completed date is older than yesterday, currentStreak should be 0? We'll keep but show last.
  const today = new Date().toISOString().slice(0,10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10)
  const mostRecent = sortedDesc[0]
  if (mostRecent !== today && mostRecent !== yesterday) {
    // streak broken, but we keep currentStreak for history, but current should be 0? We'll return 0 and note last
    // Actually keep computed but will be displayed as ended
    // For gentle UX, we show "new streak started" if not today/yesterday
  }

  // Longest streak
  let longest = 1
  let temp = 1
  const sortedAsc = [...completedDates].sort()
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i-1])
    const cur = new Date(sortedAsc[i])
    const diff = Math.floor((cur - prev) / (1000*60*60*24))
    if (diff === 1) temp++
    else {
      longest = Math.max(longest, temp)
      temp = 1
    }
  }
  longest = Math.max(longest, temp)

  const lastDate = completedDates[completedDates.length-1] || null

  return { currentStreak, longestStreak: longest, lastDate, history: completedDates, totalCompleted: completedDates.length }
}

// ==================== Feed ====================
export async function fetchFeed(coupleId) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('feed_posts').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.feed_posts || []).filter(p => p.couple_id === coupleId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export async function createFeedPost({ coupleId, authorId, contentType = 'note', contentText, imageUrl, metadata = {} }) {
  if (!contentText?.trim() && !imageUrl) throw new Error('Post cannot be empty')
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('feed_posts').insert({
      couple_id: coupleId,
      author_id: authorId,
      content_type: contentType,
      content_text: contentText?.trim() || null,
      image_url: imageUrl || null,
      metadata
    }).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const post = {
      id: mockId('feed'),
      couple_id: coupleId,
      author_id: authorId,
      content_type: contentType,
      content_text: contentText?.trim() || '',
      image_url: imageUrl || null,
      metadata,
      is_pinned: false,
      created_at: new Date().toISOString(),
    }
    db.feed_posts = db.feed_posts || []
    db.feed_posts.unshift(post)
    saveMockDB(db)
    const ch = getMockBroadcastChannel()
    if (ch) ch.postMessage({ type: 'feed_post', post })
    return post
  }
}

export async function togglePinFeedPost(postId, currentPinned) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('feed_posts').update({ is_pinned: !currentPinned }).eq('id', postId).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const idx = (db.feed_posts || []).findIndex(p => p.id === postId)
    if (idx === -1) throw new Error('Post not found')
    db.feed_posts[idx].is_pinned = !currentPinned
    saveMockDB(db)
    return db.feed_posts[idx]
  }
}

// ==================== Pings (Thinking of You) ====================
export const PING_VARIANTS = [
  { id: 'wave', emoji: '👋', label: 'wave', color: '#FFDAB7', gradient: 'linear-gradient(135deg,#FFDAB7,#FFC8A9)', description: 'Just waving hi' },
  { id: 'heart', emoji: '💖', label: 'heart-burst', color: '#FFB3BB', gradient: 'linear-gradient(135deg,#FFB3BB,#FF8FA0)', description: 'Heart burst' },
  { id: 'hug', emoji: '🫂', label: 'hug', color: '#FFD6D9', gradient: 'linear-gradient(135deg,#FFD6D9,#FFF0F1)', description: 'Sending a hug' },
  { id: 'kiss', emoji: '😘', label: 'kiss', color: '#FF8FA0', gradient: 'linear-gradient(135deg,#FF8FA0,#C86B7A)', description: 'Kiss' },
  { id: 'sparkle', emoji: '✨', label: 'sparkle', color: '#FFF0D6', gradient: 'linear-gradient(135deg,#FFF0D6,#FFDAB7)', description: 'Thinking of you' },
]

export async function sendPing({ coupleId, senderId, variant = 'heart', message = '' }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('pings').insert({
      couple_id: coupleId,
      sender_id: senderId,
      variant,
      message
    }).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const ping = {
      id: mockId('ping'),
      couple_id: coupleId,
      sender_id: senderId,
      variant,
      message,
      created_at: new Date().toISOString(),
    }
    db.pings = db.pings || []
    db.pings.unshift(ping)
    saveMockDB(db)
    const ch = getMockBroadcastChannel()
    if (ch) ch.postMessage({ type: 'ping', ping })
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('together_ping', { detail: ping }))
    return ping
  }
}

export async function fetchPings(coupleId, limit = 20) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('pings').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.pings || []).filter(p => p.couple_id === coupleId).slice(0, limit)
  }
}

export function subscribeToPings(coupleId, callback) {
  if (!coupleId) return () => {}
  if (isSupabaseConfigured && supabase) {
    const ch = supabase.channel(`pings:${coupleId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pings',
      filter: `couple_id=eq.${coupleId}`
    }, payload => callback(payload.new)).subscribe()
    return () => supabase.removeChannel(ch)
  } else {
    const bc = getMockBroadcastChannel()
    const handler = (e) => {
      const data = e.data || e.detail
      if (data?.type === 'ping' && data.ping?.couple_id === coupleId) callback(data.ping)
      else if (data?.couple_id === coupleId && data?.variant) callback(data)
    }
    if (bc) bc.addEventListener('message', handler)
    const custom = (e) => handler(e)
    window.addEventListener('together_ping', custom)
    return () => {
      if (bc) bc.removeEventListener('message', handler)
      window.removeEventListener('together_ping', custom)
    }
  }
}

// ==================== Sync Moments ====================
export async function tapSync({ coupleId, userId }) {
  const now = new Date()
  if (isSupabaseConfigured && supabase) {
    // Look for recent tap from partner within 5 min not yet synced
    const fiveMinAgo = new Date(now.getTime() - 5*60*1000).toISOString()
    const { data: recent } = await supabase.from('sync_taps').select('*')
      .eq('couple_id', coupleId)
      .neq('user_id', userId)
      .eq('is_synced', false)
      .gte('tapped_at', fiveMinAgo)
      .order('tapped_at', { ascending: false })
      .limit(1)

    let isSynced = false
    let syncedWith = null
    if (recent && recent.length > 0) {
      const partnerTap = recent[0]
      isSynced = true
      syncedWith = partnerTap.id
      // Update partner tap as synced
      await supabase.from('sync_taps').update({ is_synced: true, synced_with: null }).eq('id', partnerTap.id)
    }

    const { data, error } = await supabase.from('sync_taps').insert({
      couple_id: coupleId,
      user_id: userId,
      tapped_at: now.toISOString(),
      is_synced: isSynced,
      synced_with: syncedWith
    }).select().single()
    if (error) throw error
    return { tap: data, synced: isSynced, partnerTap: recent?.[0] || null }
  } else {
    const db = getMockDB()
    db.sync_taps = db.sync_taps || []
    const fiveMinAgo = Date.now() - 5*60*1000
    const recent = db.sync_taps
      .filter(t => t.couple_id === coupleId && t.user_id !== userId && !t.is_synced && new Date(t.tapped_at).getTime() >= fiveMinAgo)
      .sort((a,b) => new Date(b.tapped_at) - new Date(a.tapped_at))[0]

    let isSynced = false
    if (recent) {
      recent.is_synced = true
      isSynced = true
    }

    const tap = {
      id: mockId('sync'),
      couple_id: coupleId,
      user_id: userId,
      tapped_at: now.toISOString(),
      is_synced: isSynced,
      synced_with: recent?.id || null,
      created_at: now.toISOString(),
    }
    db.sync_taps.push(tap)
    saveMockDB(db)
    const ch = getMockBroadcastChannel()
    if (ch) ch.postMessage({ type: 'sync_tap', tap })
    return { tap, synced: isSynced, partnerTap: recent || null }
  }
}

export async function fetchSyncHistory(coupleId, limit = 20) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('sync_taps').select('*').eq('couple_id', coupleId).order('tapped_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.sync_taps || []).filter(t => t.couple_id === coupleId).sort((a,b) => new Date(b.tapped_at) - new Date(a.tapped_at)).slice(0, limit)
  }
}

// ==================== Bucket List ====================
export async function fetchBucketList(coupleId) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('bucket_list_items').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.bucket_list || []).filter(b => b.couple_id === coupleId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export async function addBucketItem({ coupleId, createdBy, title, description }) {
  if (!title.trim()) throw new Error('Title required')
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('bucket_list_items').insert({
      couple_id: coupleId,
      title: title.trim(),
      description: description?.trim() || null,
      created_by: createdBy
    }).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const item = {
      id: mockId('bucket'),
      couple_id: coupleId,
      title: title.trim(),
      description: description?.trim() || '',
      created_by: createdBy,
      is_completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    db.bucket_list = db.bucket_list || []
    db.bucket_list.push(item)
    saveMockDB(db)
    return item
  }
}

export async function toggleBucketItem(itemId, isCompleted) {
  const now = new Date().toISOString()
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('bucket_list_items').update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? now : null
    }).eq('id', itemId).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const idx = (db.bucket_list || []).findIndex(b => b.id === itemId)
    if (idx === -1) throw new Error('Not found')
    db.bucket_list[idx].is_completed = !isCompleted
    db.bucket_list[idx].completed_at = !isCompleted ? now : null
    saveMockDB(db)
    return db.bucket_list[idx]
  }
}

// ==================== Calendar ====================
export async function fetchCalendar(coupleId) {
  if (!coupleId) return []
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('calendar_events').select('*').eq('couple_id', coupleId).order('event_date', { ascending: true })
    if (error) throw error
    return data || []
  } else {
    const db = getMockDB()
    return (db.calendar_events || []).filter(c => c.couple_id === coupleId).sort((a,b) => new Date(a.event_date) - new Date(b.event_date))
  }
}

export async function addCalendarEvent({ coupleId, createdBy, title, eventType, eventDate, eventTime, description }) {
  if (!title.trim() || !eventDate) throw new Error('Title and date required')
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('calendar_events').insert({
      couple_id: coupleId,
      title: title.trim(),
      event_type: eventType || 'custom',
      event_date: eventDate,
      event_time: eventTime || null,
      description: description?.trim() || null,
      created_by: createdBy
    }).select().single()
    if (error) throw error
    return data
  } else {
    const db = getMockDB()
    const ev = {
      id: mockId('cal'),
      couple_id: coupleId,
      title: title.trim(),
      event_type: eventType || 'custom',
      event_date: eventDate,
      event_time: eventTime || null,
      description: description?.trim() || '',
      created_by: createdBy,
      created_at: new Date().toISOString(),
    }
    db.calendar_events = db.calendar_events || []
    db.calendar_events.push(ev)
    saveMockDB(db)
    return ev
  }
}

export async function deleteCalendarEvent(eventId) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) throw error
    return true
  } else {
    const db = getMockDB()
    db.calendar_events = (db.calendar_events || []).filter(c => c.id !== eventId)
    saveMockDB(db)
    return true
  }
}

// ==================== Our Story Timeline ====================
export async function fetchStoryTimeline(coupleId) {
  // Merge feed + answers + pings + syncs + bucket completed + calendar
  const [feed, answers, pings, syncs, bucket, calendar] = await Promise.all([
    fetchFeed(coupleId),
    fetchAllAnswers(coupleId),
    fetchPings(coupleId, 50),
    fetchSyncHistory(coupleId, 50),
    fetchBucketList(coupleId),
    fetchCalendar(coupleId)
  ])

  const items = []

  feed.forEach(p => {
    items.push({
      id: `feed-${p.id}`,
      type: 'feed',
      date: p.created_at,
      data: p,
      isPinned: p.is_pinned
    })
  })

  // Only include answers where both answered same question (to preserve unlock moment privacy)
  const groupedAnswers = {}
  answers.forEach(a => {
    const key = `${a.question_id}-${new Date(a.answered_at).toISOString().slice(0,10)}`
    if (!groupedAnswers[key]) groupedAnswers[key] = []
    groupedAnswers[key].push(a)
  })
  Object.values(groupedAnswers).forEach(group => {
    if (group.length >= 2) {
      // both answered
      const first = group[0]
      items.push({
        id: `daily-${first.question_id}-${first.answered_at}`,
        type: 'daily_question',
        date: first.answered_at,
        data: { questionId: first.question_id, answers: group }
      })
    }
  })

  pings.forEach(p => {
    items.push({
      id: `ping-${p.id}`,
      type: 'ping',
      date: p.created_at,
      data: p
    })
  })

  syncs.filter(s => s.is_synced).forEach(s => {
    items.push({
      id: `sync-${s.id}`,
      type: 'sync',
      date: s.tapped_at,
      data: s
    })
  })

  bucket.filter(b => b.is_completed).forEach(b => {
    items.push({
      id: `bucket-${b.id}`,
      type: 'bucket',
      date: b.completed_at,
      data: b
    })
  })

  // Calendar events are future, but we include them as timeline for upcoming
  // Actually for Our Story we only want past calendar? Include all but sort

  // Sort desc
  items.sort((a,b) => new Date(b.date) - new Date(a.date))

  return items
}

// ==================== Milestones / Celebrations ====================
export function checkMilestones({ relationshipStartDate, ldrStartDate, currentStreak, totalDays }) {
  const milestones = []

  // Days together milestones
  if (totalDays) {
    const d = totalDays
    if ([7,30,50,100,200,365,500,1000].includes(d)) {
      milestones.push({ type: 'days', days: d, title: `${d} days together`, emoji: '🎉' })
    }
  }

  // LDR days
  if (ldrStartDate) {
    const diff = Math.floor((new Date() - new Date(ldrStartDate)) / (1000*60*60*24))
    if ([7,30,60,100,200,365].includes(diff)) {
      milestones.push({ type: 'ldr', days: diff, title: `${diff} days strong across distance`, emoji: '💪' })
    }
  }

  // Anniversary
  if (relationshipStartDate) {
    const start = new Date(relationshipStartDate)
    const now = new Date()
    if (now.getMonth() === start.getMonth() && now.getDate() === start.getDate()) {
      const years = now.getFullYear() - start.getFullYear()
      if (years > 0) milestones.push({ type: 'anniversary', years, title: `${years} year${years>1?'s':''} anniversary`, emoji: '💍' })
    }
  }

  // Streak milestones
  if ([7,30,100].includes(currentStreak)) {
    milestones.push({ type: 'streak', days: currentStreak, title: `${currentStreak} day streak!`, emoji: '🔥' })
  }

  return milestones
}
