import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user, profile, couple, partnerProfile, signOut, unpair, updateProfile, refresh, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    location: profile?.location || '',
    timezone: profile?.timezone || 'UTC',
    relationship_start_date: profile?.relationship_start_date || '',
    ldr_start_date: profile?.ldr_start_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [unpairConfirm, setUnpairConfirm] = useState(false)

  async function handleSave() {
    setSaving(true); setMsg('')
    try {
      await updateProfile({
        display_name: form.display_name,
        location: form.location,
        timezone: form.timezone,
        relationship_start_date: form.relationship_start_date || null,
        ldr_start_date: form.ldr_start_date || null,
      })
      setMsg('Saved! 💕')
      setTimeout(()=>setMsg(''), 2000)
    } catch(e){ setMsg(e.message) }
    finally{ setSaving(false) }
  }

  async function handleUnpair() {
    if (!unpairConfirm) { setUnpairConfirm(true); return }
    try {
      await unpair()
      navigate('/pair')
    } catch(e){ alert(e.message) }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/landing')
  }

  return (
    <div style={{ padding: '16px 0', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>⚙️ Settings</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Your profile</h3>
        <div className="input-group">
          <label className="input-label">Display name</label>
          <input className="input" value={form.display_name} onChange={e=>setForm({...form, display_name: e.target.value})} />
        </div>
        <div className="input-group">
          <label className="input-label">Location</label>
          <input className="input" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} placeholder="e.g. Berlin" />
        </div>
        <div className="input-group">
          <label className="input-label">Timezone</label>
          <input className="input" value={form.timezone} onChange={e=>setForm({...form, timezone: e.target.value})} />
          <p className="text-light" style={{ fontSize: '0.8rem', marginTop: 6 }}>Example: America/New_York, Europe/Berlin, Asia/Tokyo</p>
        </div>
        <div className="input-group">
          <label className="input-label">Relationship start</label>
          <input className="input" type="date" value={form.relationship_start_date} onChange={e=>setForm({...form, relationship_start_date: e.target.value})} />
        </div>
        <div className="input-group">
          <label className="input-label">LDR start (for counter)</label>
          <input className="input" type="date" value={form.ldr_start_date} onChange={e=>setForm({...form, ldr_start_date: e.target.value})} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save 💾'}</button>
          {msg && <span style={{ fontSize: '0.9rem', color: 'var(--color-dusty-rose)' }}>{msg}</span>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>🔗 Pairing</h3>
        {profile?.couple_id ? (
          <>
            <p className="text-soft" style={{ fontSize: '0.9rem', marginBottom: 8 }}>You’re paired {partnerProfile ? `with ${partnerProfile.display_name}` : ''}. Couple ID: <code style={{ fontSize: '0.8rem' }}>{profile.couple_id.slice(0,8)}…</code></p>
            <p className="text-soft" style={{ fontSize: '0.85rem', marginBottom: 12 }}>Your invite code ({profile.invite_code}) is now used. Unpairing will free both codes.</p>
            <button className={`btn ${unpairConfirm ? 'btn-primary' : 'btn-secondary'}`} onClick={handleUnpair}>
              {unpairConfirm ? 'Confirm unlink — this clears your private space link 🔓' : 'Unlink partner'}
            </button>
            {unpairConfirm && <button className="btn btn-ghost btn-small" style={{ marginLeft: 8 }} onClick={()=>setUnpairConfirm(false)}>Cancel</button>}
          </>
        ) : (
          <>
            <p className="text-soft" style={{ fontSize: '0.9rem', marginBottom: 12 }}>Not paired yet. Your invite code: <strong>{profile?.invite_code}</strong></p>
            <button className="btn btn-primary" onClick={()=>navigate('/pair')}>Go to pairing →</button>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>🛡️ Privacy & data</h3>
        <p className="text-soft" style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
          • Every table has Row Level Security enabled in Postgres.<br/>
          • Profiles: you can only see unpaired profiles for pairing, otherwise only you + partner (same couple_id).<br/>
          • Couples: only members can SELECT/UPDATE/DELETE their row.<br/>
          • Messages, feed, daily answers: filtered by <code>get_my_couple_id()</code>.<br/>
          • Pairing uses a <code>SECURITY DEFINER</code> RPC that validates invite codes server-side, never trusting client.<br/>
          • Timestamps stored in UTC, displayed per timezone.<br/>
          • No service_role key in client — only anon key + RLS.
        </p>
        <div className="pill" style={{ marginTop: 12, fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {isSupabaseConfigured ? 'Supabase mode — real RLS active' : 'Mock mode — RLS simulated in localStorage (set VITE_SUPABASE_URL to test real RLS)'}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Account</h3>
        <p className="text-soft" style={{ fontSize: '0.9rem', marginBottom: 12 }}>{user?.email}</p>
        <button className="btn btn-secondary" onClick={handleSignOut}>Log out</button>
      </div>

      <div className="text-center text-light" style={{ marginTop: 24, fontSize: '0.8rem' }}>
        Together • cozy companion for LDR • Phase 1 • Built with 💕
      </div>
    </div>
  )
}
