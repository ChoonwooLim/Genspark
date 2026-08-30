# Logo Studio 설계 — 재설계 정본

작성일: 2026-08-30 (3차. 2차 프로·에이전시 설계를 독립 리뷰 후 보정)
상태: 설계 확정 · **Gate 0 검증 전** · 구현 미착수
대상 저장소: 이 저장소(Genspark)

> **이 문서가 정본이다.** `docs/superpowers/specs/*` 와 `docs/superpowers/plans/*` 는
> 이 문서 이전의 기록이다. 3차 보정의 판정 근거는
> `docs/fable-logo-studio-revision-report.md` 에 있다. 충돌하면 이 문서를 따른다.
>
> 이 문서의 수치 중 **부록 A 실측값은 2026-08-30 Higgsfield MCP 경유 Seedance 2.5,
> 브랜드 2개, 16편 표본의 관찰값**이다. API 계약이나 보편 사실이 아니다. 문서 전체에서
> "실측" 이라 쓴 값은 모두 이 범위다.

---

## 0. 한 문단 요약

브랜드 로고 한 장을, **아트 디렉션이 가능한 시네마틱 로고 스팅과 검수 증적이 붙은
납품 키트**로 — 몇 주가 아니라 한 시간 안에. 대상은 브랜딩·콘텐츠 에이전시다. 해자는
생성 모델이 아니라 **Direction IR · 로고 충실도 계약(Safe/Transform) · 임팩트 동기
사운드 · 검증된 납품 키트 · 승인 흐름** 이다. 생성 모델은 어댑터 뒤에 두고 교체 가능하게
만든다. 구현은 Gate 0 → P0–P6, **P2 가 첫 제품 목표**다. Gate 0 은 구현이 아니라
"이 가설에 재플랫폼 비용을 써도 되는가"를 먼저 확인하는 의사결정이다.

---

# Part I · 제품

## 1. 포지셔닝

> 범용 AI 영상 편집기가 아니라, **정확한 브랜드 엔드카드와 검수 증적을 제공하는
> 시네마틱 로고 스팅 프로덕션 시스템.**

**제품 범위:** 5초 안팎의 시네마틱 **래스터** 로고 스팅. Lottie·Rive·SVG 인터랙티브
로고 애니메이션, 범용 모션 그래픽 편집기, 장편 편집기를 대체한다고 주장하지 않는다.

### 1.1 경쟁 지형 (2026-08-30 공식 자료 기준)

경쟁사가 "못 한다"고 단정하지 않는다. 확인된 것과 확인하지 못한 것을 나눈다.

| 영역 | 확인된 사실 | 우리가 다르게 하는 것 |
|---|---|---|
| 템플릿 툴 (Renderforest 등) | MP4 다운로드, 최대 1080p, 투명 PNG 로고 업로드 [B1] | 템플릿이 아니라 로고 *자체*가 형성되는 연출. 엔드카드 충실도 QA 증적 |
| 모션 도구 (Jitter 등) | ProRes4444·투명 WebM/MOV·Lottie·4K·120fps 내보내기 [B2] | 손으로 키프레임을 짜지 않는다. 생성 + 착지 고정 + 승인 흐름 |
| 범용 생성 모델 (Runway·Veo·Seedance·Luma) | Runway Gen-4.5: ProRes·PNG/EXR 시퀀스·HDR [B3]. Veo 3.1: 네이티브 오디오, 프레임 지정 생성 [B4]. Seedance 2.5: 멀티모달 레퍼런스, 최대 30초 [B5] | 이들은 **강력한 부품**이다. 로고 충실도 계약, ROI 기반 QA 증적, 비용·재개 제어, 스팅 전용 승인·납품 단위를 **하나의 흐름**으로 제공하지 않는다 (공식 제품 자료에서 확인하지 못함 — 비교에 근거한 추론) |
| 모션 디자이너 외주 (AE 등) | 1–3주, 수정 왕복 | 첫 유효 방향까지 30분 이내(제안 목표), 변주 격자에서 비교 선택 |

**해자는 모델이 아니다.** 생성 모델은 6개월마다 바뀌고 상품화된다. 남는 것:

1. **Direction IR** — 연출 의도를 모델 무관 중간 표현으로 컴파일하는 버전형 층
2. **충실도 계약** — Safe/Transform 두 모드의 보장 범위가 QA 로 증명된다
3. **임팩트 동기 사운드** — 화면 사건과 정렬된 3층 오디오 (라이선스 게이트 통과분만)
4. **검증된 납품 키트** — 포맷 목록이 아니라 decode 후 QA 를 통과한 delivery profile + provenance
5. **승인 흐름** — 내부 승인과 고객 승인이 분리된 상태·증적

## 2. ICP 와 JTBD (초기 검증 대상)

아래는 **초기 검증 대상 ICP** 다. Gate 0 인터뷰로 확정하거나 수정한다.

> 월 5–30개의 브랜드 영상·캠페인 산출물을 납품하며, 크리에이티브 디렉터·디자이너·
> 프로듀서가 함께 일하는 3–30인 브랜딩·콘텐츠 에이전시.

| 역할 | JTBD | 화면 |
|---|---|---|
| 디자이너 | 30분 안에 고객 브랜드에 맞는 모션 방향 세 가지를 제시한다 | Brand · Direct · Explore |
| 프로듀서 | 선택된 방향을 안전한 최종본으로 만들고 비용·수정 이력을 관리한다 | Refine · 원장 |
| 고객 승인자 | 로그인 없이 버전을 비교하고 변경 요청 또는 승인을 남긴다 | 리뷰 링크 |
| 납품 담당 | 채널별 마스터·무음본·레이어·오디오·권리 증적을 한 번에 전달한다 | Deliver |

## 3. 제품 원칙 (설계 전체를 구속)

- **로고는 절대 그리게 하지 않는다.** 모델은 *로고에 도달하는 과정*만 만든다
- **보장은 증명 가능한 범위만 약속한다.** Safe/Transform 계약(§4)이 정의한 대상·프레임·ROI·코덱 밖에서 "보증"이라는 말을 쓰지 않는다
- **비싼 호출 앞에는 항상 싼 단계가 있다.** 드래프트 → 정제 → 히어로
- **검수는 사람이 한다.** 자동 QA 는 통과/경고 배지와 증적을 만들 뿐 승인하지 않는다
- **생성본은 불변.** 모든 후처리는 파생 행이며 계보가 추적된다
- **원가가 항상 보인다.** 제출 전 견적, 예산 예약, 실제 정산, 프로젝트 원장
- **벤더는 교체 가능.** 생성 · 오디오 · 저장소 전부 어댑터 뒤에. 제공자는 **라이선스 게이트를 통과한 뒤에만** 제품에 들어온다
- **Quick 은 기본값을 숨기는 것이지 단계를 숨기는 것이 아니다.** 검수와 비용 단계는 어느 경로에서도 생략되지 않는다
- **모든 단계를 눈으로 본다.** 파이프라인의 각 단계가 산출물 미리보기와 함께 실시간으로 보인다

## 4. 로고 충실도 계약 — Safe 와 Transform

