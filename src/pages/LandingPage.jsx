import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signInWithGoogle, signUpWithEmail, signInWithEmail, logAnalyticsEvent } from '../config/firebase';
import { isValidEmail, validatePassword, formatFirebaseError } from '../utils/validation';
import { HabitsLogo } from '../components/HabitsLogo';

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { user, error: authError } = await signInWithGoogle();
    if (user) {
      logAnalyticsEvent('login', { method: 'google' });
      navigate('/dashboard');
    } else {
      const errorCode = authError?.split('(')[1]?.split(')')[0] || authError;
      setError(formatFirebaseError(errorCode) || authError);
      logAnalyticsEvent('login_error', { method: 'google', error: errorCode });
    }
    setLoading(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }
    
    setLoading(true);
    
    const { user, error: authError } = isSignUp 
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);
    
    if (user) {
      logAnalyticsEvent(isSignUp ? 'sign_up' : 'login', { method: 'email' });
      navigate('/dashboard');
    } else {
      const errorCode = authError?.split('(')[1]?.split(')')[0] || authError;
      setError(formatFirebaseError(errorCode) || authError);
      logAnalyticsEvent(isSignUp ? 'sign_up_error' : 'login_error', { method: 'email', error: errorCode });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-bg">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <HabitsLogo className="w-8 h-8 rounded-lg shadow-md" />
            <span className="text-lg font-bold tracking-tight text-text-main">Habits</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
          </nav>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsSignUp(false);
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-zinc-600 hover:text-text-main hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => {
                setIsSignUp(true);
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all transform hover:scale-105 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl mix-blend-multiply"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl mix-blend-multiply"></div>
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="flex flex-col justify-center text-left z-10">
                <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary border border-primary/20 w-fit">
                  <span className="material-symbols-outlined mr-1.5 text-[18px]">trending_up</span>
                  The Power of Tiny Gains
                </div>
                <h1 className="mb-6 text-4xl font-black tracking-tight text-text-main sm:text-5xl lg:text-6xl leading-[1.1]">
                  Become <span className="text-gradient relative inline-block">1% Better</span> Every Day
                </h1>
                <p className="mb-8 text-lg text-text-muted max-w-lg leading-relaxed">
                  Compound interest is the 8th wonder of the world. So are your habits. Forget about setting goals. Focus on your <span className="text-secondary font-semibold">system</span> instead.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => {
                      setIsSignUp(true);
                      document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    Start Your Streak
                    <span className="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>
                  </button>
                  <button 
                    onClick={() => document.getElementById('philosophy-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-8 text-base font-bold text-text-main shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer"
                  >
                    Learn the System
                  </button>
                </div>
              </div>

              {/* Auth Card */}
              <div id="auth-section" className="relative lg:ml-auto w-full max-w-md lg:max-w-full z-10">
                <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 rounded-3xl bg-gradient-to-tr from-secondary/20 to-primary/20 blur-2xl"></div>
                <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
                  <div className="border-b border-zinc-100 bg-white/40 p-6">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-1">Improvement Curve (1 Year)</p>
                        <h3 className="text-3xl font-bold text-text-main tracking-tight font-sans">37.78x</h3>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                          <span className="material-symbols-outlined mr-1 text-[16px]">trending_up</span> 1% daily
                        </div>
                      </div>
                    </div>
                    <div className="h-40 w-full">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120">
                        <defs>
                          <linearGradient id="curveStroke" x1="0%" x2="100%" y1="0%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#DF8559', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#F5BCA1', stopOpacity: 1 }} />
                          </linearGradient>
                          <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#DF8559" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#F5BCA1" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <line className="text-zinc-200" stroke="currentColor" strokeWidth="1" x1="0" x2="400" y1="120" y2="120" />
                        <line className="text-zinc-200" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="400" y1="60" y2="60" />
                        <path className="opacity-50" d="M0 110 C 100 108, 200 100, 300 60 S 400 0, 400 0 V 120 H 0 Z" fill="url(#curveFill)" />
                        <path d="M0 110 C 100 108, 200 100, 300 60 S 400 0, 400 0" fill="none" stroke="url(#curveStroke)" strokeLinecap="round" strokeWidth="4" />
                        <circle className="shadow-lg shadow-primary/50" cx="400" cy="0" fill="#DF8559" r="4" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 bg-white/60">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-text-main">Build Your Identity</h3>
                      <p className="text-sm text-text-muted mt-1">
                        {isSignUp ? 'Create an account to track your atomic habits.' : 'Log in to track your atomic habits.'}
                      </p>
                    </div>
                    
                    {error && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <form className="space-y-4" onSubmit={handleEmailAuth}>
                      <div>
                        <label className="sr-only" htmlFor="email">Email address</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="material-symbols-outlined text-zinc-400">mail</span>
                          </div>
                          <input
                            className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 text-text-main placeholder:text-zinc-400 focus:border-secondary focus:ring-secondary sm:text-sm sm:leading-6 shadow-sm transition-all focus:outline-none"
                            id="email"
                            name="email"
                            placeholder="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="sr-only" htmlFor="password">Password</label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="material-symbols-outlined text-zinc-400">lock</span>
                          </div>
                          <input
                            className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 text-text-main placeholder:text-zinc-400 focus:border-secondary focus:ring-secondary sm:text-sm sm:leading-6 shadow-sm transition-all focus:outline-none"
                            id="password"
                            name="password"
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <button 
                        className="flex w-full items-center justify-center rounded-xl bg-secondary px-3 py-3.5 text-sm font-bold leading-6 text-white shadow-lg shadow-secondary/30 hover:bg-secondary-hover hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : (isSignUp ? 'Create Identity' : 'Sign In')}
                      </button>
                    </form>

                    <div className="mt-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-text-muted">Or continue with</span>
                        </div>
                      </div>

                      <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-text-main shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        type="button"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </button>
                    </div>

                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-text-muted hover:text-secondary transition-colors cursor-pointer"
                        type="button"
                      >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section id="philosophy-section" className="py-16 sm:py-24 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-base font-bold leading-7 text-secondary tracking-wide uppercase">The Philosophy</h2>
              <p className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">Systems Over Goals</p>
              <p className="mt-6 text-lg leading-8 text-text-muted">
                Winners and losers have the same goals. The difference is the <span className="text-secondary font-medium">system</span> they implement to achieve them.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
                <div className="glass-panel flex flex-col rounded-2xl p-8 hover:shadow-2xl hover:border-secondary/30 transition-all duration-300 group">
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-text-main mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">trending_flat</span>
                    </div>
                    Plateau of Potential
                  </dt>
                  <dd className="flex flex-auto flex-col text-base leading-relaxed text-text-muted">
                    <p className="flex-auto">Break through the disappointment valley where results lag behind efforts. Your work is not wasted; it is just being stored.</p>
                  </dd>
                </div>
                <div className="glass-panel flex flex-col rounded-2xl p-8 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group">
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-text-main mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">science</span>
                    </div>
                    Atomic Changes
                  </dt>
                  <dd className="flex flex-auto flex-col text-base leading-relaxed text-text-muted">
                    <p className="flex-auto">Tiny changes, remarkable results. It is about the cycle of endless refinement and continuous improvement.</p>
                  </dd>
                </div>
                <div className="glass-panel flex flex-col rounded-2xl p-8 hover:shadow-2xl hover:border-secondary/30 transition-all duration-300 group">
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-text-main mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[24px]">fingerprint</span>
                    </div>
                    Identity-Based Habits
                  </dt>
                  <dd className="flex flex-auto flex-col text-base leading-relaxed text-text-muted">
                    <p className="flex-auto">Focus on who you wish to become, not just what you want to achieve. Real change starts with identity.</p>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative isolate overflow-hidden bg-white py-16 sm:py-24 lg:py-32 border-t border-zinc-200">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/5 via-background-light to-background-light"></div>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-black tracking-tight text-text-main sm:text-4xl">Who do you want to <span className="text-secondary">become</span>?</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-text-muted">
                Real change starts with identity. Every action you take is a vote for the type of person you wish to become.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-y-4">
                <label className="sr-only" htmlFor="identity-input">Identity Input</label>
                <div className="relative w-full max-w-md">
                  <input
                    className="block w-full rounded-full border-0 bg-white py-4 pl-8 pr-40 text-text-main shadow-lg ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-secondary sm:text-lg sm:leading-6 focus:outline-none"
                    id="identity-input"
                    placeholder="e.g., A runner, A writer..."
                    type="text"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <button 
                      onClick={() => {
                        setIsSignUp(true);
                        document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center rounded-full bg-secondary px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-secondary-hover transition-colors cursor-pointer" 
                      type="button"
                    >
                      Claim Identity
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
