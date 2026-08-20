// Server-only Apify integration — never import this from client code (src/).
// Reads APIFY_API_TOKEN from process.env, which must NOT be prefixed with
// VITE_ or it would get inlined into the public browser bundle.

const ACTOR_IDS = {
  Instagram: 'apify/instagram-hashtag-scraper',
  TikTok: 'clockworks/tiktok-scraper',
  YouTube: 'streamers/youtube-scraper',
}

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

function buildActorInput(platform, searchTerm) {
  const term = searchTerm.replace(/^#/, '').trim()
  if (platform === 'Instagram') return { hashtags: [term], resultsType: 'posts', resultsLimit: 30 }
  if (platform === 'TikTok') return { hashtags: [term], resultsPerPage: 30 }
  if (platform === 'YouTube') return { searchQueries: [term], maxResults: 30 }
  throw badRequest(`Unsupported platform: ${platform}`)
}

export async function startRun(platform, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) throw badRequest('Enter a hashtag or keyword to search.')
  const actorId = ACTOR_IDS[platform]
  if (!actorId) throw badRequest(`Unsupported platform: ${platform}`)

  const input = buildActorInput(platform, searchTerm)
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

// Each platform's raw dataset items get collapsed to one row per unique
// creator (hashtag/search results are per-post or per-video, so the same
// profile often shows up multiple times) in a shape the CRM can insert directly.
function normalize(platform, items) {
  if (platform === 'Instagram') return normalizeInstagram(items)
  if (platform === 'TikTok') return normalizeTikTok(items)
  if (platform === 'YouTube') return normalizeYouTube(items)
  return []
}

function normalizeInstagram(items) {
  const seen = new Map()
  for (const item of items) {
    const handle = item.ownerUsername
    if (!handle || seen.has(handle)) continue
    seen.set(handle, {
      externalId: item.ownerId || handle,
      name: item.ownerFullName || handle,
      handle,
      handleOrUrl: `https://instagram.com/${handle}`,
      // The hashtag scraper returns posts, not profile stats — Instagram
      // doesn't expose follower count here without a second profile lookup.
      followerCount: null,
      bio: item.caption ? String(item.caption).slice(0, 160) : '',
    })
  }
  return [...seen.values()]
}

function normalizeTikTok(items) {
  const seen = new Map()
  for (const item of items) {
    const author = item.authorMeta
    if (!author?.name || seen.has(author.name)) continue
    seen.set(author.name, {
      externalId: author.id || author.name,
      name: author.nickName || author.name,
      handle: author.name,
      handleOrUrl: `https://www.tiktok.com/@${author.name}`,
      followerCount: typeof author.fans === 'number' ? author.fans : null,
      bio: author.signature || '',
    })
  }
  return [...seen.values()]
}

function normalizeYouTube(items) {
  const seen = new Map()
  for (const item of items) {
    const handle = item.channelName
    if (!handle || seen.has(handle)) continue
    seen.set(handle, {
      externalId: item.channelUrl || handle,
      name: handle,
      handle,
      handleOrUrl: item.channelUrl || '',
      followerCount: typeof item.numberOfSubscribers === 'number' ? item.numberOfSubscribers : null,
      bio: item.channelDescription ? String(item.channelDescription).slice(0, 160) : '',
    })
  }
  return [...seen.values()]
}