"워드마크 픽셀 보증"은 착지 교체만으로는 영상 전체에 대해 성립하지 않는다. 보장 범위를
두 모드로 나누고, 각각 QA 로 증명 가능한 범위만 약속한다.

| 모드 | 생성 방식 | 보장 범위 (QA 로 증명) | 사용자 고지 |
|---|---|---|---|
| **Transform** (기본 창작 경로) | AI 가 재질·형성 과정을 만들고, 마지막 구간을 원본 엔드카드로 착지 | **최종 홀드/엔드카드 구간**의 로고 기하·색. 대상: 납품 파일 decode 후 마지막 `holdSeconds` 구간 프레임의 로고 ROI | 중간 형성 구간은 변형될 수 있다. 사람 검수 필수 |
| **Safe** (안전판) | AI 는 배경·VFX 플레이트만 만들고, 실제 로고 레이어(canvas)를 합성 | 로고가 표시되는 **모든 구간**의 로고 레이어 + 최종 엔드카드. 대상: 납품 파일 decode 후 로고 노출 구간 전체의 ROI | 창의적 변형은 제한된다. 브랜드 정확성 우선 |

- **Transform 이 기본이다.** Safe 는 워드마크가 한 프레임도 달라지면 안 되는 브랜드를 위한 fallback 이며, 우선순위를 뒤집지 않는다
- Safe 는 **P2 부터** 제공한다. 제품 약속("브랜드 안전 옵션이 있다")에 필요한 fallback 을 P5 까지 미루면 P2 파일럿에서 보수적인 브랜드를 잃는다
- 보장 문구는 항상 대상(파일·프레임 구간·ROI·코덱)을 붙인다. "엔드카드 충실도 보증(Transform)" · "로고 레이어 충실도 보증(Safe)"
- 보장의 판정 기준(§10)은 **Gate 0 코퍼스로 calibration 하기 전까지 실측 휴리스틱**이다. SLA 로 선언하지 않는다

## 5. 사용자 워크플로와 화면

```
Brand ─▶ Direct ─▶ Explore ─▶ Refine ─▶ Sound ─▶ Deliver
 브랜드     디렉션     탐색      정제      사운드     납품
 (무료)    (무료)   (저가 N편)  (히어로)   (소액)    (무료)
```

### 5.1 Brand — 브랜드 킷

- 입력: SVG(우선) / PNG(알파) / 시퀀스 프레임. 업로드 즉시 **trim 후** alpha·edge 오염도, 실제 바운딩 박스 기준 해상도 스캔 결과 표시(§10)
- 자동 추출: 지배색·보조색. 심볼/워드마크 분리는 연결 성분 분석으로 **제안**하고 **사용자가 확인**한다 — 자동 확정하지 않는다
- 라이트/다크 배경용 변형, 세이프존, 기본 배치(16:9 폭 62% · 9:16 78% · 1:1 72% — 실측 초기값). 소스가 실제 바운딩 기준 800px 미만이면 비율을 낮춘다
- **사용처·필수 비율·권리 확인·Safe/Transform 기본값**을 브랜드에 기록한다. 권리 확인은 "이 로고를 이 용도로 사용할 권한이 있다"는 체크와 시각·사용자 기록이다 — 법적 판단을 대신하지 않는다
- 산출: `brands` · `logos`(variant: symbol|wordmark|lockup, theme: light|dark)

### 5.2 Direct — 디렉션 보드 (제품의 심장)

Direction IR(§7.2)을 편집하는 화면. 시작은 **Look 프리셋**이지만 프리셋은 IR 초기값일 뿐이다.

| 항목 | 내용 |
|---|---|
| Purpose · Channel | 용도(엔딩/인트로/범퍼), 채널, 필수 비율·길이·fps |
| Logo policy | 사용할 variant, Safe/Transform, 최초 노출·완전 노출·최종 홀드 규칙 |
| World · Material · Formation · Camera · Light | 타입 + 강도(0–1) + 자유 보조 텍스트 |
| Tempo | `impactAt` · `riserFrom` · `holdSeconds` · motion intensity. 타임라인 바로 조정 |
| Palette | 브랜드 파생, 덮어쓰기 가능. 대비·배경 정책 |
| Constraints | 금지 요소(자연계 프리셋 자동 채움) + 브랜드 가이드 제약 |
| References | 이미지·영상·모션·오디오 레퍼런스 (모델 capabilities 에 따라 전달) |
| Pro prompt | **컴파일 결과 미리보기**. 직접 수정은 `vendorOverrides` 로 저장되고, 구조화 필드와 충돌하면 경고 |

- 보드는 **버전이 있다.** 어떤 렌더가 어떤 IR 버전·컴파일러 버전에서 나왔는지 항상 추적
- 우측에 **엔드프레임 라이브 프리뷰**(canvas, 무료·즉시) — 배치·여백 확정

### 5.3 Explore — 탐색 격자

- 보드 하나로 **N편(기본 4) 드래프트**: 같은 모델·같은 시드 정책·해상도만 낮춤·오디오 없음. (저가 모델 드래프트는 P5 실측 후)
- 격자에서 **동기 재생·A/B 비교·차이 축 표시**. ★ 선택 시 **선택 이유**를 한 줄 기록(승인 증적)
- 각 칸에 드래프트 원가와 히어로 승격 예상 원가
- 드래프트 마지막 프레임의 로고 ROI 가 엔드프레임과 크게 어긋나면 "착지 실패" 배지(§10)

### 5.4 Refine — 정제와 히어로 렌더

- 선택 드래프트 기준으로 IR 한 축만 바꿔 재탐색(자식 IR 버전)
- **히어로 렌더**: 1080p → 업스케일 옵션. 착지 교체·타이밍 정규화 자동
- **내부 검수 화면**: 콘택트 시트 + ROI QA 결과 + 경고 배지 → `creative_approved` / 반려(사유는 IR 버전에 기록)

### 5.5 Sound — 사운드 디자인

- `creative_approved` 된 히어로 위에 오디오 층 조립(§11). 파형 위 `impactAt` 마커
- 층별 게인·뮤트, 히어로 히트 교체, 음악 무드 재선택. 전부 `audio_manifest` 수정 + 재믹스(무료)

### 5.6 Deliver — 납품 키트와 고객 승인

- delivery profile(§12) 선택 → 인코딩 → **decode 후 QA** → `deliverables`
- **리뷰 링크**로 고객이 로그인 없이 A/B 비교·타임코드 코멘트·승인(§13). `client_approved` 시 버전 잠금
- ZIP + 개별 링크 + manifest

### 5.7 두 가지 속도, 한 파이프라인

