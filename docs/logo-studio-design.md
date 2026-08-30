# Logo Studio 설계 — 재설계 정본

작성일: 2026-08-30 (2차. 1차 통합 설계를 프로 시장용 제품 설계로 전면 재작성)
상태: 설계 확정, 구현 미착수
대상 저장소: 이 저장소(Genspark)

> **이 문서가 정본이다.** `docs/superpowers/specs/*` 와 `docs/superpowers/plans/*` 는
> 이 문서 이전의 기록이다. 1차 설계에서 실측으로 확정된 값(부록 A)과 오디오 세부(§9)는
> 그대로 승계했고, 나머지는 이 문서가 대체한다. 충돌하면 이 문서를 따른다.

---

## 0. 한 문단 요약

브랜드 로고 한 장을, **아트 디렉션이 가능한 헐리우드급 로고 스팅과 납품 키트**로 —
몇 주가 아니라 한 시간 안에. 대상은 프로·에이전시다. 해자는 생성 모델이 아니라
**디렉션 시스템(Direction IR) · 로고 충실도 파이프라인 · 임팩트 동기 사운드 · 납품
키트** 네 가지다. 생성 모델은 어댑터 뒤에 두고 교체 가능하게 만든다. 구현은 P0–P6
일곱 단계, **P2 가 첫 목표**다.

---

# Part I · 제품

## 1. 포지셔닝

**누구 대신 무엇을 이기는가**

| 경쟁 영역 | 그들의 한계 | 우리의 승부처 |
|---|---|---|
| 템플릿 툴 (Renderforest · Motion Array · Canva) | 남과 같은 결과, 로고가 스티커 | 로고 *자체*가 재질과 형태를 바꾸며 만들어지는 고유 연출 |
| 범용 AI 비디오 (Runway · Kling · Veo · Seedance 직접 사용) | 로고 뭉개짐, 오디오 무동기, 납품 포맷 없음, 매번 프롬프트 노가다 | 로고 충실도 보증 · 임팩트 동기 오디오 · 납품 키트 · 디렉션 시스템 |
| 모션 디자이너 외주 (AE + Element 3D) | 1–3주, 수백만 원, 수정 왕복 | 1시간, 수만 원대 원가, 변주 격자에서 즉시 고른다 |

**해자는 모델이 아니다.** 생성 모델은 6개월마다 바뀌고 상품화된다. 남는 것:

1. **Direction IR** — 사람이 쓴 연출 의도를 모델 무관 중간 표현으로 컴파일하는 층
2. **충실도 파이프라인** — 엔드프레임 고정 → 착지 교체 → 자동 QA → 사람 검수. 워드마크 픽셀 보증
3. **임팩트 동기 사운드** — 화면 사건과 80ms 이내로 맞는 3층 오디오
4. **납품 키트** — 마스터 · 비율 · 알파 · 스틸 · 루프 · 인트로/아웃트로 세트

## 2. 제품 원칙 (설계 전체를 구속)

- **로고는 절대 그리게 하지 않는다.** 모델은 *로고에 도달하는 과정*만 만든다. 실제 로고를 `end_image` 로 못 박는다
- **비싼 호출 앞에는 항상 싼 단계가 있다.** 드래프트 → 정제 → 히어로. 첫 클릭에 히어로 원가를 태우지 않는다
- **검수는 사람이 한다.** 자동 QA 는 통과/경고 배지를 붙일 뿐 승인하지 않는다
- **생성본은 불변.** 모든 후처리는 파생 행. 오디오를 고치려고 영상을 재생성하지 않는다
- **원가가 항상 보인다.** 모든 생성 버튼에 예상 원가, 프로젝트마다 지출 원장
- **벤더는 교체 가능.** 생성 · 오디오 · 저장소 전부 어댑터 뒤에
- **간편함은 기본값을 숨기는 것이지 낮추는 것이 아니다.** Quick 경로와 Direct 경로의 품질·성능은 완전히 같다
- **모든 단계를 눈으로 본다.** 파이프라인의 각 단계가 산출물 미리보기와 함께 실시간으로 보인다

## 3. 사용자 워크플로와 화면

프로의 실제 작업 순서를 그대로 화면으로 만든다. 6단계, 각 단계가 하나의 화면.

```
Brand ─▶ Direct ─▶ Explore ─▶ Refine ─▶ Sound ─▶ Deliver
 브랜드     디렉션     탐색      정제      사운드     납품
 (무료)    (무료)   (저가 N편)  (히어로)   (소액)    (무료)
```

### 3.1 Brand — 브랜드 킷

- 입력: SVG(우선) / PNG(알파) / 시퀀스 마지막 프레임. 업로드 즉시 오염도 · 불투명 픽셀 비율 스캔 결과 표시 (기준은 §11)
- 자동 추출: 지배색 · 보조색, 심볼/워드마크 분리(연결 성분 분석), 라이트/다크 배경용 변형
- 세이프존과 기본 배치(16:9 폭 62% · 9:16 78% · 1:1 72%, 소스 800px 미만이면 자동 축소)를 캔버스에서 미리 조정 — 이것이 엔드프레임의 원천
- 산출: `brands` · `logos`. 한 브랜드에 로고 여러 개(심볼 · 워드마크 · 락업)

### 3.2 Direct — 디렉션 보드 (제품의 심장)

시작은 **Look 프리셋**(§5.3)이지만 프리셋은 보드의 초기값일 뿐이다.

