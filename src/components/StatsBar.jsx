import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { STATUSES } from '../lib/constants'
import { STATUS_STYLES } from './StatusBadge'

export default function StatsBar() {
  const contacts = useStore((s) => s.contacts)

  const { total, withOffer, byStatus } = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    let withOffer = 0
    for (const c of contacts) {
      if (byStatus[c.status] !== undefined) byStatus[c.status]++
      if (c.offer_code) withOffer++
    }
    return { total: contacts.length, withOffer, byStatus }
  }, [contacts])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Total Contacts" value={total} />
      <StatCard
        label="With Offer Code"
        value={withOffer}
        sub={total ? `${Math.round((withOffer / total) * 100)}% of total` : null}
      />
      <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5">
        <p className="text-xs font-medium text-[#A9A9AD] uppercase tracking-wide mb-3">By Stage</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s]}`}>
              {s}
              <span className="opacity-70">{byStatus[s]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5 flex flex-col justify-center">
      <p className="text-xs font-medium text-[#A9A9AD] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">{value}</p>
      {sub && <p className="text-xs text-[#A9A9AD] mt-1">{sub}</p>}
    </div>
  )
}