- **Quick 경로 (기본)**: 로고 올리기 → Look 하나 → **[탐색 시작]**. 브랜드 스캔·엔드프레임·IR 기본값·드래프트 4편·자동 QA 가 이어서 돈다. 사용자는 격자에서 고르고 [히어로로], 검수 화면에서 승인, 기본 delivery profile 로 납품
- **Direct 경로**: 같은 화면에서 "디렉션 열기" → 보드 전체
- 두 경로는 **같은 파이프라인·같은 품질 설정**을 쓴다. Quick 은 선택지를 기본값으로 대신할 뿐 **검수·비용 확인·승인 단계를 건너뛰지 않는다.** 결과의 성패와 사용자 책임까지 같다고 주장하지 않는다
- Quick 이 약속하는 것은 클릭 수가 아니다: **빠른 첫 유효 방향 · 비교 가능한 탐색 결과 · 재현 가능한 수정 루프 · 제출 전 위험·비용 이해**

### 5.8 파이프라인 모니터

어떤 런이든 클릭하면 **실행 타임라인**이 열린다. `pipeline_steps` 행이 SSE 로 실시간 갱신된다.

```
● 엔드프레임 생성      0.8s   [썸네일 · sha256]
● 제출 (seedance)      1.2s   submission_id · vendor_job_id · 견적 45cr(예약)
◐ 생성 중              2m14s  벤더 상태 원문(redacted)
○ 다운로드                    [sha256 · codec]
○ 착지 교체 · 트림           [교체 전/후 마지막 프레임]
○ ROI QA                     [기하 Δ · CIEDE2000 · 배지]
○ 콘택트 시트
○ 오디오 층                  [층별 파형 + impactAt 마커]
○ 믹스 · 라우드니스          [I-LUFS · TP · transient Δ]
○ 정산                       45cr 확정 · 원장 행
```

- 단계마다 산출물 미리보기 · 해시. 실패는 단계명·에러 원문·**재개 가능 지점**을 표시
- `submission_unknown` 상태는 별도 배지로 — "제출됐는지 모름, 대사 필요"
- 프로젝트 상단 **진행 중 잡 트레이**. 워커 로그는 접힌 패널
- SSE 는 인증된 연결이며 `Last-Event-ID` 로 DB 에서 replay 한다(§8.4)

---

# Part II · 시스템

## 6. 아키텍처

**유지:** Hono · TypeScript · Node 컨테이너 · Postgres · Playwright+Chromium+ffmpeg Debian 이미지 · Orbitron 배포 · Dockerfile(`# CUSTOM`).
**바꾸는 것:** 프로세스 분리, 모듈 경계, 프론트, 운영 신뢰성.

```
┌──────────────── 브라우저 (React) ────────────────┐
│ Brand · Direct · Explore · Refine · Sound · Deliver │
│ 파이프라인 모니터 (SSE)   ·   리뷰 링크 (공개 뷰)   │
└──────────────┬──────────────────────┬────────────┘
               │ REST                  │ SSE (auth, Last-Event-ID)
┌──────────────▼──────────────────────▼────────────┐
│ web 프로세스 (Hono)                                │
│  api/*  · events(SSE, DB replay)                   │
└──────────────┬────────────────────────────────────┘
               │ Postgres: pg-boss 큐 + outbox (같은 트랜잭션)
┌──────────────▼────────────────────────────────────┐
│ worker 프로세스 (같은 이미지, 다른 CMD)              │
│  pipeline/  멱등 step 실행기 (lease · heartbeat)     │
│  engines/   registry + adapters                     │
│  audio/     providers (license-gated)               │
│  media/     ffmpeg · playwright (리소스 제한)        │
│  storage/   volume | s3 어댑터 (tenant prefix, signed URL) │
└───────────────────────────────────────────────────┘
```

### 6.1 핵심 결정

1. **web/worker 분리, 큐는 pg-boss(Postgres).** 같은 이미지에 `CMD` 만 다르게 — Orbitron 컨테이너 2개. **두 컨테이너가 같은 영구 볼륨을 안전하게 공유하는지는 Gate 0 에서 Orbitron 실측으로 확인**한다. 실패 시 P0 부터 object storage(MinIO — Orbitron 에 이미 `igos-minio` 존재)로 간다
2. **파이프라인은 멱등 단계 그래프.** 단계는 `(run_id, step_name, input_hash)` 로 식별되며 같은 키의 재실행은 기존 산출물을 반환한다. **계산 코어는 순수하지만 실행기는 side effect(벤더 호출·파일·DB)와 멱등성을 책임진다.** lease·heartbeat·fencing token 으로 중복 워커를 막고, 취소·재개 규칙은 §8.3
3. **DB 기록과 큐 투입은 한 트랜잭션.** 단계 결과 행 + 다음 단계 잡을 같은 Postgres 트랜잭션에 넣는다(pg-boss 의 외부 트랜잭션 전달 또는 outbox 테이블 + relay). 어느 쪽인지는 P0 첫 태스크에서 pg-boss 버전으로 확정
4. **엔진 계약은 능력 선언형** (§7.1). 라우터가 `capabilities` 로 후보를 거른다
5. **Direction IR 은 버전형 JSON** (§7.2). 어댑터의 `compile()` 이 모델 문법으로 변환
6. **벤더 통신은 서버 REST 어댑터.** MCP 는 사람이 세션에서 쓰는 도구다. **단, 서버에서 호출 가능한 Seedance REST 경로가 실제로 존재하는지는 미검증이다**(§7.3). Gate 0 의 첫 항목
7. **저장소 어댑터**: tenant prefix 키, 짧은 만료 signed URL, content hash. P0 은 볼륨, P2 종료 시 object storage 전환 여부 결정(리뷰 링크 트래픽·replica 수 기준)
8. **프론트: React + Vite + TypeScript**, TanStack Query · Zustand · SSE 훅. 디자인 토큰은 `docs/DESIGN-cohere.md` 승계. `/app/*` 스트랭글러
9. **인증·격리**: 모든 테이블에 `workspace_id`, 모든 조회·변경에 workspace 범위 강제(쿼리 계층 또는 RLS). P2 까지는 단일 워크스페이스 + `STUDIO_ADMIN_TOKEN` 이지만 **리뷰 링크 보안(§13)과 tenant 범위 강제는 P2 에 들어간다.** 다중 사용자·역할·SSO 는 P4/P6

### 6.2 모듈 지도 (신규)

| 경로 | 책임 |
|---|---|
| `src/web/` | Hono 앱, REST, SSE |
| `src/worker/` | pg-boss 소비자, 단계 실행기(lease/heartbeat) |
| `src/pipeline/*.ts` | `brand-scan` · `endframe` · `generate` · `reconcile` · `post` · `qa` · `audio` · `deliver` |
| `src/engines/` | `registry.ts` · `canvas.ts` · `seedance.ts` · `composite.ts`(Safe) |
| `src/direction/` | `ir.ts`(스키마·버전·마이그레이션) · `presets.ts` · `compile/*.ts` |
| `src/audio/` | `providers/*.ts` · `plan.ts` · `mix.ts` · `license.ts`(게이트) |
| `src/media/` | `ffmpeg.ts` · `playwright.ts` — CPU·메모리·시간 제한 래퍼 |
| `src/storage/` | 인터페이스 · `volume.ts` · `s3.ts` · signed URL |
| `src/billing/` | 견적 · 예약 · 정산 · 원장 |
| `src/review/` | 토큰 발급·해시·만료·폐기, 공개 뷰 |
| `src/db/` | 스키마 · 마이그레이션(forward/rollback) · 쿼리 |
| `app/` | React 프론트 |