| 항목 | 내용 | 예 |
|---|---|---|
| World | 배경 환경 | 딥블랙 스튜디오 · 안개 낀 숲 · 수면 |
| Material | 로고가 만들어지는 재질 | 용융 크롬 · 크리스탈 · 물 · 빛 |
| Formation | 형성 동사 | 단조 · 스냅 조립 · 결정화 · 응집 · 엮음 · 드러남 |
| Camera | 카메라 | 정면 고정 · 느린 돌리인 · 로우앵글 상승 |
| Light | 조명 | 림라이트 · 볼류메트릭 · 소프트 |
| Tempo | `impactAt` · 라이저 시작 · 착지 홀드 길이 | 타임라인 바를 끌어서 조정 |
| Palette | 브랜드에서 파생 | 덮어쓰기 가능 |
| Constraints | 부정 지시 | 자연계 프리셋은 자동 채움 (`no fire, no flames, no smoke …`) |
| Pro prompt | 위 항목이 컴파일된 프롬프트 | 열어서 직접 수정. 수정 시 필드와의 링크 표시 |

- 각 항목은 몇 개의 선택지 + 자유 입력
- 보드는 **버전이 있다.** 어떤 렌더가 어떤 보드 버전에서 나왔는지 항상 추적. "Material 만 바꿔 재탐색"은 자식 버전
- 우측에 **엔드프레임 라이브 프리뷰**(canvas 엔진, 무료 · 즉시) — 여백 · 배치를 여기서 확정

### 3.3 Explore — 탐색 격자

- 보드 하나로 **N편(기본 4) 드래프트**를 저비용으로 생성: 같은 모델 · 같은 시드 정책 · 해상도만 낮춤(480–720p) · 오디오 없음
- 격자에서 재생 · 비교. ★ 표시한 드래프트의 시드 · 설정을 정제 단계로 넘김
- 각 칸에 드래프트 원가와 히어로 승격 예상 원가 표시
- 마지막 프레임과 엔드프레임의 SSIM 이 0.6 미만이면 "착지 실패" 배지 — 승격 전에 거른다

### 3.4 Refine — 정제와 히어로 렌더

- 선택한 드래프트 기준으로 보드 한 축만 바꿔 재탐색 가능
- **히어로 렌더**: 1080p → 업스케일 4K 옵션. 착지 교체 · 타이밍 정규화 자동 적용
- **검수 화면**: 콘택트 시트 + 착지 SSIM + ΔE + 경고 배지. 승인/반려. 반려 사유는 보드 버전에 기록

### 3.5 Sound — 사운드 디자인

- 승인된 히어로 위에 3층 자동 조립(§9). 파형 위에 `impactAt` 마커
- 층별 게인 · 뮤트, 히어로 히트 교체(프롬프트 재생성, 소액), 음악 무드 재선택
- 결과는 `renders.audio_manifest` 로 저장. 모든 조작은 매니페스트 수정 + 재믹스(ffmpeg, 무료)

### 3.6 Deliver — 납품 키트

§12. 마스터 · 비율 · 알파 · 포스터 프레임 · 루프 · 인트로/아웃트로 · 무음본. ZIP 일괄 + 개별 링크.
**리뷰 링크**: 클라이언트가 로그인 없이 보고 승인/코멘트. 버전 이력 포함.

### 3.7 두 가지 속도, 한 파이프라인

- **Quick 경로 (기본)**: 로고 올리기 → Look 하나 고르기 → **[스팅 만들기]** 한 번. 브랜드 추출 · 엔드프레임 · 보드 기본값 · 드래프트 4편 · 자동 QA 까지 자동 진행. 사용자는 격자에서 하나 고르고 [히어로로] 만 누른다. 사운드 · 납품도 기본값으로 자동. **클릭 3번이면 납품 키트까지**
- **Direct 경로**: 같은 화면에서 "디렉션 열기"를 누르면 보드 전체가 펼쳐진다. 점진적 노출
- 두 경로의 품질 · 성능은 **완전히 동일**하다. Quick 은 보드를 숨길 뿐 기본값을 낮추지 않고, 드래프트 깔때기 · 착지 교체 · QA 도 그대로 돈다

### 3.8 파이프라인 모니터 — 모든 단계를 눈으로 본다

어떤 렌더든 클릭하면 **실행 타임라인**이 열린다. 워커의 각 단계가 SSE 로 실시간 갱신된다.

```
● 엔드프레임 생성      0.8s   [썸네일]
● 제출 (seedance)      1.2s   job_id · 예상 3–6분 · 45cr 차감
◐ 생성 중              2m14s  진행률 · 벤더 상태 원문
○ 다운로드
○ 착지 교체 · 트림           [교체 전/후 마지막 프레임 나란히]
○ 자동 QA                    [SSIM 0.994 ✓ · ΔE 2.1 ✓ · 정렬 −12ms ✓]
○ 콘택트 시트                [시트 이미지]
○ 오디오 3층                 [층별 파형 + impactAt 마커]
○ 믹스 · 라우드니스          [−16.2 LUFS ✓ · −1.0 dBTP ✓]
```

- 단계마다 **산출물 미리보기가 붙는다** — 끝나기 전에도 엔드프레임 · 콘택트 시트 · 파형을 본다
- 실패는 단계명 · 에러 원문 · 재개 가능 지점을 표시. "fetched 부터 다시" 버튼이 여기 붙는다
- 프로젝트 상단에 **진행 중 잡 트레이**: 동시 렌더 각각의 단계 · 경과 · 원가를 한 줄씩
- 워커 로그(ffmpeg 명령 · 벤더 응답 원문)는 접힌 패널 — 디버깅할 때만 편다
- 모니터는 별도 상태가 아니라 `pipeline_steps` 테이블을 그대로 그린다 (§7)

### 3.9 현 화면과의 관계

작업실 → Brand + Direct · 미리보기 → Explore/Refine 검수 · 라이브러리 → Brand 킷 목록 · 보관함 → 프로젝트 목록 · 핸드오프 → 제거(§13).

---

# Part II · 시스템

## 4. 아키텍처

