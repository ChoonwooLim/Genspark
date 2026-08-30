# Logo Studio 통합 설계

작성일: 2026-08-30
상태: 설계 확정, 구현 미착수
대상 저장소: 이 저장소(Genspark) — 흡수 통합

## 1. 무엇을 통합하는가

`genspark.twinverse.org` 에서 돌고 있는 **Logo Studio**(이 저장소)와,
2026-08-30 에 별도로 설계했던 **Logo Sting Studio**(AI 생성 + 후반작업 파이프라인)를
하나의 사이트로 합친다.

방향은 **흡수**다. Logo Sting Studio 를 이 저장소 안으로 가져오고, Seedance 를
두 번째 렌더 엔진으로 붙인다. 반대 방향은 성숙도로 봐도 성립하지 않는다.

### 두 시스템의 실체

| | Logo Studio (현재) | Logo Sting Studio (설계만) |
|---|---|---|
| 렌더 방식 | Canvas 2D 결정론적 | Seedance 2.5 확률적 생성 |
| 알파 | **있음** (Playwright `omitBackground`) | 없음 |
| 정확도 | 픽셀 단위 재현 | 매번 다름 |
| 소요 | 즉시 | 3–6분 |
| 비용 | 무료 | 45 크레딧/편 |
| 연출 다양성 | **1종** (보크셀 조립 고정) | 프리셋 6종, 사실상 무한 |
| 시네마틱 품질 | 컨셉 스케치 수준 | 헐리우드급 |

**정확히 상보적이다.** 한쪽의 약점이 다른 쪽의 강점이다.

## 2. 통합 논지 — 로고 자체를 VFX 로 변형시킨다

**이 제품의 핵심 기능은 `seedance` 엔진이다.** 로고를 배경 위에 얹는 것이 아니라,
**로고 자체가 재질과 형태를 바꾸며 만들어지는 것**이다.

- 용융 크롬이 흘러 **글자 하나하나로 단조**되고 백열에서 브랜드 색으로 식는다
- 크리스탈 파편이 날아와 **글자로 스냅**해 조립된다
- 번개가 응결하며 **글자로 결정화**된다
- 물방울이 모여 **글자로 뭉쳐지고** 수면 반사와 함께 정착한다
- 새싹이 자라 **글자를 엮어낸다**

로고가 VFX 의 **주인공**이지 위에 붙은 스티커가 아니다. 2026-08-30 세션에서
PLAZION·GreenB 로 16편을 실제로 만들어 확인했다. Canvas 로는 이런 것을 만들 수 없다 —
연출 하나가 손으로 코딩한 보크셀 조립뿐이고, 새 연출마다 렌더러를 다시 짜야 한다.

### 로고가 뭉개지지 않게 하는 법

AI 가 로고를 그리므로 워드마크가 망가질 위험이 있다. 세 겹으로 막는다.

| 겹 | 방법 | 근거 |
|---|---|---|
| 1 | `end_image` 로 **착지 지점을 고정** | 최종 로고가 목표 프레임으로 수렴한다 |
| 2 | 후반작업에서 **마지막 구간을 원본으로 크로스페이드** | 착지가 픽셀 정확해진다 |
| 3 | 콘택트 시트로 **중간 구간을 사람이 확인** | 붕괴는 자동 판정이 불가능하다 |

실측: `end_image` 만으로도 워드마크 자획이 살아남았다. 로고가 화면 폭 15%(글자 높이
약 40px)로 작았는데도 그랬다. "확산 모델은 타이포를 뭉갠다"는 일반론은 이 방식에
과하게 비관적이다.

### 세 엔진의 위상

```
              ┌─ seedance   ★ 핵심. 로고 자체가 변형되며 만들어진다
로고 1장 ─────┼─ canvas       결정론적 · 알파 · 무료 · 즉시. 프리뷰와 레이어 소스
              └─ composite    로고를 절대 건드리면 안 되는 경우의 대안
```