## 7. 생성 엔진

### 7.1 엔진 계약

```ts
interface GenEngine {
  id: string                                    // 'seedance-2.5@higgsfield' 처럼 모델+경로
  modelVersion: string                          // 벤더가 노출하는 정확한 버전 문자열
  capabilities: {
    endImage: boolean; startImage: boolean; audio: boolean
    references: ('image'|'video'|'audio')[]
    durations: number[]; resolutions: string[]; aspects: string[]
    draftTier: boolean; idempotencyKey: boolean
  }
  estimate(req: GenRequest): Promise<Quote>      // {credits, currency, priceVersion, validUntil}
  submit(req: GenRequest, submissionId: string): Promise<VendorJob>   // 유일한 과금 지점
  poll(job: VendorJob): Promise<VendorStatus>
  reconcile(submissionId: string): Promise<VendorJob | null>          // 응답 유실 후 대사
  fetch(job: VendorJob): Promise<ArtifactPath>
  compile(ir: DirectionIR): CompiledRequest      // {prompt, params, compilerVersion}
}
```

- `endImage: false` 인 모델은 Transform 히어로에 못 쓴다
- `submit()` 은 **어떤 경우에도 자동 재시도하지 않는다.** 타임아웃·네트워크 오류는 `failed` 가 아니라 `submission_unknown` 으로 가고, `reconcile()` 로 대사한다(§8.3). 사용자의 재제출은 기존 제출의 재시도가 아니라 **새 `submission_id` 를 가진 replacement** 다
- 벤더가 idempotency key 를 지원하면 `submission_id` 를 전달한다

### 7.2 Direction IR — Brand Motion Brief

```ts
type DirectionIR = {
  irVersion: string                                // 스키마 버전. 프리셋 마이그레이션 기준
  purpose: 'ending'|'intro'|'bumper'; channel: string[]
  format: { aspect: string; durationSeconds: number; fps: number }
  logo: {
    logoId: string; variant: 'symbol'|'wordmark'|'lockup'
    mode: 'transform'|'safe'
    exposure: { firstVisibleAt?: number; fullyFormedAt: number; holdSeconds: number }
  }
  world: Axis; material: Axis; formation: Axis; camera: Axis; light: Axis   // {type, intensity 0–1, note?}
  tempo: { impactAt: number; riserFrom: number; motionIntensity: number }
  palette: { brand: string; accent: string; background: string; contrastPolicy: string }
  constraints: { forbidden: string[]; brandGuide: string[] }
  references: Array<{ kind: 'image'|'video'|'motion'|'audio'; assetId: string; role: string }>
  safeZone: { x: number; y: number; w: number; h: number }
  freeText?: string                                 // 구조화 필드에 **추가**될 뿐 무효화하지 못한다
  vendorOverrides?: Record<string, { prompt?: string; params?: object }>   // 모델별 직접 수정. 충돌 경고
}
```

- **우선순위**: 구조화 필드 > `freeText`(추가) > `vendorOverrides`(해당 모델에서만, 충돌 시 경고 배지). 어떤 층도 상위 층을 조용히 무효화하지 않는다
- 프리셋 = IR 초기값 묶음 + `irVersion`. 프리셋 6종(forge·shard·arc·dew·growth·mist)의 값은 2차 설계 그대로이며 초기값이다
- **제출 스냅샷**(`generations.snapshot`)에는 IR, 컴파일된 요청 원문, `compilerVersion`, `modelVersion`, 엔드프레임 sha256, seed, 벤더 응답(redacted)을 모두 저장한다
- 승인 기준·delivery profile 은 IR 이 아니라 프로젝트·납품 단위에 둔다(§9). IR 은 "무엇을 만들 것인가"만 담는다

### 7.3 Transform 경로 — Seedance 어댑터

**미검증 전제:** 2차 설계는 Higgsfield REST 로 Seedance 2.5 를 호출한다고 가정했다.
2026-08-30 기준 ByteDance 공식 Seedance 2.5 API 는 "BytePlus ModelArk 를 통해 제공 예정"
이며 [B5], Higgsfield 가 서버에서 호출 가능한 공개 REST 를 제공하는지는 **공식 자료로 확인하지
못했다.** 실측(부록 A)은 전부 Higgsfield **MCP** 경유다. → **Gate 0 항목 1.**

실측으로 관찰된 요청 형태(MCP 경유, 계약 아님):

```ts
{ model: 'seedance_2_5', mode: 'omni_reference',   // 없으면 422 관찰
  duration: 5, resolution: '1080p', aspect_ratio, bitrate_mode: 'high',
  generate_audio: false,
  medias: [{ role: 'end_image', value: endFrameMediaId }],   // 하나만
  prompt }
```

- `start_image` + `end_image` 동시 제공 시 워드마크 은색 변질 관찰(표본 내)
- 자연 계열은 부정 지시 필요 관찰
- 이 파라미터들은 REST 경로 확정 후 **contract test(recorded response)** 로 고정한다

### 7.4 엔드프레임 · canvas 엔진

canvas 엔진은 엔드프레임 생성, 무료 즉시 구도 확인, Safe 모드의 로고 레이어, 알파 소스를 맡는다. 기존 3초/30fps 하드코딩은 요청 파라미터로 뺀다. 엔드프레임은 sha256 이 스냅샷에 들어간다.

### 7.5 Safe 경로 — composite 엔진 (P2)

- AI 는 플레이트만: `end_image` 없이, 프롬프트에 `Absolutely no text, no letters, no logo, no typography anywhere in frame`
- canvas 가 **레이어 모드**로 로고 시퀀스를 만든다 — 플레이트의 `impactAt` 에 맞춰 나타나 정지, 자체 배경 효과 없음. 플레이트의 길이·fps 에 canvas 를 맞춘다(결정론적·무료)
- 합성: `ffmpeg overlay`. 보장 범위는 §4 Safe
- **P2 범위는 최소**: 레이어 모드 1종(fade-in + hold). 다양한 레이어 연출은 P5

## 8. 운영 신뢰성

### 8.1 과금 — 예약·제출·정산

```
견적(estimate) → 예산 예약(ledger: reserve) → submit → 벤더 응답
   → 정산(ledger: settle, 실제 차감) 또는 해제(ledger: release)
```

- `Quote` 에 벤더·모델·가격 버전·통화/크레딧 체계·유효 시각을 기록한다
- **프로젝트 예산 상한은 예약 시점에 검사**한다(동시 요청이 상한을 넘지 않도록 row lock)
- 정산 행은 벤더 청구 ID 를 가진다. 취소·환불은 `adjust` 행

### 8.2 제출 상태와 대사

```
queued → reserving → submission_pending → submitted → generating → fetched
                          │                                          
                          └─ submission_unknown ─(reconcile)─▶ submitted | not_submitted(release)
```

