import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth()

  const [name, setName] = useState('')
  const [upiId, setUpiId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setUpiId(user.upiId || '')
    }
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!name.trim()) {
      setError('Full name is required')
      return
    }
    if (!upiId.trim()) {
      setError('UPI ID is required')
      return
    }
    if (!/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      setError('Please enter a valid UPI ID (e.g. username@bank)')
      return
    }
    setLoading(true)
    try {
      await updateProfile(name.trim(), upiId.trim())
      setSuccess('Profile and UPI settings updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleDiscard = () => {
    if (user) {
      setName(user.name || '')
      setUpiId(user.upiId || '')
      setError('')
      setSuccess('')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[760px] w-full mx-auto px-6 py-8 space-y-6">
        <nav className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <Link to="/groups" className="hover:text-[#0F172A] transition-colors">Home</Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#0F172A] font-semibold">Profile & Settings</span>
        </nav>

        <section className="space-y-1 pb-4 border-b border-[#E2E8F0]">
          <h1 className="font-bold text-2xl tracking-tight text-[#0F172A]">
            Profile & Payment Settings
          </h1>
          <p className="text-sm text-[#64748B]">
            Manage your personal identity and primary UPI ID used for settlement deep links.
          </p>
        </section>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-3 text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] p-3 text-xs text-[#15803D]">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">Personal Details</h2>
              <p className="text-xs text-[#64748B]">Your profile identity across shared expense groups.</p>
            </div>

            <div className="space-y-4 pt-2 border-t border-[#E2E8F0]">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    Email Address
                  </label>
                  <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                    Read-only
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] h-[38px] px-3 font-mono text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-6 space-y-4">
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">UPI Payment Configuration</h2>
              <p className="text-xs text-[#64748B]">
                Your UPI ID is used by group members to settle balances directly with you.
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-[#E2E8F0]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  UPI ID
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. rohan@oksbi, user@okhdfcbank, mobile@icici"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 font-mono text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-5 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-[16px]">
                  progress_activity
                </span>
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
