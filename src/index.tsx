// Cloudflare Workers / Pages entry point.
import { serveStatic } from 'hono/cloudflare-workers'
import { createApp } from './app'

const app = createApp()
app.use('/static/*', serveStatic({ root: './public' }))

export default app