**유지:** Hono · TypeScript · Node 컨테이너 · Postgres · Playwright + Chromium + ffmpeg Debian 이미지 · Orbitron 배포 · Dockerfile(`# CUSTOM` 마커).
**바꾸는 것:** 프로세스 분리, 모듈 경계, 프론트.

```
┌──────────────── 브라우저 (React) ────────────────┐
│ Brand · Direct · Explore · Refine · Sound · Deliver │
│ 파이프라인 모니터 (SSE)   ·   리뷰 링크 (공개 뷰)   │
└──────────────┬──────────────────────┬────────────┘
               │ REST                  │ SSE
┌──────────────▼──────────────────────▼────────────┐
│ web 프로세스 (Hono)                                │
│  api/brand  api/direction  api/jobs  api/review    │
│  api/deliver  api/ledger   events(SSE)             │
└──────────────┬────────────────────────────────────┘
               │ Postgres 큐 (pg-boss)
┌──────────────▼────────────────────────────────────┐
│ worker 프로세스 (같은 이미지, 다른 엔트리)            │
│  pipeline/  brand-scan · endframe · generate ·      │
│             post · qa · audio · deliver              │
│  engines/   registry + adapters (seedance, kling…)  │
│  audio/     providers (elevenlabs, stable, mmaudio) │
│  media/     ffmpeg · playwright 래퍼                 │
│  storage/   volume | s3 어댑터                       │
└───────────────────────────────────────────────────┘
```

### 4.1 핵심 결정

1. **web/worker 분리, 큐는 Postgres(pg-boss).** Redis 없이 이미 있는 DB 로 큐 · 재시도 · 스케줄. 3–6분 잡이 웹 프로세스를 잡지 않고 컨테이너 재시작에도 잡이 살아남는다. 같은 Docker 이미지에 `CMD` 만 다르게 — Orbitron 에 컨테이너 2개(`web`, `worker`).
2. **파이프라인은 단계 그래프.** 각 단계는 `(input, ctx) → artifact` 순수 함수. 산출물을 DB 에 기록한 뒤 다음 단계를 큐에 넣는다. "fetched 부터 재개"가 공짜로 나오고, 모니터 UI 는 단계 기록을 그대로 그린다.
3. **엔진 계약은 능력 선언형** (§5.1). 라우터가 `capabilities` 로 후보를 거른다.
4. **Direction IR** 은 모델 무관 JSON (§5.2). 각 어댑터의 `compile()` 이 자기 모델 문법으로 변환한다. 프리셋 = IR 초기값 묶음.
5. **벤더 통신은 직접 HTTP.** Higgsfield/Seedance 는 MCP 가 아니라 REST 어댑터로. MCP 는 사람이 세션에서 쓰는 도구지 서버가 의존할 층이 아니다.
6. **저장소 어댑터.** 지금은 볼륨. 인터페이스 뒤에 두어 나중에 MinIO/S3 로 무중단 전환.
7. **프론트: React + Vite + TypeScript.** TanStack Query(서버 상태) · Zustand(보드 편집 상태) · SSE 훅. 디자인 시스템은 `docs/DESIGN-cohere.md` 토큰 승계. **스트랭글러**: React 앱을 `/app/*` 에 올리고 화면을 하나씩 이관, 완료 시 옛 페이지 삭제.
8. **인증**: 워크스페이스 + 매직링크 이메일 로그인, 역할(owner / editor / reviewer). 리뷰 링크는 토큰 기반 공개 뷰. 구현은 P6 이지만 **모든 테이블에 `workspace_id` 를 처음부터 넣는다.** 그때까지는 단일 워크스페이스 + `STUDIO_ADMIN_TOKEN`.

### 4.2 모듈 지도 (신규)

| 경로 | 책임 |
|---|---|
| `src/web/` | Hono 앱, REST 라우트, SSE |
| `src/worker/` | pg-boss 소비자, 파이프라인 실행기 |
| `src/pipeline/*.ts` | 단계 함수: `brand-scan` · `endframe` · `generate` · `post` · `qa` · `audio` · `deliver` |
| `src/engines/registry.ts` | 엔진 계약 · 등록 · 라우터 |
| `src/engines/canvas.ts` | 현 `render.node.ts` 의 Playwright 캡처 이식 |
| `src/engines/seedance.ts` | Seedance REST 어댑터 + `compile()` |
| `src/engines/composite.ts` | 플레이트 + 알파 레이어 합성 (P5) |
| `src/direction/ir.ts` · `presets.ts` | IR 스키마 · 프리셋 정의 |
| `src/audio/providers/*.ts` · `plan.ts` · `mix.ts` | §9 |
| `src/media/ffmpeg.ts` · `playwright.ts` | 프로세스 래퍼 |
| `src/storage/` | `volume.ts` · `s3.ts` · 인터페이스 |
| `src/db/` | 스키마 · 마이그레이션 · 쿼리 |
| `app/` | React 프론트 (Vite 별도 진입) |

`render.node.ts` · `handoff.node.ts` · `sequences.node.ts` · `public/static/*.js` 는 이관 완료 시 삭제.

## 5. 생성 엔진

### 5.1 엔진 계약

```ts
interface GenEngine {
  id: string                                   // 'seedance-2.5' | 'kling-2.x' …
  capabilities: {
    endImage: boolean; startImage: boolean; audio: boolean
    durations: number[]; resolutions: string[]; aspects: string[]
    draftTier: boolean                         // 저해상 저가 드래프트 지원
  }
  estimate(req: GenRequest): Promise<Cost>     // 제출 전 프리플라이트
  submit(req: GenRequest): Promise<VendorJob>  // 크레딧 차감 지점. 재시도 금지
  poll(job: VendorJob): Promise<VendorStatus>
  fetch(job: VendorJob): Promise<ArtifactPath>
  compile(ir: DirectionIR): VendorPrompt       // IR → 이 모델의 프롬프트·파라미터
}
```

