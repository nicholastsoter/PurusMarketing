import { startHashtagRun } from '../../../server/apify.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { term } = req.body || {}
    const result = await startHashtagRun(term)
    res.status(200).json(result)
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to start hashtag research' })
  }
}
