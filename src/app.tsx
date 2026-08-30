// Shared Hono app — runtime-agnostic (no Cloudflare-only or Node-only APIs).
// Both the Workers entry (src/index.tsx) and the Node entry
// (src/server.node.ts) import createApp() and attach their own serveStatic.
//
// Each feature is its own route so a page loads only the scripts it needs; the
// shared client state lives in /static/core.js.
import { Hono } from 'hono'
import { etag } from 'hono/etag'
import { renderer, ASSET_VERSION } from './renderer'
import { generateLogoWithGenspark, importGensparkImage, type GensparkConfig } from './genspark-image'
import { HomePage, StudioPage, PreviewPage, LibraryPage, HandoffPage, ArchivePage } from './pages'

type AppOptions = {
  genspark?: GensparkConfig
}

const ROUTES = [
  {
    path: '/',
    title: null,
    description: '로고 인트로 영상을 만들고, 렌더링하고, 보관하는 작업 도구 — Logo Studio',
    scripts: ['vfx-intro.js', 'hero.js'],
    Page: HomePage,
  },
  {
    path: '/studio',
    title: '로고 작업실',
    description: '로고를 업로드하거나 AI로 생성하고 애니메이션 강도를 조절합니다',
    scripts: ['vfx-intro.js', 'core.js', 'studio.js'],
    Page: StudioPage,
  },
  {
    path: '/preview',
    title: '미리보기',
    description: '3초 루프 미리보기와 투명 PNG 시퀀스 내보내기',
    scripts: ['vendor/jszip.min.js', 'vfx-intro.js', 'core.js', 'preview.js'],
    Page: PreviewPage,
  },
  {
    path: '/library',
    title: '라이브러리',
    description: '저장한 프로젝트와 프리셋',
    scripts: ['core.js', 'library.js'],
    Page: LibraryPage,
  },
  {
    path: '/handoff',
    title: '핸드오프 가져오기',
    description: 'Genspark 핸드오프 프로젝트를 통째로 가져옵니다',
    scripts: ['vendor/jszip.min.js', 'core.js', 'handoff.js'],
    Page: HandoffPage,
  },
  {
    path: '/archive',
    title: '보관함',
    description: '서버에 보관된 PNG 시퀀스 아카이브',
    scripts: ['core.js', 'archive.js'],
    Page: ArchivePage,
  },
] as const

export function createApp(options: AppOptions = {}) {
  const app = new Hono()

  // Cache-busting: every response revalidates with the server (304 when
  // unchanged), so a redeploy shows up without the user hard-refreshing.
  // Build outputs whose filename carries a content hash are the exception —
  // the name changes when the bytes change, so they are safe to cache forever.
  app.use('*', async (c, next) => {
    await next()
    if (c.req.path.startsWith('/api/')) {
      c.header('Cache-Control', 'no-store')
      return
    }
    const hashed = c.res.status < 400 && /\.[0-9a-f]{8,}\.[a-z0-9]+$/i.test(c.req.path)
    c.header(
      'Cache-Control',
      hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate'
    )
  })

  // ETag on every response so `must-revalidate` costs a 304 instead of a full
  // re-download. Registered after the header middleware above so that one runs
  // last on the way out and stamps Cache-Control onto the 304 as well.
  app.use('*', etag())

  app.use(renderer)

  app.post('/api/ai/generate-logo', (c) => generateLogoWithGenspark(c, options.genspark || {}))
  app.post('/api/ai/import-genspark-image', (c) => importGensparkImage(c, options.genspark || {}))

  for (const route of ROUTES) {
    app.get(route.path, (c) =>
      c.render(<route.Page />, {
        title: route.title,
        description: route.description,
        path: route.path,
        scripts: route.scripts,
      } as any)
    )
  }

  /** Bare surface for the headless renderer — no layout, no chrome, no other
   *  scripts. Rendered with c.html rather than the shared renderer because the
   *  navigation and stylesheets would end up in the captured frames. */
  app.get('/render/engine', (c) => {
    const q = c.req.query()
    const portrait = q.aspect === 'portrait'
    const width = portrait ? 1080 : 1920
    const height = portrait ? 1920 : 1080
    const search = new URLSearchParams(q).toString()
    return c.html(
      `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:#020009;overflow:hidden}
  canvas{display:block;width:${width}px;height:${height}px}
</style></head><body>
<canvas id="render-canvas" width="${width}" height="${height}"></canvas>
<script src="/static/vfx-intro.js?v=${ASSET_VERSION}"></script>
<script src="/static/render-engine.js?v=${ASSET_VERSION}"></script>
</body></html>`
    )
  })

  app.get('/health', (c) => c.text('ok'))

  return app
}