- `endImage: false` 인 모델은 히어로 렌더에 못 쓴다. 드래프트 전용
- 라우팅: `capabilities` 필터 → 프리셋 선호 엔진 → 사용자 선택. 기본은 Seedance 2.5
- **`submit()` 은 어떤 경우에도 자동 재시도하지 않는다.** 타임아웃 · 네트워크 오류 · 벤더 5xx 전부 `failed` 로 기록하고 사람이 재제출한다. 폴링 타임아웃도 재제출하지 않는다 — 크레딧 중복 차감

### 5.2 Direction IR

```ts
type DirectionIR = {
  world: string; material: string; formation: string
  camera: string; light: string
  tempo: { impactAt: number; riserFrom: number; holdSeconds: number }
  palette: { brand: string; accent: string; background: string }
  constraints: string[]                         // 부정 지시
  freeText?: string                             // Pro prompt 수정분
  brand: { name: string; logoId: string }
}
```

`compile()` 은 IR 을 모델별 프롬프트로 만든다. Seedance 에서 실측으로 확정된 요청 형태:

```ts
{
  model: 'seedance_2_5',
  mode: 'omni_reference',        // 필수. 없으면 422. end_image 는 이 모드에서만 허용
  duration: 5, resolution: '1080p', aspect_ratio, bitrate_mode: 'high',
  generate_audio: audioMode === 'seedance',
  medias: [{ role: 'end_image', value: endFrameMediaId }],   // 정확히 하나
  prompt: compile(ir),
}
```

- `start_image` 와 `end_image` 를 **둘 다** 주면 최종 워드마크가 은색으로 변질된다. `end_image` 만
- 자연 계열은 부정 지시를 길게 — 모델 기본값이 "화려한 VFX" 라 `no fire, no flames, no smoke, no molten metal, no explosion, no sparks, no neon, no lightning` 없이는 불꽃이 들어온다
- REST API 의 파라미터명이 MCP 와 다를 수 있다. **P2 첫 태스크는 API 스파이크(1편 생성)** 로 이 제약을 재검증하는 것

### 5.3 프리셋 (IR 초기값)

| 키 | Material / Formation | World | LUFS | 디졸브 | impactAt |
|---|---|---|---|---|---|
| `forge` | 용융 크롬 / 단조 | 딥블랙 | −16 | 0.6s | 2.2s |
| `shard` | 크리스탈 파편 / 스냅 조립 | 딥블랙 | −16 | 0.5s | 2.6s |
| `arc` | 번개 / 응결 · 결정화 | 딥바이올렛 | −16 | 0.5s | 2.8s |
| `dew` | 물방울 / 응집 | 오프화이트 | −20 | 0.3s | 3.1s |
| `growth` | 새싹 · 넝쿨 / 엮음 | 오프화이트 | −20 | 0.3s | 3.4s |
| `mist` | 안개 / 드러남 | 딥그린 | −20 | 0.3s | 2.9s |

디졸브가 프리셋마다 다른 이유 — 정적 배경(안개 · 물)은 짧아도 티가 안 나지만, 잔불이 움직이는 `forge` 는 짧으면 착지 교체 지점의 점프가 보인다. `impactAt` 은 초기값이며 콘택트 시트의 프레임 차분 피크로 자동 추정해 제안하고 사용자가 Tempo 에서 끈다.

### 5.4 엔드프레임

canvas 엔진이 만든다. 브랜드 배경 위에 로고를 정확한 크기 · 위치로 배치한 정지 프레임. **여백이 중요하다** — 레퍼런스의 프레이밍이 그대로 복사되므로 꽉 차면 잘려 나온다. 기본 폭 비율은 §3.1. 소스가 800px 미만이면 비율을 낮춘다. 억지로 키우면 뭉개지고, 여백이 늘어난 쪽이 절제된 브랜드 톤에 맞는다.

### 5.5 canvas 엔진 — 뒷받침

사라지지 않는다. 엔드프레임 생성 · 무료 즉시 구도 확인 · 알파 레이어 소스. 기존 3초/30fps 하드코딩은 요청 파라미터로 뺀다.

### 5.6 composite 엔진 — 안전판 (P5)

워드마크가 한 픽셀도 달라지면 안 되는 경우만. Canvas 쪽을 Seedance 의 5초/24fps 에 맞춘다(결정론적 · 무료). Canvas 레이어 모드: 플레이트의 임팩트 타이밍에 로고가 나타나 정지하는 것까지만, 자체 배경 효과는 끈다. 이 모드에서는 `end_image` 를 주지 않고 프롬프트에 `Absolutely no text, no letters, no logo, no typography anywhere in frame` 을 넣는다.

```bash
ffmpeg -i plate.mp4 -framerate {fps} -i logo_%04d.png \
  -filter_complex "[0:v][1:v]overlay=format=auto:shortest=1" -map 0:a? …
```

## 6. 데이터 모델

**원칙:** 생성본 불변 · 모든 파생은 별개 행 · 모든 행에 `workspace_id` · 원장은 append-only.

```
workspaces ─┬─ users (membership, role)
            ├─ brands ─── logos (variant: symbol|wordmark|lockup, theme: light|dark,
            │                    brand_rgb, scan jsonb, safe_zone jsonb)
            ├─ projects ─┬─ directions   (보드 버전. ir jsonb, preset_key, parent_id)
            │            ├─ generations  (벤더 원본. engine, vendor_job_id, tier: draft|hero,
            │            │                seed, ir_snapshot jsonb, direction_id,
            │            │                cost_credits, status, storage_key)
            │            ├─ renders      (파생본. source_generation_id, kind: landed|sounded|
            │            │                delivery, audio_manifest jsonb, qa jsonb, storage_key)
            │            ├─ pipeline_runs ─ pipeline_steps
            │            ├─ deliverables (format, aspect, variant, storage_key, render_id)
            │            └─ review_links ─ review_comments (token, status, at_seconds)
            └─ ledger    (append-only: kind, credits, usd, ref_type, ref_id, at)
```

