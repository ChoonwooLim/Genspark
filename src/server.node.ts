// Node.js server entry point — used by container/Docker-based deploy paths
// (e.g. Orbitron) that run `npm run build && npm start` on a generic Node
// runtime instead of Cloudflare Workers. Cloudflare Pages/Workers deploys
// use src/index.tsx instead; this file is never bundled into that path.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app'
import { createSequencesApi } from './sequences.node'

const app = createApp({
  genspark: {
    apiKey: process.env.GSK_API_KEY,
    baseUrl: process.env.GSK_API_BASE_URL,
    accessToken: process.env.STUDIO_ADMIN_TOKEN,
  },
})
app.use('/static/*', serveStatic({ root: './public' }))

// Server-side PNG-sequence archive (Postgres metadata + archive on the
// Orbitron persistent volume). Node-only; the Workers entry has no equivalent.
app.route('/api/sequences', await createSequencesApi())

const port = Number(process.env.PORT) || 3000

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`PLAZION VFX Intro server listening on http://0.0.0.0:${info.port}`)
})

const gracefulShutdown = () => {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)
