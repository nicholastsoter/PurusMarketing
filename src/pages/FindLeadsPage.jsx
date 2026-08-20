import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { SEARCH_PLATFORMS } from '../lib/constants'
import { runApifySearch } from '../lib/apifyClient'

const inputCls = 'rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#A9A9AD] focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-accent-400 transition'

// Best-effort match against whatever format Apify's channelLocation field
// comes back in — not guaranteed to be an exact code or spelled-out name.
function isUsLocation(location) {
  if (!location) return false
  const normalized = String(location).trim().toLowerCase()
  return normalized === 'us' || normalized === 'usa' || normalized.includes('united states')
}

export default function FindLeadsPage() {
  const bulkAddContacts = useStore((s) => s.bulkAddContacts)
  const fetchKnownHandles = useStore((s) => s.fetchKnownHandles)
  const rejectLead = useStore((s) => s.rejectLead)
  const [searchParams] = useSearchParams()

  // State below lives in the global store (not local useState) so it
  // survives navigating to another tab and back — React Router unmounts
  // this page, which would otherwise silently discard search results the
  // user already spent Apify credits on.
  const platform = useStore((s) => s.leadsPlatform)
  const term = useStore((s) => s.leadsTerm)
  const loading = useStore((s) => s.leadsLoading)
  const adding = useStore((s) => s.leadsAdding)
  const statusMessage = useStore((s) => s.leadsStatusMessage)
  const error = useStore((s) => s.leadsError)
  const results = useStore((s) => s.leadsResults)
  const selected = useStore((s) => s.leadsSelected)
  const minFollowers = useStore((s) => s.leadsMinFollowers)
  const maxFollowers = useStore((s) => s.leadsMaxFollowers)
  const usOnly = useStore((s) => s.leadsUsOnly)
  const allDuplicates = useStore((s) => s.leadsAllDuplicates)
  const rejectingId = useStore((s) => s.leadsRejectingId)

  // Supports the handoff from Hashtag Research ("Search in Find Leads"),
  // which links here with ?platform=&term= pre-filled. Only applies when
  // those params are actually present — a plain click on the Find Leads
  // nav tab carries none, and must leave whatever's already persisted alone.
  useEffect(() => {
    const p = searchParams.get('platform')
    const t = searchParams.get('term')
    const patch = {}
    if (p && SEARCH_PLATFORMS.includes(p)) patch.leadsPlatform = p
    if (t) patch.leadsTerm = t
    if (Object.keys(patch).length) useStore.setState(patch)
  }, [searchParams])

  const visibleResults = useMemo(() => {
    if (!results) return results
    // Instagram results never have a follower count, so a leftover min/max
    // from a previous TikTok/YouTube search must not silently zero these out.
    if (platform === 'Instagram') return results

    let filtered = results
    // TikTok's "US only" is applied at search time (proxyCountryCode), so
    // there's nothing to filter here. YouTube has no reliable input-level
    // geo option, so it's filtered here using each channel's About-page
    // location — channels that never set one are excluded rather than
    // guessed in, same reasoning as the follower-count filter below.
    if (platform === 'YouTube' && usOnly) {
      filtered = filtered.filter((r) => isUsLocation(r.location))
    }

    const min = minFollowers === '' ? null : Number(minFollowers)
    const max = maxFollowers === '' ? null : Number(maxFollowers)
    if (min == null && max == null) return filtered
    return filtered.filter((r) => {
      if (r.followerCount == null) return false
      if (min != null && r.followerCount < min) return false
      if (max != null && r.followerCount > max) return false
      return true
    })
  }, [results, minFollowers, maxFollowers, platform, usOnly])

  const runSearch = async (e) => {
    e.preventDefault()
    if (!term.trim() || loading) return

    useStore.setState({
      leadsLoading: true,
      leadsError: '',
      leadsResults: null,
      leadsSelected: new Set(),
      leadsAllDuplicates: false,
      leadsStatusMessage: 'Starting search…',
    })

    try {
      const { items } = await runApifySearch({
        startUrl: '/api/apify/start',
        startBody: { platform, searchTerm: term.trim(), usOnly },
        resultsUrl: (datasetId) => `/api/apify/results?datasetId=${encodeURIComponent(datasetId)}&platform=${encodeURIComponent(platform)}`,
        onProgress: (s) => useStore.setState({ leadsStatusMessage: `Searching ${platform} for "${term.trim()}"… (${s}s)` }),
      })

      // Excludes anyone already in the CRM (by exact profile URL) or already
      // rejected (by handle) for this platform, so re-running a similar
      // search doesn't keep resurfacing the same people. Best-effort: if this
      // fails (e.g. the rejected_leads migration hasn't been run yet), fall
      // back to showing results unfiltered rather than blocking the search.
      let existingUrls = new Set()
      let rejectedHandles = new Set()
      try {
        useStore.setState({ leadsStatusMessage: 'Checking for duplicates…' })
        ;({ existingUrls, rejectedHandles } = await fetchKnownHandles(platform))
      } catch (dupErr) {
        console.warn('Duplicate check unavailable:', dupErr.message)
      }
      const deduped = items.filter((r) => !existingUrls.has(r.handleOrUrl) && !rejectedHandles.has(r.handle))

      useStore.setState({
        leadsResults: deduped,
        leadsAllDuplicates: items.length > 0 && deduped.length === 0,
        leadsStatusMessage: deduped.length ? '' : 'No results found for that search.',
      })
    } catch (err) {
      useStore.setState({ leadsError: err.message || 'Something went wrong.', leadsResults: null })
    } finally {
      useStore.setState({ leadsLoading: false })
    }
  }

  const handleReject = async (r) => {
    const reason = window.prompt(`Reject @${r.handle}? Add a reason (optional):`)
    if (reason === null) return // cancelled
    useStore.setState({ leadsRejectingId: r.externalId, leadsError: '' })
    try {
      await rejectLead({ platform, handle: r.handle, handleOrUrl: r.handleOrUrl, reason: reason.trim() })
      useStore.setState((s) => {
        const nextSelected = new Set(s.leadsSelected)
        nextSelected.delete(r.externalId)
        return {
          leadsResults: s.leadsResults.filter((x) => x.externalId !== r.externalId),
          leadsSelected: nextSelected,
        }
      })
    } catch (err) {
      useStore.setState({ leadsError: err.message || 'Failed to reject lead.' })
    } finally {
      useStore.setState({ leadsRejectingId: null })
    }
  }

  const toggleOne = (id) => {
    useStore.setState((s) => {
      const next = new Set(s.leadsSelected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { leadsSelected: next }
    })
  }

  const toggleAll = () => {
    if (!visibleResults?.length) return
    useStore.setState((s) => ({
      leadsSelected: s.leadsSelected.size === visibleResults.length ? new Set() : new Set(visibleResults.map((r) => r.externalId)),
    }))
  }

  const addSelected = async () => {
    if (!results?.length || !selected.size) return
    useStore.setState({ leadsAdding: true, leadsError: '' })
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
        contact_info: r.email || '',
        notes: r.bio ? `Bio: ${r.bio}` : '',
      }))
    try {
      await bulkAddContacts(rows)
      useStore.setState((s) => ({
        leadsResults: s.leadsResults.filter((r) => !selected.has(r.externalId)),
        leadsSelected: new Set(),
      }))
    } catch (err) {
      useStore.setState({ leadsError: err.message || 'Failed to add contacts.' })
    } finally {
      useStore.setState({ leadsAdding: false })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Find Leads</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">Search a hashtag or keyword to discover creators, then add the ones you like to the CRM.</p>
      </div>

      <form onSubmit={runSearch} className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-[#6E6E73]">Platform</span>
            <select
              className={inputCls}
              value={platform}
              onChange={(e) => useStore.setState({ leadsPlatform: e.target.value })}
              disabled={loading}
            >
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
              onChange={(e) => useStore.setState({ leadsTerm: e.target.value })}
              placeholder="homeschoolmom"
              disabled={loading}
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-[#6E6E73]">Min followers</span>
            <input
              type="number"
              min="0"
              className={`${inputCls} w-28 disabled:opacity-40 disabled:cursor-not-allowed`}
              value={minFollowers}
              onChange={(e) => useStore.setState({ leadsMinFollowers: e.target.value })}
              placeholder="0"
              disabled={platform === 'Instagram'}
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-[#6E6E73]">Max followers</span>
            <input
              type="number"
              min="0"
              className={`${inputCls} w-28 disabled:opacity-40 disabled:cursor-not-allowed`}
              value={maxFollowers}
              onChange={(e) => useStore.setState({ leadsMaxFollowers: e.target.value })}
              placeholder="Any"
              disabled={platform === 'Instagram'}
            />
          </label>
          <label className={`flex items-center gap-2 pb-2.5 text-sm ${platform === 'Instagram' ? 'text-[#A9A9AD]' : 'text-[#6E6E73]'}`}>
            <input
              type="checkbox"
              checked={usOnly}
              onChange={(e) => useStore.setState({ leadsUsOnly: e.target.checked })}
              disabled={platform === 'Instagram'}
            />
            US only
          </label>
          <button
            type="submit"
            disabled={loading || !term.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        {platform === 'Instagram' && (
          <p className="text-xs text-[#A9A9AD]">
            Instagram results don't include follower counts or location data (the hashtag scraper only returns posts, not profile stats), so the follower and US-only filters are both unavailable here.
          </p>
        )}
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

      {!loading && !error && results && results.length === 0 && !allDuplicates && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
          <p className="text-sm text-[#6E6E73]">No results found for that search. Try a different hashtag or keyword.</p>
        </div>
      )}

      {!loading && !error && allDuplicates && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
          <p className="text-sm text-[#6E6E73]">Every result from that search is already in your CRM or was previously rejected.</p>
        </div>
      )}

      {!loading && !error && results && results.length > 0 && visibleResults.length === 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
          <p className="text-sm text-[#6E6E73]">No results match your filters. Try widening the follower range or turning off "US only".</p>
        </div>
      )}

      {!loading && visibleResults && visibleResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#6E6E73]">
              <input type="checkbox" checked={selected.size === visibleResults.length} onChange={toggleAll} />
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
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Bio</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {visibleResults.map((r) => (
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
                      {r.handleOrUrl ? (
                        <a
                          href={r.handleOrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-accent-500 hover:text-accent-600 hover:underline transition"
                        >
                          @{r.handle}
                        </a>
                      ) : (
                        <p className="text-xs text-[#A9A9AD]">@{r.handle}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">
                      {r.followerCount != null ? r.followerCount.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">{r.email || '—'}</td>
                    <td className="px-5 py-3.5 text-[#6E6E73] max-w-sm truncate">{r.bio || '—'}</td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleReject(r)}
                        disabled={rejectingId === r.externalId}
                        className="text-xs text-rose-500 hover:text-rose-600 transition disabled:opacity-50"
                      >
                        {rejectingId === r.externalId ? 'Rejecting…' : 'Reject'}
                      </button>
                    </td>
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