- `directions.parent_id` — 보드 버전 트리
- `generations.ir_snapshot` — 제출 시점의 IR 사본. 보드를 나중에 고쳐도 불변
- `renders.source_generation_id` — 착지 교체본 · 사운드본 · 납품본이 전부 한 생성본을 가리킨다. 생성(유료)과 마무리(무료)를 분리 보관해야 오디오 게인 하나 고치려고 재생성하는 일이 없다
- `pipeline_steps` — `run_id, name, status, started_at, ended_at, artifact_key, metrics jsonb, error text, vendor_raw jsonb`. 모니터의 한 줄 = 한 행
- `ledger` — 벤더 응답 시점에 기록. `generations.cost_credits` 는 캐시, 원장이 정본. 과금 단계의 기초 데이터이므로 지금부터 쌓는다

**기존 테이블 이관:** `studio_logos → logos` · `studio_presets → directions`(프리셋 원형) · `renders → generations + renders` 분리(engine `canvas` · tier `hero` 로 백필) · `handoff_bundles` 일회성 내보내기 후 삭제 · 시퀀스 업로드는 `logos` 소스 첨부로 흡수.

## 7. 상태기계

### 7.1 생성 (`generations.status`)

```
queued → submitted → generating → fetched → landed → qa_done → in_review → approved
                        │                                          │
                        └─ failed(step, error, resumable_from)      └─ rejected(reason → direction 버전에 기록)
```

- `fetched` 이후는 전부 무료 단계. **재개는 `fetched` 부터.** 그 앞은 재제출 = 재과금이라 사람이 명시적으로 누른다
- 드래프트는 `landed` · `qa_done` 을 건너뛰고 `fetched → in_review`(격자 표시). 착지 교체 · 전체 QA 는 히어로만
- `approved` 된 히어로만 Sound · Deliver 로 진입

### 7.2 파이프라인 런 (`pipeline_runs.kind`)

`brand_scan` · `endframe` · `draft_batch` · `hero` · `sound` · `deliver`. 런마다 단계 목록이 고정돼 있어 모니터가 시작 전부터 빈 체크리스트를 그린다.

### 7.3 리뷰 링크

`open → approved | changes_requested`. 코멘트는 `at_seconds` 를 가지며 파형 · 콘택트 시트 위에 핀으로 표시된다.

## 8. 후반작업과 QA

### 8.1 후반작업 (히어로)

| 단계 | 처리 | 실측 근거 |
|---|---|---|
| 착지 교체 | 마지막 구간을 엔드프레임으로 크로스페이드(프리셋 디졸브 길이) | `end_image` 를 줘도 로고가 미세하게 이동 · 축소된다 |
| 타이밍 | 5.00초 트림, fps 정규화 | 5초 요청 → 5.056초, 항상 24fps |

라우드니스 정규화는 오디오 믹스가 흡수한다. 두 번 정규화하면 덕킹이 뭉개진다.

### 8.2 자동 QA

| 지표 | 기준 | 적용 |
|---|---|---|
| 드래프트 착지 SSIM (마지막 프레임 vs 엔드프레임) | ≥ 0.6 아니면 "착지 실패" 배지 | 드래프트 |
| 착지 프레임 SSIM (교체 후 vs 엔드프레임) | ≥ 0.99 | 히어로 |
| 최종 프레임 로고 색 vs 브랜드 컬러 | ΔE < 5 | 히어로 |
| 출력 라우드니스 | 프리셋 목표 ±1 LUFS | 사운드 |
| 트루피크 | ≤ −1.0 dBTP | 사운드 |
| 임팩트 정렬 (오디오 피크 vs `impactAt`) | ±80 ms (`ffmpeg astats`) | 사운드 |
| 층별 무음 검사 | 각 층 > −50 dB | 사운드 |
| 로고 소스 오염도 | < 2 % | 입력 |
| 로고 소스 불투명 픽셀 비율 | ≥ 60 % | 입력 |
| 시드 재현성 | 같은 IR · 시드 재생성 시 유사도 기록 (모델별 "정제 가능성" 지표 축적) | 정제 |

**자동 판정 불가능한 것** — 중간 구간에서 워드마크가 뭉개졌는지. `shard` 는 중간에 글자가 흩어지는 것이 의도라 붕괴와 구분되지 않는다. → 콘택트 시트 + 파형 · 임팩트 마커를 검수 화면에 띄우고 사람이 승인한다. "완전 자동"을 주장하지 않는다.

콘택트 시트는 **사람이 보는 용도**다. 생성 모델에 레퍼런스로 넣으면 격자가 출력에 박힌다.

## 9. 오디오 — 3층

### 9.1 문제

생성 모델의 내장 오디오는 범용적이고 편차가 크다(부록 A.2: −21 ~ −41dB). 로고 스팅은 5초 안에 승부가 나므로 임팩트가 프레임 단위로 맞아야 한다. 0.2초 늦으면 싸구려가 된다.

**Higgsfield 로는 안 된다.** `generate_audio` 는 TTS 전용이고 `sonilo_music` · `mirelo_text_to_audio` 는 게임 파이프라인 전용이다. 외부 제공자가 필요하다.

### 9.2 3층 구조

