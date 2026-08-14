import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import { Signup, Login } from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Pairing from './pages/Pairing'
import Settings from './pages/Settings'
import Chat from './pages/Chat'

function Protected({ children }) {
  const { user, loading, initialized } = useAuth()
  if (!initialized || loading) return <div style={{ minHeight: '80vh', display: 'grid', placeItems: 'center' }}><div className="loading-dots"><span></span><span></span><span></span></div></div>
  if (!user) return <Navigate to="/landing" replace />
  return children
}

function PairRedirect() {
  const { code } = useParams()
  return <Navigate to={`/pair?code=${code}`} replace />
}

// Wrapper for invite link /invite/:code -> /pair with code prefilled
function InviteRoute() {
  const { code } = useParams()
  // Reuse Pairing component that reads code from params
  return <Pairing />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route path="/pair" element={<Protected><Pairing /></Protected>} />
            <Route path="/invite/:code" element={<Protected><InviteRoute /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/chat" element={<Protected><Chat /></Protected>} />
            <Route path="/feed" element={<Protected><Dashboard /></Protected>} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
