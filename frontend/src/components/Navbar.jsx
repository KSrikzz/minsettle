import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const isGroupsActive = location.pathname.startsWith('/groups') || location.pathname === '/'
  const isProfileActive = location.pathname === '/profile'

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] w-full">
      <div className="max-w-[1120px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/groups" className="flex items-center gap-2.5">
            <span className="font-bold text-lg tracking-tight text-[#0F172A]">MinSettle</span>
            <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[#E2E8F0]">
              Expense Sharing
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm ml-2">
            <Link
              to="/groups"
              className={`pb-3 -mb-3 transition-colors ${
                isGroupsActive
                  ? 'font-semibold text-[#0F172A] border-b-2 border-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Groups
            </Link>
            <Link
              to="/profile"
              className={`pb-3 -mb-3 transition-colors ${
                isProfileActive
                  ? 'font-semibold text-[#0F172A] border-b-2 border-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Profile & UPI
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
                title="Manage Profile & UPI"
              >
                <div className="w-8 h-8 rounded-[6px] bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-[#0F172A]">{user.name}</span>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    {user.upiId || 'No UPI set'}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors ml-1"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
