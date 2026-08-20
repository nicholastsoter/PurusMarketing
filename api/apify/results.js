import { getResults } from '../../server/apify.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { datasetId, platform } = req.query
    const items = await getResults(datasetId, platform)
    res.status(200).json({ items })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to fetch results' })
  }
}
