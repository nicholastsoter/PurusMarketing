const POLL_INTERVAL_MS = 2500
const MAX_POLL_MS = 120000
const TERMINAL_FAILURE_STATUSES = ['FAILED', 'ABORTED', 'TIMED-OUT']

async function requestJson(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Starts an Apify actor run through our /api/apify/* proxy and polls the
// (actor-agnostic) status endpoint until it completes, since runs are async
// and can take well past a typical serverless function's timeout. Used by
// both Find Leads and Hashtag Research, which differ only in which start/
// results endpoints they call.
export async function runApifySearch({ startUrl, startBody, resultsUrl, onProgress }) {
  const { runId, datasetId: startingDatasetId, status: startingStatus } = await requestJson(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(startBody),
  })

  let datasetId = startingDatasetId
  let status = startingStatus
  const startedAt = Date.now()

  while (status !== 'SUCCEEDED') {
    if (TERMINAL_FAILURE_STATUSES.includes(status)) {
      throw new Error(`Search ${status.toLowerCase().replace('-', ' ')} — try a different term, or check the run in your Apify dashboard.`)
    }
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new Error('This search is taking longer than expected. Check the run status in your Apify dashboard.')
    }
    onProgress?.(Math.round((Date.now() - startedAt) / 1000))
    await sleep(POLL_INTERVAL_MS)

    const next = await requestJson(`/api/apify/status?runId=${encodeURIComponent(runId)}`)
    status = next.status
    if (next.datasetId) datasetId = next.datasetId
  }

  return requestJson(resultsUrl(datasetId))
}
