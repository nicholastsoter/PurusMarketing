import { startRun } from '../../server/apify.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { platform, searchTerm } = req.body || {}
    const result = await startRun(platform, searchTerm)
    res.status(200).json(result)
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to start search' })
  }
}