`canvas` 는 사라지지 않는다. 하지만 역할이 바뀐다 — **최종 연출을 만드는 엔진이
아니라, `seedance` 를 뒷받침하는 도구**다.

- `end_image` 를 만든다 (브랜드 배경 위에 정확한 크기·위치로 로고 배치)
- 무료·즉시라서 구도와 여백을 크레딧 없이 잡아볼 수 있다
- 알파 레이어가 필요할 때 뽑는다

`composite` 는 **핵심이 아니라 안전판**이다. 규제 문서·계약서 같은 데 들어가
워드마크가 한 픽셀도 달라지면 안 되는 경우에만 쓴다. 이때는 Seedance 에게
로고 없는 플레이트만 시키고 Canvas 알파 로고를 겹친다. 대신 로고가 VFX 에
참여하지 못하므로 **연출의 힘이 떨어진다.** 기본값이 아니다.

## 3. 이 통합으로 폐기되는 앞선 결정 두 가지

정직하게 남긴다. 2026-08-30 오전에 내렸던 결정 중 둘이 뒤집힌다.

### 폐기 1 — Python 신규 저장소

`docs/superpowers/plans/2026-08-30-logo-sting-core-pipeline.md`(ECOROID 저장소)는
Python + Pillow + ffmpeg 로 12개 태스크를 짠 계획이다. **인프라 부분이 이미 여기
구현돼 있다.**

| P1a 계획의 태스크 | 이 저장소의 현황 |
|---|---|
| Task 01 ffmpeg 래퍼 | `render.node.ts` 의 `run()` · Dockerfile 에 ffmpeg 포함 |
| Task 05–07 후반작업 체인 | `encodeVideo()` 확장으로 흡수 |
| Task 09 콘택트 시트 | Playwright 프레임 캡처 경로 재사용 |
| Task 10 납품 세트 | `sequences` · `renders` 다운로드 흐름 존재 |
| 잡 상태 모델 | `renders` 테이블에 `status`/`download_token`/`storage_path` 존재 |

살아남는 것은 **로직**이다 — 프리셋 6종 프롬프트, 로고 오염도 스캔, 엔드프레임 생성,
QA 지표, Seedance 어댑터. 이것들을 TypeScript 로 이식한다.

### 폐기 2 — 알파를 P4 로 미룬 결정

루마키로 Seedance 출력에서 매트를 뽑는 데 실패했고(로고 하위 25% 휘도 44.6 vs
배경 3.0), 그래서 알파를 P4 로 미뤘다. **이 앱이 알파를 이미 뽑는다.**
Canvas 2D 를 Playwright 가 `omitBackground: true` 로 캡처한다.

AI 출력에서 매트를 뽑을 이유가 없어졌다. 로고 레이어를 따로 렌더하면 된다.

## 4. 목표 아키텍처

런타임·배포는 그대로 둔다. Hono + TypeScript + Vite, Node 컨테이너, Orbitron,
PostgreSQL, Playwright + Chromium + ffmpeg 이 든 Debian 이미지.

```
              ┌──────────────── 렌더 엔진 ────────────────┐
페이지        │                                            │
  작업실 ──▶ │  canvas.engine    Playwright + Canvas 2D   │──▶ renders
  미리보기    │  seedance.engine  Higgsfield 어댑터         │     (기존 테이블)
  라이브러리  │  composite.engine canvas 알파 ⊕ seedance    │
              └────────────────────────────────────────────┘
                            │
                    post 체인 (ffmpeg)
             라우드니스 · 타이밍 · 착지 · 업스케일
```

### 새로 만드는 모듈

