// Server-only Apify integration — never import this from client code (src/).
// Reads APIFY_API_TOKEN from process.env, which must NOT be prefixed with
// VITE_ or it would get inlined into the public browser bundle.

const ACTOR_IDS = {
  Instagram: 'apify/instagram-hashtag-scraper',
  TikTok: 'clockworks/tiktok-scraper',
  YouTube: 'streamers/youtube-scraper',
}

// Instagram-only: Apify's official hashtag analytics actor is well-documented
// and maintained by Apify itself. TikTok's equivalents are all third-party
// actors from different, less-established publishers with no clear "best"
// pick, so this stays scoped to Instagram rather than guessing at one.
const HASHTAG_ANALYTICS_ACTOR = 'apify/instagram-hashtag-analytics-scraper'

function badRequest(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

// Apify's REST API takes actor ids as "owner~name" in URL paths.
function actorPath(actorId) {
  return actorId.replace('/', '~')
}

async function apifyFetch(url, options = {}) {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw Object.assign(new Error('Apify is not configured — set APIFY_API_TOKEN in your environment.'), { statusCode: 500 })

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let message = `Apify request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error?.message) message = body.error.message
    } catch { /* non-JSON error body */ }
    if (res.status === 429) message = 'Apify rate limit reached — wait a moment and try again.'
    if (res.status === 401) message = 'Apify rejected the API token — check APIFY_API_TOKEN.'
    throw Object.assign(new Error(message), { statusCode: res.status >= 400 && res.status < 600 ? res.status : 502 })
  }

  return res.json()
}

// US-only support differs by platform, not just a flag: Instagram's actor has
// no geo input at all; TikTok has a documented proxyCountryCode field that
// actually changes what gets scraped; YouTube's actor has no reliable geo
// input (a community issue thread on the actor reports its gl= URL trick
// doesn't change results) — so YouTube is filtered after the fact instead,
// using the channelLocation field its output already includes.
function buildActorInput(platform, searchTerm, { usOnly } = {}) {
  const term = searchTerm.replace(/^#/, '').trim()
  if (platform === 'Instagram') return { hashtags: [term], resultsType: 'posts', resultsLimit: 30 }
  if (platform === 'TikTok') {
    const input = { hashtags: [term], resultsPerPage: 30 }
    if (usOnly) input.proxyCountryCode = 'US'
    return input
  }
  if (platform === 'YouTube') return { searchQueries: [term], maxResults: 30 }
  throw badRequest(`Unsupported platform: ${platform}`)
}

export async function startRun(platform, searchTerm, usOnly) {
  if (!searchTerm || !searchTerm.trim()) throw badRequest('Enter a hashtag or keyword to search.')
  const actorId = ACTOR_IDS[platform]
  if (!actorId) throw badRequest(`Unsupported platform: ${platform}`)

  const input = buildActorInput(platform, searchTerm, { usOnly })
  const { data } = await apifyFetch(`https://api.apify.com/v2/acts/${actorPath(actorId)}/runs`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return { runId: data.id, datasetId: data.defaultDatasetId, status: data.status }
}

export async function getRunStatus(runId) {
  if (!runId) throw badRequest('runId is required.')
  const { data } = await apifyFetch(`https://api.apify.com/v2/actor-runs/${runId}`)
  return { status: data.status, datasetId: data.defaultDatasetId }
}

export async function getResults(datasetId, platform) {
  if (!datasetId) throw badRequest('datasetId is required.')
  const items = await apifyFetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`)
  return normalize(platform, Array.isArray(items) ? items : [])
}

export async function startHashtagRun(term) {
  if (!term || !term.trim()) throw badRequest('Enter a niche keyword or hashtag to research.')
  const clean = term.replace(/^#/, '').trim()
  const { data } = await apifyFetch(`https://api.apify.com/v2/acts/${actorPath(HASHTAG_ANALYTICS_ACTOR)}/runs`, {
    method: 'POST',
    body: JSON.stringify({ hashtags: [clean] }),
  })
  return { runId: data.id, datasetId: data.defaultDatasetId, status: data.status }
}

