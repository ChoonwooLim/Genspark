// Page bodies. One export per route; src/app.tsx wires them up.
//
// Layout follows docs/DESIGN-cohere.md: left-aligned display type on white,
// rule-separated rows instead of repeated card grids, one dark product band per
// page at most, and secondary actions as text links rather than more buttons.

const FEATURES = [
  {
    href: '/studio',
    index: '01',
    title: '로고 작업실',
    body: '로고를 업로드하거나 Genspark AI로 만들고, 글로우와 모션 에너지를 조절해 프로젝트로 저장합니다.',
  },
  {
    href: '/preview',
    index: '02',
    title: '미리보기 · 내보내기',
    body: '3초 루프를 실시간으로 확인하고, 투명 PNG 90장을 폴더나 ZIP으로 내보냅니다.',
  },
  {
    href: '/library',
    index: '03',
    title: '라이브러리',
    body: '저장한 프로젝트와 프리셋. Orbitron 서버에 보관되어 어느 기기에서나 같은 목록이 보입니다.',
  },
  {
    href: '/handoff',
    index: '04',
    title: '핸드오프',
    body: 'Genspark 핸드오프를 통째로 가져옵니다 — 스펙, 타임라인, 에셋, 원본 HTML 프로토타입까지.',
  },
  {
    href: '/archive',
    index: '05',
    title: '보관함',
    body: '서버에 올린 PNG 시퀀스 아카이브. 토큰 링크로 언제든 다시 내려받습니다.',
  },
]

/* ===== Shared fragments ========================================== */

function PageHead({ eyebrow, title, lede, aside }: any) {
  return (
    <div class="shell page-head">
      <div class="reveal">
        <p class="eyebrow">{eyebrow}</p>
        <h1 class="display">{title}</h1>
        <p class="lede">{lede}</p>
      </div>
      {aside ? <div class="page-head__aside reveal">{aside}</div> : null}
    </div>
  )
}

/** The canvas plus its overlays. Controls are passed in because the home page
 *  shows the loop with none of them. */
function Stage({ controls }: { controls?: any }) {
  return (
    <div class="stage">
      <div class="stage__top">
        <div id="aspect-toggle" class="segmented" role="tablist" aria-label="화면 비율">
          <button type="button" class="aspect-btn is-active" data-aspect="landscape" role="tab" aria-selected="true">
            16:9 · 1920×1080
          </button>
          <button type="button" class="aspect-btn" data-aspect="portrait" role="tab" aria-selected="false">
            9:16 · 1080×1920
          </button>
        </div>
        <p class="loop-badge">
          <span id="loop-count">0</span> loops
        </p>
      </div>

      <div id="canvas-wrap" class="canvas-wrap canvas-wrap--landscape">
        <canvas id="intro-canvas" width="1920" height="1080" aria-label="PLAZION VFX 인트로 미리보기"></canvas>
        <div id="sound-gate" class="sound-gate">
          <div class="sound-gate__inner">
            <h2>사운드와 함께 재생</h2>
            <p>브라우저 정책상 클릭 후 오디오가 활성화됩니다</p>
            <button id="sound-gate-btn" type="button" class="stage-btn stage-btn--solid">
              재생 시작
            </button>
          </div>
        </div>
      </div>

      {controls}
    </div>
  )
}

/* ===== / ========================================================= */

