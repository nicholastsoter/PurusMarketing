export default function NicheTag({ niche }) {
  if (!niche) return null
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warm-100 text-[#6E6E73]">
      {niche}
    </span>
  )
}