- `submission_unknown`: 요청은 보냈으나 응답을 못 받음. **자동 재시도 금지.** `reconcile()` 이 벤더에서 `submission_id`/idempotency key 로 조회. 벤더가 조회를 지원하지 않으면 사람이 벤더 대시보드와 대조해 수동 확정 — 모니터에 배지로 노출
- `(engine, vendor_job_id)` 유니크 제약으로 같은 벤더 잡이 두 생성 행에 붙지 못한다
- 사용자 재제출 = 새 `generations` 행 + 새 `submission_id` (`replaces_generation_id` 로 계보)

### 8.3 단계 멱등·lease·재개

- 단계 실행 전 `pipeline_steps` 에 `(run_id, step_name, input_hash)` 로 upsert. 이미 `done` 이면 산출물 반환
- 실행 중 lease(`leased_by`, `lease_until`, `fence`). heartbeat 로 연장. 만료 시 다른 워커가 인수하되 fence 가 낮은 쪽의 결과 쓰기는 거부
- 산출물 쓰기는 **해시 이름**(`sha256.ext`)으로 — 중복 실행이 같은 파일을 덮어써도 내용이 같다. 원장 정산은 `submission_id` 유니크로 중복 차단
- 취소: `cancel_requested` 플래그 → 단계 경계에서 종료. 유료 제출 이후 취소는 벤더 취소 API 가 있을 때만 시도, 없으면 결과를 받아 보관
- 재개: `fetched` 이후는 무료이므로 어느 단계에서든 재개 가능. 그 앞은 재제출(과금)이며 사람이 명시적으로 누른다

### 8.4 SSE

인증된 연결. 이벤트는 `pipeline_events`(append-only)에서 읽고 `Last-Event-ID` 로 replay. 다중 web replica 는 Postgres `LISTEN/NOTIFY` 로 fan-out(P0 은 단일 replica).

### 8.5 보안 기본선 (P2 전 완료)

| 영역 | 규칙 |
|---|---|
| Tenant | 모든 쿼리 workspace 범위 강제. storage key `ws/{workspace_id}/...`. 짧은 만료 signed URL |
| 업로드 | SVG 는 script·외부 참조·`foreignObject` 제거 후 래스터화(sandbox). MIME sniffing. 이미지 디코더 리소스 제한 |
| 미디어 처리 | ffmpeg/Playwright 에 CPU·메모리·wall-time 제한, 임시 디렉터리 격리 |
| 벤더 응답 | 저장 전 secret·개인정보 redaction |
| 리뷰 링크 | §13 |
| 자산 정책 | 브랜드 자산 보관 기간·삭제·복구, **모델 학습 사용 안 함** 명시 |

## 9. 데이터 모델

**원칙:** 생성본 불변 · 파생은 별개 행이고 계보가 있다 · 모든 행에 `workspace_id` · 원장은 append-only · 모든 산출물에 content hash.

```
workspaces ─┬─ users (membership, role)
            ├─ brands ─── logos (variant, theme, brand_rgb, scan jsonb, safe_zone, rights_ack jsonb)
            ├─ projects ─┬─ directions   (ir jsonb, ir_version, preset_key, parent_id)
            │            ├─ generations  (engine, model_version, tier, seed, submission_id UNIQUE,
            │            │                vendor_job_id, snapshot jsonb, status, replaces_generation_id,
            │            │                artifact_id, quote jsonb)
            │            ├─ renders      (source_generation_id, parent_render_id, kind: landed|sounded,
            │            │                audio_manifest jsonb, qa jsonb, artifact_id, internal_status)
            │            ├─ deliverables (render_id, profile_key, artifact_id, qa jsonb, manifest jsonb,
            │            │                license_snapshot jsonb, locked_by_review_id)
            │            ├─ artifacts    (sha256, mime, bytes, codec_profile jsonb, storage_key,
            │            │                provenance jsonb: {step_id, inputs[], tool_versions})
            │            ├─ pipeline_runs ─ pipeline_steps (input_hash, status, leased_by, lease_until,
            │            │                fence, attempt, artifact_id, metrics, error, vendor_raw_redacted)
            │            ├─ pipeline_events (append-only, SSE 원천)
            │            ├─ outbox        (또는 pg-boss 트랜잭션 전달 — P0 에서 확정)
            │            └─ review_links ─ review_comments · review_events (audit)
            │                 (token_hash, expires_at, revoked_at, scope: deliverable ids,
            │                  client_status, approver, approved_at)
            └─ ledger    (append-only: kind: reserve|settle|release|adjust, credits, usd,
                          provider, model, price_version, vendor_charge_id, ref_type, ref_id, at)
```

- **계보**: `generations → renders(parent_render_id 체인) → deliverables`. landed 위에 sounded, sounded 위에 delivery. 어떤 파생본이 납품됐는지 항상 식별된다
- `renders.internal_status`: `draft_selected → creative_approved → production_approved`
- `review_links.client_status`: `open → changes_requested | client_approved → superseded`
- `deliverables.license_snapshot`: 그 납품본에 들어간 모든 provider/model/license 상태
- 기존 테이블 이관: `studio_logos → logos`, `studio_presets → directions`, `renders → generations + renders`, `handoff_bundles` 일회성 내보내기 후 삭제

## 10. QA

**모든 임계값은 2026-08-30 표본 16편에서 나온 실측 휴리스틱이다. Gate 0 코퍼스로
calibration 하기 전에는 SLA 가 아니다.**

### 10.1 입력 (로고)

| 지표 | 방법 | 초기값 |
|---|---|---|
| 오염도 | trim(alpha bbox) 후 브랜드 외 색조 픽셀 비율 | < 2 % |
| 불투명 비율 | trim 후 alpha ≥ 250 픽셀 비율 | ≥ 60 % |
| 실효 해상도 | trim 후 bbox 폭 | ≥ 800 px 권장 |
| edge 오염 | alpha 경계 2px 링의 색조 편차 | 경고만 |

### 10.2 로고 충실도 (Transform: 홀드 구간 / Safe: 노출 구간 전체)

전체 프레임 SSIM 은 배경이 크면 로고 오류를 숨긴다. **로고 ROI 기준**으로 잰다.

| 지표 | 방법 | 초기값 |
|---|---|---|
| 기하 | 엔드프레임 로고 알파 마스크를 기준으로 위치·스케일·회전 정렬 오차 | 위치 < 0.5 % 폭, 스케일 ±1 %, 회전 ±0.5° |
| 형태 | 정렬 후 윤곽·획의 픽셀 차이(마스크 내) | < 1 % |
| 색 | **CIEDE2000**, sRGB/D65, 알파 합성 배경 = 프리셋 배경 명시 | ΔE00 < 3 (경고 3–5) |
| 드래프트 착지 사전 필터 | 마지막 프레임 ROI 기하 오차 | 스케일 ±15 % 초과 시 "착지 실패" |

**Delivery QA**: 위 측정을 **최종 인코딩 파일을 다시 decode 한 프레임**에서 한 번 더 수행한다. 히어로 중간 산출물 통과가 납품본 통과를 보장하지 않는다.

### 10.3 오디오

