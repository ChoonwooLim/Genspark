// Cloudflare Workers / Pages entry point.
import { serveStatic } from 'hono/cloudflare-workers'
import { createApp } from './app'

const app = createApp()
app.use('/static/*', serveStatic({ root: './public' }))

// Workers has no filesystem or pg, so the studio library cannot live here.
// These stubs preserve the `storage:'unconfigured'` contract that makes the
// client fall back to IndexedDB; the Node entry mounts the real implementation.
app.get('/api/logos', (c) => c.json({ logos: [], storage: 'unconfigured' }))
app.get('/api/presets', (c) => c.json({ presets: [], storage: 'unconfigured' }))

export default app
