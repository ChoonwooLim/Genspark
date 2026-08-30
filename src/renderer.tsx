import { jsxRenderer } from 'hono/jsx-renderer'

export const NAV = [
  { href: '/studio', label: '작업실' },
  { href: '/preview', label: '미리보기' },
  { href: '/library', label: '라이브러리' },
  { href: '/handoff', label: '핸드오프' },
  { href: '/archive', label: '보관함' },
] as const

// Bumped when the static bundle changes, so a deploy is visible even where an
// edge cache holds the previous asset.
export const ASSET_VERSION = '20260830-darkbar-1'

type Meta = {
  title?: string
  description?: string
  path?: string
  scripts?: string[]
}

export const renderer = jsxRenderer(({ children, title, description, path, scripts }: any) => {
  const meta: Meta = { title, description, path, scripts }
  const pageTitle = meta.title ? `${meta.title} · Logo Studio` : 'Logo Studio'

  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={meta.description || '로고 인트로를 만들고, 내보내고, 보관하는 작업 도구'}
        />
        <link rel="icon" href="data:," />
        <link href={`/static/system.css?v=${ASSET_VERSION}`} rel="stylesheet" />
        <link href={`/static/stage.css?v=${ASSET_VERSION}`} rel="stylesheet" />
      </head>
      <body>
        {/* The one piece of persistent chrome, so it is the one piece that is
            always dark: a near-black rail that frames every page identically
            and reads as the product itself rather than as part of the page. */}
        <header class="topbar">
          <div class="shell topbar__inner">
            <a class="wordmark" href="/">
              <b>Logo</b>
              <span>Studio</span>
            </a>
            <nav class="topnav" aria-label="주요 기능">
              {NAV.map((item) => (
                <a href={item.href} aria-current={meta.path === item.href ? 'page' : undefined}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div class="topbar__action">
              {/* Only pages that load core.js can resolve the storage mode; on
                  the others the chip would sit at "확인 중" forever. */}
              {(meta.scripts || []).includes('core.js') ? (
                <span id="storage-indicator" class="chip chip--neutral">저장소 확인 중</span>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main">{children}</main>

        {/* Left light on purpose. The stage is the darkest field on any page
            and has to stay that way; a second black slab at the bottom would
            make three and the stage would stop reading as the subject. */}
        <footer class="footer">
          <div class="shell footer__inner">
            <div class="footer__id">
              <a class="wordmark wordmark--footer" href="/">
                <b>Logo</b>
                <span>Studio</span>
              </a>
              <p class="micro">PLAZION VFX Intro · Voxel Materialize · 3초 루프</p>
            </div>
            <nav class="cluster" aria-label="바닥글">
              {NAV.map((item) => (
                <a href={item.href}>{item.label}</a>
              ))}
            </nav>
          </div>
        </footer>

        {(meta.scripts || []).map((src) => (
          <script src={`/static/${src}?v=${ASSET_VERSION}`}></script>
        ))}
      </body>
    </html>
  )
})