| 파일 | 책임 |
|---|---|
| `src/engines/registry.ts` | 엔진 계약과 등록. `render.node.ts` 가 여기로 위임 |
| `src/engines/canvas.ts` | 현재 `render.node.ts` 의 Playwright 캡처를 엔진으로 추출 |
| `src/engines/seedance.ts` | Higgsfield 제출·폴링·다운로드 |
| `src/engines/composite.ts` | 플레이트 + 알파 레이어 ffmpeg 합성 |
| `src/presets.ts` | 프리셋 6종 정의와 프롬프트 조립 |
| `src/post.ts` | 라우드니스·타이밍·착지 교체 |
| `src/qa.ts` | 자동 지표와 콘택트 시트 |
| `src/logo-scan.ts` | 업로드 로고 오염도·해상도·알파 검증 |

`render.node.ts`(500줄)는 **오케스트레이터로 축소**한다. 잡 수명주기와 DB 만 다루고
실제 렌더는 엔진에 위임한다. 지금은 Playwright 캡처가 이 파일 안에 박혀 있어
엔진을 추가할 자리가 없다.

### 엔진 계약

```ts
type EngineJob = {
  logo: LogoRef            // studio_logos 행 또는 업로드
  preset: PresetKey
  aspect: '16:9' | '9:16' | '1:1'
  durationSeconds: number
  fps: number
  transparent: boolean
}

interface Engine {
  readonly id: 'canvas' | 'seedance' | 'composite'
  readonly supportsAlpha: boolean
  readonly costsCredits: boolean
  render(job: EngineJob, ctx: RenderContext): Promise<RenderArtifact>
}
```

`costsCredits` 를 계약에 넣는 이유 — **크레딧을 쓰는 엔진은 자동 재시도하지 않는다.**
오케스트레이터가 이 플래그로 재시도 정책을 가른다. 실패하면 멈추고 사람에게 묻는다.

## 5. seedance 엔진의 설계 — 핵심 기능

제품의 중심이므로 가장 자세히 다룬다.

### 요청 조립

```ts
{
  model: 'seedance_2_5',
  mode: 'omni_reference',      // 필수. 빠뜨리면 422
  duration: 5,
  resolution: '1080p',
  aspect_ratio: job.aspect,
  generate_audio: true,
  bitrate_mode: 'high',
  medias: [{ role: 'end_image', value: endFrameMediaId }],   // 정확히 하나
  prompt: buildPrompt(preset, brand, color, accent),
}
```

두 가지가 실측으로 확정된 제약이다.

- `mode` 를 빠뜨리면 **422** — `end_image` 는 `omni_reference` 에서만 허용된다
- `start_image` 와 `end_image` 를 **둘 다** 주면 최종 워드마크가 보라에서
  **은색으로 변질**된다. 브랜드 컬러를 잃는다. `end_image` 하나만 준다

### 프리셋 6종

| 키 | 연출 | 배경 | 목표 LUFS | 디졸브 |
|---|---|---|---|---|
| `forge` | 용융 크롬이 글자로 단조 | 딥블랙 | −16 | 0.6s |
| `shard` | 크리스탈 파편이 조립 | 딥블랙 | −16 | 0.5s |
| `arc` | 번개가 응결·결정화 | 딥바이올렛 | −16 | 0.5s |
| `dew` | 물방울이 모여 뭉쳐짐 | 오프화이트 | −20 | 0.3s |
| `growth` | 새싹·넝쿨이 엮어냄 | 오프화이트 | −20 | 0.3s |
| `mist` | 안개가 걷히며 드러남 | 딥그린 | −20 | 0.3s |

프롬프트 템플릿에 `{brand}` `{color}` `{accent}` 만 치환한다. 전문은
`docs/superpowers/plans/2026-08-30-logo-sting-core-pipeline.md` Task 02 참조.

**자연 계열에는 부정 지시를 길게 나열해야 한다.** 모델 기본값이 "화려한 VFX" 라
`no fire, no flames, no smoke, no molten metal, no explosion, no sparks, no neon,
no lightning` 을 명시하지 않으면 불꽃이 들어온다.

디졸브 길이가 프리셋마다 다른 이유 — 배경이 정적인 컨셉(안개·물)은 짧아도 티가
안 나지만, 잔불이 움직이는 `forge` 는 짧으면 착지 교체 지점의 점프가 보인다.

