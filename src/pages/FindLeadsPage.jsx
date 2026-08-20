import { useState } from 'react'
import { useStore } from '../store/useStore'
import { SEARCH_PLATFORMS } from '../lib/constants'

const inputCls = 'rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#A9A9AD] focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-accent-400 transition'
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

export default function FindLeadsPage() {
  const bulkAddContacts = useStore((s) => s.bulkAddContacts)

  const [platform, setPlatform] = useState('Instagram')
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const runSearch = async (e) => {
    e.preventDefault()
    if (!term.trim() || loading) return

    setLoading(true)
    setError('')
    setResults(null)
    setSelected(new Set())
    setStatusMessage('Starting search…')

    try {
      const { runId, datasetId: startingDatasetId, status: startingStatus } = await requestJson('/api/apify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, searchTerm: term.trim() }),
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
        setStatusMessage(`Searching ${platform} for "${term.trim()}"… (${Math.round((Date.now() - startedAt) / 1000)}s)`)
        await sleep(POLL_INTERVAL_MS)

        const next = await requestJson(`/api/apify/status?runId=${encodeURIComponent(runId)}`)
        status = next.status
        if (next.datasetId) datasetId = next.datasetId
      }

      setStatusMessage('Fetching results…')
      const { items } = await requestJson(`/api/apify/results?datasetId=${encodeURIComponent(datasetId)}&platform=${encodeURIComponent(platform)}`)
      setResults(items)
      setStatusMessage(items.length ? '' : 'No results found for that search.')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!results?.length) return
    setSelected((prev) => (prev.size === results.length ? new Set() : new Set(results.map((r) => r.externalId))))
  }

  const addSelected = async () => {
    if (!results?.length || !selected.size) return
    setAdding(true)
    setError('')
    const rows = results
      .filter((r) => selected.has(r.externalId))
      .map((r) => ({
        name: r.name || r.handle,
        platform,
        handle_or_url: r.handleOrUrl,
        follower_count: r.followerCount,
        niche: '',
        status: 'Identified',
        offer_code: null,
        contact_info: '',
        notes: r.bio ? `Bio: ${r.bio}` : '',
      }))
    try {
      await bulkAddContacts(rows)
      setResults((prev) => prev.filter((r) => !selected.has(r.externalId)))
      setSelected(new Set())
    } catch (err) {
      setError(err.message || 'Failed to add contacts.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Find Leads</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">Search a hashtag or keyword to discover creators, then add the ones you like to the CRM.</p>
      </div>

      <form onSubmit={runSearch} className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[#6E6E73]">Platform</span>
          <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)} disabled={loading}>
            {SEARCH_PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[220px] space-y-1.5">
          <span className="block text-xs font-medium text-[#6E6E73]">Hashtag or keyword</span>
          <input
            className={`${inputCls} w-full`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="homeschoolmom"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !term.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full border-2 border-accent-200 border-t-accent-500 animate-spin" />
          <p className="text-sm text-[#6E6E73]">{statusMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {!loading && !error && results && results.length === 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
          <p className="text-sm text-[#6E6E73]">No results found for that search. Try a different hashtag or keyword.</p>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#6E6E73]">
              <input type="checkbox" checked={selected.size === results.length} onChange={toggleAll} />
              {selected.size ? `${selected.size} selected` : 'Select all'}
            </label>
            <button
              onClick={addSelected}
              disabled={!selected.size || adding}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition disabled:opacity-50"
            >
              {adding ? 'Adding…' : `Add Selected to CRM${selected.size ? ` (${selected.size})` : ''}`}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-200/70 text-left">
                  <th className="px-5 py-3 w-8" />
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Handle</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Followers</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Bio</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.externalId}
                    onClick={() => toggleOne(r.externalId)}
                    className="border-b border-warm-100 last:border-0 hover:bg-warm-50 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.externalId)} onChange={() => toggleOne(r.externalId)} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="font-medium text-[#1D1D1F]">{r.name}</p>
                      <p className="text-xs text-[#A9A9AD]">@{r.handle}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">
                      {r.followerCount != null ? r.followerCount.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] max-w-sm truncate">{r.bio || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
