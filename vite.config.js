import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { startRun, getRunStatus, getResults, startHashtagRun, getHashtagResults } from './server/apify.js'

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_-prefixed vars to client code via import.meta.env.
  // APIFY_API_TOKEN is intentionally unprefixed (server-only secret); load it
  // from .env into process.env so the dev middleware below can read it, the
  // same way it'll be read from real environment variables in production.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.APIFY_API_TOKEN) process.env.APIFY_API_TOKEN = env.APIFY_API_TOKEN

  return {
    plugins: [react(), apifyDevApi()],
  }
})

// Mirrors the /api/apify/* Vercel functions for local dev, so `npm run dev`
// exercises the same request/response shape without needing `vercel dev`.
function apifyDevApi() {
  return {
    name: 'apify-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/apify/start', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { platform, searchTerm, usOnly } = body ? JSON.parse(body) : {}
            const result = await startRun(platform, searchTerm, usOnly)
            sendJson(res, 200, result)
          } catch (err) {
            sendJson(res, err.statusCode || 500, { error: err.message || 'Failed to start search' })
          }
        })
      })

      server.middlewares.use('/api/apify/status', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        try {
          const { searchParams } = new URL(req.url, 'http://localhost')
          const result = await getRunStatus(searchParams.get('runId'))
          sendJson(res, 200, result)
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Failed to check run status' })
        }
      })

      server.middlewares.use('/api/apify/results', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        try {
          const { searchParams } = new URL(req.url, 'http://localhost')
          const items = await getResults(searchParams.get('datasetId'), searchParams.get('platform'))
          sendJson(res, 200, { items })
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Failed to fetch results' })
        }
      })

      server.middlewares.use('/api/apify/hashtags/start', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { term } = body ? JSON.parse(body) : {}
            const result = await startHashtagRun(term)
            sendJson(res, 200, result)
          } catch (err) {
            sendJson(res, err.statusCode || 500, { error: err.message || 'Failed to start hashtag research' })
          }
        })
      })

      server.middlewares.use('/api/apify/hashtags/results', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return }
        try {
          const { searchParams } = new URL(req.url, 'http://localhost')
          const result = await getHashtagResults(searchParams.get('datasetId'))
          sendJson(res, 200, result)
        } catch (err) {
          sendJson(res, err.statusCode || 500, { error: err.message || 'Failed to fetch hashtag results' })
        }
      })
    },
  }
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
