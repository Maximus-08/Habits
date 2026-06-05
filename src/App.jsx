import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HabitsProvider, useHabits } from './context/HabitsContext';
import LandingPage, { HabitsLogo } from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import EnvironmentDesign from './pages/EnvironmentDesign';
import WeeklyReview from './pages/WeeklyReview';
import Analytics from './pages/Analytics';
import { FileText, BarChart3, RotateCcw, Award, LogOut, HelpCircle } from 'lucide-react';
import { Button } from './components/ui/Primitives';

// App Layout Wrapper to show/hide navbar and handle onboarding routing
function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, authLoading, useLocalStorage, identities, userProfile, logout } = useHabits();
  
  const isOnboarding = location.pathname === '/onboarding';
  const isLanding = location.pathname === '/';

  // Cleanup onboarding submission flag once identities successfully load in the context
  React.useEffect(() => {
    if (identities.length > 0) {
      sessionStorage.removeItem('onboarding_submitted');
    }
  }, [identities]);

  // 1. Loading state spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif text-text">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-12 h-12 animate-spin text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-muted">Loading Habits...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated route guard
  if (!currentUser) {
    if (!isLanding) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // 3. Authenticated - prevent viewing landing page (redirect to dashboard)
  if (isLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Smart redirect: If no identities are defined, force onboarding (except if already on onboarding or onboarding is submitting)
  const isOnboardingSubmitted = sessionStorage.getItem('onboarding_submitted') === 'true';
  if (identities.length === 0 && !isOnboarding && !isOnboardingSubmitted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Active link helper
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Floating Offline Banner */}
      {useLocalStorage && (
        <div className="bg-[#DF8559] text-white text-xs font-mono py-2.5 px-4 text-center flex items-center justify-center gap-2 select-none shadow-sm font-semibold transition-all z-50">
          <span>⚠️ Firestore database is unreachable. Operating in local browser storage (offline mode).</span>
        </div>
      )}

      {/* Navigation Bar (Hidden during onboarding) */}
      {!isOnboarding && (
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border/80 transition-all select-none">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <span className="text-xl font-bold font-serif text-text tracking-wide flex items-center gap-2">
                  <HabitsLogo className="w-8 h-8 rounded-lg shadow-md shrink-0" />
                  Habits
                </span>
              </Link>

              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-hoverBg text-primary font-bold'
                      : 'text-muted hover:text-text hover:bg-hoverBg/50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/environment"
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                    isActive('/environment')
                      ? 'bg-hoverBg text-primary font-bold'
                      : 'text-muted hover:text-text hover:bg-hoverBg/50'
                  }`}
                >
                  Environment
                </Link>
                <Link
                  to="/review"
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                    isActive('/review')
                      ? 'bg-hoverBg text-primary font-bold'
                      : 'text-muted hover:text-text hover:bg-hoverBg/50'
                  }`}
                >
                  Weekly Review
                </Link>
                <Link
                  to="/analytics"
                  className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                    isActive('/analytics')
                      ? 'bg-hoverBg text-primary font-bold'
                      : 'text-muted hover:text-text hover:bg-hoverBg/50'
                  }`}
                >
                  Analytics
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              {/* Level Badge */}
              <div className="bg-hoverBg text-text border border-border/80 rounded-lg px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span>Lvl {userProfile.level || 1}</span>
              </div>

              {/* Help/Tutorial Button */}
              <button
                onClick={() => {
                  navigate('/dashboard?tutorial=true');
                }}
                className="p-2 text-muted hover:text-primary hover:bg-hoverBg rounded-lg transition-colors cursor-pointer"
                title="System Tutorial"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                className="p-2 text-muted hover:text-primary hover:bg-hoverBg rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation bar */}
          <div className="md:hidden flex items-center justify-around border-t border-border/40 h-11 bg-surface">
            <Link to="/dashboard" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded ${isActive('/dashboard') ? 'text-primary' : 'text-muted'}`}>
              Dashboard
            </Link>
            <Link to="/environment" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded ${isActive('/environment') ? 'text-primary' : 'text-muted'}`}>
              Environment
            </Link>
            <Link to="/review" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded ${isActive('/review') ? 'text-primary' : 'text-muted'}`}>
              Review
            </Link>
            <Link to="/analytics" className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded ${isActive('/analytics') ? 'text-primary' : 'text-muted'}`}>
              Analytics
            </Link>
          </div>
        </header>
      )}

      {/* Main Page Area */}
      <main className="flex-1 bg-bg">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <HabitsProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/environment" element={<EnvironmentDesign />} />
            <Route path="/review" element={<WeeklyReview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        
        {/* Sleek themed toast notifications */}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#4A4036',
              border: '1px solid #EAE4DD',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(74, 64, 54, 0.08)'
            },
            success: {
              iconTheme: {
                primary: '#A3C9A8',
                secondary: '#FFFFFF'
              }
            },
            error: {
              iconTheme: {
                primary: '#F6C879',
                secondary: '#FFFFFF'
              }
            }
          }}
        />
      </HabitsProvider>
    </Router>
  );
}