| 지표 | 방법 | 초기값 |
|---|---|---|
| 라우드니스 | integrated LUFS(5초 전체) + short-term LUFS 최대 | 프리셋 목표 ±1 |
| 트루피크 | `ebur128` TP | ≤ −1.0 dBTP |
| 임팩트 정렬 | `impactAt ± 150 ms` 창 안의 **transient onset** 시각 vs `impactAt` | ±80 ms |
| 층별 무음 | 각 층 RMS | > −50 dB |

`mean_volume`(부록 A.2)과 LUFS 를 같은 근거로 쓰지 않는다. `astats` 최대 피크 하나로 임팩트를 확정하지 않는다 — 검수 화면에서 **사람 청감 확인**을 병행한다.

### 10.4 자동 판정 불가능한 것

중간 구간에서 워드마크가 뭉개졌는지(Transform). `shard` 는 흩어짐이 의도라 붕괴와 구분되지 않는다. → 콘택트 시트 + 파형·임팩트 마커 + ROI 지표를 나란히 띄우고 사람이 승인한다. 콘택트 시트는 사람용이며 모델 입력으로 쓰지 않는다.

## 11. 오디오 — 층과 라이선스 게이트

### 11.1 문제

생성 모델 내장 오디오는 범용적이고 편차가 크다(부록 A.2). 임팩트는 프레임 단위로 맞아야 한다. Higgsfield `generate_audio` 는 TTS 전용이라 외부 제공자가 필요하다.

### 11.2 제공자 라이선스 게이트 — 도입 전 필수

**제공자는 라이선스 게이트를 통과한 뒤에만 코드에 들어온다.** 게이트 결과는 `src/audio/license.ts` 와 이 표에 기록한다. 이것은 법률 자문이 아니라 출시 차단 조건이다.

| 층 | 제공자 | 2026-08-30 확인 | 게이트 상태 |
|---|---|---|---|
| L1 동기 SFX (V2A) | MMAudio | 코드 MIT. **체크포인트 CC-BY-NC 4.0.** "상업 적합성 보증 안 함" [B6] | **차단.** 상용 빌드에서 L1 기본 꺼짐. 대안: 상용 V2A 제공자 실측 후 교체, 또는 별도 상용 체크포인트 계약을 release prerequisite 로 |
| L2 설계 SFX | ElevenLabs SFX | 플랜별 조건 상이(공식 요금 페이지 재확인 필요) [B7] | 조건부. 채택 시 플랜·용도 스냅샷 |
| L3 음악 (기본) | Stable Audio | Community License: 연매출 USD 1M 미만 무료, 초과 시 Enterprise. 산출물 소유권 사용자 [B8]. **호스팅 API 약관은 별도 확인** | 조건부 통과. 매출 임계 도달 시 Enterprise |
| L3 음악 (대안) | ElevenLabs Music | "certain subscriptions and conditions" 하에 광범위 상용. 용도별 조건은 Music Terms [B9] | 미확정. 광고 용도 조건 확인 전 미채택 |

납품본마다 `deliverables.license_snapshot` 에 provider/model/plan/license 를 기록한다.

### 11.3 층 구조

| 층 | 무엇을 푸는가 | 동기화 |
|---|---|---|
| L2 설계 SFX | 히어로 히트 | `impactAt` 배치(`adelay`) |
| L3 음악 | 5초 시네마틱 베드 | 섹션 구성으로 다운비트를 임팩트에 강제 |
| L1 동기 SFX | 화면 추종음 | 자동(모델이 프레임을 봄). **라이선스 통과 제공자에 한해** |

상용 빌드의 기본은 **L2 + L3**. L1 은 게이트 통과 제공자가 생기면 P3 후반에 추가.

### 11.4 믹스

2차 설계의 ffmpeg 체인(사이드체인 덕킹 + `loudnorm`)을 승계한다. 목표: VFX −16 / 자연 −20 LUFS, TP −1.0 dBTP. 생성 모델 내장 오디오는 기본 끈다(`audioMode`: designed|vendor|silent). stems 는 48 kHz WAV 로 보관(§12).

### 11.5 제공자 추상화

`SfxProvider` · `MusicProvider` · `V2AProvider` 인터페이스, 환경변수로 선택. 한 제공자가 사라져도 나머지 층은 돈다.

## 12. 납품 — Delivery Profile

납품 키트는 파일명 목록이 아니라 **profile** 이다. 각 profile 은 인코딩 규격 + decode 후 QA + manifest 를 정의한다.

| profile | 규격 | 조건 |
|---|---|---|
| `web-master` | H.264 MP4 1080p/4K, yuv420p, Rec.709 primaries/transfer/matrix, limited range, 24fps(소스 기준) | 항상 |
| `mezzanine` | ProRes 422 HQ MOV, Rec.709 | 항상 |
| `alpha-master` | ProRes 4444 / WebM VP9+alpha | **alpha-capable 소스(Safe 로고 레이어·canvas)에서만.** Transform 히어로는 "알파 불가" 명시 |
| `frames` | PNG 시퀀스(편집자용) | 요청 시 |
| `clean-plate` · `logo-layer` | 플레이트 단독 · 로고 알파 레이어 단독 | Safe 경로에서 |
| `stems` | 48 kHz WAV: music · sfx · (l1) 개별 | 사운드 후 |
| `silent` · `poster` · `loop` · `intro`/`outro` | 파생 | 무료 |
| `reframe-{aspect}` | 로고 세이프 리프레임(무료) 또는 재생성(원가 명시) | 선택 |

- 모든 profile 은 인코딩 후 **decode → 길이·프레임 수·pixel format·색 메타·오디오·ROI QA** 를 통과해야 `deliverables` 에 들어간다
- `manifest.json`: 모델·`compilerVersion`·프롬프트 해시·소스 로고 sha256·엔드프레임 sha256·`license_snapshot`·파생 계보
- AI 출력에서 매트를 뽑지 않는다(부록 A.1)

## 13. 리뷰·승인 워크플로

**내부 승인과 고객 승인을 분리한다.**

| 흐름 | 상태 | 주체 |
|---|---|---|
| 내부 | `draft_selected → creative_approved → production_approved` | 워크스페이스 사용자 |
| 외부 | `open → changes_requested \| client_approved → superseded` | 리뷰 링크 승인자 |

- 리뷰 링크: 토큰 ≥ 128bit, DB 에는 **hash 만**, 만료·폐기·회전, scope 는 특정 deliverable 집합. 다운로드는 signed URL. 댓글은 sanitize(XSS). 선택적 워터마크. 모든 열람·승인·폐기는 `review_events` 감사 로그
- A/B 동기 비교, 타임코드·영역 마크업, 승인자 지정
- `client_approved` 시 deliverable 잠금(`locked_by_review_id`). 변경 요청은 새 Direction 버전 → 새 Render → 새 비용으로 계보가 이어진다
- **P2 에 들어가는 최소 리뷰**: 토큰 hash·만료·폐기·scope·감사 로그·A/B 비교·승인/변경요청. 역할·알림·다중 승인자·내부 댓글 스레드는 P4

## 14. 원가와 원장

