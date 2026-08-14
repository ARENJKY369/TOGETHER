import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured, generateInviteCode, getMockDB, saveMockDB } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // auth user
  const [profile, setProfile] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // ---------- Supabase Mode ----------
  const fetchProfileSupabase = useCallback(async (userId) => {
    if (!supabase) return null
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error && error.code !== 'PGRST116') {
      console.error('fetch profile error', error)
      return null
    }
    return data
  }, [])

  const fetchCoupleSupabase = useCallback(async (coupleId) => {
    if (!supabase || !coupleId) return null
    const { data, error } = await supabase.from('couples').select('*').eq('id', coupleId).single()
    if (error) {
      console.error('fetch couple error', error)
      return null
    }
    return data
  }, [])

  const fetchPartnerSupabase = useCallback(async () => {
    if (!supabase) return null
    const { data, error } = await supabase.rpc('get_partner_profile')
    if (error) {
      console.error('partner fetch error', error)
      return null
    }
    return data && data[0] ? data[0] : null
  }, [])

  const refreshSupabase = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null); setCouple(null); setPartnerProfile(null); return
    }
    const p = await fetchProfileSupabase(userId)
    setProfile(p)
    if (p?.couple_id) {
      const c = await fetchCoupleSupabase(p.couple_id)
      setCouple(c)
      const partner = await fetchPartnerSupabase()
      setPartnerProfile(partner)
    } else {
      setCouple(null); setPartnerProfile(null)
    }
  }, [fetchProfileSupabase, fetchCoupleSupabase, fetchPartnerSupabase])

  // ---------- Mock Mode ----------
  const refreshMock = useCallback((userId) => {
    const db = getMockDB()
    if (!userId) {
      setProfile(null); setCouple(null); setPartnerProfile(null); return
    }
    const p = db.profiles.find(pr => pr.id === userId) || null
    setProfile(p)
    if (p?.couple_id) {
      const c = db.couples.find(cp => cp.id === p.couple_id) || null
      setCouple(c)
      if (c) {
        const partnerId = c.user1_id === userId ? c.user2_id : c.user1_id
        const partner = db.profiles.find(pr => pr.id === partnerId) || null
        setPartnerProfile(partner)
      }
    } else {
      setCouple(null); setPartnerProfile(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) await refreshSupabase(session.user.id)
        }
        // Listen for auth changes
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return
          setUser(session?.user ?? null)
          if (session?.user) {
            await refreshSupabase(session.user.id)
          } else {
            setProfile(null); setCouple(null); setPartnerProfile(null)
          }
        })
        if (mounted) setLoading(false)
        return () => listener.subscription.unsubscribe()
      } else {
        // Mock init
        const db = getMockDB()
        const uid = db.currentUserId
        if (uid) {
          const mockUser = db.users.find(u => u.id === uid)
          if (mockUser) {
            setUser({ id: mockUser.id, email: mockUser.email })
            refreshMock(mockUser.id)
          }
        }
        if (mounted) setLoading(false)
        setInitialized(true)
      }
    }

    init().then(() => setInitialized(true))

    return () => { mounted = false }
  }, [refreshSupabase, refreshMock])

  // -------- Auth actions (both modes) --------
  const signUp = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // Create profile placeholder - actual creation via trigger or onboarding
      return data
    } else {
      // Mock signup
      const db = getMockDB()
      if (db.users.some(u => u.email === email)) throw new Error('User already exists (mock)')
      const id = 'mock_' + Math.random().toString(36).slice(2, 10)
      const newUser = { id, email, password } // plaintext only for mock!
      const invite_code = generateInviteCode()
      const newProfile = {
        id,
        display_name: '',
        avatar_url: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: '',
        relationship_start_date: null,
        ldr_start_date: null,
        love_languages: [],
        invite_code,
        couple_id: null,
        onboarding_completed: false,
        created_at: new Date().toISOString()
      }
      db.users.push(newUser)
      db.profiles.push(newProfile)
      db.currentUserId = id
      saveMockDB(db)
      setUser({ id, email })
      setProfile(newProfile)
      return { user: { id, email } }
    }
  }

  const signIn = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    } else {
      const db = getMockDB()
      const found = db.users.find(u => u.email === email && u.password === password)
      if (!found) throw new Error('Invalid credentials (mock)')
      db.currentUserId = found.id
      saveMockDB(db)
      setUser({ id: found.id, email: found.email })
      refreshMock(found.id)
      return { user: { id: found.id, email } }
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    } else {
      const db = getMockDB()
      db.currentUserId = null
      saveMockDB(db)
    }
    setUser(null); setProfile(null); setCouple(null); setPartnerProfile(null)
  }

  const updateProfile = async (updates) => {
    if (isSupabaseConfigured && supabase && user) {
      const { data, error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', user.id).select().single()
      if (error) throw error
      setProfile(data)
      return data
    } else if (user) {
      const db = getMockDB()
      const idx = db.profiles.findIndex(p => p.id === user.id)
      if (idx === -1) throw new Error('Profile not found')
      db.profiles[idx] = { ...db.profiles[idx], ...updates }
      saveMockDB(db)
      setProfile(db.profiles[idx])
      return db.profiles[idx]
    }
  }

  const createProfileIfMissing = async (extra = {}) => {
    if (!user) return null
    if (isSupabaseConfigured && supabase) {
      const existing = await fetchProfileSupabase(user.id)
      if (existing) {
        setProfile(existing)
        return existing
      }
      const invite_code = generateInviteCode()
      const payload = {
        id: user.id,
        invite_code,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        display_name: extra.display_name || user.email?.split('@')[0] || '',
        ...extra
      }
      const { data, error } = await supabase.from('profiles').insert(payload).select().single()
      if (error) {
        console.error('create profile error', error)
        throw error
      }
      setProfile(data)
      return data
    }
    return null
  }

  const pairWithCode = async (code) => {
    const cleaned = code.trim().toUpperCase()
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('pair_with_code', { invite_code_input: cleaned })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      await refreshSupabase(user.id)
      return data
    } else {
      // mock pairing
      const db = getMockDB()
      const currentP = db.profiles.find(p => p.id === user.id)
      if (!currentP) throw new Error('Profile not found')
      if (currentP.couple_id) throw new Error('You are already paired')
      if (currentP.invite_code === cleaned) throw new Error("You can't pair with your own code")
      const target = db.profiles.find(p => p.invite_code === cleaned)
      if (!target) throw new Error('Invite code not found')
      if (target.couple_id) throw new Error('This code has already been used')
      const newCoupleId = 'couple_' + Math.random().toString(36).slice(2, 10)
      const newCouple = {
        id: newCoupleId,
        user1_id: target.id,
        user2_id: currentP.id,
        status: 'paired',
        next_visit_date: null,
        created_at: new Date().toISOString()
      }
      db.couples.push(newCouple)
      currentP.couple_id = newCoupleId
      target.couple_id = newCoupleId
      saveMockDB(db)
      setProfile({ ...currentP })
      setCouple(newCouple)
      setPartnerProfile(target)
      return { success: true, couple_id: newCoupleId }
    }
  }

  const unpair = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('unpair_couple')
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      setCouple(null); setPartnerProfile(null)
      await refreshSupabase(user.id)
      return data
    } else {
      const db = getMockDB()
      const currentP = db.profiles.find(p => p.id === user.id)
      if (!currentP?.couple_id) throw new Error('Not paired')
      const coupleId = currentP.couple_id
      const couple = db.couples.find(c => c.id === coupleId)
      if (couple) {
        const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
        const partner = db.profiles.find(p => p.id === partnerId)
        if (partner) partner.couple_id = null
      }
      currentP.couple_id = null
      db.couples = db.couples.filter(c => c.id !== coupleId)
      saveMockDB(db)
      setCouple(null); setPartnerProfile(null); setProfile({ ...currentP })
      return { success: true }
    }
  }

  const refresh = async () => {
    if (!user) return
    if (isSupabaseConfigured) await refreshSupabase(user.id)
    else refreshMock(user.id)
  }

  const value = {
    user, profile, couple, partnerProfile,
    loading, initialized,
    signUp, signIn, signOut,
    updateProfile, createProfileIfMissing,
    pairWithCode, unpair, refresh,
    isSupabaseConfigured
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
