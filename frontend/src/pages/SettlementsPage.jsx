import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { formatINR } from '../utils/format'

export const SettlementsPage = () => {
  const { groupId } = useParams()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [balances, setBalances] = useState([])
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeSettlement, setActiveSettlement] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const fetchBalancesAndSuggestions = async () => {
    try {
      setLoading(true)
      const [groupRes, balRes, suggRes] = await Promise.all([
        client.get(`/groups/${groupId}`),
        client.get(`/groups/${groupId}/balances`),
        client.post(`/groups/${groupId}/settlements/suggest`)
      ])
      const grp = groupRes.data.group || groupRes.data.data
      const balList = balRes.data.balances || balRes.data.data?.balances || []
      const suggData = suggRes.data.data || suggRes.data
      const txns = suggData?.transactions || suggData?.settlements || []
      const solverMethod = suggData?.solverMethod || suggData?.solverUsed || suggData?.summary?.solverUsed || 'optimal'

      setGroup(grp)
      setBalances(balList)
      setSuggestion({
        ...suggData,
        transactions: txns,
        settlements: txns,
        solverMethod,
      })
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to compute settlement graph')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalancesAndSuggestions()
  }, [groupId])

  const generateUpiUri = (payee, amountPaise) => {
    const vpa = payee?.upiId || 'merchant@upi'
    const name = encodeURIComponent(payee?.name || 'Group Member')
    const rupees = (amountPaise / 100).toFixed(2)
    return `upi://pay?pa=${vpa}&pn=${name}&am=${rupees}&cu=INR&tn=MinSettle%20Settlement`
  }

  const handleConfirmPaid = async () => {
    if (!activeSettlement) return
    const payerId = activeSettlement.payer?._id || activeSettlement.payer
    if (payerId !== user?._id) {
      setConfirmError('Only the payer who owes this amount can confirm payment.')
      return
    }
    setConfirmError('')
    setConfirmLoading(true)
    try {
      await client.post(`/groups/${groupId}/settlements/confirm`, {
        settlementId: activeSettlement._id,
        payer: activeSettlement.payer?._id || activeSettlement.payer,
        payee: activeSettlement.payee?._id || activeSettlement.payee,
        amountPaise: activeSettlement.amountPaise,
        method: 'upi'
      })
      setActiveSettlement(null)
      await fetchBalancesAndSuggestions()
    } catch (err) {
      setConfirmError(err.response?.data?.message || 'Failed to confirm settlement')
    } finally {
      setConfirmLoading(false)
    }
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
          <span className="text-[#64748B]">Balances & Settlements</span>
        </nav>

        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="space-y-1">
            <h1 className="font-bold text-2xl tracking-tight text-[#0F172A]">
              Balances & Settlements
            </h1>
            <p className="text-sm text-[#64748B]">
              Track member balances and settle group dues with minimized transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchBalancesAndSuggestions}
            className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-3.5 py-2 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Recalculate</span>
          </button>
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
            className="pb-3 text-[#0F172A] font-semibold border-b-2 border-[#0F172A]"
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
            <span>Calculating settlement plan...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#475569]">account_balance</span>
                  <h2 className="font-bold text-base text-[#0F172A]">Current Net Balances</h2>
                </div>
                <span className="text-xs text-[#64748B]">Group breakdown</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {balances.map((b) => {
                  const isPositive = b.netBalancePaise > 0
                  const isNegative = b.netBalancePaise < 0
                  const isMe = (b.user?._id || b.user) === user?._id

                  return (
                    <div
                      key={b.user?._id || b.user}
                      className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#0F172A] truncate">
                          {b.user?.name || 'Member'} {isMe && '(You)'}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-[9999px] ${
                            isPositive
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : isNegative
                              ? 'bg-[#FEE2E2] text-[#B91C1C]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {isPositive ? 'Gets Paid' : isNegative ? 'Owes' : 'Settled'}
                        </span>
                      </div>
                      <div className="font-mono text-lg font-bold tabular-nums text-[#0F172A]">
                        {formatINR(Math.abs(b.netBalancePaise))}
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                        <span>Paid: {formatINR(b.totalPaidPaise || 0)}</span>
                        <span>Owed: {formatINR(b.totalOwedPaise || 0)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[8px] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#475569]">alt_route</span>
                  <h2 className="font-bold text-base text-[#0F172A]">Simplified Settlement Plan</h2>
                </div>
                <div className="text-xs font-mono text-[#64748B] flex items-center gap-2">
                  <span>Transactions needed:</span>
                  <span className="font-bold text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-[4px] border border-[#E2E8F0]">
                    {suggestion?.transactions?.length || 0}
                  </span>
                </div>
              </div>

              {suggestion?.transactions?.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#15803D] bg-[#F0FDF4] border border-[#DCFCE7] rounded-[6px] space-y-1">
                  <span className="material-symbols-outlined text-[24px]">task_alt</span>
                  <p className="font-semibold">All Balances Settled</p>
                  <p className="text-xs text-[#166534]">No peer transfers are needed right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestion?.transactions?.map((tx, idx) => {
                    const isPayerMe = (tx.payer?._id || tx.payer) === user?._id
                    const isPayeeMe = (tx.payee?._id || tx.payee) === user?._id

                    return (
                      <div
                        key={tx._id || idx}
                        className="border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[4px] bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                              <span>{isPayerMe ? 'You' : tx.payer?.name || 'Member'}</span>
                              <span className="material-symbols-outlined text-[16px] text-[#64748B]">arrow_forward</span>
                              <span>{isPayeeMe ? 'You' : tx.payee?.name || 'Member'}</span>
                            </div>
                            <div className="text-xs text-[#64748B] font-mono mt-0.5">
                              Payee UPI: {tx.payee?.upiId || 'No UPI ID registered'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <div className="font-mono text-base font-bold text-[#0F172A] tabular-nums">
                              {formatINR(tx.amountPaise)}
                            </div>
                            <div className="text-[11px] text-[#64748B]">Direct UPI Transfer</div>
                          </div>

                          {isPayerMe ? (
                            <button
                              type="button"
                              onClick={() => setActiveSettlement(tx)}
                              className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
                              <span>Pay & Settle</span>
                            </button>
                          ) : (
                            <span
                              className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 select-none"
                              title="Only the member who owes this amount can pay and confirm it"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              <span>Payer Only</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {activeSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40">
          <div className="bg-white border border-[#E2E8F0] rounded-[8px] w-full max-w-[500px] p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">UPI Settlement</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Direct peer-to-peer transfer via standard NPCI UPI link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSettlement(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {confirmError && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] p-2.5 text-xs text-[#B91C1C]">
                {confirmError}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] p-4 text-center space-y-1">
                <div className="text-xs font-medium text-[#64748B] uppercase">Transfer Amount</div>
                <div className="font-mono text-2xl font-bold text-[#0F172A]">
                  {formatINR(activeSettlement.amountPaise)}
                </div>
                <div className="text-xs text-[#64748B]">
                  From <strong className="text-[#0F172A]">{activeSettlement.payer?.name}</strong> to{' '}
                  <strong className="text-[#0F172A]">{activeSettlement.payee?.name}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569] block">
                  Payee UPI ID
                </label>
                <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-[6px] p-2.5 font-mono text-xs font-semibold text-[#0F172A] select-all">
                  {activeSettlement.payee?.upiId || 'No UPI ID set'}
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={generateUpiUri(activeSettlement.payee, activeSettlement.amountPaise)}
                  className="flex-1 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] py-2 rounded-[6px] text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Open UPI App</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      generateUpiUri(activeSettlement.payee, activeSettlement.amountPaise)
                    )
                    alert('UPI Link copied to clipboard!')
                  }}
                  className="border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] px-3 py-2 rounded-[6px] text-xs font-medium transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setActiveSettlement(null)}
                className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-[6px] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={handleConfirmPaid}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {confirmLoading && (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    progress_activity
                  </span>
                )}
                <span>Mark as Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