- 모든 생성 버튼에 `estimate()` 견적(가격 버전 포함). 예산 예약 → 정산 → 프로젝트 원장
- 프로젝트 예산 상한은 예약 시 검사. 초과 시 제출 버튼 비활성
- `ledger` 는 append-only. 예상/실제 차이는 KPI 로 추적(§18)

## 15. 비계 정리

2차 설계와 동일: 핸드오프 임포트(일회성 내보내기 후 삭제) · `/api/ai/import-genspark-image` · `plazion_logo.png` · 바닐라 프론트(이관 완료 화면부터). **유지:** Genspark AI 로고 생성(Brand 소스 옵션) · Workers 정적 셸.

---

# Part III · 실행

## 16. Gate 0 — 제품·엔진·시장 검증 (구현 전)

대규모 재플랫폼 전에 **가설을 먼저 검증**한다. 구현 마일스톤이 아니다. 유료 호출은 예산을 정하고 사람이 승인한 뒤 실행한다.

| # | 검증 | 통과 기준 | 실패 시 |
|---|---|---|---|
| 1 | **Seedance 서버 호출 경로** — Higgsfield REST 존재 여부, 또는 BytePlus ModelArk 가용성, `end_image`/omni reference 지원, idempotency, 조회 API | 서버에서 1편 생성 + 조회 성공, 파라미터 contract 기록 | 경로가 없으면 P0 착수 보류. 대안 엔진(Veo 3.1 프레임 지정 생성 [B4] 등)을 같은 게이트로 |
| 2 | **평가 코퍼스** — 대표 로고 30개(긴 워드마크·얇은 획·한글/비라틴·다색/그라디언트·엠블럼·흰색·복합 락업) | 코퍼스와 QA 임계값 calibration 완료 | — |
| 3 | **생성 실험** — 로고 유형×룩×비율 균형 표집. 초기 계획 60–100편, **예산에 맞게 조정** | 재현성(같은 seed)·대기시간 분포·실패율·실제 비용·중복 과금 여부 scorecard | 기준 미달이면 프리셋·모델·충실도 약속을 먼저 바꾼다 |
| 4 | **Safe/Transform 계약 확정** — 코퍼스에서 두 모드의 QA 통과율 | 각 모드의 보장 문구가 데이터로 뒷받침됨 | 보장 범위 축소 |
| 5 | **블라인드 비교** — Renderforest·Jitter 템플릿·Runway/Luma 직접 사용 대비 | 에이전시 평가자 선호와 이유 기록 | 포지셔닝 수정 |
| 6 | **ICP 인터뷰** — 에이전시 3–5곳, 승인 흐름·납품 요구·가격 감도 | ICP·JTBD 확정 또는 수정 | §2 수정 |
| 7 | **Orbitron 인프라** — web/worker 볼륨 공유, 컨테이너 2개 배포 | 공유 쓰기 안전 확인 | P0 부터 MinIO |
| 8 | **오디오 제공자 게이트** — L2/L3 후보의 플랜·용도 조건 | §11.2 표 갱신 | 해당 층 보류 |

**Gate 0 산출물**: scorecard 문서, calibrated 임계값, 확정된 계약 문구, go/no-go 결정 기록. 이 문서의 해당 섹션을 갱신한다.

## 17. 마이그레이션 P0–P6

각 단계 끝에 사이트가 정상 동작해야 한다. **P2 가 첫 제품 목표** — 파일럿 후 멈추고 P3 이후를 재우선순위한다.

| 단계 | 목표 | 완료 조건 (테스트 포함) |
|---|---|---|
| **P0 신뢰 코어** | 재시작·중복·과금에 안전한 실행 기반 | web/worker 분리 · 멱등 step + lease · 트랜잭션 큐 투입 · 예약/정산 원장 · artifact hash · 스키마(`workspace_id`) + forward/rollback 마이그레이션 · canvas 어댑터 이식 · React 셸 + 모니터. **테스트**: fake engine E2E, golden hash(고정 런타임) + perceptual/ROI regression(교차 환경), worker kill·중복 전달·submit timeout·SSE reconnect chaos, 동시 예약 예산 상한 |
| **P1 Brand Motion Brief** | 임의 브랜드의 검증 가능한 연출 의도 | Brand 킷(스캔·사용자 확인 분리·권리 체크·safe zone) · 버전형 IR + 프리셋 마이그레이션 · references · 엔드프레임 + sha256 · Safe/Transform 선택 · 하드코딩 제거 · 핸드오프 내보내기 후 삭제 |
| **P2 ★ 승인 가능한 베타** | 첫 end-to-end 고객 가치 | Seedance 어댑터(contract test) · 드래프트 격자 → 히어로 · **Safe fallback(최소 레이어 모드)** · ROI QA + delivery decode QA · 내부 검수 · **최소 보안 리뷰 링크(A/B·승인)** · `web-master` + `mezzanine` + `poster` 납품 · 원장 · 보안 기본선(§8.5). **종료 조건: 파일럿 에이전시 1곳 이상이 리뷰 링크로 실제 방향을 비교·승인하고 납품본을 받는다. 그 후 중지·재우선순위** |
| **P3 상용 사운드·납품** | 라이선스 명확한 사운드와 편집자 패키지 | L2 + L3(게이트 통과분) · 덕킹 · loudness/transient QA · stems 48kHz · 전체 delivery profile · provenance manifest · L1 은 게이트 통과 제공자 확보 시 |
| **P4 협업·파일럿 확장** | 반복 가능한 에이전시 운영 | 다중 사용자·역할(owner/editor/reviewer) · 매직링크 · 내부/외부 댓글 분리 · 알림 · 승인 이력 · 원장 UI · 반복 프로젝트 지표 |
| **P5 멀티모델** | 실측 기반 벤더 복원력 | 두 번째 엔진 scorecard(Gate 0 절차 재사용) · 라우터 · circuit breaker · canary · 저가 드래프트 모델 실측 · Safe 레이어 연출 확장 |
| **P6 출시·엔터프라이즈** | 외부 상용 운영 | 결제/패키징 결정 · SSO · DPA · retention · backup/restore 검증 · 운영 SLO · 법무·보안 sign-off · 옛 페이지 삭제 |

**순서의 이유**
- Gate 0 없이 P0 를 시작하면 경로가 없는 엔진 위에 재플랫폼을 짓는 위험이 있다
- P0 는 "작은 리팩토링"이 아니라 재플랫폼이다 — 현재 저장소에는 React·pg-boss·테스트 스크립트가 없다. 완료 조건에 테스트를 넣는 이유
- P2 에 Safe·최소 보안 리뷰·최소 납품을 함께 넣어야 "고객이 승인 가능한 베타"가 된다. 2차 설계의 "P4 공개 리뷰, P6 인증" 순서 모순을 해소
- P3 사운드가 P4 협업보다 앞인 건 체감 품질 상승폭 때문. 단 라이선스 통과분만

## 18. 파일럿 KPI 와 release gate (제안 목표)

아래 수치는 확정 사실이 아니라 **제안 목표**다. 파일럿에서 보정한다.

