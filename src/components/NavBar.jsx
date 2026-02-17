import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function NavBar({ currentPage = 'dashboard' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    const { success } = await logout();
    if (success) {
      navigate('/');
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', page: 'dashboard' },
    { to: '/identity', label: 'Identity Log', page: 'identity' },
    { to: '/environment-design', label: 'Environment Design', page: 'environment-design' },
    { to: '/analytics', label: 'Analytics', page: 'analytics' },
    { to: '/review', label: 'Review', page: 'review' },
  ]

  return (
    <nav className="w-full bg-surface-light border-b border-zinc-200 sticky top-0 z-50 backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-[20px] font-bold">all_inclusive</span>
          </div>
          <Link to="/dashboard">
            <span className="text-xl font-bold tracking-tight text-zinc-900">
              Atomic<span className="text-primary">Tracker</span>
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.page} to={link.to}>
              <span className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === link.page
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary overflow-hidden ring-2 ring-white shadow-sm cursor-pointer hover:ring-secondary/30 transition-all"
            />
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
