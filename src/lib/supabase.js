import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let supabase = null
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      }
    }
  })
} else {
  console.warn('⚠️ Supabase not configured — running in mock mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real backend.')
}

export { supabase }

// Helper to generate cute invite code in frontend (fallback)
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

// Mock store helpers — used when Supabase not configured, so app still works for demo/testing
const MOCK_KEY = 'together_mock_db'

export function getMockDB() {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Ensure Phase 2 & 3 fields exist
      if (!parsed.messages) parsed.messages = []
      if (!parsed.reactions) parsed.reactions = []
      if (!parsed.users) parsed.users = []
      if (!parsed.daily_questions) parsed.daily_questions = []
      if (!parsed.daily_answers) parsed.daily_answers = []
      if (!parsed.feed_posts) parsed.feed_posts = []
      if (!parsed.pings) parsed.pings = []
      if (!parsed.sync_taps) parsed.sync_taps = []
      if (!parsed.bucket_list) parsed.bucket_list = []
      if (!parsed.calendar_events) parsed.calendar_events = []
      if (!parsed.streak) parsed.streak = {}
      return parsed
    }
  } catch {}
  return { profiles: [], couples: [], currentUserId: null, users: [], messages: [], reactions: [], daily_questions: [], daily_answers: [], feed_posts: [], pings: [], sync_taps: [], bucket_list: [], calendar_events: [], streak: {} }
}

export function saveMockDB(db) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(db))
    // Notify other tabs / listeners via storage event trick + broadcast
    // Dispatch custom event for same-tab listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('together_mock_update', { detail: db }))
    }
  } catch {}
}

export function clearMockDB() {
  localStorage.removeItem(MOCK_KEY)
}

// Broadcast channel for mock realtime (chat, typing)
let mockChannel = null
export function getMockBroadcastChannel() {
  if (typeof window === 'undefined') return null
  if (!mockChannel) {
    try {
      mockChannel = new BroadcastChannel('together_mock_chat')
    } catch {
      mockChannel = null
    }
  }
  return mockChannel
}