### 엔드프레임은 canvas 엔진이 만든다

브랜드 배경 위에 로고를 정확한 크기·위치로 배치한 정지 프레임이다.
**여백이 중요하다** — 레퍼런스 프레임의 프레이밍이 그대로 복사되므로 로고가 꽉 차면
결과물에서 잘려 나온다. 16:9 는 폭 62%, 9:16 은 78% 를 기본으로 한다.

로고 소스가 800px 미만이면 폭 비율을 자동으로 낮춘다. 억지로 키우면 뭉개지는데,
여백이 늘어난 쪽이 오히려 절제된 브랜드 톤에 맞는다.

### 후반작업

| 단계 | 처리 | 실측 근거 |
|---|---|---|
| 착지 교체 | 마지막 구간을 엔드프레임으로 크로스페이드 | `end_image` 를 줘도 로고가 미세하게 이동·축소된다 |
| 라우드니스 | `loudnorm` + 리미터 | VFX −23dB / 자연 −41dB, 편차 18dB |
| 타이밍 | 5.00초로 트림, fps 정규화 | 5초 요청 → 5.06초, 항상 24fps 출력 |

라우드니스에 함정이 있다. −41dB 를 −16 LUFS 로 올리면 게인이 25dB 라 **노이즈
플로어도 같이 올라온다.** 자연 계열은 조용한 것이 정상이므로 목표를 −20 으로 낮추고,
게인이 20dB 를 넘으면 경고를 띄운다.

### 비율은 재생성이다

리프레임하면 로고가 잘린다. 비율마다 `end_image` 를 새로 만들고 다시 생성해야 하며
**크레딧이 그만큼 배로 든다.** UI 에서 원가로 명시한다.

### 폴링

오디오 포함 1080p 5초는 **3–6분** 걸린다. 진행 중 `type` 이 `"image"` 로 표시되는
것은 Seedance 2.5 의 표기 오류이므로 `status` 만 신뢰한다.
**타임아웃이 나도 재제출하지 않는다** — 크레딧이 중복 차감된다.

## 6. composite 엔진의 설계 — 안전판

기본값이 아니다. 워드마크가 한 픽셀도 달라지면 안 되는 경우에만 쓴다.

### 타이밍 정합

Canvas 는 3초 30fps(90프레임), Seedance 는 5초 24fps 로 고정 출력한다. 그대로는 못 겹친다.

**Canvas 쪽을 맞춘다.** Canvas 엔진은 결정론적이고 무료이므로 어떤 길이·fps 로든
다시 렌더하면 된다. 지금 하드코딩된 3초/30fps 를 `EngineJob` 파라미터로 뺀다.
Seedance 쪽을 맞추려 들면 재생성이라 크레딧이 든다.

### 로고 레이어 모드

현재 Canvas 애니메이션은 보크셀 조립 → 글리치 → 임팩트 → 홀로그램의 완결된 연출이다.
플레이트 위에 겹치면 **두 개의 연출이 싸운다.**

composite 용으로 **레이어 모드**를 추가한다 — 로고가 플레이트의 임팩트 타이밍에 맞춰
나타나 정지하는 것까지만 하고, 자체 배경 효과(글리치·쇼크웨이브)는 끈다.
프리셋마다 임팩트 시점이 다르므로 `revealAt` 을 프리셋 파라미터로 둔다.

### 합성

```
ffmpeg -i plate.mp4 -framerate {fps} -i logo_%04d.png \
  -filter_complex "[0:v][1:v]overlay=format=auto:shortest=1" \
  -map 0:a? ...
```

플레이트의 오디오를 그대로 쓴다. 로고 레이어에는 오디오가 없다.

### Seedance 프롬프트 분기

composite 모드에서는 프리셋 프롬프트에 **로고를 그리지 말라는 지시**를 넣고
`end_image` 를 주지 않는다. 2026-08-30 세션의 Test B 가 이 형태였고 잘 나왔다.

