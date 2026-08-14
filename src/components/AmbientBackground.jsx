import { useMemo, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Determine time of day state from timezone
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 8) return 'dawn'   // 5-8
  if (hour >= 8 && hour < 17) return 'day'   // 8-17
  if (hour >= 17 && hour < 20) return 'dusk' // 17-20
  return 'night'
}

function getHourInTimezone(timezone) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: timezone })
    return parseInt(formatter.format(now), 10)
  } catch {
    return new Date().getHours()
  }
}

export default function AmbientBackground() {
  const { profile, partnerProfile } = useAuth()
  const [nowTick, setNowTick] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000) // update each minute
    return () => clearInterval(id)
  }, [])

  // compute combined state
  const ambientClass = useMemo(() => {
    // suppress unused warning for nowTick
    void nowTick
    const myTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const partnerTz = partnerProfile?.timezone || null

    const myHour = getHourInTimezone(myTz)
    const myState = getTimeOfDay(myHour)

    if (!partnerTz || !partnerProfile) {
      return `ambient-${myState}`
    }

    const partnerHour = getHourInTimezone(partnerTz)
    const partnerState = getTimeOfDay(partnerHour)

    if (myState === partnerState) return `ambient-${myState}`
    // mixed states
    if ((myState === 'day' && partnerState === 'night') || (myState === 'night' && partnerState === 'day')) {
      return 'ambient-mixed'
    }
    if (myState === 'night' || partnerState === 'night') return 'ambient-dusk'
    return 'ambient-mixed'
  }, [profile?.timezone, partnerProfile?.timezone, partnerProfile, nowTick])

  return <div className={`ambient-bg ${ambientClass}`} aria-hidden />
}

export function getTimeOfDayLabel(hour) {
  const state = getTimeOfDay(hour)
  const map = {
    dawn: { label: 'Dawn', icon: '🌅', emoji: '☀️' },
    day: { label: 'Daytime', icon: '☀️', emoji: '🌤️' },
    dusk: { label: 'Dusk', icon: '🌇', emoji: '🌆' },
    night: { label: 'Night', icon: '🌙', emoji: '🌙' },
  }
  return map[state]
}
