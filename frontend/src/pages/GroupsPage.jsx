import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

export const GroupsPage = () => {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)

  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const navigate = useNavigate()

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const res = await client.get('/groups')
      const list = res.data.groups || res.data.data || []
      setGroups(list)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)
    try {
      const res = await client.post('/groups', {
        name: createName,
        description: createDesc
      })
      const created = res.data.group || res.data.data
      setShowCreateModal(false)
      setCreateName('')
      setCreateDesc('')
      await fetchGroups()
      if (created?._id) {
        navigate(`/groups/${created._id}/expenses`)
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create group')
    } finally {
      setModalLoading(false)
    }
  }

  const handleEditGroup = async (e) => {
    e.preventDefault()
    if (!editingGroup) return
    const isCreator = (editingGroup.createdBy?._id || editingGroup.createdBy) === user?._id
    if (!isCreator) return
    setModalError('')
    setModalLoading(true)
    try {
      await client.patch(`/groups/${editingGroup._id}`, {
        name: editName,
        description: editDesc
      })
      setEditingGroup(null)
      await fetchGroups()
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update group')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId, groupName) => {
    const target = groups.find((g) => g._id === groupId)
    const isCreator = (target?.createdBy?._id || target?.createdBy) === user?._id
    if (!isCreator) {
      alert('Only the group creator can delete this group')
      return
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${groupName}"? All expenses and settlement records in this group will be deleted.`)) {
      return
    }
    try {
      await client.delete(`/groups/${groupId}`)
      await fetchGroups()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group')
    }
  }

  const handleJoinGroup = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)
    try {
      const res = await client.post('/groups/join', {
        inviteCode: joinCode.trim().toUpperCase()
      })
      const joined = res.data.group || res.data.data
      setShowJoinModal(false)
      setJoinCode('')
      await fetchGroups()
      if (joined?._id) {
        navigate(`/groups/${joined._id}/expenses`)
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'Invalid invite code or group not found')
    } finally {
      setModalLoading(false)
    }
  }

  const openEditModal = (group) => {
    const isCreator = (group?.createdBy?._id || group?.createdBy) === user?._id
    if (!isCreator) return
    setEditingGroup(group)
    setEditName(group.name || '')
    setEditDesc(group.description || '')
    setModalError('')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1120px] w-full mx-auto px-6 py-8 space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-1">
            <h1 className="font-bold text-2xl tracking-tight text-[#0F172A]">Expense Groups</h1>
            <p className="text-sm text-[#64748B]">
              Organize shared living, trips, and recurring group expenses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowJoinModal(true)
                setModalError('')
                setJoinCode('')
              }}
              className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>Join via Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true)
                setModalError('')
              }}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Group</span>
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-3 text-xs text-[#B91C1C]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-[#64748B] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span>Fetching groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-[#F1F5F9] rounded-[8px] flex items-center justify-center mx-auto text-[#64748B]">
              <span className="material-symbols-outlined text-[28px]">group_work</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0F172A]">No Groups Found</h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                You haven't joined or created any expense groups yet. Create a group to start tracking splits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create Your First Group</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => {
              const isCreator = (group.createdBy?._id || group.createdBy) === user?._id

              return (
                <div
                  key={group._id}
                  className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 flex flex-col justify-between space-y-4 hover:border-[#CBD5E1] transition-colors relative"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-[#0F172A] leading-snug">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCreator && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(group)}
                              title="Edit group details (Creator only)"
                              className="text-[#64748B] hover:text-[#0F172A] p-1 rounded hover:bg-[#F1F5F9] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group._id, group.name)}
                              title="Delete group (Creator only)"
                              className="text-[#64748B] hover:text-[#DC2626] p-1 rounded hover:bg-[#FEF2F2] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </>
                        )}
                        <span className="bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] text-[11px] font-semibold px-2 py-0.5 rounded-[4px]">
                          {group.members?.length || 1} {group.members?.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-xs text-[#64748B] line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-mono text-[#64748B] uppercase">Code:</span>
                      <span className="font-mono text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-[#0F172A]">
                        {group.inviteCode}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/groups/${group._id}/members`}
                        className="text-[#64748B] hover:text-[#0F172A] font-medium"
                      >
                        Members
                      </Link>
                      <span className="text-[#CBD5E1]">·</span>
                      <Link
                        to={`/groups/${group._id}/settlements`}
                        className="text-[#64748B] hover:text-[#0F172A] font-medium"
                      >
                        Balances
                      </Link>
                    </div>
                    <Link
                      to={`/groups/${group._id}/expenses`}
                      className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-3 py-1.5 rounded-[6px] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Expenses</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[460px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Create New Group</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Set up a shared ledger for roommates, travel, or friends.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Flat 402 - 5th Cross"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Apartment utilities, internet, groceries..."
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] p-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[460px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Edit Group Details</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Update group title or description.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
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

            <form onSubmit={handleEditGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] p-3 text-sm text-[#0F172A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[440px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Join Group by Invite Code</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Enter the unique code shared by your group creator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
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

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Invite Code
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. INV-402F9A"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 font-mono text-sm tracking-widest text-[#0F172A] placeholder-[#94A3B8] uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