> Absolutely no text, no letters, no logo, no typography anywhere in frame.

## 7. 비계 정리

제품이 아니라 개발 과정의 흔적인 것들을 제거한다. 상용 목표와 맞지 않고,
남겨두면 멀티테넌시를 얹을 때 전부 다시 손봐야 한다.

### 제거

| 대상 | 규모 | 사유 |
|---|---|---|
| 핸드오프 번들 임포트 | `handoff.node.ts` 612줄 + `handoff.js` + 페이지 + `handoff_bundles` 테이블 | Genspark Design 핸드오프 zip 을 받아 HTML 프로토타입을 서빙하는 개발자 도구다. 제품 사용자에게는 의미가 없고, zip 폭탄 방어·CSP 샌드박스 등 유지 비용만 크다 |
| `/api/ai/import-genspark-image` | `genspark-image.ts` 일부 | Genspark 내부 UI 결과를 URL 로 끌어오는 경로. 외부 사용자에게는 존재하지 않는 워크플로 |
| `public/static/plazion_logo.png` | 에셋 | 기본 로고가 특정 브랜드일 이유가 없다 |

핸드오프 기능은 삭제 전에 **기존 번들을 내려받을 수 있는 일회성 내보내기**를 제공한다.
DB 에 든 것을 그냥 버리지 않는다.

### 유지

- Genspark AI 로고 생성(`/api/ai/generate-logo`) — 로고가 없는 사용자에게 진입점이 된다
- 라이브러리 · 보관함 · 프리셋 · 시퀀스 업로드 — 전부 제품 기능이다
- Cloudflare Workers 진입점 — 정적 셸 배포 경로로 유지. 단 엔진은 Node 전용임을 명시

## 8. 브랜드 중립화

PLAZION 고정값이 9개 파일에 흩어져 있다. 상용은 물론이고 GreenB 작업조차
매번 코드를 고쳐야 하는 상태다.

| 현재 하드코딩 | 이동 위치 |
|---|---|
| 보크셀 셀 14px(가로) / 11px(세로) | 프리셋 파라미터 |
| 로고 샘플 폭 1200px / 620px | `ASPECTS` 테이블 (비율별 폭 비율) |
| `#020009` 배경 | 프리셋 `backgroundRgb` |
| `#7A4DFF → #B782FF` 그라디언트 | 브랜드 컬러에서 파생 |
| `rgba(230,210,255,.55)` 임팩트 플래시 | 브랜드 컬러에서 파생 |
| PRNG seed 4242 | 프로젝트별 seed (재현성은 유지, 브랜드마다 다른 결과) |
| 타임라인 구간 값 | 프리셋 `timeline` |

**브랜드 컬러는 로고에서 자동 추출한다.** 업로드된 로고의 지배 색조를 뽑아
기본값으로 제시하고 사용자가 덮어쓸 수 있게 한다. 이 추출기는 로고 오염도 스캐너와
같은 히스토그램을 쓰므로 추가 비용이 거의 없다.

## 9. 데이터 모델 변경

기존 테이블을 최대한 유지한다. `renders` 는 이미 잡 모델로 충분하다.

```sql
-- renders 확장
ALTER TABLE renders ADD COLUMN engine       text NOT NULL DEFAULT 'canvas';
ALTER TABLE renders ADD COLUMN preset       text;
ALTER TABLE renders ADD COLUMN source_render_id uuid REFERENCES renders(id);
ALTER TABLE renders ADD COLUMN qa           jsonb;
ALTER TABLE renders ADD COLUMN credits_spent integer NOT NULL DEFAULT 0;

-- studio_logos 확장
ALTER TABLE studio_logos ADD COLUMN brand_rgb  text;
ALTER TABLE studio_logos ADD COLUMN scan       jsonb;

DROP TABLE handoff_bundles;   -- 일회성 내보내기 이후
```

