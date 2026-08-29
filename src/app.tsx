// Shared Hono app/page definition — runtime-agnostic (no Cloudflare-only or
// Node-only APIs). Both the Cloudflare Workers entry (src/index.tsx) and the
// Node.js server entry (src/server.node.ts) import `createApp()` from here
// and each attaches its own runtime-appropriate `serveStatic` middleware.
import { Hono } from 'hono'
import { etag } from 'hono/etag'
import { renderer } from './renderer'
import { generateLogoWithGenspark, importGensparkImage, type GensparkConfig } from './genspark-image'

type AppOptions = {
  genspark?: GensparkConfig
}

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
    const hashed =
      c.res.status < 400 && /\.[0-9a-f]{8,}\.[a-z0-9]+$/i.test(c.req.path)
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
              <a href="#workspace-section">로고 작업실</a>
              <a href="#stage-section">미리보기</a>
              <a href="#library-section">라이브러리</a>
              <a href="#spec-section">스펙</a>
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
                <button id="download-sequence" type="button" class="ctrl-btn ctrl-btn--primary">
                  <i class="fa-solid fa-file-zipper"></i>
                  <span id="sequence-label">폴더에 PNG 시퀀스 저장</span>
                </button>
                <button id="upload-sequence" type="button" class="ctrl-btn ctrl-btn--server" hidden>
                  <i class="fa-solid fa-cloud-arrow-up"></i>
                  <span id="upload-label">Orbitron 서버에 저장</span>
                </button>
              </div>
              <div id="export-status" class="export-status" role="status" aria-live="polite" hidden>
                <div class="export-status__row">
                  <span id="export-status-text">프레임 준비 중</span>
                  <span id="export-progress-value">0%</span>
                </div>
                <div class="export-progress" aria-hidden="true">
                  <span id="export-progress-bar"></span>
                </div>
                <p id="export-status-note">현재 화면비 · 30fps · 3초 · 투명 PNG 90장을 선택한 폴더에 저장합니다.</p>
              </div>
            </div>
          </section>

          {/* ===== Logo Studio ===== */}
          <section id="workspace-section" class="workspace-section">
            <header class="section-heading">
              <div>
                <p class="eyebrow">ONE-STOP LOGO WORKFLOW</p>
                <h2>로고 작업실</h2>
                <p>로고를 업로드하거나 Genspark AI로 만들거나 내부 UI 결과를 가져온 뒤, 애니메이션을 조정해 프로젝트와 프리셋으로 저장하세요.</p>
              </div>
              <div class="section-heading__actions">
                <span id="storage-indicator" class="storage-indicator"><i class="fa-solid fa-circle"></i> 저장소 확인 중</span>
                <button id="new-project-btn" class="ctrl-btn" type="button"><i class="fa-solid fa-plus"></i> 새 프로젝트</button>
              </div>
            </header>

            <div class="workspace-grid">
              <article class="workspace-card source-card">
                <div class="card-heading">
                  <span class="step-index">01</span>
                  <div><h3>새 로고 선택</h3><p>기존 파일, 새 AI 시안 또는 Genspark 결과</p></div>
                </div>

                <div class="source-mode" role="tablist" aria-label="로고 제작 방식 선택">
                  <button id="source-mode-upload" class="source-mode__button is-active" type="button" role="tab" aria-selected="true">
                    <i class="fa-solid fa-upload"></i><span><strong>내 로고 사용</strong><small>가지고 있는 파일 업로드</small></span>
                  </button>
                  <button id="source-mode-ai" class="source-mode__button" type="button" role="tab" aria-selected="false">
                    <i class="fa-solid fa-wand-magic-sparkles"></i><span><strong>새 로고 만들기</strong><small>현재 PLAZION과 무관한 시안</small></span>
                  </button>
                  <button id="source-mode-import" class="source-mode__button" type="button" role="tab" aria-selected="false">
                    <i class="fa-solid fa-link"></i><span><strong>Genspark 결과 가져오기</strong><small>내부 UI에서 만든 이미지 연결</small></span>
                  </button>
                </div>

                <div id="upload-source-panel" class="source-panel">
                  <p class="source-instruction"><strong>1-A.</strong> 애니메이션에 사용할 로고 파일을 선택하세요.</p>
                  <label id="logo-dropzone" class="logo-dropzone" for="logo-upload">
                    <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    <strong>로고 파일을 놓거나 선택</strong>
                    <span>PNG · SVG · WEBP · JPG / 투명 PNG 권장</span>
                  </label>
                </div>

                <div id="ai-source-panel" class="source-panel" hidden>
                  <p class="source-instruction"><strong>1-B.</strong> 기존 PLAZION을 참고하지 않고 새로운 브랜드 시안을 생성합니다.</p>
                  <div class="form-stack">
                    <label class="field-label" for="ai-brand-name">새 브랜드 이름 <span class="required-mark">필수</span></label>
                    <input id="ai-brand-name" class="text-field" type="text" placeholder="예: NOVA LAB" maxlength="80" />

                    <div class="form-row">
                      <label><span class="field-label">로고 구성</span>
                        <select id="ai-logo-type" class="text-field">
                          <option value="standalone abstract symbol with no lettering">심볼만</option>
                          <option value="distinctive monogram built from the brand initials">이니셜 모노그램</option>
                          <option value="clean wordmark with custom typography">브랜드 글자형</option>
                          <option value="symbol plus a separate clean wordmark">심볼 + 글자</option>
                        </select>
                      </label>
                      <label><span class="field-label">색상 방향</span>
                        <select id="ai-logo-palette" class="text-field">
                          <option value="unexpected bold colors chosen for this brand, explicitly avoid purple">새로운 색상 · 보라색 제외</option>
                          <option value="strict black and white monochrome">블랙 &amp; 화이트</option>
                          <option value="warm orange, coral and deep navy">오렌지 · 코랄</option>
                          <option value="fresh green, teal and cream">그린 · 틸</option>
                          <option value="electric cyan, lime and charcoal">사이언 · 라임</option>
                        </select>
                      </label>
                    </div>

                    <div class="form-row">
                      <label><span class="field-label">디자인 스타일</span>
                        <select id="ai-logo-style" class="text-field">
                          <option value="minimal flat geometric identity">미니멀 플랫</option>
                          <option value="organic hand-drawn identity">오가닉 핸드드로잉</option>
                          <option value="retro editorial identity from the 1970s">레트로 에디토리얼</option>
                          <option value="premium restrained luxury identity">절제된 럭셔리</option>
                          <option value="playful friendly character identity">친근한 캐릭터</option>
                          <option value="experimental brutalist graphic identity">실험적 브루탈리즘</option>
                        </select>
                      </label>
                      <label><span class="field-label">차별화 강도</span>
                        <select id="ai-logo-originality" class="text-field">
                          <option value="bold">과감하게 다르게</option>
                          <option value="balanced">균형 있게</option>
                          <option value="safe">안정적으로</option>
                        </select>
                      </label>
                    </div>

                    <label class="field-label" for="ai-logo-prompt">브랜드 성격과 원하는 아이디어</label>
                    <textarea id="ai-logo-prompt" class="text-field" rows="4" placeholder="예: 음악가를 위한 협업 서비스. 연결과 리듬을 하나의 단순한 심볼로 표현. 행성, 불꽃, 날개 모양은 사용하지 않기."></textarea>

                    <label class="field-label" for="ai-logo-avoid">피하고 싶은 요소</label>
                    <input id="ai-logo-avoid" class="text-field" type="text" placeholder="예: 보라색, 금속 질감, 불꽃, 기존 PLAZION과 유사한 형태" maxlength="300" />

                    <label><span class="field-label">AI 모델</span>
                      <select id="ai-logo-model" class="text-field">
                        <option value="nano-banana-2-flash-lite">빠른 생성</option>
                        <option value="nano-banana-2">고품질</option>
                        <option value="gpt-image-2">정교한 텍스트</option>
                        <option value="qwen-image-3">한·영 타이포</option>
                      </select>
                    </label>

                    <button id="generate-logo-btn" class="action-btn action-btn--ai" type="button">
                      <i class="fa-solid fa-wand-magic-sparkles"></i><span>새 로고 시안 생성</span>
                    </button>
                    <p class="field-help">현재 미리보기 이미지는 AI에 전달하지 않습니다. 생성 버튼을 누를 때마다 새로운 시안을 만듭니다.</p>
                  </div>
                </div>

                <div id="import-source-panel" class="source-panel" hidden>
                  <p class="source-instruction"><strong>1-C.</strong> Genspark 내부 UI에서 만든 결과 이미지의 주소를 붙여 넣으면 현재 로고로 자동 적용합니다.</p>
                  <div class="form-stack">
                    <div id="genspark-paste-zone" class="genspark-paste-zone" tabindex="0" role="button" aria-label="Genspark 결과 이미지 붙여넣기">
                      <i class="fa-regular fa-paste"></i>
                      <span><strong>가장 쉬운 방법: 이미지 복사 후 Ctrl+V</strong><small>Genspark 결과 이미지에서 복사한 다음 이 영역을 클릭하고 붙여 넣으세요.</small></span>
                    </div>
                    <div class="source-divider"><span>또는 이미지 주소</span></div>
                    <label class="field-label" for="genspark-import-url">Genspark 결과 이미지 주소</label>
                    <input id="genspark-import-url" class="text-field" type="url" inputmode="url" placeholder="https://www.genspark.ai/..." autocomplete="off" />
                    <button id="import-genspark-btn" class="action-btn action-btn--import" type="button">
                      <i class="fa-solid fa-cloud-arrow-down"></i><span>결과 가져와서 적용</span>
                    </button>
                    <div class="import-help">
                      <strong>주소 복사 방법</strong>
                      <ol>
                        <li>Genspark 내부 UI에서 로고를 생성합니다.</li>
                        <li>완성 이미지에서 <b>이미지 주소 복사</b>를 선택합니다.</li>
                        <li>위 칸에 붙여 넣고 가져오기 버튼을 누릅니다.</li>
                      </ol>
                      <p><code>/api/files/s/...</code> 공유 링크가 비공개로 표시되면 이미지를 다운로드한 뒤 <b>내 로고 사용</b>에서 업로드하세요.</p>
                    </div>
                  </div>
                </div>

                <p id="source-ready-status" class="source-ready-status"><i class="fa-solid fa-circle-info"></i> 아직 새 로고를 선택하지 않았습니다. 위 세 방식 중 하나를 완료하세요.</p>
              </article>

              <article class="workspace-card settings-card">
                <div class="card-heading">
                  <span class="step-index">02</span>
                  <div><h3>애니메이션 설정</h3><p>프리셋과 강도 조절</p></div>
                </div>
                <div class="form-stack">
                  <label class="field-label" for="project-name">프로젝트 이름</label>
                  <input id="project-name" class="text-field" type="text" value="PLAZION VFX Intro" maxlength="100" />

                  <label class="field-label" for="preset-select">프리셋</label>
                  <div class="inline-field">
                    <select id="preset-select" class="text-field">
                      <option value="voxel-default">Voxel Materialize · 기본</option>
                    </select>
                    <button id="delete-preset-btn" class="icon-btn" type="button" title="선택 프리셋 삭제" aria-label="선택 프리셋 삭제"><i class="fa-solid fa-trash"></i></button>
                  </div>

                  <div class="setting-block">
                    <div class="range-heading"><label for="glow-range">글로우</label><output id="glow-value">100%</output></div>
                    <input id="glow-range" type="range" min="0" max="200" value="100" />
                  </div>
                  <div class="setting-block">
                    <div class="range-heading"><label for="energy-range">모션 에너지</label><output id="energy-value">100%</output></div>
                    <input id="energy-range" type="range" min="40" max="180" value="100" />
                  </div>

                  <fieldset class="choice-group">
                    <legend>출력 화면비</legend>
                    <label><input type="radio" name="studio-aspect" value="landscape" checked /> 16:9 · 1920×1080</label>
                    <label><input type="radio" name="studio-aspect" value="portrait" /> 9:16 · 1080×1920</label>
                  </fieldset>

                  <label class="toggle-row">
                    <input id="auto-preset-toggle" type="checkbox" checked />
                    <span><strong>저장 시 프리셋 자동 등록</strong><small>현재 설정을 다음 프로젝트에서도 바로 사용합니다.</small></span>
                  </label>

                  <button id="save-project-btn" class="action-btn action-btn--save" type="button">
                    <i class="fa-solid fa-floppy-disk"></i><span>프로젝트 저장 + 프리셋 등록</span>
                  </button>
                  <p id="studio-status" class="studio-status" role="status" aria-live="polite"></p>
                </div>
              </article>

              <aside class="workspace-card workflow-card">
                <div class="card-heading">
                  <span class="step-index">03</span>
                  <div><h3>빠른 작업</h3><p>현재 로고 출력</p></div>
                </div>
                <div class="quick-actions">
                  <button id="studio-preview-btn" class="quick-action" type="button"><i class="fa-solid fa-play"></i><span><strong>미리보기 재생</strong><small>상단 스테이지에서 확인</small></span></button>
                  <button id="studio-download-btn" class="quick-action" type="button"><i class="fa-solid fa-layer-group"></i><span><strong>PNG 시퀀스</strong><small>투명 프레임 90장 저장</small></span></button>
                  <button id="download-current-logo-btn" class="quick-action" type="button"><i class="fa-solid fa-download"></i><span><strong>로고 원본</strong><small>현재 소스 이미지 다운로드</small></span></button>
                </div>
              </aside>
            </div>
          </section>

          {/* ===== Project Library ===== */}
          {/* ===== Genspark Handoff Bundles ===== */}
          <section id="handoff-section" class="handoff-section" hidden>
            <header class="section-heading">
              <div>
                <p class="eyebrow">GENSPARK PROJECT HANDOFF</p>
                <h2>핸드오프 가져오기</h2>
                <p>Genspark가 내보낸 <code>project.zip</code>을 통째로 가져옵니다 — HTML 프로토타입, 애니메이션 참조 코드, 로고와 에셋, 스펙(해상도·FPS·타임라인), Remotion 프로젝트까지.</p>
              </div>
            </header>

            <label id="handoff-dropzone" class="handoff-dropzone" for="handoff-upload">
              <input id="handoff-upload" type="file" accept=".zip,application/zip" hidden />
              <i class="fa-solid fa-file-zipper"></i>
              <strong>project.zip 을 여기에 놓거나 클릭해 선택</strong>
              <span>README의 마스터 스펙과 타임라인을 자동으로 읽어옵니다</span>
            </label>

            <div class="handoff-actions">
              <button id="handoff-folder-btn" type="button" class="ctrl-btn ctrl-btn--primary">
                <i class="fa-solid fa-folder-open"></i> 압축 푼 폴더 선택
              </button>
              <input id="handoff-folder-input" type="file" multiple hidden />
              <span class="handoff-actions__hint">폴더 선택이 안 되는 브라우저에서는 위에 ZIP을 그대로 올리세요</span>
            </div>

            <p id="handoff-status" class="handoff-status" role="status" aria-live="polite"></p>

            <div id="handoff-list" class="handoff-list"></div>
            <p id="handoff-empty" class="library-empty">아직 가져온 핸드오프 번들이 없습니다.</p>
            <div id="handoff-detail" class="handoff-detail" hidden></div>
          </section>

          <section id="library-section" class="library-section">
            <header class="section-heading section-heading--inline">
              <div>
                <p class="eyebrow">SAVED PROJECTS</p>
                <h2>로고 라이브러리</h2>
                <p>저장한 로고를 다시 불러와 재생하고 원본 또는 시퀀스를 다운로드할 수 있습니다.</p>
              </div>
              <div class="library-tools">
                <label class="search-field"><i class="fa-solid fa-magnifying-glass"></i><input id="library-search" type="search" placeholder="프로젝트 검색" /></label>
                <button id="refresh-library-btn" class="ctrl-btn" type="button"><i class="fa-solid fa-arrows-rotate"></i> 새로고침</button>
              </div>
            </header>
            <div id="library-grid" class="library-grid" aria-live="polite"></div>
            <div id="library-empty" class="library-empty" hidden>
              <i class="fa-regular fa-folder-open"></i>
              <h3>아직 저장된 로고가 없습니다</h3>
              <p>로고 작업실에서 첫 프로젝트를 저장해 보세요.</p>
            </div>
          </section>

          {/* ===== Server Sequence Library (Node container only — hidden when the
                   /api/sequences backend is absent or has no database) ===== */}
          <section id="sequence-library-section" class="library-section" hidden>
            <h2 class="section-title">
              <i class="fa-solid fa-server"></i> 서버 보관함
            </h2>
            <p class="library-note" id="library-note">
              Orbitron 서버에 저장된 PNG 시퀀스입니다.
            </p>
            <div id="library-list" class="library-list">
              <p class="library-empty">아직 저장된 시퀀스가 없습니다.</p>
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

        <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
        <script src="/static/vfx-intro.js?v=20260829-studio-4"></script>
        <script src="/static/app.js?v=20260829-studio-4"></script>
        <script src="/static/studio.js?v=20260829-studio-4"></script>
        <script src="/static/handoff.js?v=20260829-studio-4"></script>
      </div>
    )
  })

  // Simple health check for container orchestrators (Orbitron/Docker).
  app.get('/health', (c) => c.text('ok'))

  return app
}
