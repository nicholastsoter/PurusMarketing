import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import StatusBadge from './StatusBadge'
import NicheTag from './NicheTag'
import { isHttpUrl } from '../lib/url'

export default function ContactTable() {
  const contacts = useStore((s) => s.contacts)
  const openContact = useStore((s) => s.openContact)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const sorted = useMemo(() => {
    if (!sort.key) return contacts
    const copy = [...contacts]
    copy.sort((a, b) => {
      const av = (a[sort.key] || '').toString().toLowerCase()
      const bv = (b[sort.key] || '').toString().toLowerCase()
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [contacts, sort])

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  if (!contacts.length) return <EmptyState />

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-warm-200/70 text-left">
            <Th label="Name" />
            <Th label="Platform" />
            <Th label="Niche" sortKey="niche" sort={sort} onSort={toggleSort} />
            <Th label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
            <Th label="Followers" />
            <Th label="Offer Code" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.id}
              onClick={() => openContact(c.id)}
              className="border-b border-warm-100 last:border-0 hover:bg-warm-50 cursor-pointer transition"
            >
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="font-medium text-[#1D1D1F]">{c.name}</p>
                {c.handle_or_url && (
                  isHttpUrl(c.handle_or_url) ? (
                    <a
                      href={c.handle_or_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-accent-500 hover:text-accent-600 hover:underline transition"
                    >
                      {c.handle_or_url.replace(/^https?:\/\//i, '')}
                    </a>
                  ) : (
                    <p className="text-xs text-[#A9A9AD]">{c.handle_or_url}</p>
                  )
                )}
              </td>
              <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">{c.platform}</td>
              <td className="px-5 py-3.5"><NicheTag niche={c.niche} /></td>
              <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
              <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">
                {c.follower_count != null ? c.follower_count.toLocaleString() : '—'}
              </td>
              <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">{c.offer_code || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ label, sortKey, sort, onSort }) {
  const active = sort?.key === sortKey
  return (
    <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide whitespace-nowrap">
      {sortKey ? (
        <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-[#6E6E73] transition">
          {label}
          {active && <span>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
        </button>
      ) : (
        label
      )}
    </th>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
      <p className="text-sm text-[#6E6E73]">No contacts yet. Add your first one to get started.</p>
    </div>
  )
}
