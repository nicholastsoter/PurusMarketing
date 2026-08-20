import { getRunStatus } from '../../server/apify.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { runId } = req.query
    const result = await getRunStatus(runId)
    res.status(200).json(result)
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to check run status' })
  }
}
