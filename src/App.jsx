import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import IdentityManagement from './pages/IdentityManagement'
import PerformanceTracker from './pages/PerformanceTracker'
import WeeklyReview from './pages/WeeklyReview'
import EnvironmentDesign from './pages/EnvironmentDesign'

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#18181b',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/identity" element={<ProtectedRoute><IdentityManagement /></ProtectedRoute>} />
          <Route path="/environment-design" element={<ProtectedRoute><EnvironmentDesign /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><PerformanceTracker /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><WeeklyReview /></ProtectedRoute>} />
        </Routes>
      </UserProvider>
    </AuthProvider>
  )
}

export default App
