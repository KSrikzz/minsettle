import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { formatINR, rupeesToPaise } from '../utils/format'

export const GroupExpensesPage = () => {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [description, setDescription] = useState('')
  const [amountRupees, setAmountRupees] = useState('')
  const [category, setCategory] = useState('food')
  const [expenseType, setExpenseType] = useState('one-off')
  const [splitType, setSplitType] = useState('equal')
  const [paidBy, setPaidBy] = useState('')
  const [customSplits, setCustomSplits] = useState({})
  const [percentageSplits, setPercentageSplits] = useState({})
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const [showEditGroupModal, setShowEditGroupModal] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')
  const [groupModalLoading, setGroupModalLoading] = useState(false)
  const [groupModalError, setGroupModalError] = useState('')

  const fetchGroupAndExpenses = async () => {
    try {
      setLoading(true)
      const [groupRes, expRes] = await Promise.all([
        client.get(`/groups/${groupId}`),
        client.get(`/groups/${groupId}/expenses`)
      ])
      const grp = groupRes.data.group || groupRes.data.data
      const exps = expRes.data.expenses || expRes.data.data || []
      setGroup(grp)
      setExpenses(exps)
      if (grp?.members?.length > 0 && !paidBy) {
        setPaidBy(user?._id || grp.members[0]._id)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupAndExpenses()
  }, [groupId])

  const openAddModal = () => {
    setEditingExpenseId(null)
    setDescription('')
    setAmountRupees('')
    setCategory('food')
    setExpenseType('one-off')
    setSplitType('equal')
    setPaidBy(user?._id || group?.members?.[0]?._id || '')
    setCustomSplits({})
    setPercentageSplits({})
    setModalError('')
    setShowAddModal(true)
  }

  const openEditExpenseModal = (exp) => {
    const creatorId = exp.createdBy?._id || exp.createdBy || exp.paidBy?._id || exp.paidBy
    if (creatorId !== user?._id) return
    setEditingExpenseId(exp._id)
    setDescription(exp.description || '')
    setAmountRupees((exp.amountPaise / 100).toFixed(2))
    setCategory(exp.category || 'food')
    setExpenseType(exp.expenseType || 'one-off')
    setSplitType(exp.splitType || 'equal')
    setPaidBy(exp.paidBy?._id || exp.paidBy || '')

    const customObj = {}
    const percObj = {}
    if (Array.isArray(exp.splits)) {
      exp.splits.forEach((s) => {
        const uId = s.user?._id || s.user
        customObj[uId] = (s.amountPaise / 100).toFixed(2)
        if (exp.amountPaise > 0) {
          percObj[uId] = ((s.amountPaise / exp.amountPaise) * 100).toFixed(1)
        }
      })
    }
    setCustomSplits(customObj)
    setPercentageSplits(percObj)
    setModalError('')
    setShowAddModal(true)
  }

  const handleSaveExpense = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)

    const amountPaise = rupeesToPaise(amountRupees)
    if (amountPaise <= 0) {
      setModalError('Amount must be greater than zero')
      setModalLoading(false)
      return
    }

    const payload = {
      description,
      amountPaise,
      category,
      expenseType,
      splitType,
      paidBy: paidBy || user?._id
    }

    if (splitType === 'custom') {
      const splitsArray = Object.entries(customSplits).map(([uid, r]) => ({
        user: uid,
        amountPaise: rupeesToPaise(r)
      }))
      const sumSplits = splitsArray.reduce((acc, s) => acc + s.amountPaise, 0)
      if (sumSplits !== amountPaise) {
        setModalError(`Custom splits sum (${sumSplits / 100}) does not match expense amount (${amountPaise / 100})`)
        setModalLoading(false)
        return
      }
      payload.splits = splitsArray
    } else if (splitType === 'percentage') {
      const percArray = Object.entries(percentageSplits).map(([uid, p]) => ({
        user: uid,
        percentage: parseFloat(p) || 0
      }))
      const totalPerc = percArray.reduce((acc, p) => acc + p.percentage, 0)
      if (Math.abs(totalPerc - 100) > 0.01) {
        setModalError(`Percentages must sum to 100% (currently ${totalPerc}%)`)
        setModalLoading(false)
        return
      }
      payload.splits = percArray
    }

    try {
      if (editingExpenseId) {
        await client.put(`/groups/${groupId}/expenses/${editingExpenseId}`, payload)
      } else {
        await client.post(`/groups/${groupId}/expenses`, payload)
      }
      setShowAddModal(false)
      setEditingExpenseId(null)
      await fetchGroupAndExpenses()
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to save expense')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    const exp = expenses.find((e) => e._id === expenseId)
    const creatorId = exp?.createdBy?._id || exp?.createdBy || exp?.paidBy?._id || exp?.paidBy
    if (creatorId && creatorId !== user?._id) {
      alert('Only the member who added this expense can delete it')
      return
    }
    if (!window.confirm('Delete this expense? Balances and pending settlements will update immediately.')) return
    try {
      await client.delete(`/groups/${groupId}/expenses/${expenseId}`)
      await fetchGroupAndExpenses()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  const openEditGroup = () => {
    if (!group || !isCreator) return
    setEditGroupName(group.name || '')
    setEditGroupDesc(group.description || '')
    setGroupModalError('')
    setShowEditGroupModal(true)
  }

  const handleUpdateGroup = async (e) => {
    e.preventDefault()
    if (!isCreator) return
    setGroupModalError('')
    setGroupModalLoading(true)
    try {
      await client.patch(`/groups/${groupId}`, {
        name: editGroupName,
        description: editGroupDesc
      })
      setShowEditGroupModal(false)
      await fetchGroupAndExpenses()
    } catch (err) {
      setGroupModalError(err.response?.data?.message || 'Failed to update group')
    } finally {
      setGroupModalLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!isCreator) return
    if (!window.confirm(`Permanently delete group "${group?.name}"? All expenses and debts will be erased.`)) return
    try {
      await client.delete(`/groups/${groupId}`)
      navigate('/groups')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group')
    }
  }

  const isCreator = (group?.createdBy?._id || group?.createdBy) === user?._id

  const categoryStyles = {
    rent: 'bg-[#F1F5F9] text-[#0F172A]',
    wifi: 'bg-[#EFF6FF] text-[#1D4ED8]',
    groceries: 'bg-[#F0FDF4] text-[#15803D]',
    utilities: 'bg-[#FFFBEB] text-[#B45309]',
    food: 'bg-[#FEF2F2] text-[#B91C1C]',
    travel: 'bg-[#FAF5FF] text-[#7E22CE]',
    other: 'bg-[#F8FAFC] text-[#475569]'
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1120px] w-full mx-auto px-6 py-6 space-y-6">
        <nav className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <Link to="/groups" className="hover:text-[#0F172A] transition-colors">Groups</Link>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#0F172A] font-semibold">{group?.name || 'Group'}</span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-[#64748B]">Expenses</span>
        </nav>

        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl tracking-tight text-[#0F172A]">
                {group?.name || 'Group Expenses'}
              </h1>
              <span className="bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] px-2 py-0.5 rounded-[4px] text-xs font-semibold">
                {group?.members?.length || 0} Members
              </span>
              {isCreator && (
                <>
                  <button
                    type="button"
                    onClick={openEditGroup}
                    title="Edit group details (Creator only)"
                    className="text-[#64748B] hover:text-[#0F172A] p-1 rounded hover:bg-[#F1F5F9] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    title="Delete group (Creator only)"
                    className="text-[#64748B] hover:text-[#DC2626] p-1 rounded hover:bg-[#FEF2F2] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </>
              )}
            </div>
            {group?.description && (
              <p className="text-sm text-[#64748B]">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>+ Add Expense</span>
            </button>
          </div>
        </section>

        <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-sm">
          <Link
            to={`/groups/${groupId}/expenses`}
            className="pb-3 text-[#0F172A] font-semibold border-b-2 border-[#0F172A]"
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
            className="pb-3 text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
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
            <span>Loading expense records...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-[#F1F5F9] rounded-[8px] flex items-center justify-center mx-auto text-[#64748B]">
              <span className="material-symbols-outlined text-[28px]">receipt</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0F172A]">No Expenses Logged</h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                No active expenses recorded for this group. Add an expense to begin tracking balances.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Log First Expense</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Description</th>
                    <th className="py-3 px-5">Category</th>
                    <th className="py-3 px-5">Paid By</th>
                    <th className="py-3 px-5 text-right">Total Amount</th>
                    <th className="py-3 px-5 text-right">Your Share</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
                  {expenses.map((exp) => {
                    const mySplit = exp.splits?.find((s) => (s.user?._id || s.user) === user?._id)
                    const isPayer = (exp.paidBy?._id || exp.paidBy) === user?._id
                    const dateFormatted = new Date(exp.date || exp.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })

                    const creatorId = exp.createdBy?._id || exp.createdBy || exp.paidBy?._id || exp.paidBy
                    const canModify = creatorId === user?._id

                    return (
                      <tr key={exp._id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-5 font-mono text-xs text-[#64748B]">
                          {dateFormatted}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-[#0F172A]">{exp.description}</div>
                          <div className="text-xs text-[#64748B] capitalize">{exp.expenseType} · {exp.splitType} split</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-block px-2 py-0.5 rounded-[4px] text-xs font-medium uppercase tracking-wider ${categoryStyles[exp.category] || categoryStyles.other}`}>
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-[#0F172A]">
                            {isPayer ? 'You' : exp.paidBy?.name || 'Unknown'}
                          </div>
                          {exp.paidBy?.upiId && (
                            <div className="font-mono text-[11px] text-[#64748B]">{exp.paidBy.upiId}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                          {formatINR(exp.amountPaise)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs">
                          {mySplit ? (
                            <span className="text-[#0F172A] font-medium">{formatINR(mySplit.amountPaise)}</span>
                          ) : (
                            <span className="text-[#94A3B8]">₹0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {canModify ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditExpenseModal(exp)}
                                className="border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155] px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors"
                                title="Edit expense details"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="border border-[#E2E8F0] hover:border-[#EF4444] text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors"
                                title="Soft delete expense"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94A3B8] font-mono select-none">—</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 overflow-y-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[540px] p-6 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">
                  {editingExpenseId ? 'Edit Group Expense' : 'Add Group Expense'}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Enter details and select split distribution for group members.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingExpenseId(null)
                }}
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

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. WiFi Bill - ACT Fibernet"
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A] placeholder-[#94A3B8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    placeholder="e.g. 1199.00"
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 font-mono text-sm text-[#0F172A] placeholder-[#94A3B8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A]"
                  >
                    {group?.members?.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m._id === user?._id ? `${m.name} (You)` : m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A]"
                  >
                    <option value="food">Food</option>
                    <option value="groceries">Groceries</option>
                    <option value="rent">Rent</option>
                    <option value="wifi">WiFi / Internet</option>
                    <option value="utilities">Utilities</option>
                    <option value="travel">Travel</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                    Expense Frequency
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A]"
                  >
                    <option value="one-off">One-off Expense</option>
                    <option value="recurring">Recurring Monthly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Split Method
                </label>
                <div className="flex border border-[#E2E8F0] rounded-[6px] overflow-hidden text-xs font-semibold">
                  {['equal', 'percentage', 'custom'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSplitType(st)}
                      className={`flex-1 py-2 text-center capitalize transition-colors ${
                        splitType === st
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-white text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {splitType === 'equal' && (
                  <p className="text-xs text-[#64748B] pt-1">
                    Split equally across all {group?.members?.length || 0} members.
                  </p>
                )}

                {splitType === 'percentage' && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-[#64748B]">Assign percentage per member (must sum to 100%):</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {group?.members?.map((m) => (
                        <div key={m._id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-[#0F172A] font-medium truncate">{m.name}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={percentageSplits[m._id] || ''}
                              onChange={(e) => setPercentageSplits({ ...percentageSplits, [m._id]: e.target.value })}
                              className="w-20 bg-white border border-[#E2E8F0] rounded-[4px] px-2 py-1 text-right font-mono"
                            />
                            <span>%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {splitType === 'custom' && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-[#64748B]">Assign exact amounts in ₹ (must sum to ₹{amountRupees || '0'}):</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {group?.members?.map((m) => (
                        <div key={m._id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-[#0F172A] font-medium truncate">{m.name}</span>
                          <div className="flex items-center gap-1">
                            <span>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={customSplits[m._id] || ''}
                              onChange={(e) => setCustomSplits({ ...customSplits, [m._id]: e.target.value })}
                              className="w-24 bg-white border border-[#E2E8F0] rounded-[4px] px-2 py-1 text-right font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingExpenseId(null)
                  }}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[460px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">Edit Group Settings</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Update group title or description.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditGroupModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {groupModalError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-2.5 text-xs text-[#B91C1C]">
                {groupModalError}
              </div>
            )}

            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] h-[38px] px-3 text-sm text-[#0F172A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] focus:border-[#0F172A] focus:outline-none rounded-[6px] p-3 text-sm text-[#0F172A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={groupModalLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {groupModalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