| 축 | 제안 기준 |
|---|---|
| Safe 충실도 | 납품 decode 후 로고 ROI 기하·색 기준 100 % 통과 |
| Transform 충실도 | 엔드카드 기준 통과 + 중간 변형 고지 + 사람 승인 |
| 속도 | 첫 유효 방향 p50 ≤ 30분, 최종 납품 p50 ≤ 60분 |
| 비용 신뢰 | 예상/실제 차이 추적, 중복 과금 0, `submission_unknown` 100 % 대사 |
| 파이프라인 | 중복 전달·worker crash 후 artifact/ledger 중복 0 |
| 시장 | 파일럿 에이전시 5곳 · 실제 프로젝트 25건에서 승인 시간·재생성률·반복 사용 |
| 보안 | 만료/폐기 링크 차단 100 %, cross-workspace 접근 0 |
| 권리 | 모든 납품본에 license_snapshot 존재 |

**최종 판단 질문**: 첫 승인 시간이 줄었는가 · 수정 횟수와 재생성 비용이 줄었는가 · 브랜드 안전 때문에 포기하는 비율이 낮은가 · 다음 프로젝트에도 쓰는가 · 프로젝트 매출총이익이 유지되는가.

## 19. 리스크

| 리스크 | 대응 |
|---|---|
| **Seedance 서버 호출 경로가 없다** | Gate 0 #1. 없으면 대안 엔진을 같은 게이트로. 이 문서의 Transform 경로는 그 결과로 갱신 |
| 2개 브랜드 16편이 코퍼스 전체를 대표하지 못함 | Gate 0 #2–4. 임계값은 calibration 전 휴리스틱 |
| P0 재플랫폼이 현재 렌더를 깨뜨림 | golden hash + ROI regression, fake engine E2E |
| 드래프트와 히어로가 다르게 나옴 | 같은 모델·seed, 해상도만 낮춤. 저가 모델은 P5 실측 후 |
| 응답 유실 후 중복 과금 | `submission_unknown` + reconcile + `submission_id` 유니크 + 무재시도 |
| 단계 기록과 큐 투입 사이 유실 | 같은 트랜잭션(pg-boss 외부 tx 또는 outbox) — P0 첫 태스크 |
| MMAudio 상용 불가 | L1 기본 꺼짐. 게이트 통과 제공자 확보 전 미채택 |
| 음악 라이선스가 광고 용도를 막음 | Stable Audio Community(매출 임계 관리). ElevenLabs Music 은 Music Terms 확인 전 미채택. 게이트 통과 전 외부 판매 금지 |
| 공개 리뷰 링크 무방비 | §13 최소 보안이 P2 완료 조건 |
| web/worker 볼륨 공유 불가 | Gate 0 #7. MinIO 로 |
| 단일 개발 리소스 | P2 종료 조건 명시. P3 이후 재우선순위 |

## 20. 하지 않는 것

- 결제·크레딧 정산 상품화(P6 결정) — 원장만 쌓는다
- Workers 렌더 · 내레이션 · 사용자 음악 업로드 · 오디오 마스터링 체인
- 5초 초과 다샷 · 범용 타임라인 편집기 · Lottie/Rive 제작 플랫폼 · 범용 로고 제작 플랫폼
- 제품명·도메인 변경 — 별도 안건으로 표시만

## 21. 작업 규칙 (승계)

- 크레딧을 쓰는 호출은 절대 자동 재시도하지 않는다. 응답 유실은 `submission_unknown` 으로 대사한다
- 생성 원본은 덮어쓰지 않는다
- 영상 검수는 콘택트 시트 1장으로 한다 (5초 전 프레임 ≈ 22만 토큰, 시트 ≈ 1.5천)
- 콘택트 시트를 생성 모델에 레퍼런스로 넣지 않는다
- 제공자는 라이선스 게이트 통과 전에 코드에 넣지 않는다

---

# 부록 A · 실측 근거

**범위: 2026-08-30 · Higgsfield MCP 경유 Seedance 2.5 · PLAZION·GreenB 2개 브랜드 · 16편.**
특정 시점·경로·표본의 관찰값이다. API 계약이나 보편 사실이 아니며, Gate 0 에서 재측정한다.

## A.1 루마키 알파 추출 실패

검정 배경 FORGE 영상. 배경 휘도 3.0, 로고 평균 83.4(중앙값 62.2), **로고 하위 25% 44.6**. 배경과 벌어지지 않아 루마키가 로고 본체를 반투명 판정. 크로마키는 화염·글로우에 색이 물들고, 더블 패스는 AI 가 다른 영상을 뱉어 불가. → 매트를 뽑지 않고 알파 레이어를 따로 렌더한다(Safe 경로의 근거).

## A.2 내장 오디오 편차

VFX 계열 mean_volume −21 ~ −24 dB, 자연 계열 −29 ~ −43 dB (편차 18 dB). `mean_volume` 은 LUFS 가 아니다 — 목표 라우드니스 계열 분리의 동기일 뿐 측정 기준은 §10.3.

## A.3 출력 규격 (관찰)

항상 24 fps · 5초 요청 → 5.056초 · 1080p 상한 · 알파 없음 · hevc/aac 32 kHz · 오디오 포함 1080p 5초 **3–6분** · 진행 중 `type:"image"` 표기(벤더 표시 오류로 추정, `status` 만 신뢰) · **45 크레딧/편** (Higgsfield 계정 기준, 가격 버전 미기록 — Gate 0 에서 재기록).

## A.4 로고 소스 오염

시퀀스 마지막 프레임 오염 39.6 % / 중간 프레임 0.2 %(불투명 57 %) / 원본 PNG 0 %. → 브랜드 원본 에셋을 쓴다.

## A.5 착지 정확도

`end_image` 단독: 자획·형태·브랜드 컬러 보존, 위치·크기 미세 이동·축소 → 착지 교체 필요. `start_image` 동시 제공 시 은색 변질. 로고 화면 폭 15 %(글자 높이 약 40 px)에서도 자획 보존.

# 부록 B · 출처 (확인일 2026-08-30)

- [B1] Renderforest Logo Animation — <https://www.renderforest.com/logo-animation>
- [B2] Jitter Export — <https://help.jitter.video/en/articles/5369843-export-your-work>
- [B3] Runway Models (출력 포맷) — <https://docs.dev.runwayml.com/guides/models/>
- [B4] Gemini API Video (Veo 3.1) — <https://ai.google.dev/gemini-api/docs/video>
- [B5] Seedance 2.5 발표 — <https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5>
- [B6] MMAudio (코드 MIT · 체크포인트 CC-BY-NC 4.0) — <https://github.com/hkchengrex/MMAudio>
- [B7] ElevenLabs API 가격 — <https://elevenlabs.io/pricing/api> (본 3차 보정에서 미열람 — 채택 전 확인)
- [B8] Stability AI License — <https://stability.ai/license>
- [B9] ElevenLabs Music — <https://elevenlabs.io/docs/eleven-creative/products/music> · Music Terms <https://elevenlabs.io/music-terms> (미열람)
- pg-boss — <https://github.com/timgit/pg-boss>
