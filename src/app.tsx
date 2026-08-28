// Shared Hono app/page definition — runtime-agnostic (no Cloudflare-only or
// Node-only APIs). Both the Cloudflare Workers entry (src/index.tsx) and the
// Node.js server entry (src/server.node.ts) import `createApp()` from here
// and each attaches its own runtime-appropriate `serveStatic` middleware.
import { Hono } from 'hono'
import { renderer } from './renderer'

export function createApp() {
  const app = new Hono()

  app.use(renderer)

  app.get('/', (c) => {
    return c.render(
      <div id="app-root">
        {/* ===== Header ===== */}
        <header id="site-header" class="site-header">
          <div class="header-inner">
            <div class="brand-mark">
              <span class="brand-dot"></span>
              <span class="brand-text">PLAZION</span>
              <span class="brand-sub">VFX INTRO</span>
            </div>
            <nav class="header-nav">
              <a href="#stage-section">미리보기</a>
              <a href="#spec-section">스펙</a>
              <a href="#timeline-section">타임라인</a>
            </nav>
          </div>
        </header>

        <main>
          {/* ===== Hero / Stage ===== */}
          <section id="stage-section" class="stage-section">
            <div class="stage-intro-text">
              <p class="eyebrow">3-SECOND BRAND STING · VOXEL MATERIALIZE</p>
              <h1>VFX 로고영상 3초짜리</h1>
              <p class="lede">
                메탈릭 Z-플레임 로고가 보크셀 그리드로 조립되고, 글리치와 임팩트 플래시를 거쳐
                홀로그램 스캔라인으로 안착하는 3초 루핑 인트로입니다.
              </p>
            </div>

            <div id="stage-frame" class="stage-frame">
              <div id="aspect-toggle" class="aspect-toggle" role="tablist" aria-label="화면 비율 선택">
                <button type="button" class="aspect-btn is-active" data-aspect="landscape" role="tab" aria-selected="true">
                  <i class="fa-solid fa-tv"></i> 16:9 · 1920×1080
                </button>
                <button type="button" class="aspect-btn" data-aspect="portrait" role="tab" aria-selected="false">
                  <i class="fa-solid fa-mobile-screen-button"></i> 9:16 · 1080×1920
                </button>
              </div>

              <div id="canvas-wrap" class="canvas-wrap canvas-wrap--landscape">
                <canvas id="intro-canvas" width="1920" height="1080" aria-label="PLAZION VFX 로고 인트로 미리보기"></canvas>

                <div id="sound-gate" class="sound-gate">
                  <div class="sound-gate-inner">
                    <i class="fa-solid fa-volume-high"></i>
                    <h2>사운드와 함께 재생</h2>
                    <p>브라우저 정책상 클릭 후 오디오가 활성화됩니다</p>
                    <button id="sound-gate-btn" type="button">
                      <i class="fa-solid fa-play"></i> 재생 시작
                    </button>
                  </div>
                </div>

                <div id="loop-badge" class="loop-badge">
                  <span id="loop-count">0</span> LOOPS
                </div>
              </div>

              <div class="stage-controls">
                <button id="mute-toggle" type="button" class="ctrl-btn" aria-pressed="true">
                  <i class="fa-solid fa-volume-high"></i>
                  <span id="mute-label">사운드 켜짐</span>
                </button>
                <button id="restart-btn" type="button" class="ctrl-btn">
                  <i class="fa-solid fa-rotate-right"></i> 다시보기
                </button>
                <a id="download-logo" href="/static/plazion_logo.png" download class="ctrl-btn">
                  <i class="fa-solid fa-image"></i> 로고 원본
                </a>
              </div>
            </div>
          </section>

          {/* ===== Spec Section ===== */}
          <section id="spec-section" class="spec-section">
            <h2 class="section-title">
              <i class="fa-solid fa-sliders"></i> Master Specifications
            </h2>
            <div class="spec-grid">
              <div class="spec-card">
                <span class="spec-label">Duration</span>
                <span class="spec-value">3.0s <small>looping</small></span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Landscape</span>
                <span class="spec-value">1920 × 1080 <small>16:9</small></span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Portrait</span>
                <span class="spec-value">1080 × 1920 <small>9:16</small></span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Frame Rate</span>
                <span class="spec-value">60fps <small>web / 30fps MP4</small></span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Background</span>
                <span class="spec-value spec-swatch-row">
                  <span class="swatch" style="background:#020009"></span>
                  #020009
                </span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Primary Gradient</span>
                <span class="spec-value spec-swatch-row">
                  <span class="swatch" style="background:linear-gradient(135deg,#6C33D9,#A874FF)"></span>
                  #6C33D9 → #A874FF
                </span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Accent Glow</span>
                <span class="spec-value spec-swatch-row">
                  <span class="swatch" style="background:#B782FF"></span>
                  #B782FF
                </span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Impact Flash</span>
                <span class="spec-value spec-swatch-row">
                  <span class="swatch" style="background:rgba(230,210,255,0.55)"></span>
                  rgba(230,210,255,.55)
                </span>
              </div>
            </div>
          </section>

          {/* ===== Timeline Section ===== */}
          <section id="timeline-section" class="timeline-section">
            <h2 class="section-title">
              <i class="fa-solid fa-timeline"></i> Timeline — Variant 03 Voxel Materialize
            </h2>
            <ol class="timeline-list">
              <li>
                <span class="tl-time">0.15s – 1.60s</span>
                <span class="tl-body">
                  <strong>보크셀 팝인.</strong> 11–14px 셀이 로고 색을 샘플링, 중심에서 거리 기반 딜레이 +
                  지터로 순차 등장 (<code>easeOutBack</code> 오버슈트).
                </span>
              </li>
              <li>
                <span class="tl-time">1.42s – 1.90s</span>
                <span class="tl-body">
                  <strong>글리치 페이즈.</strong> 프레임당 4개 수평 바가 ±80px 시프트, 퍼플 틴트 15–35%.
                  Whoosh SFX 트리거.
                </span>
              </li>
              <li>
                <span class="tl-time">1.85s – 2.05s</span>
                <span class="tl-body"><strong>임팩트 플래시</strong> + 서브붐 SFX (피크 프레임 56).</span>
              </li>
              <li>
                <span class="tl-time">1.85s – 2.75s</span>
                <span class="tl-body">
                  <strong>쇼크웨이브.</strong> 단일 링, 반경 → <code>hypot(w,h) × 0.6</code>, 불투명도 0.9 → 0.
                </span>
              </li>
              <li>
                <span class="tl-time">1.90s – 2.20s</span>
                <span class="tl-body">클린 로고 이미지가 45px 퍼플 글로우와 함께 크로스페이드 인.</span>
              </li>
              <li>
                <span class="tl-time">2.15s – 3.00s</span>
                <span class="tl-body">
                  <strong>홀로그램 아이들.</strong> 3px 스캔라인 + 이동 스캔밴드, 로고 ±6% 플리커.
                </span>
              </li>
            </ol>

            <div class="sfx-note">
              <i class="fa-solid fa-waveform-lines"></i>
              <p>
                오디오는 외부 파일 없이 WebAudio로 절차적 생성됩니다 — Sub Boom(120→32Hz), Noise
                Sweep(1800→180Hz LPF), Transient Click, Whoosh(400→3200Hz BPF).
              </p>
            </div>
          </section>
        </main>

        <footer class="site-footer">
          <p>PLAZION VFX Intro · Design handoff: Voxel Materialize (Variant 03) · 3s loop</p>
        </footer>

        <script src="/static/vfx-intro.js"></script>
        <script src="/static/app.js"></script>
      </div>
    )
  })

  // Simple health check for container orchestrators (Orbitron/Docker).
  app.get('/health', (c) => c.text('ok'))

  return app
}
