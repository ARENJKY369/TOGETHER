import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AmbientBackground from './AmbientBackground'

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠', activeIcon: '🏡' },
  { path: '/chat', label: 'Chat', icon: '💬', activeIcon: '💌' },
  { path: '/feed', label: 'Memories', icon: '📸', comingSoon: true },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout({ children }) {
  const { user, profile } = useAuth()
  const location = useLocation()

  // Don't show nav on auth pages
  const hideNav = ['/login','/signup','/onboarding','/pair'].includes(location.pathname) || !user

  return (
    <>
      <AmbientBackground />
      {!hideNav && (
        <header className="top-nav">
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>💕</span>
              <span className="display-font" style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--color-text)' }}>Together</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {profile?.display_name && (
                <span className="pill pill-rose" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.display_name.split(' ')[0]}
                </span>
              )}
              <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.9rem' }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (profile?.display_name?.[0] || user?.email?.[0] || '💕')}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="page" style={{ paddingTop: hideNav ? 0 : 16 }}>
        <div className="container">
          {children}
        </div>
      </main>

      {!hideNav && (
        <nav className="mobile-nav">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} className={isActive ? 'active' : ''} onClick={e => { if(item.comingSoon){ e.preventDefault(); alert('Phase 3 — Memories & rituals coming soon! 📸'); } }}>
                <span style={{ fontSize: '1.2rem' }}>{isActive ? item.activeIcon || item.icon : item.icon}</span>
                <span>{item.label}</span>
                {item.comingSoon && <span style={{ fontSize: '0.55rem', background: 'var(--color-blush-light)', padding: '1px 6px', borderRadius: '999px', marginTop: '2px' }}>soon</span>}
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