| 층 | 제공자 | 무엇을 푸는가 | 동기화 |
|---|---|---|---|
| L1 동기 SFX | MMAudio (video-to-audio) | 화면 사건에 붙는 소리 | 자동 — 모델이 프레임을 본다 |
| L2 설계 SFX | ElevenLabs SFX v2 | 아트 디렉션이 필요한 히어로 히트 | Tempo `impactAt` 으로 배치 (`adelay`) |
| L3 음악 | Stable Audio (기본) / ElevenLabs Music v2 | 5초 시네마틱 베드 | composition_plan 으로 다운비트를 임팩트에 강제 |

셋 다 필요한 이유 — MMAudio 혼자면 화면에 없는 서브베이스 붐이 없다. ElevenLabs 혼자면 화염 크래클 · 물방울 같은 화면 추종음을 손으로 못 맞춘다. 음악은 둘 다 못 만든다.

```ts
type AudioPlan = {
  impactAt: number; riserFrom: number
  musicPrompt: string
  heroSfx: Array<{ at: number; prompt: string; gainDb: number }>
}
```

음악은 두 섹션 — `[0, impactAt]` 라이저(저역 드론 + 상승 텍스처), `[impactAt, 5.0]` 잔향과 해소.

### 9.3 믹스

```bash
ffmpeg -y -i video.mp4 -i music.wav -i l1.wav -i hero0.wav -i hero1.wav \
  -filter_complex "\
    [3:a]adelay=2200|2200[h0]; [4:a]adelay=2450|2450[h1]; \
    [2:a][h0][h1]amix=inputs=3:normalize=0[sfx]; \
    [1:a]volume=-6dB[mus]; \
    [mus][sfx]sidechaincompress=threshold=0.05:ratio=6:attack=5:release=250[ducked]; \
    [ducked][sfx]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.0:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out.mp4
```

**사이드체인 덕킹이 핵심이다.** 임팩트 순간 음악을 눌러야 히트가 크게 들린다. 목표 라우드니스는 프리셋 값(VFX −16 · 자연 −20 LUFS), 트루피크 −1.0 dBTP.

생성 모델 내장 오디오는 기본 끈다. `audioMode` = `designed`(기본) / `vendor`(빠르고 싸게) / `silent`(편집자용).

### 9.4 제공자 추상화

Udio 는 2025-10-29 다운로드를 전면 중단했다. 제공자는 예고 없이 바뀐다.

```ts
interface SfxProvider   { generate(prompt: string, seconds: number): Promise<Buffer> }
interface MusicProvider { compose(plan: CompositionPlan): Promise<Buffer> }
interface V2AProvider   { fromVideo(video: Path, hint?: string): Promise<Buffer> }
```

`AUDIO_SFX_PROVIDER` · `AUDIO_MUSIC_PROVIDER` · `AUDIO_V2A_PROVIDER` 로 고른다. 하나가 죽어도 나머지 두 층은 돈다.

### 9.5 ⚠ 라이선스 — 상용 출시 전 반드시 확인

| 제공자 | 상업 이용 | 주의 |
|---|---|---|
| ElevenLabs SFX v2 | 유료 플랜 royalty-free | 무료 플랜은 출처 표기 의무. 효과당 $0.0194 |
| ElevenLabs Music v2 | 광범위 클리어 | **광고 · 영화 · TV · 게임 · 엔터프라이즈 배포는 추가 라이선스** |
| Stable Audio | 라이선스 데이터셋 | 프레임워크가 명확. 기악 중심이라 스팅에 적합 |
| MMAudio | 오픈 모델 | 가중치 라이선스 · 호스팅 약관 별도 확인 |

로고 스팅은 광고에 해당할 소지가 크다. → **음악 기본 제공자는 Stable Audio.** P6 전 법적 확인 결과를 이 문서에 갱신한다. 확인 전 외부 판매 금지.

### 9.6 비용

오디오는 영상 대비 무시할 만하다. 영상 1편 45크레딧 · SFX 효과당 $0.0194 · 음악 5초 소액 · MMAudio 초당 과금 소액.

## 10. 원가와 원장

- 모든 생성 버튼에 `estimate()` 결과를 표시한다. 드래프트 배치는 편수 × 단가, 히어로 승격 · 4K 업스케일 · 비율 재생성은 각각 원가 명시
- 프로젝트 상단에 지출 합계(크레딧 · USD) 상시 표시
- 프로젝트별 **예산 상한** — 초과 시 제출 버튼 비활성
- `ledger` 는 벤더 응답 시점에 append. 취소 · 환불은 음수 행

## 11. 브랜드 킷 세부

- 로고 소스 우선순위: 브랜드 원본 SVG/PNG(알파) → 시퀀스 마지막 프레임 → SVG 래스터
- 시퀀스에서 뽑을 때 오염도 스캔 필수(부록 A.4). 마지막 프레임은 글로우 잔광이 알파에 섞인다. 오염 ≥ 2% 또는 불투명 < 60% 면 경고하고 원본 에셋을 권한다
- 브랜드 컬러는 히스토그램으로 자동 추출(오염도 스캐너와 같은 패스). 사용자가 덮어쓴다
- 하드코딩 제거: 보크셀 셀 크기 · 샘플 폭 · `#020009` 배경 · 그라디언트 · 임팩트 플래시 · PRNG seed · 타임라인 구간 값 → 전부 프리셋/IR/브랜드 파생값

## 12. 납품 키트

| 항목 | 생성 방식 | 원가 |
|---|---|---|
| 마스터 H.264 1080p / 4K | 히어로 + 사운드 믹스 | 무료 (4K 업스케일만 크레딧) |
| ProRes 4444 / WebM 알파 | canvas 레이어 또는 composite 경로에서만 가능. 아니면 "알파 불가" 명시 | 무료 |
| 비율 변형 16:9 · 9:16 · 1:1 | (a) 재생성 — 원가 명시 (b) 로고 세이프 리프레임 — 로고 바운딩 유지 크롭 | 선택 |
| 포스터 프레임 PNG | 착지 프레임 | 무료 |
| 루프본 | 착지 홀드 연장 | 무료 |
| 인트로 / 아웃트로 | 아웃트로 = 착지 후 홀드 · 인트로 = 착지 후 페이드아웃 | 무료 |
| 무음본 | 오디오 스트림 제거 | 무료 |