`source_render_id` 가 핵심이다. **후반작업본은 생성본을 참조하는 별개 행**이다.
생성(유료)과 마무리(무료)를 분리 보관해야 오디오 게인 하나 고치려고 45크레딧을
다시 쓰는 일이 없다.

`credits_spent` 는 P3(과금)의 기초 데이터다. 지금부터 쌓아두지 않으면 나중에 원가를
역산할 수 없다.

## 10. 마이그레이션 단계

각 단계가 끝난 시점에 사이트가 정상 동작해야 한다. 큰 뭉치로 갈아엎지 않는다.

| 단계 | 내용 | 끝났을 때 |
|---|---|---|
| **M1** | 엔진 레지스트리 도입, 기존 Playwright 캡처를 `canvas` 엔진으로 추출 | 동작 동일. 순수 리팩토링 |
| **M2** | 비계 제거(핸드오프 내보내기 후 삭제), PLAZION 값 파라미터화, 엔드프레임 생성 | 임의 브랜드의 엔드프레임을 뽑을 수 있다 |
| **M3** ★ | `seedance` 엔진 + 프리셋 6종 + post 체인 + QA + 검수 UI | **핵심 기능 완성.** 로고가 VFX 로 변형돼 나온다 |
| **M4** | `composite` 엔진, Canvas 레이어 모드, 타이밍 파라미터화 | 픽셀 정확도가 필수인 경우의 대안 확보 |

**M3 이 이 통합의 목표다.** M1·M2 는 M3 을 놓을 자리를 만드는 작업이고, M4 는
그 뒤에 붙는 안전판이다. **M3 이 끝나면 일단 멈추고 실제로 써 본다.** M4 는
현장에서 "워드마크가 한 픽셀도 달라지면 안 된다"는 요구가 실제로 나온 뒤에 한다.

M1 을 먼저 하는 이유 — 지금 `render.node.ts` 에 Playwright 가 박혀 있어 엔진을 추가할
자리가 없다. 리팩토링 없이 Seedance 를 밀어넣으면 500줄이 900줄이 된다.

M2 를 M3 앞에 두는 이유 — 프리셋 구조가 브랜드 중립화의 결과물이고, `seedance` 는
M2 가 만드는 **엔드프레임 없이는 아무것도 못 한다.** 순서를 바꾸면 PLAZION 전용
프리셋을 만들었다가 다시 뜯게 된다.

## 11. 리스크

| 리스크 | 대응 |
|---|---|
| Canvas 레이어 모드와 플레이트 연출이 어울리지 않을 수 있다 | M4 착수 전 수동 합성으로 1편 검증. 오늘 소재가 이미 있다 |
| Seedance 3–6분 대기가 UI 를 막는다 | `renders` 가 이미 비동기 잡 모델이다. 폴링 UI 만 추가 |
| 리팩토링(M1)이 기존 렌더를 깨뜨린다 | M1 전에 현재 출력의 골든 파일을 확보. 프레임 해시로 회귀 검증 |
| 크레딧 소진 | `credits_spent` 기록 + 제출 전 `get_cost` 프리플라이트. 자동 재시도 금지 |
| 단일 `STUDIO_ADMIN_TOKEN` 인증으로는 외부 개방 불가 | P2 과제. 이 통합의 범위 밖이며 그때까지 사내 도구로 운영 |

## 12. 이 통합에서 하지 않는 것

- **멀티테넌시·회원가입** — 지금은 공유 토큰 하나다. 별도 단계로 다룬다
- **결제·크레딧 정산** — `credits_spent` 만 쌓아둔다
- **Seedance 외 생성 백엔드** — 엔진 계약은 열어두되 구현은 하나
- **Cloudflare Workers 에서의 렌더** — Workers 에는 Chromium 도 ffmpeg 도 없다. 정적 셸만 서빙한다
- **도메인·제품명 변경** — `genspark.twinverse.org` 유지. 이름이 내용과 어긋나지만 통합과 독립된 결정이다
