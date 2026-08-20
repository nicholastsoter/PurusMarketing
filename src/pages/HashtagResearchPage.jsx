import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { runApifySearch } from '../lib/apifyClient'

const inputCls = 'rounded-xl border border-warm-200 px-3.5 py-2.5 text-sm text-[#1D1D1F] placeholder:text-[#A9A9AD] focus:outline-none focus:ring-2 focus:ring-accent-400/40 focus:border-accent-400 transition'

export default function HashtagResearchPage() {
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const runResearch = async (e) => {
    e.preventDefault()
    if (!term.trim() || loading) return

    setLoading(true)
    setError('')
    setResult(null)
    setStatusMessage('Starting research…')

    try {
      const data = await runApifySearch({
        startUrl: '/api/apify/hashtags/start',
        startBody: { term: term.trim() },
        resultsUrl: (datasetId) => `/api/apify/hashtags/results?datasetId=${encodeURIComponent(datasetId)}`,
        onProgress: (s) => setStatusMessage(`Researching "${term.trim()}"… (${s}s)`),
      })
      setResult(data)
      setStatusMessage(data.suggestions.length ? '' : 'No related hashtags found for that term.')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const searchInFindLeads = (hashtag) => {
    navigate(`/find-leads?platform=Instagram&term=${encodeURIComponent(hashtag)}`)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Hashtag Research</h2>
        <p className="text-sm text-[#6E6E73] mt-0.5">
          Enter a niche keyword or hashtag to see related tags ranked by volume, based on Instagram data. Send any of them straight to Find Leads.
        </p>
      </div>

      <form onSubmit={runResearch} className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-5 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[220px] space-y-1.5">
          <span className="block text-xs font-medium text-[#6E6E73]">Niche keyword or hashtag</span>
          <input
            className={`${inputCls} w-full`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="homeschool"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading || !term.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent-500 hover:bg-accent-600 text-white transition disabled:opacity-50"
        >
          {loading ? 'Researching…' : 'Research'}
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

      {!loading && !error && result && result.suggestions.length === 0 && (
        <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 p-16 text-center">
          <p className="text-sm text-[#6E6E73]">No related hashtags found for that term. Try something broader.</p>
        </div>
      )}

      {!loading && result && result.suggestions.length > 0 && (
        <div className="space-y-3">
          {result.postsLabel && (
            <p className="text-xs text-[#A9A9AD]">
              #{term.trim().replace(/^#/, '')} has about {result.postsLabel} posts on Instagram.
            </p>
          )}

          <div className="bg-white rounded-2xl shadow-soft border border-warm-200/70 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-200/70 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Hashtag</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#A9A9AD] uppercase tracking-wide">Volume</th>
                  <th className="px-5 py-3 w-40" />
                </tr>
              </thead>
              <tbody>
                {result.suggestions.map((s) => (
                  <tr key={s.hashtag} className="border-b border-warm-100 last:border-0 hover:bg-warm-50 transition">
                    <td className="px-5 py-3.5 font-medium text-[#1D1D1F] whitespace-nowrap">#{s.hashtag}</td>
                    <td className="px-5 py-3.5 text-[#6E6E73] whitespace-nowrap">{s.label || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => searchInFindLeads(s.hashtag)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-50 text-accent-600 hover:bg-accent-100 transition"
                      >
                        Search in Find Leads
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
