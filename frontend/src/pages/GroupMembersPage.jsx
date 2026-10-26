import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

export const GroupMembersPage = () => {
  const { groupId } = useParams()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchGroup = async () => {
    try {
      setLoading(true)
      const res = await client.get(`/groups/${groupId}`)
      const grp = res.data.group || res.data.data
      setGroup(grp)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroup()
  }, [groupId])

  const handleCopyInvite = () => {
    if (!group?.inviteCode) return
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)
    try {
      await client.post(`/groups/${groupId}/members`, { email: inviteEmail.trim() })
      setShowAddModal(false)
      setInviteEmail('')
      await fetchGroup()
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to add member')
    } finally {
      setModalLoading(false)
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return
    try {
      await client.delete(`/groups/${groupId}/members/${memberId}`)
      await fetchGroup()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member')
    }
  }

  const isCreator = (group?.createdBy?._id || group?.createdBy) === user?._id

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1120px] w-full mx-auto px-6 py-6 space-y-6">
        <nav className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <Link to="/groups" className="hover:text-[#0F172A] transition-colors">Groups</Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#0F172A] font-semibold">{group?.name || 'Group'}</span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#64748B]">Members</span>
        </nav>

        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl tracking-tight text-[#0F172A]">
                {group?.name || 'Group Members'}
              </h1>
              <span className="bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-xs font-semibold">
                {group?.members?.length || 0} Members
              </span>
            </div>
            <p className="text-sm text-[#64748B]">
              Manage group members and invite people to share expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 gap-2">
              <span className="text-[11px] font-medium text-[#64748B] uppercase">Invite Code</span>
              <span className="font-mono text-xs font-semibold text-[#0F172A] tracking-wider">
                {group?.inviteCode || '...'}
              </span>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="text-[#475569] hover:text-[#0F172A] p-0.5 transition-colors flex items-center"
                title="Copy Invite Code"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'done' : 'content_copy'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddModal(true)
                setModalError('')
              }}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>+ Add Member by Email</span>
            </button>
          </div>
        </section>

        <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-sm">
          <Link
            to={`/groups/${groupId}/expenses`}
            className="pb-3 text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
          >
            Expenses Log
          </Link>
          <Link
            to={`/groups/${groupId}/settlements`}
            className="pb-3 text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
          >
            Balances & Settlements
          </Link>
          <Link
            to={`/groups/${groupId}/members`}
            className="pb-3 text-[#0F172A] font-semibold border-b-2 border-[#0F172A]"
          >
            Members & Invite Code
          </Link>
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-3 text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-[#64748B] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span>Loading members...</span>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-5">Member Name</th>
                    <th className="py-3 px-5">Email</th>
                    <th className="py-3 px-5">UPI ID</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                  {group?.members?.map((m) => {
                    const isMemberCreator = (group.createdBy?._id || group.createdBy) === m._id
                    const isSelf = m._id === user?._id

                    return (
                      <tr key={m._id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center text-xs font-semibold">
                              {m.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#0F172A]">{m.name}</span>
                            {isSelf && (
                              <span className="bg-[#F1F5F9] text-[#475569] text-[11px] px-1.5 py-0.2 rounded font-medium border border-[#E2E8F0]">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs text-[#475569]">
                          {m.email}
                        </td>
                        <td className="py-3.5 px-5">
                          {m.upiId ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[4px] text-[#0F172A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
                              <span>{m.upiId}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-[#94A3B8] italic">No UPI set</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          {isMemberCreator ? (
                            <span className="inline-block bg-[#0F172A] text-white text-[11px] font-semibold px-2 py-0.5 rounded-[4px]">
                              Group Creator
                            </span>
                          ) : (
                            <span className="inline-block bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] text-[11px] font-medium px-2 py-0.5 rounded-[4px]">
                              Member
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {isCreator && !isMemberCreator ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m._id, m.name)}
                              className="border border-[#E2E8F0] hover:border-[#EF4444] text-[#475569] hover:text-[#DC2626] hover:bg-[#FEF2F2] px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors"
                            >
                              Remove
                            </button>
                          ) : isMemberCreator ? (
                            <span className="text-[11px] text-[#94A3B8]">Admin</span>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[480px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Add Member by Email</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Enter the registered email of the user to invite them directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {modalError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-2.5 text-xs text-[#B91C1C]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] p-3 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#475569] text-[18px] shrink-0 mt-0.5">info</span>
                <p className="text-xs text-[#64748B]">
                  Members must already have a registered MinSettle account to join this group.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
