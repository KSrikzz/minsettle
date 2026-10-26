import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [upiId, setUpiId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Name is required')
        if (!upiId.trim()) throw new Error('UPI ID is required')
        if (!/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
          throw new Error('Please enter a valid UPI ID (e.g. username@bank)')
        }
        await register(name.trim(), email.trim(), password, upiId.trim())
      } else {
        await login(email, password)
      }
      navigate('/groups')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <span className="font-bold text-2xl tracking-tight text-[#0F172A]">MinSettle</span>
            <span className="bg-[#F1F5F9] text-[#475569] text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[#E2E8F0]">
              Expense Sharing
            </span>
          </div>
          <p className="text-sm text-[#64748B]">
            Effortless expense splitting and simplified group settlements
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-6">
          <div className="flex border-b border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false)
                setError('')
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                !isRegister
                  ? 'text-[#0F172A] border-b-2 border-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true)
                setError('')
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                isRegister
                  ? 'text-[#0F172A] border-b-2 border-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#B91C1C] text-[18px] shrink-0 mt-0.5">
                error
              </span>
              <p className="text-xs text-[#B91C1C] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    UPI ID / VPA
                  </label>
                  <span className="text-[11px] text-[#DC2626] font-semibold">Required</span>
                </div>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. rohan@oksbi"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8] font-mono text-xs"
                />
                <p className="text-[11px] text-[#64748B]">
                  Used to generate UPI deep links for direct peer settlements.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm h-[40px] rounded-[6px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
              )}
              <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-[#64748B]">
          Simple, transparent, and fair expense management for groups.
        </div>
      </div>
    </div>
  )
}
