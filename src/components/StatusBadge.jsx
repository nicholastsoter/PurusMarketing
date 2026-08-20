export const STATUS_STYLES = {
  Identified: 'bg-slate-100 text-slate-600',
  Contacted: 'bg-blue-50 text-blue-600',
  Negotiating: 'bg-amber-50 text-amber-700',
  Agreed: 'bg-emerald-50 text-emerald-700',
  Posted: 'bg-violet-50 text-violet-700',
  Tracking: 'bg-rose-50 text-rose-600',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}
