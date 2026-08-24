// Outreach priority score — a heuristic, not a measure of who a creator's
// audience actually is (none of the Find Leads scrapers expose follower
// demographics). Combines two signals we do have:
//   1. Niche fit: does their niche/bio mention terms relevant to Purus?
//   2. Reach: follower count, log-scaled (so 500 vs 5,000 matters more than
//      500,000 vs 5,000,000) and weighted per platform.
// Both halves are intentionally easy to retune here as priorities change.

// Adjust freely — these are a starting point, not a measured judgment about
// which platform's followers are worth more to Purus.
export const PLATFORM_WEIGHTS = {
  Instagram: 1,
  TikTok: 1,
  YouTube: 1,
  Blog: 1,
  Press: 1,
  Other: 0.8,
}

// Matched against niche + notes (lowercased). Extend as Purus's target
// audience gets more specific.
const FIT_KEYWORDS = [
  'parent', 'mom', 'mother', 'dad', 'father', 'family', 'families',
  'kid', 'kids', 'child', 'children',
  'homeschool', 'homeschooling',
  'screen time', 'screentime', 'digital wellbeing', 'parental control',
  'faith', 'christian', 'faith-based',
  'tech review', 'tech reviewer',
]

// Log-scaled so the difference between 500 and 5,000 followers matters as
// much as the difference between 500,000 and 5,000,000 — a flat linear scale
// would make reach completely dominate the score for any account over ~50K.
function reachComponent(followerCount, platform) {
  if (followerCount == null || followerCount <= 0) return 0
  const weight = PLATFORM_WEIGHTS[platform] ?? 1
  const scaled = Math.log10(followerCount + 1) * weight
  const MAX_SCALED = Math.log10(1_000_000) // treat 1M+ (weighted) as a full-reach score
  return Math.max(0, Math.min(1, scaled / MAX_SCALED))
}

function fitComponent(contact) {
  const text = `${contact.niche || ''} ${contact.notes || ''}`.toLowerCase()
  if (!text.trim()) return 0
  const matches = FIT_KEYWORDS.filter((kw) => text.includes(kw)).length
  return Math.max(0, Math.min(1, matches / 3)) // 3+ matches = full fit score
}

// score: 0-100. label: bucket for the UI badge.
export function computePriorityScore(contact) {
  const fit = fitComponent(contact)
  const reach = reachComponent(contact.follower_count, contact.platform)
  const score = Math.round(100 * (0.5 * fit + 0.5 * reach))
  const label = score >= 66 ? 'High' : score >= 33 ? 'Medium' : 'Low'
  return { score, label }
}