AI 출력에서 매트를 뽑지 않는다(부록 A.1). 알파가 필요하면 canvas 레이어를 따로 렌더한다. ZIP 은 요청 시 즉석 생성. 리뷰 링크는 키트 전체를 공개 뷰로 보여준다.

## 13. 비계 정리

| 대상 | 사유 |
|---|---|
| 핸드오프 번들 임포트 (`handoff.node.ts` 612줄 + `handoff.js` + 페이지 + `handoff_bundles`) | Genspark Design zip 을 받아 HTML 프로토타입을 서빙하는 개발자 도구. 제품 사용자에게 의미 없고 zip 폭탄 방어 · CSP 샌드박스 유지 비용만 크다. 삭제 전 기존 번들 일회성 내보내기 |
| `/api/ai/import-genspark-image` | Genspark 내부 UI 결과를 URL 로 끌어오는 경로. 외부 사용자에겐 없는 워크플로 |
| `public/static/plazion_logo.png` | 기본 로고가 특정 브랜드일 이유가 없다 |
| `public/static/*.js` 바닐라 프론트 | React 이관 완료 화면부터 순차 삭제 |

**유지:** Genspark AI 로고 생성(Brand 킷의 소스 옵션) · Cloudflare Workers 진입점(정적 셸 전용).

---

# Part III · 실행

## 14. 마이그레이션

각 단계 끝에 사이트가 정상 동작해야 한다. **P2 가 첫 목표** — 거기서 실제 브랜드로 써 보고 이후를 재우선순위한다.

| 단계 | 내용 | 끝났을 때 |
|---|---|---|
| **P0 기반** | web/worker 분리 + pg-boss · 파이프라인 단계 그래프 · 엔진 계약 · 레지스트리(canvas 어댑터로 기존 렌더 이식) · 저장소 어댑터 · 스키마 신설(`workspace_id` 포함) · 기존 데이터 이관 · React 셸 `/app` + 파이프라인 모니터 | 기존 canvas 렌더가 새 파이프라인 · 모니터로 돈다. 골든 프레임 해시 회귀 통과 |
| **P1 브랜드 · 디렉션** | Brand 킷(스캔 · 색 추출 · 심볼/워드마크 분리 · 세이프존) · 엔드프레임 생성 · Direction IR + 프리셋 6종 + 보드 UI · PLAZION 하드코딩 제거 · 핸드오프 내보내기 후 삭제 | 임의 브랜드로 엔드프레임과 IR 을 만든다. 아직 AI 생성 없음 |
| **P2 ★ 생성 · 검수** | Seedance REST 스파이크 → 어댑터 + `compile()` · 드래프트 격자 → 히어로 깔때기 · 착지 교체 · 타이밍 · 자동 QA · 검수 화면 · 원장 · 프리플라이트 · 예산 상한 · Quick 경로 | **로고가 VFX 로 변형돼 나오고 검수 · 승인된다. 여기서 멈추고 써 본다** |
| **P3 사운드** | L2 ElevenLabs → L3 Stable Audio + 덕킹 → L1 MMAudio · Sound 화면 · 매니페스트 재믹스 | 임팩트에 소리가 박힌다 |
| **P4 납품** | 납품 키트 전부 · 리프레임 · 루프/인트로 · 아웃트로 · ZIP · 리뷰 링크(공개 뷰 · 코멘트 · 승인) | 클라이언트에게 링크 하나로 납품 |
| **P5 멀티모델** | 두 번째 엔진(Kling 또는 Veo — P2 시점의 `end_image` 지원 여부로 결정) · 라우터 · composite 안전판 + canvas 레이어 모드 · 저가 모델 드래프트 실측 | 벤더 하나가 죽어도 제품이 산다 |
| **P6 협업 · 출시 준비** | 워크스페이스 · 매직링크 · 역할 · 원장 UI · 옛 페이지 삭제 · 라이선스 법적 확인 결과 반영 | 외부 고객에게 열 수 있다 |

**순서의 이유**

- P0 없이는 3–6분 잡과 모니터가 성립하지 않는다. 지금 `render.node.ts` 에 Playwright 가 박혀 있어 엔진을 추가할 자리도 없다
- P1 이 P2 의 입력(엔드프레임 · IR)을 만든다
- 사운드(P3)가 납품(P4)보다 앞인 건 체감 품질 상승폭이 가장 크기 때문. L2 임팩트 클랭 하나만 박혀도 가장 크게 오른다. L1(V2A)은 결과 예측이 가장 어려워 앞의 두 층으로 기준선을 만든 뒤 붙인다
- 멀티모델(P5)은 어댑터 계약이 P0 에서 확정되므로 뒤로 미뤄도 비용이 안 는다

## 15. 리스크