export function HomePage() {
  return (
    <>
      <PageHead
        eyebrow="3-second brand sting · voxel materialize"
        title={
          <>
            로고가 조립되는
            <br />3초를 만듭니다.
          </>
        }
        lede="보크셀 그리드로 조립되고, 글리치와 임팩트 플래시를 지나 홀로그램으로 안착하는 브랜드 인트로. 로고를 넣고, 다듬고, 시퀀스로 내보내는 과정을 한 곳에서."
        aside={
          <div class="cluster" style="justify-content:flex-end">
            <a class="btn" href="/studio">
              작업실 열기
            </a>
            <a class="btn btn--quiet" href="/preview">
              먼저 보기
            </a>
          </div>
        }
      />

      <div class="shell reveal">
        <Stage />
      </div>

      <section class="section">
        <div class="shell">
          <div class="section__head">
            <p class="eyebrow">Workflow</p>
            <h2 class="h-section">다섯 단계, 다섯 화면</h2>
          </div>
          <div class="rows">
            {FEATURES.map((feature) => (
              <a href={feature.href} class="feature-row">
                <span class="mono-label">{feature.index}</span>
                <span class="feature-row__body">
                  <span class="h-card">{feature.title}</span>
                  <span class="caption">{feature.body}</span>
                </span>
                <span class="feature-row__go" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

/* ===== /studio =================================================== */

export function StudioPage() {
  return (
    <>
      <PageHead
        eyebrow="One-stop logo workflow"
        title="로고 작업실"
        lede="파일 업로드, Genspark AI 생성, 결과 가져오기 중 하나로 로고를 확정하고 애니메이션 강도를 조절합니다."
        aside={
          <p id="studio-status" class="status" role="status" aria-live="polite">
            로고를 준비해 주세요
          </p>
        }
      />

      <section class="section section--flush">
        <div class="shell studio-grid">
          {/* ---- 01 Source ---- */}
          <div class="studio-col stack stack-md">
            <div class="spread">
              <h2 class="h-card">
                <span class="mono-label">01</span> 로고 소스
              </h2>
              <button id="new-project-btn" type="button" class="btn btn--quiet">
                새 프로젝트
              </button>
            </div>

            <div class="segmented segmented--light" role="tablist" aria-label="로고 소스 방식">
              <button id="source-mode-upload" type="button" class="is-active" role="tab" aria-selected="true">
                업로드
              </button>
              <button id="source-mode-ai" type="button" role="tab" aria-selected="false">
                AI 생성
              </button>
              <button id="source-mode-import" type="button" role="tab" aria-selected="false">
                가져오기
              </button>
            </div>

            <div id="upload-source-panel">
              <label id="logo-dropzone" class="dropzone" for="logo-upload">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                />
                <strong class="h-card">파일을 놓거나 클릭해 선택</strong>
                <span class="caption">PNG · JPEG · WebP · SVG · 투명 배경 권장</span>
              </label>
            </div>

            <div id="ai-source-panel" class="stack stack-sm" hidden>
              <div class="field">
                <label for="ai-brand-name">브랜드 이름</label>
                <input id="ai-brand-name" class="input" type="text" placeholder="PLAZION" />
              </div>
              <div class="field">
                <label for="ai-logo-prompt">로고 설명</label>
                <textarea
                  id="ai-logo-prompt"
                  class="textarea"
                  placeholder="브랜드 성격, 심볼, 컬러와 분위기를 설명하세요."
                ></textarea>
              </div>
              <div class="pair">
                <div class="field">
                  <label for="ai-logo-type">로고 형태</label>
                  <select id="ai-logo-type" class="select">
                    <option value="wordmark">워드마크</option>
                    <option value="symbol">심볼</option>
                    <option value="lockup" selected>
                      심볼 + 워드마크
                    </option>
                  </select>
                </div>
                <div class="field">
                  <label for="ai-logo-style">스타일</label>
                  <select id="ai-logo-style" class="select">
                    <option value="future metallic">퓨처 메탈릭</option>
                    <option value="flat geometric">플랫 지오메트릭</option>
                    <option value="editorial minimal">에디토리얼 미니멀</option>
                    <option value="organic">오가닉</option>
                  </select>
                </div>
              </div>
              <div class="pair">
                <div class="field">
                  <label for="ai-logo-palette">컬러</label>
                  <input id="ai-logo-palette" class="input" type="text" placeholder="#A8E85C 단색" />
                </div>
                <div class="field">
                  <label for="ai-logo-model">모델</label>
                  <select id="ai-logo-model" class="select">
                    <option value="nano-banana-2-flash-lite">빠른 생성</option>
                    <option value="nano-banana-2">표준</option>
                    <option value="nano-banana-pro">고품질</option>
                    <option value="gpt-image-2">GPT Image 2</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label for="ai-logo-avoid">피할 요소</label>
                <input id="ai-logo-avoid" class="input" type="text" placeholder="순환 화살표, 지구본, 새싹" />
              </div>
              <div class="field">
                <label for="ai-logo-originality">독창성</label>
                <input id="ai-logo-originality" class="range" type="range" min="0" max="100" value="60" />
              </div>
              <button id="generate-logo-btn" type="button" class="btn">
                Genspark AI로 생성
              </button>
              <p class="micro">
                생성은 Genspark 크레딧을 사용하며 Orbitron의 <code>GSK_API_KEY</code>로 호출됩니다.
              </p>
            </div>

            <div id="import-source-panel" class="stack stack-sm" hidden>
              <div id="genspark-paste-zone" class="dropzone" tabindex="0">
                <strong class="h-card">이미지를 여기에 붙여넣기</strong>
                <span class="caption">Genspark 결과를 복사한 뒤 Ctrl+V</span>
              </div>
              <div class="field">
                <label for="genspark-import-url">또는 이미지 주소</label>
                <input id="genspark-import-url" class="input" type="url" placeholder="https://...genspark.ai/..." />
              </div>
              <button id="import-genspark-btn" type="button" class="btn btn--ghost">
                주소로 가져오기
              </button>
            </div>

            <p id="source-ready-status" class="status"></p>
          </div>

          {/* ---- 02 Settings ---- */}
          <div class="studio-col stack stack-md">
            <h2 class="h-card">
              <span class="mono-label">02</span> 애니메이션 설정
            </h2>

            <div class="field">
              <label for="project-name">프로젝트 이름</label>
              <input id="project-name" class="input" type="text" placeholder="PLAZION VFX Intro" />
            </div>

            <div class="field">
              <label for="preset-select">프리셋</label>
              <div class="cluster" style="flex-wrap:nowrap">
                <select id="preset-select" class="select"></select>
                <button id="delete-preset-btn" type="button" class="btn btn--ghost btn--sm">
                  삭제
                </button>
              </div>
            </div>

            <div class="field">
              <div class="spread">
                <span class="field-label">글로우</span>
                <span id="glow-value" class="mono-label">100%</span>
              </div>
              <input id="glow-range" class="range" type="range" min="0" max="200" value="100" />
            </div>

            <div class="field">
              <div class="spread">
                <span class="field-label">모션 에너지</span>
                <span id="energy-value" class="mono-label">100%</span>
              </div>
              <input id="energy-range" class="range" type="range" min="40" max="180" value="100" />
            </div>

            <fieldset class="field fieldset">
              <legend class="field-label">출력 화면비</legend>
              <label class="checkline">
                <input type="radio" name="studio-aspect" value="landscape" checked />
                <span>16:9 · 1920×1080</span>
              </label>
              <label class="checkline">
                <input type="radio" name="studio-aspect" value="portrait" />
                <span>9:16 · 1080×1920</span>
              </label>
            </fieldset>

            <label class="checkline">
              <input id="auto-preset-toggle" type="checkbox" checked />
              <span>
                저장 시 프리셋 자동 등록
                <br />
                <span class="micro">현재 설정을 다음 프로젝트에서도 바로 사용합니다.</span>
              </span>
            </label>

            <div class="studio-preview">
              <div class="spread">
                <p class="mono-label">Live preview</p>
                <p class="mono-label"><span id="loop-count">0</span> loops</p>
              </div>
              {/* Which animation plays here: the built-in engine, or — after a
                  handoff is adopted — that handoff's own concepts. */}
              <div class="field" id="studio-anim-field" hidden>
                <select id="studio-anim" class="select select--on-dark"></select>
              </div>
              <div id="canvas-wrap" class="canvas-wrap canvas-wrap--landscape">
                <canvas id="intro-canvas" width="1920" height="1080" aria-label="설정 미리보기"></canvas>
              </div>
              <div id="studio-proto" class="handoff-frame" hidden></div>
              <p id="studio-anim-note" class="micro"></p>
            </div>

            <button id="save-project-btn" type="button" class="btn">
              프로젝트 저장
            </button>

            <hr class="rule" />

            <div class="cluster">
              <a id="studio-preview-btn" class="btn btn--quiet" href="/preview">
                미리보기에서 열기
              </a>
              <a id="studio-download-btn" class="btn btn--quiet" href="/preview#export">
                PNG 시퀀스 내보내기
              </a>
              <button id="download-current-logo-btn" type="button" class="btn btn--quiet">
                현재 로고 다운로드
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ===== /preview ================================================== */

export function PreviewPage() {
  return (
    <>
      <PageHead
        eyebrow="Preview · export"
        title="미리보기"
        lede="현재 로고로 3초 루프를 재생합니다. 투명 PNG 90장을 폴더에 직접 저장하거나 서버 보관함으로 올릴 수 있습니다."
        aside={
          <a class="btn btn--quiet" href="/studio">
            작업실에서 편집
          </a>
        }
      />

      <div class="shell reveal" id="export">
        <div class="stage">
          <div class="stage__top">
            {/* Source first: the built-in engine and an imported prototype are
                different animations, not two views of one. */}
            <div class="field stage__source">
              <label class="mono-label" for="source-select">Animation</label>
              <select id="source-select" class="select select--on-dark"></select>
            </div>

            <div id="aspect-toggle" class="segmented" role="tablist" aria-label="화면 비율">
              <button type="button" class="aspect-btn is-active" data-aspect="landscape" role="tab" aria-selected="true">
                16:9
              </button>
              <button type="button" class="aspect-btn" data-aspect="portrait" role="tab" aria-selected="false">
                9:16
              </button>
            </div>

            <p class="loop-badge">
              <span id="loop-count">0</span> loops
            </p>
          </div>

          <div id="engine-view">
            <div id="canvas-wrap" class="canvas-wrap canvas-wrap--landscape">
              <canvas id="intro-canvas" width="1920" height="1080" aria-label="인트로 미리보기"></canvas>
              <div id="sound-gate" class="sound-gate">
                <div class="sound-gate__inner">
                  <h2>사운드와 함께 재생</h2>
                  <p>브라우저 정책상 클릭 후 오디오가 활성화됩니다</p>
                  <button id="sound-gate-btn" type="button" class="stage-btn stage-btn--solid">
                    재생 시작
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Imported prototypes are untrusted HTML: sandboxed, no same-origin. */}
          <div id="proto-view" class="handoff-frame" hidden></div>

          <p id="source-note" class="export-status__note"></p>

          <div class="stage__controls">
            <button id="mute-toggle" type="button" class="stage-btn" aria-pressed="true">
              <span id="mute-label">사운드 켜짐</span>
            </button>
            <button id="restart-btn" type="button" class="stage-btn">
              다시보기
            </button>
            <a id="download-logo" href="/static/plazion_logo.png" download class="stage-btn">
              로고 원본
            </a>
            <button id="download-sequence" type="button" class="stage-btn stage-btn--solid">
              <span id="sequence-label">폴더에 PNG 시퀀스 저장</span>
            </button>
            <button id="upload-sequence" type="button" class="stage-btn" hidden>
              <span id="upload-label">서버 보관함에 저장</span>
            </button>
          </div>

          {/* Server-side rendering. Works for imported prototypes too, which
              the browser cannot capture from a sandboxed iframe. */}
          <div id="render-panel" class="stage__controls" hidden>
            <button id="render-mp4" type="button" class="stage-btn stage-btn--solid">
              MP4 렌더링
            </button>
            <label class="stage-field">
              <span class="mono-label">다른 형식</span>
              <select id="render-format" class="select select--on-dark">
                <option value="png">PNG 시퀀스 · 투명 가능</option>
                <option value="webm">WebM · VP9 · 투명 가능</option>
                <option value="mov">MOV · ProRes 4444 · 투명 가능</option>
              </select>
            </label>
            <button id="render-alt" type="button" class="stage-btn">
              선택 형식으로 렌더링
            </button>
            <label class="checkline checkline--on-dark">
              <input id="render-transparent" type="checkbox" />
              <span>투명 배경</span>
            </label>
            <label class="stage-field">
              <span class="mono-label">FPS</span>
              <select id="render-fps" class="select select--on-dark select--slim">
                <option value="24">24</option>
                <option value="30" selected>30</option>
                <option value="60">60</option>
              </select>
            </label>
            <label class="stage-field">
              <span class="mono-label">길이(초)</span>
              <input id="render-duration" class="input input--on-dark" type="number" min="0.5" max="30" step="0.5" value="5" />
            </label>
          </div>

          <p id="render-status" class="export-status__note" role="status" aria-live="polite"></p>
          <div id="export-status" class="export-status" role="status" aria-live="polite" hidden>
            <div class="export-status__row">
              <span id="export-status-text">프레임 준비 중</span>
              <span id="export-progress-value">0%</span>
            </div>
            <div class="progress" aria-hidden="true">
              <span id="export-progress-bar"></span>
            </div>
            <p id="export-status-note" class="export-status__note">
              현재 화면비 · 30fps · 3초 · 투명 PNG 90장
            </p>
          </div>
        </div>
      </div>

      <section class="section">
        <div class="shell">
          <div class="section__head">
            <p class="eyebrow">Master specification</p>
            <h2 class="h-section">스펙</h2>
          </div>
          <dl class="spec-rows">
            {[
              ['Duration', '3.0s', '루핑'],
              ['Landscape', '1920 × 1080', '16:9'],
              ['Portrait', '1080 × 1920', '9:16'],
              ['Frame rate', '60fps', '웹 / 30fps PNG 시퀀스'],
              ['Background', '#020009', '+ rgba(40,15,80,.35) 비네트'],
              ['Primary', '#6C33D9 → #A874FF', '브랜드 퍼플 그라디언트'],
              ['Accent glow', '#B782FF', 'shadowBlur 45px'],
              ['Impact flash', 'rgba(230,210,255,.55)', '피크 프레임 56'],
            ].map(([label, value, note]) => (
              <div>
                <dt class="mono-label">{label}</dt>
                <dd>
                  <strong>{value}</strong> <span class="caption">{note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          <div class="section__head">
            <p class="eyebrow">Timeline · variant 03</p>
            <h2 class="h-section">3초 안에서 일어나는 일</h2>
          </div>
          <ol class="timeline">
            {[
              ['0.15 – 1.60s', '보크셀 팝인', '11–14px 셀이 로고 색을 샘플링, 중심에서 거리 기반 딜레이 + 지터로 순차 등장 (easeOutBack 오버슈트).'],
              ['1.42 – 1.90s', '글리치', '프레임당 4개 수평 바가 ±80px 시프트, 퍼플 틴트 15–35%. Whoosh SFX 트리거.'],
              ['1.85 – 2.05s', '임팩트 플래시', '서브붐 SFX, 피크 프레임 56.'],
              ['1.85 – 2.75s', '쇼크웨이브', '단일 링, 반경 → hypot(w,h) × 0.6, 불투명도 0.9 → 0.'],
              ['1.90 – 2.20s', '클린 로고 리빌', '45px 퍼플 글로우와 함께 크로스페이드 인.'],
              ['2.15 – 3.00s', '홀로그램 아이들', '3px 스캔라인 + 이동 스캔밴드, 로고 ±6% 플리커.'],
            ].map(([time, title, body]) => (
              <li>
                <span class="mono-label">{time}</span>
                <span class="timeline__body">
                  <strong>{title}</strong>
                  <span class="caption">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p class="micro" style="margin-top:24px">
            오디오는 외부 파일 없이 WebAudio로 절차 생성됩니다 — Sub Boom(120→32Hz), Noise Sweep(1800→180Hz
            LPF), Transient Click, Whoosh(400→3200Hz BPF).
          </p>
        </div>
      </section>
    </>
  )
}

/* ===== /library ================================================== */

export function LibraryPage() {
  return (
    <>
      <PageHead
        eyebrow="Projects · presets"
        title="라이브러리"
        lede="저장한 프로젝트와 프리셋. 서버 저장소가 연결돼 있으면 어느 기기에서나 같은 목록이 보입니다."
        aside={
          <div class="cluster" style="justify-content:flex-end">
            <input id="library-search" class="input" type="search" placeholder="이름으로 검색" />
            <button id="refresh-library-btn" type="button" class="btn btn--ghost btn--sm">
              새로고침
            </button>
          </div>
        }
      />

      <section class="section section--flush">
        <div class="shell">
          <div id="library-grid" class="rows"></div>
          <p id="library-empty" class="empty">
            <strong>아직 저장된 프로젝트가 없습니다</strong>
            <span class="caption">
              작업실에서 로고를 확정하고 저장하면 여기에 쌓입니다.
            </span>
            <span>
              <a class="btn btn--quiet" href="/studio">
                작업실 열기
              </a>
            </span>
          </p>
        </div>
      </section>

      <section class="section">
        <div class="shell">
          <div class="section__head">
            <p class="eyebrow">Presets</p>
            <h2 class="h-section">프리셋</h2>
          </div>
          <div id="preset-rows" class="rows"></div>
        </div>
      </section>
    </>
  )
}

/* ===== /handoff ================================================== */

export function HandoffPage() {
  return (
    <>
      <PageHead
        eyebrow="Genspark project handoff"
        title="핸드오프 가져오기"
        lede="Genspark가 내보낸 프로젝트를 통째로 가져옵니다 — HTML 프로토타입, 애니메이션 참조 코드, 로고와 에셋, 해상도·FPS·타임라인 스펙, Remotion 프로젝트까지."
        aside={
          <p id="handoff-status" class="status" role="status" aria-live="polite"></p>
        }
      />

      <section class="section section--flush" id="handoff-section">
        <div class="shell stack stack-md">
          <div class="handoff-intake">
            <label id="handoff-dropzone" class="dropzone" for="handoff-upload">
              <input id="handoff-upload" type="file" accept=".zip,application/zip" hidden />
              <strong class="h-card">project.zip 을 놓거나 클릭</strong>
              <span class="caption">README의 마스터 스펙과 타임라인을 자동으로 읽습니다</span>
            </label>
            <div class="handoff-intake__or">
              <button id="handoff-folder-btn" type="button" class="btn">
                압축 푼 폴더 선택
              </button>
              <input id="handoff-folder-input" type="file" multiple hidden />
              <p class="micro">
                폴더 선택을 지원하지 않는 브라우저에서는 ZIP을 그대로 올리세요.
              </p>
            </div>
          </div>

          <div id="handoff-list" class="rows"></div>
          <p id="handoff-empty" class="empty">
            <strong>아직 가져온 핸드오프가 없습니다</strong>
            <span class="caption">Genspark 프로젝트를 내보내 압축을 푼 폴더를 선택해 보세요.</span>
          </p>
          <div id="handoff-detail" class="handoff-detail" hidden></div>
        </div>
      </section>
    </>
  )
}

/* ===== /archive ================================================== */

export function ArchivePage() {
  return (
    <>
      <PageHead
        eyebrow="Server archive"
        title="보관함"
        lede="서버에 올린 PNG 시퀀스 아카이브입니다. 각 항목은 고유 토큰 링크로만 내려받을 수 있습니다."
        aside={<p id="archive-note" class="status" role="status" aria-live="polite"></p>}
      />

      <section class="section section--flush">
        <div class="shell">
          <div id="library-list" class="rows"></div>
          <p id="archive-empty" class="empty">
            <strong>보관된 시퀀스가 없습니다</strong>
            <span class="caption">미리보기에서 “서버 보관함에 저장”을 누르면 여기에 쌓입니다.</span>
            <span>
              <a class="btn btn--quiet" href="/preview">
                미리보기로 이동
              </a>
            </span>
          </p>
          <p id="library-note" class="micro" style="margin-top:24px"></p>
        </div>
      </section>
    </>
  )
}
