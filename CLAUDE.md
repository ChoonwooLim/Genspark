# Logo Studio

브랜드 로고 한 장에서 로고 스팅(로고 엔딩·인트로) 영상을 만드는 웹 스튜디오.
저장소 이름은 `Genspark` 이지만 실제 내용은 Logo Studio 다 — 이름과 내용이
어긋나 있으니 혼동하지 말 것.

- 배포: <https://genspark.twinverse.org> (Orbitron, 컨테이너 `orbitron-genspark-*`)
- 저장소: `ChoonwooLim/Genspark` · 기본 브랜치 `main`

## 지금 무엇을 하고 있는가

**Logo Sting Studio(AI 생성 + 후반작업)를 이 저장소로 흡수 통합하는 중이다.**

정본은 **`docs/logo-studio-design.md`** — 통합 설계 완성본이다.
새 세션은 **이 문서를 먼저 읽고** 시작한다. 아키텍처·엔진 설계·오디오 파이프라인·
마이그레이션(M1~M5)·QA·실측 근거가 전부 거기 한 곳에 있다.

`docs/superpowers/` 아래 문서들은 통합 이전의 기록이며 배너가 달려 있다.
**갱신하지 않는다.** 고칠 일이 있으면 정본을 고친다.

**핵심 기능은 `seedance` 엔진이다** — 로고 *자체*가 재질과 형태를 바꾸며 만들어진다.
용융 크롬이 글자로 단조되고, 파편이 글자로 스냅하고, 새싹이 글자를 엮어낸다.
로고를 배경 위에 얹는 `composite` 는 워드마크가 한 픽셀도 달라지면 안 되는
경우의 **안전판**이지 기본 경로가 아니다. 우선순위를 뒤집지 말 것.

**M3 이 목표다.** M1·M2 는 자리를 만드는 작업이고 M4 는 그 뒤의 선택지다.

오디오(효과음·음악)는 정본 8장. **Higgsfield 로는 음악·효과음을 만들 수 없다** —
`generate_audio` 는 TTS 전용이고 `sonilo_music`·`mirelo_text_to_audio` 는 게임
파이프라인 전용이다. 외부 제공자 3층(MMAudio / ElevenLabs SFX / Stable Audio)을 쓴다.

`docs/superpowers/plans/2026-08-30-logo-sting-core-pipeline.md` 는 통합 이전에
Python 신규 저장소를 전제로 쓴 계획이다. **인프라 부분은 폐기됐고 로직만 살아남는다.**
파일 상단 배너 참조.

## 아키텍처

Hono + TypeScript + Vite. **듀얼 런타임**이다.

| 진입점 | 대상 | 비고 |
|---|---|---|
| `src/index.tsx` | Cloudflare Workers | 정적 셸만. API 는 스텁 |
| `src/server.node.ts` | Node 컨테이너 (Orbitron) | **실제 기능은 전부 여기** |
| `src/app.tsx` | 공유 | 런타임 비종속 페이지/라우트 |

**렌더는 Node 전용이다.** Workers 에는 Chromium 도 ffmpeg 도 없다.
Workers 쪽에 렌더 기능을 추가하려 들지 말 것.

### 파일 지도

| 파일 | 책임 |
|---|---|
| `src/pages.tsx` | 6개 페이지 전체 (홈·작업실·미리보기·라이브러리·핸드오프·보관함) |
| `src/render.node.ts` | Playwright 프레임 캡처 → ffmpeg 인코딩. **통합 M1 에서 오케스트레이터로 축소 예정** |
| `src/logos.node.ts` | `studio_logos` · `studio_presets` CRUD |
| `src/sequences.node.ts` | PNG 시퀀스 업로드·다운로드 |
| `src/handoff.node.ts` | Genspark Design 번들 임포트. **통합 M2 에서 제거 예정** |
| `src/genspark-image.ts` | Genspark AI 로고 생성 프록시 |
| `src/storage.node.ts` | Postgres 풀·업로드 경로 해석 |
| `public/static/*.js` | 바닐라 JS 프론트엔드 (`vfx-intro.js` 가 Canvas 렌더러) |

### 테이블

`studio_logos` · `studio_presets` · `renders` · `handoff_bundles`(제거 예정)

## 개발

```bash
npm run dev            # Vite + Workers 런타임 (API 스텁)
npm start              # build:node && node dist-node/server.js — 실제 기능
```

Node 경로로 띄워야 렌더·저장이 동작한다. `npm run dev` 만으로는 API 가 스텁이다.

## 환경변수

| 이름 | 용도 |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_FILE` | PostgreSQL |
| `UPLOAD_DIR` | 영구 볼륨 경로 |
| `GSK_API_KEY` · `GSK_API_BASE_URL` | Genspark AI 로고 생성 |
| `STUDIO_ADMIN_TOKEN` | 쓰기 API 보호 (단일 공유 토큰) |
| `CHROMIUM_EXECUTABLE_PATH` | 기본 `/usr/bin/chromium` |
| `PORT` | Orbitron 이 주입 |

인증은 **공유 토큰 하나**다. 멀티테넌시가 아니다. 외부 개방은 별도 과제.

## 배포 규칙

- **Dockerfile 을 반드시 유지한다.** Orbitron 자동 생성 이미지는 chromium 도 ffmpeg 도
  없어서 렌더가 죽는다. 파일 상단 주석에 이유가 적혀 있다
- Debian(`node:20-bookworm-slim`) 을 쓴다 — Playwright 가 musl 을 지원하지 않는다
- Windows 에서는 커밋·푸시만. 배포는 Orbitron 에서
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` — 이미지에 이미 크로미움이 있다

## 작업 규칙

- **크레딧을 쓰는 호출은 절대 자동 재시도하지 않는다.** Seedance 생성·업스케일이
  해당한다. 실패하면 멈추고 사람에게 묻는다
- **생성 원본은 덮어쓰지 않는다.** 후반작업본은 `source_render_id` 로 참조하는 별개 행이다
- 영상 검수는 **콘택트 시트 1장**으로 한다. 전 프레임을 읽으면 토큰이 폭발한다
  (5초 영상 = 약 22만 토큰, 콘택트 시트 = 약 1.5천)
- 콘택트 시트는 **사람이 보는 용도**다. 생성 모델에 레퍼런스로 넣으면 격자가 출력에 박힌다

## 커밋 메시지

`feat:` 새 기능 / `fix:` 버그 / `refactor:` 리팩토링 / `docs:` 문서 / `chore:` 잡무
