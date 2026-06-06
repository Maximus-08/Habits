import { useEffect } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useHabits } from '../context/HabitsContext';
import { HabitsLogo } from './HabitsLogo';
import { Award, LogOut, HelpCircle } from 'lucide-react';

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, authLoading, dbError, initialSyncCompleted, identities, userProfile, logout } = useHabits();
  
  const isOnboarding = location.pathname === '/onboarding';
  const isLanding = location.pathname === '/';

  // Cleanup onboarding submission flag once identities successfully load in the context
  useEffect(() => {
    if (identities.length > 0) {
      sessionStorage.removeItem('onboarding_submitted');
    }
  }, [identities]);

  // 1. Database connection error/offline view
  if (dbError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center font-serif text-text p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L4.929 6.364M3 3l18 18" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Connection Unreachable</h2>
            <p className="text-sm text-muted">
              We couldn't connect to the database. Please check your internet connection or try again.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all cursor-pointer"
          >
            Retry Connection
          </button>
          {currentUser && (
            <button 
              onClick={logout} 
              className="text-xs text-muted hover:text-primary transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Loading state spinner
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

  // 3. Unauthenticated route guard
  if (!currentUser) {
    if (!isLanding) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // 4. Authenticated - prevent viewing landing page (redirect to dashboard)
  if (isLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  const hasOnboardedLocal = currentUser ? localStorage.getItem(`atomic_onboarded_${currentUser.uid}`) === 'true' : false;

  // 5. Smart redirect: If no identities are defined and user has never onboarded, force onboarding
  const isOnboardingSubmitted = sessionStorage.getItem('onboarding_submitted') === 'true';
  if (initialSyncCompleted && identities.length === 0 && !isOnboarding && !isOnboardingSubmitted && !hasOnboardedLocal) {
    return <Navigate to="/onboarding" replace />;
  }

  // 6. Skip onboarding page if user has already onboarded
  if (isOnboarding && (identities.length > 0 || hasOnboardedLocal)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Active link helper
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-bg">

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