| 리스크 | 대응 |
|---|---|
| P0 리팩토링이 현재 렌더를 깨뜨림 | 착수 전 골든 프레임 확보. 해시 회귀 테스트가 P0 완료 조건 |
| 드래프트가 히어로와 다르게 나와 "고른 것과 다른 것"이 옴 | 드래프트는 같은 모델 · 같은 시드 · 해상도만 낮춤을 기본. 저가 모델 드래프트는 P5 에서 실측 후 도입 |
| Seedance REST 파라미터가 MCP 와 다름 | P2 첫 태스크로 API 스파이크(1편). `mode` · `end_image` 단독 제약 재검증 |
| 크레딧 소진 · 중복 차감 | 프리플라이트 + 원장 + 제출 무재시도 + 프로젝트 예산 상한 |
| 음악 라이선스가 광고 용도를 막음 | Stable Audio 기본. P6 전 법적 확인. 미확인 시 외부 판매 금지 |
| 오디오 제공자 소멸 | 세 층 전부 인터페이스로 격리 |
| React 이관 중 두 프론트 공존 | `/app` 스트랭글러, 화면 단위 이관, 단계마다 옛 화면 링크 제거 |
| 단일 개발 리소스로 범위 과다 | P2 에서 멈추는 지점 명시. P3 이후는 P2 실사용 결과로 재우선순위 |
| 워커 컨테이너가 Orbitron 에서 별도 배포되어야 함 | 같은 이미지 · `CMD` 만 다름. P0 에서 Orbitron 설정 확인 |

## 16. 하지 않는 것

- 결제 · 크레딧 정산 — 원장만 쌓는다
- Cloudflare Workers 에서의 렌더 — Chromium 도 ffmpeg 도 없다
- 내레이션 · 보이스오버 — 5초에 말이 들어갈 자리가 없다
- 사용자 음악 업로드 — 저작권 책임 구조가 상용에서 분쟁 소지
- 5초 초과 다샷 구성 · 타임라인 편집기 — 스팅에 과하다
- 오디오 마스터링 체인 — loudnorm 과 덕킹으로 충분
- 제품명 · 도메인 변경 — 세계 시장 출시 시 필요하지만 이 설계와 독립된 결정. **별도 안건으로 표시만 한다**

## 17. 작업 규칙 (승계)

- 크레딧을 쓰는 호출은 절대 자동 재시도하지 않는다
- 생성 원본은 덮어쓰지 않는다
- 영상 검수는 콘택트 시트 1장으로 한다 (5초 영상 전 프레임 ≈ 22만 토큰, 시트 ≈ 1.5천)
- 콘택트 시트를 생성 모델에 레퍼런스로 넣지 않는다

---

# 부록 A · 실측 근거 (2026-08-30, PLAZION · GreenB 16편)

## A.1 루마키 알파 추출 실패

검정 배경 FORGE 영상에 루마키를 걸어 매트를 뽑고 중간 회색 위에 합성해 확인.

| 영역 | 휘도 (0–255) |
|---|---|
| 배경 | 3.0 |
| 로고 평균 (중앙값 62.2) | 83.4 |
| 로고 하위 25% | **44.6** |

로고의 어두운 4분의 1이 휘도 45라 배경과 벌어지지 않는다. 루마키가 로고 본체를 반투명으로 판정했고 합성 시 색이 죽고 검은 프린지가 생겼다. screen 블렌드에서는 어두운 로고가 사라졌다. 크로마키는 화염 · 글로우에 색이 물들고, 더블 패스 매트는 AI 가 같은 프롬프트로 다른 영상을 뱉어 불가능하다. **→ 매트를 뽑지 않고 알파 레이어를 따로 렌더한다.**

## A.2 오디오 라우드니스 편차

| 프리셋 계열 | mean_volume |
|---|---|
| VFX (forge · shard · arc) | −21 ~ −24 dB |
| 자연 (dew · growth · mist) | −29 ~ −43 dB |

편차 18dB. 자연 컨셉은 조용한 것이 정상이라 목표를 계열별로 나눴다. −41dB 를 −16 LUFS 로 올리면 게인 25dB 라 노이즈 플로어도 올라온다.

## A.3 출력 규격

| 항목 | 실측 |
|---|---|
| 프레임레이트 | 요청과 무관하게 항상 24 fps |
| 길이 | 5초 요청 → 5.056초 |
| 해상도 | 요청대로 (1080p 상한) |
| 알파 | 없음 |
| 코덱 | hevc / aac 32kHz stereo |
| 소요 | 오디오 포함 1080p 5초 3–6분. 진행 중 `type: "image"` 표기는 벤더 버그 — `status` 만 신뢰 |

## A.4 로고 소스 오염

| 프레임 | 브랜드 외 색조 | 불투명 픽셀 비율 |
|---|---|---|
| 마지막 (0089) | **39.6 %** | 낮음 |
| 중간 (0042) | 0.2 % | 57 % |
| 브랜드 원본 PNG | 0.00 % | 100 % |

마지막 프레임은 글로우 · 링 잔광이 알파에 섞이고, 중간 프레임은 하프톤 디졸브라 격자로 남는다. **→ 시퀀스에서 뽑지 말고 브랜드 원본 에셋을 쓴다.**

## A.5 착지 정확도

`end_image` 단독으로 생성한 결과의 마지막 프레임 vs 엔드프레임:
워드마크 자획 · 형태 **보존** · 브랜드 컬러 **보존**(`start_image` 동시 제공 시 은색 변질) · 위치 · 크기 **미세 이동 · 축소** → 착지 교체가 필요한 이유. 로고가 화면 폭 15%(글자 높이 약 40px)로 작았는데도 자획이 살아남았다.

# 부록 B · 출처

- MMAudio — <https://github.com/hkchengrex/MMAudio> · <https://replicate.com/zsxkib/mmaudio> · <https://www.eachlabs.ai/meta/mm-audio>
- Eleven Music API — <https://elevenlabs.io/docs/api-reference/music/compose> · <https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans>
- ElevenLabs SFX · 요금 — <https://elevenlabsmagazine.com/elevenlabs-ai-sound-effects-guide-2026/>
- 음악 제공자 라이선스 비교 — <https://www.chartlex.com/blog/marketing/ai-music-generator-comparison-2026>
- pg-boss — <https://github.com/timgit/pg-boss>