export async function getHashtagResults(datasetId) {
  if (!datasetId) throw badRequest('datasetId is required.')
  const items = await apifyFetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true`)
  return normalizeHashtagAnalytics(Array.isArray(items) ? items : [])
}

// Each platform's raw dataset items get collapsed to one row per unique
// creator (hashtag/search results are per-post or per-video, so the same
// profile often shows up multiple times) in a shape the CRM can insert directly.
function normalize(platform, items) {
  if (platform === 'Instagram') return normalizeInstagram(items)
  if (platform === 'TikTok') return normalizeTikTok(items)
  if (platform === 'YouTube') return normalizeYouTube(items)
  return []
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/

// Creators commonly list a business/collab email in their bio or channel
// description; this is a best-effort scrape of whatever text we already have
// (no extra API calls). Instagram's hashtag scraper only gives us post
// captions, not the poster's bio, so a hit there is rare but still checked.
function extractEmail(text) {
  const match = text && String(text).match(EMAIL_RE)
  return match ? match[0] : null
}

function normalizeInstagram(items) {
  const seen = new Map()
  for (const item of items) {
    const handle = item.ownerUsername
    if (!handle || seen.has(handle)) continue
    const rawText = item.caption || ''
    seen.set(handle, {
      externalId: item.ownerId || handle,
      name: item.ownerFullName || handle,
      handle,
      handleOrUrl: `https://instagram.com/${handle}`,
      // The hashtag scraper returns posts, not profile stats — Instagram
      // doesn't expose follower count here without a second profile lookup.
      followerCount: null,
      bio: rawText.slice(0, 160),
      email: extractEmail(rawText),
    })
  }
  return [...seen.values()]
}

function normalizeTikTok(items) {
  const seen = new Map()
  for (const item of items) {
    const author = item.authorMeta
    if (!author?.name || seen.has(author.name)) continue
    const rawText = author.signature || ''
    seen.set(author.name, {
      externalId: author.id || author.name,
      name: author.nickName || author.name,
      handle: author.name,
      handleOrUrl: `https://www.tiktok.com/@${author.name}`,
      followerCount: typeof author.fans === 'number' ? author.fans : null,
      bio: rawText,
      email: extractEmail(rawText),
    })
  }
  return [...seen.values()]
}

// The analytics actor groups suggestions into several buckets (related,
// frequent, average, rare, and semantic variants of each) — merged here into
// one deduplicated, volume-ranked list rather than showing 7 separate
// categories, which would be exactly the dense/cluttered layout we're
// avoiding elsewhere in this app.
const HASHTAG_SUGGESTION_KEYS = ['related', 'frequent', 'average', 'rare', 'relatedFrequent', 'relatedAverage', 'relatedRare']

// Volumes come back as formatted strings (e.g. "1.96 g", "234.5 k") rather
// than raw numbers — parsed only for sorting; the original label is still
// shown to the user since the exact magnitude convention isn't guaranteed.
function parseVolume(label) {
  if (label == null) return null
  const match = String(label).trim().match(/^([\d.]+)\s*([kmgb])?$/i)
  if (!match) return null
  const num = parseFloat(match[1])
  if (Number.isNaN(num)) return null
  const suffix = (match[2] || '').toLowerCase()
  const mult = suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'g' || suffix === 'b' ? 1e9 : 1
  return num * mult
}

function normalizeHashtagAnalytics(items) {
  const seed = items[0]
  if (!seed) return { postsCount: null, postsLabel: null, suggestions: [] }

  const seen = new Map()
  for (const key of HASHTAG_SUGGESTION_KEYS) {
    const list = Array.isArray(seed[key]) ? seed[key] : []
    for (const entry of list) {
      const rawHash = entry?.hash ?? entry?.hashtag ?? entry?.name
      if (!rawHash) continue
      const hashtag = String(rawHash).replace(/^#/, '')
      if (!hashtag || seen.has(hashtag)) continue
      const label = entry?.info ?? entry?.count ?? null
      seen.set(hashtag, { hashtag, label: label != null ? String(label) : null, volume: parseVolume(label) })
    }
  }

  const suggestions = [...seen.values()].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))
  return {
    postsCount: typeof seed.postsCount === 'number' ? seed.postsCount : null,
    postsLabel: seed.posts ?? null,
    suggestions,
  }
}

function normalizeYouTube(items) {
  const seen = new Map()
  for (const item of items) {
    const handle = item.channelName
    if (!handle || seen.has(handle)) continue
    const rawText = item.channelDescription || ''
    seen.set(handle, {
      externalId: item.channelUrl || handle,
      name: handle,
      handle,
      handleOrUrl: item.channelUrl || '',
      followerCount: typeof item.numberOfSubscribers === 'number' ? item.numberOfSubscribers : null,
      bio: rawText.slice(0, 160),
      email: extractEmail(rawText),
      // Only some channels set this in their About page — used for the
      // client-side "US only" filter, since there's no reliable way to
      // ask this actor for US results directly.
      location: item.channelLocation || null,
    })
  }
  return [...seen.values()]
}
