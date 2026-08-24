const LABEL_STYLES = {
  High: 'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
}

export default function PriorityBadge({ score, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${LABEL_STYLES[label] || LABEL_STYLES.Low}`}>
      {label}
      <span className="opacity-70">{score}</span>
    </span>
  )
}
