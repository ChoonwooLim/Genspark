// Node.js server entry point — used by container/Docker-based deploy paths
// (e.g. Orbitron) that run `npm run build && npm start` on a generic Node
// runtime instead of Cloudflare Workers. Cloudflare Pages/Workers deploys
// use src/index.tsx instead; this file is never bundled into that path.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app'

const app = createApp()
app.use('/static/*', serveStatic({ root: './public' }))

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
