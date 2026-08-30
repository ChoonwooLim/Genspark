# Logo Studio 설계 — 완성본

작성일: 2026-08-30
상태: 설계 확정, 구현 미착수
대상 저장소: 이 저장소(Genspark)

> **이 문서가 정본이다.** `docs/superpowers/specs/` 와 `docs/superpowers/plans/` 의
> 문서들은 이 문서로 통합되기 전의 기록이며 배너가 달려 있다. 구현 계획의 태스크별
> 코드는 `docs/superpowers/plans/2026-08-30-logo-sting-core-pipeline.md` 를 참조용으로
> 읽되, 인프라 부분은 폐기됐다.

---

## 0. 한 문단 요약

브랜드 로고 한 장에서 **로고 자체가 재질과 형태를 바꾸며 만들어지는** 5초 영상을
생성하고, 효과음·음악까지 붙여 완성본으로 내보내는 웹 스튜디오. 이미 돌고 있는
Canvas 2D 렌더러 위에 Seedance AI 엔진과 3층 오디오 파이프라인을 얹는다.
마이그레이션은 M1–M5, 목표는 M3다.

---

# Part I · 통합

## 1. 무엇을 통합하는가

`genspark.twinverse.org` 에서 돌고 있는 **Logo Studio**(이 저장소)와,
별도로 설계했던 **Logo Sting Studio**(AI 생성 + 후반작업)를 하나의 사이트로 합친다.

방향은 **흡수**다. Logo Sting Studio 를 이 저장소로 가져오고 Seedance 를 두 번째
렌더 엔진으로 붙인다. 반대 방향은 성숙도로 봐도 성립하지 않는다.

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

로고가 VFX 의 **주인공**이지 위에 붙은 스티커가 아니다. Canvas 로는 이런 것을 만들 수
없다 — 연출 하나가 손으로 코딩한 보크셀 조립뿐이고, 새 연출마다 렌더러를 다시 짜야 한다.

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

`composite` 는 **핵심이 아니라 안전판**이다. 로고가 VFX 에 참여하지 못하므로
연출의 힘이 떨어진다. 기본값이 아니다.

## 3. 폐기된 앞선 결정 두 가지

정직하게 남긴다.

### 폐기 1 — Python 신규 저장소

`2026-08-30-logo-sting-core-pipeline.md` 는 Python + Pillow + ffmpeg 로 12개 태스크를
짠 계획이다. **인프라 부분이 이미 여기 구현돼 있다.**

| P1a 계획의 태스크 | 이 저장소의 현황 |
|---|---|
| Task 01 ffmpeg 래퍼 | `render.node.ts` 의 `run()` · Dockerfile 에 ffmpeg 포함 |
| Task 05–07 후반작업 체인 | `encodeVideo()` 확장으로 흡수 |
| Task 09 콘택트 시트 | Playwright 프레임 캡처 경로 재사용 |
| Task 10 납품 세트 | `sequences` · `renders` 다운로드 흐름 존재 |
| 잡 상태 모델 | `renders` 테이블에 `status`/`download_token`/`storage_path` 존재 |

살아남는 것은 **로직**이다 — 프리셋 6종 프롬프트, 로고 오염도 스캔, 엔드프레임 생성,
QA 지표, Seedance 어댑터. 전부 TypeScript 로 이식한다.

### 폐기 2 — 알파를 뒤로 미룬 결정

루마키로 Seedance 출력에서 매트를 뽑는 데 실패했고(부록 A), 그래서 알파를 미뤘다.
**이 앱이 알파를 이미 뽑는다.** Canvas 2D 를 Playwright 가 `omitBackground: true` 로
캡처한다. AI 출력에서 매트를 뽑을 이유가 없어졌다.

## 4. 아키텍처

런타임·배포는 그대로 둔다. Hono + TypeScript + Vite, Node 컨테이너, Orbitron,
PostgreSQL, Playwright + Chromium + ffmpeg 이 든 Debian 이미지.

```
              ┌──────────────── 렌더 엔진 ────────────────┐
페이지        │                                            │
  작업실 ──▶ │  canvas.engine    Playwright + Canvas 2D   │──▶ renders
  미리보기    │  seedance.engine  Higgsfield 어댑터         │
  라이브러리  │  composite.engine canvas 알파 ⊕ seedance    │
              └────────────────────────────────────────────┘
                            │
                    post 체인 (ffmpeg)
              착지 · 타이밍 · 업스케일
                            │
                    audio 파이프라인 (3층)
              설계 SFX · 음악 · 동기 SFX · 믹스
```

### 새로 만드는 모듈

| 파일 | 책임 |
|---|---|
| `src/engines/registry.ts` | 엔진 계약과 등록 |
| `src/engines/canvas.ts` | 현재 `render.node.ts` 의 Playwright 캡처를 추출 |
| `src/engines/seedance.ts` | Higgsfield 제출·폴링·다운로드 |
| `src/engines/composite.ts` | 플레이트 + 알파 레이어 합성 |
| `src/presets.ts` | 프리셋 6종 정의와 프롬프트 조립 |
| `src/post.ts` | 타이밍·착지 교체 |
| `src/qa.ts` | 자동 지표와 콘택트 시트 |
| `src/logo-scan.ts` | 업로드 로고 검증 |
| `src/audio/providers/*.ts` | MMAudio · ElevenLabs · Stable Audio |
| `src/audio/plan.ts` | 프리셋 오디오 스펙 → 층별 요청 조립 |
| `src/audio/mix.ts` | ffmpeg 믹스·덕킹·라우드니스 |

`render.node.ts`(500줄)는 **오케스트레이터로 축소**한다. 잡 수명주기와 DB 만 다루고
실제 렌더는 엔진에 위임한다. 지금은 Playwright 캡처가 이 파일 안에 박혀 있어
엔진을 추가할 자리가 없다.

### 엔진 계약

```ts
type EngineJob = {
  logo: LogoRef
  preset: PresetKey
  aspect: '16:9' | '9:16' | '1:1'
  durationSeconds: number
  fps: number
  transparent: boolean
  audioMode: 'designed' | 'seedance' | 'silent'
}

interface Engine {
  readonly id: 'canvas' | 'seedance' | 'composite'
  readonly supportsAlpha: boolean
  readonly costsCredits: boolean
  render(job: EngineJob, ctx: RenderContext): Promise<RenderArtifact>
}
```

`costsCredits` 를 계약에 넣는 이유 — **크레딧을 쓰는 엔진은 자동 재시도하지 않는다.**
오케스트레이터가 이 플래그로 재시도 정책을 가른다.

---

# Part II · 엔진

## 5. seedance 엔진 — 핵심

### 요청 조립

```ts
{
  model: 'seedance_2_5',
  mode: 'omni_reference',      // 필수. 빠뜨리면 422
  duration: 5,
  resolution: '1080p',
  aspect_ratio: job.aspect,
  generate_audio: job.audioMode === 'seedance',
  bitrate_mode: 'high',
  medias: [{ role: 'end_image', value: endFrameMediaId }],   // 정확히 하나
  prompt: buildPrompt(preset, brand, color, accent),
}
```

실측으로 확정된 제약 둘.

- `mode` 를 빠뜨리면 **422** — `end_image` 는 `omni_reference` 에서만 허용된다
- `start_image` 와 `end_image` 를 **둘 다** 주면 최종 워드마크가 **은색으로 변질**된다.
  브랜드 컬러를 잃는다. `end_image` 하나만 준다

### 프리셋 6종

| 키 | 연출 | 배경 | LUFS | 디졸브 | 임팩트 |
|---|---|---|---|---|---|
| `forge` | 용융 크롬이 글자로 단조 | 딥블랙 | −16 | 0.6s | 2.2s |
| `shard` | 크리스탈 파편이 조립 | 딥블랙 | −16 | 0.5s | 2.6s |
| `arc` | 번개가 응결·결정화 | 딥바이올렛 | −16 | 0.5s | 2.8s |
| `dew` | 물방울이 모여 뭉쳐짐 | 오프화이트 | −20 | 0.3s | 3.1s |
| `growth` | 새싹·넝쿨이 엮어냄 | 오프화이트 | −20 | 0.3s | 3.4s |
| `mist` | 안개가 걷히며 드러남 | 딥그린 | −20 | 0.3s | 2.9s |

프롬프트 템플릿에 `{brand}` `{color}` `{accent}` 만 치환한다.

**자연 계열에는 부정 지시를 길게 나열해야 한다.** 모델 기본값이 "화려한 VFX" 라
`no fire, no flames, no smoke, no molten metal, no explosion, no sparks, no neon,
no lightning` 을 명시하지 않으면 불꽃이 들어온다.

디졸브 길이가 프리셋마다 다른 이유 — 배경이 정적인 컨셉(안개·물)은 짧아도 티가 안
나지만, 잔불이 움직이는 `forge` 는 짧으면 착지 교체 지점의 점프가 보인다.

임팩트 시각은 콘택트 시트에서 읽은 초기값이다. 오디오 배치에 쓴다(8장).

### 엔드프레임은 canvas 엔진이 만든다

브랜드 배경 위에 로고를 정확한 크기·위치로 배치한 정지 프레임이다.
**여백이 중요하다** — 레퍼런스 프레임의 프레이밍이 그대로 복사되므로 로고가 꽉 차면
결과물에서 잘려 나온다. 16:9 는 폭 62%, 9:16 은 78%, 1:1 은 72% 를 기본으로 한다.

로고 소스가 800px 미만이면 폭 비율을 자동으로 낮춘다. 억지로 키우면 뭉개지는데,
여백이 늘어난 쪽이 오히려 절제된 브랜드 톤에 맞는다.

### 후반작업

| 단계 | 처리 | 실측 근거 |
|---|---|---|
| 착지 교체 | 마지막 구간을 엔드프레임으로 크로스페이드 | `end_image` 를 줘도 로고가 미세하게 이동·축소된다 |
| 타이밍 | 5.00초로 트림, fps 정규화 | 5초 요청 → 5.06초, 항상 24fps 출력 |

라우드니스 정규화는 **오디오 믹스가 흡수한다**(8장). 두 번 정규화하면 덕킹이 뭉개진다.

### 비율은 재생성이다

리프레임하면 로고가 잘린다. 비율마다 엔드프레임을 새로 만들고 다시 생성해야 하며
**크레딧이 그만큼 배로 든다.** UI 에서 원가로 명시한다.

### 폴링

오디오 포함 1080p 5초는 **3–6분** 걸린다. 진행 중 `type` 이 `"image"` 로 표시되는
것은 Seedance 2.5 의 표기 오류이므로 `status` 만 신뢰한다.
**타임아웃이 나도 재제출하지 않는다** — 크레딧이 중복 차감된다.

## 6. canvas 엔진 — 뒷받침

사라지지 않는다. 역할이 바뀐다 — **최종 연출을 만드는 엔진이 아니라 `seedance` 를
뒷받침하는 도구**다.

- 엔드프레임을 만든다
- 무료·즉시라서 구도와 여백을 크레딧 없이 잡아볼 수 있다
- 알파 레이어가 필요할 때 뽑는다

기존 3초/30fps 하드코딩을 `EngineJob` 파라미터로 뺀다.

## 7. composite 엔진 — 안전판

기본값이 아니다. 워드마크가 한 픽셀도 달라지면 안 되는 경우에만 쓴다.

### 타이밍 정합

Canvas 3초 30fps, Seedance 5초 24fps. 그대로는 못 겹친다.
**Canvas 쪽을 맞춘다** — 결정론적이고 무료이므로 어떤 길이·fps 로든 다시 렌더하면 된다.
Seedance 쪽을 맞추려 들면 재생성이라 크레딧이 든다.

### 로고 레이어 모드

현재 Canvas 애니메이션은 보크셀 조립 → 글리치 → 임팩트 → 홀로그램의 완결된 연출이다.
플레이트 위에 겹치면 **두 개의 연출이 싸운다.** composite 용 레이어 모드를 추가한다 —
로고가 플레이트의 임팩트 타이밍에 맞춰 나타나 정지하는 것까지만 하고 자체 배경 효과는 끈다.

### 합성

```bash
ffmpeg -i plate.mp4 -framerate {fps} -i logo_%04d.png \
  -filter_complex "[0:v][1:v]overlay=format=auto:shortest=1" \
  -map 0:a? ...
```

### Seedance 프롬프트 분기

composite 모드에서는 `end_image` 를 주지 않고 **로고를 그리지 말라는 지시**를 넣는다.

> Absolutely no text, no letters, no logo, no typography anywhere in frame.

---

# Part III · 오디오

## 8. 오디오 파이프라인 — 3층

### 문제

`seedance` 가 만든 영상은 그림은 좋은데 **소리가 범용적이다.** Seedance 내장 오디오는
−21 ~ −41dB 로 편차가 크고 임팩트 순간과 정확히 맞지 않는다. 로고 스팅은 5초 안에
승부가 나므로 **임팩트가 프레임 단위로 맞아야 한다.** 0.2초 늦으면 싸구려가 된다.

### Higgsfield 로는 안 된다 — 확인된 사실

`generate_audio` 는 **TTS 전용**이다. 도구 문서에 명시돼 있다.

> This tool only generates speech: it cannot generate music or sound effects for
> general use, and there is no standalone music/SFX model here.

카탈로그의 `sonilo_music`·`mirelo_text_to_audio` 는 **게임 생성 파이프라인 전용**이다.
→ 외부 제공자가 필요하다.

### 3층 구조

| 층 | 제공자 | 무엇을 푸는가 |
|---|---|---|
| **L1 동기 SFX** | MMAudio (video-to-audio) | 화면 사건에 붙는 소리. 모델이 프레임을 보므로 **동기가 자동** |
| **L2 설계 SFX** | ElevenLabs SFX v2 | 아트 디렉션이 필요한 히어로 히트 |
| **L3 음악** | Stable Audio (기본) / ElevenLabs Music v2 | 5초 시네마틱 베드 |

셋 다 필요한 이유 — **MMAudio 혼자면** 화면에 보이는 것만 소리가 난다. 서브베이스 붐은
화면에 없다. **ElevenLabs 혼자면** 타이밍을 사람이 매번 잡아야 한다. 화염 크래클·물방울
처럼 화면을 따라가야 하는 소리는 손으로 못 맞춘다. **음악은 둘 다 못 만든다.**

### 동기화 — 층마다 다르게

| 층 | 방법 |
|---|---|
| L1 | **자동.** 모델이 프레임을 본다 |
| L2 | **프리셋의 `impactAt`** 으로 배치 (ffmpeg `adelay`) |
| L3 | **composition_plan** 으로 섹션을 나눠 다운비트를 임팩트에 맞춘다 |

```ts
type PresetAudio = {
  impactAt: number          // 초. 히어로 히트가 터지는 시점
  riserFrom: number
  musicPrompt: string
  heroSfx: Array<{ at: number; prompt: string; gainDb: number }>
}
```

5초 스팅의 음악 구성은 두 섹션이면 충분하다.

```
[0.0 – impactAt]   긴장을 쌓는 라이저. 저역 드론 + 상승 텍스처
[impactAt – 5.0]   임팩트 후 잔향과 해소
```

**임팩트에 다운비트가 오도록 구성으로 강제한다.** 생성된 음악을 나중에 밀어 맞추는
것보다 훨씬 정확하다.

### 믹스

```bash
ffmpeg -y -i video.mp4 -i music.wav -i l1.wav -i hero0.wav -i hero1.wav \
  -filter_complex "\
    [3:a]adelay=2200|2200[h0]; \
    [4:a]adelay=2450|2450[h1]; \
    [2:a][h0][h1]amix=inputs=3:normalize=0[sfx]; \
    [1:a]volume=-6dB[mus]; \
    [mus][sfx]sidechaincompress=threshold=0.05:ratio=6:attack=5:release=250[ducked]; \
    [ducked][sfx]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.0:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out.mp4
```

**사이드체인 덕킹이 핵심이다.** 임팩트가 터지는 순간 음악을 눌러야 히트가 크게 들린다.
이것 하나로 아마추어와 헐리우드가 갈린다.

라우드니스 목표는 프리셋 값 — VFX −16 LUFS, 자연 −20 LUFS. 트루피크 −1.0dBTP.

### Seedance 내장 오디오는 끈다

`generate_audio: false`. 범용 오디오가 설계된 3층과 싸운다. 다만 지우지 않고
`audioMode` 로 남긴다 — `designed`(기본) / `seedance`(빠르고 싸게) / `silent`(편집자용).

### 제공자 추상화는 선택이 아니라 필수

**Udio 는 2025년 10월 29일에 다운로드를 전면 중단했다.** 제공자는 예고 없이 바뀐다.

```ts
interface SfxProvider  { generate(prompt: string, seconds: number): Promise<Buffer> }
interface MusicProvider{ compose(plan: CompositionPlan): Promise<Buffer> }
interface V2AProvider  { fromVideo(video: Path, hint?: string): Promise<Buffer> }
```

환경변수로 구현을 고른다 — `AUDIO_SFX_PROVIDER` · `AUDIO_MUSIC_PROVIDER` ·
`AUDIO_V2A_PROVIDER`. 한 제공자가 죽어도 나머지 두 층은 계속 돈다.

### ⚠ 라이선스 — 상용 출시 전 반드시 확인

| 제공자 | 상업 이용 | 주의 |
|---|---|---|
| ElevenLabs SFX v2 | 유료 플랜에서 royalty-free | 무료 플랜은 출처 표기 의무. 효과당 $0.0194 |
| ElevenLabs Music v2 | 광범위하게 클리어됨 | **광고·영화·TV·게임·엔터프라이즈 배포는 추가 라이선스 필요** |
| Stable Audio | AudioSparx 등 라이선스 데이터셋 | 프레임워크가 더 명확. 기악 중심이라 스팅에 적합 |
| MMAudio | 오픈 모델 | **가중치 라이선스 확인 필요.** 호스팅 제공자 약관도 별개 |

**로고 스팅은 광고에 해당할 소지가 크다.** ElevenLabs Music 의 "추가 라이선스" 조항이
기본 경로를 막을 수 있다. → **음악 층 기본 제공자를 Stable Audio 로 둔다.**
상용 출시 전에 법적으로 확인하고 결론을 이 문서에 갱신한다.
확인하지 않은 채로 외부 고객에게 팔면 안 된다.

### 비용

오디오는 영상 대비 무시할 만하다. 아끼려 들 이유가 없다.

| 항목 | 대략 |
|---|---|
| Seedance 영상 1편 | 45 크레딧 |
| ElevenLabs SFX (히어로 히트 2–3개) | 효과당 $0.0194 |
| 음악 5초 | 크레딧제, 편당 소액 |
| MMAudio (Replicate·fal) | 초당 과금, 5초는 소액 |

---

# Part IV · 정리와 실행

## 9. 비계 정리

제품이 아니라 개발 과정의 흔적인 것들을 제거한다.

### 제거

| 대상 | 규모 | 사유 |
|---|---|---|
| 핸드오프 번들 임포트 | `handoff.node.ts` 612줄 + `handoff.js` + 페이지 + `handoff_bundles` 테이블 | Genspark Design 핸드오프 zip 을 받아 HTML 프로토타입을 서빙하는 개발자 도구. 제품 사용자에게 의미가 없고 zip 폭탄 방어·CSP 샌드박스 유지 비용만 크다 |
| `/api/ai/import-genspark-image` | `genspark-image.ts` 일부 | Genspark 내부 UI 결과를 URL 로 끌어오는 경로. 외부 사용자에게는 존재하지 않는 워크플로 |
| `public/static/plazion_logo.png` | 에셋 | 기본 로고가 특정 브랜드일 이유가 없다 |

핸드오프는 삭제 전에 **기존 번들을 내려받는 일회성 내보내기**를 제공한다.
DB 에 든 것을 그냥 버리지 않는다.

### 유지

Genspark AI 로고 생성 · 라이브러리 · 보관함 · 프리셋 · 시퀀스 업로드 ·
Cloudflare Workers 진입점(정적 셸 전용).

## 10. 브랜드 중립화

PLAZION 고정값이 9개 파일에 흩어져 있다. GreenB 작업조차 매번 코드를 고쳐야 한다.

| 현재 하드코딩 | 이동 위치 |
|---|---|
| 보크셀 셀 14px / 11px | 프리셋 파라미터 |
| 로고 샘플 폭 1200px / 620px | `ASPECTS` 테이블 |
| `#020009` 배경 | 프리셋 `backgroundRgb` |
| `#7A4DFF → #B782FF` 그라디언트 | 브랜드 컬러에서 파생 |
| `rgba(230,210,255,.55)` 임팩트 플래시 | 브랜드 컬러에서 파생 |
| PRNG seed 4242 | 프로젝트별 seed |
| 타임라인 구간 값 | 프리셋 `timeline` |

**브랜드 컬러는 로고에서 자동 추출한다.** 업로드된 로고의 지배 색조를 뽑아 기본값으로
제시하고 사용자가 덮어쓸 수 있게 한다. 이 추출기는 로고 오염도 스캐너와 같은
히스토그램을 쓰므로 추가 비용이 거의 없다.

## 11. 데이터 모델

기존 테이블을 최대한 유지한다. `renders` 는 이미 잡 모델로 충분하다.

```sql
ALTER TABLE renders ADD COLUMN engine           text NOT NULL DEFAULT 'canvas';
ALTER TABLE renders ADD COLUMN preset           text;
ALTER TABLE renders ADD COLUMN source_render_id uuid REFERENCES renders(id);
ALTER TABLE renders ADD COLUMN qa               jsonb;
ALTER TABLE renders ADD COLUMN credits_spent    integer NOT NULL DEFAULT 0;
ALTER TABLE renders ADD COLUMN audio_mode       text NOT NULL DEFAULT 'designed';
ALTER TABLE renders ADD COLUMN audio_manifest   jsonb;
ALTER TABLE renders ADD COLUMN audio_cost_usd   numeric(10,4) NOT NULL DEFAULT 0;

ALTER TABLE studio_logos ADD COLUMN brand_rgb text;
ALTER TABLE studio_logos ADD COLUMN scan      jsonb;

DROP TABLE handoff_bundles;   -- 일회성 내보내기 이후
```

**`source_render_id` 가 핵심이다.** 후반작업본은 생성본을 참조하는 별개 행이다.
생성(유료)과 마무리(무료)를 분리 보관해야 오디오 게인 하나 고치려고 45크레딧을
다시 쓰는 일이 없다.

**`audio_manifest` 는 오디오만 다시 만들기 위해 남긴다.** 음악이 마음에 안 들어서
영상을 재생성하는 일은 없어야 한다. 매니페스트가 있으면 같은 영상에 다른 오디오를
얹는 것이 무료에 가깝다.

`credits_spent` 와 `audio_cost_usd` 는 과금 단계의 기초 데이터다. 지금부터 쌓지 않으면
나중에 원가를 역산할 수 없다.

## 12. 상태 흐름

```
queued → generating → generated → posting → scoring → review → approved
                          ↑            │        │        │
                          └────────────┴────────┴────────┘
                                재마무리는 generated 부터
실패 시: failed (+ 실패 단계명, 에러 원문 보존)
```

**`generated` 에서 멈춰 세울 수 있어야 한다.** 생성이 마음에 안 들면 거기서 버리고
재생성하고, 마무리·오디오 문제면 `generated` 부터 다시 태운다.

`review` 가 사람 게이트다. 콘택트 시트 · 파형 · 자동 QA 결과를 나란히 띄운다.

## 13. QA

### 자동 판정

| 지표 | 기준 |
|---|---|
| 착지 프레임 SSIM (교체 후 vs 엔드프레임) | ≥ 0.99 |
| 출력 라우드니스 | 프리셋 목표 ±1 LUFS |
| 트루피크 | ≤ −1.0 dBTP |
| **임팩트 정렬** (오디오 피크 시각 vs `impactAt`) | ±80 ms |
| 오디오 층별 무음 검사 | 각 층 > −50 dB |
| 최종 프레임 로고 색상 vs 브랜드 컬러 | ΔE < 5 |
| 로고 소스 오염도 (입력) | < 2 % |
| 로고 소스 불투명 픽셀 비율 (입력) | ≥ 60 % |

80ms 는 사람이 어긋남을 느끼기 시작하는 경계다. `ffmpeg astats` 로 피크 시각을 뽑는다.

### 자동 판정 불가능

**중간 구간에서 워드마크가 뭉개졌는지는 알고리즘이 판정할 수 없다.** `shard` 는 중간에
글자가 흩어지는 것이 의도된 연출이라 붕괴와 구분되지 않는다.

→ **콘택트 시트 + 파형·임팩트 마커를 검수 화면에 띄우고 사람이 승인한다.**
"완전 자동"을 억지로 주장하지 않는 편이 제품 신뢰에 낫다.

## 14. 마이그레이션

각 단계가 끝난 시점에 사이트가 정상 동작해야 한다. 큰 뭉치로 갈아엎지 않는다.

| 단계 | 내용 | 끝났을 때 |
|---|---|---|
| **M1** | 엔진 레지스트리 도입, Playwright 캡처를 `canvas` 엔진으로 추출 | 동작 동일. 순수 리팩토링 |
| **M2** | 비계 제거, PLAZION 값 파라미터화, 엔드프레임 생성 | 임의 브랜드의 엔드프레임을 뽑을 수 있다 |
| **M3** ★ | `seedance` 엔진 + 프리셋 6종 + post + QA + 검수 UI | **핵심 완성.** 로고가 VFX 로 변형돼 나온다 |
| **M4** | `composite` 엔진, Canvas 레이어 모드 | 픽셀 정확도가 필수인 경우의 대안 |
| **M5a** | 오디오 L2 — ElevenLabs SFX, `impactAt` 배치 | 임팩트 클랭이 박힌다 |
| **M5b** | 오디오 L3 — 음악 + 사이드체인 덕킹 | 헐리우드 감이 난다 |
| **M5c** | 오디오 L1 — MMAudio 동기 층 | 화면을 따라가는 소리까지 |

**M3 이 목표다.** M1·M2 는 자리를 만드는 작업이고 M4 는 그 뒤의 선택지다.
**M3 이 끝나면 일단 멈추고 실제로 써 본다.**

순서의 이유:

- **M1 이 먼저** — 지금 `render.node.ts` 에 Playwright 가 박혀 있어 엔진을 추가할
  자리가 없다. 리팩토링 없이 Seedance 를 밀어넣으면 500줄이 900줄이 된다
- **M2 가 M3 앞** — 프리셋 구조가 브랜드 중립화의 결과물이고, `seedance` 는 M2 가
  만드는 엔드프레임 없이는 아무것도 못 한다
- **M5a 가 오디오의 처음** — 임팩트 클랭 하나만 제대로 박혀도 체감 품질이 가장 크게
  오른다. 음악과 동기 SFX 는 그 위에 얹는 것이다
- **M5c 가 마지막** — V2A 는 세 층 중 결과 예측이 가장 어렵다. 앞의 두 층으로 기준선을
  만들어 두고 비교해야 실제로 좋아졌는지 판정할 수 있다

## 15. 리스크

| 리스크 | 대응 |
|---|---|
| M1 리팩토링이 기존 렌더를 깨뜨린다 | M1 전에 현재 출력의 골든 파일 확보. 프레임 해시로 회귀 검증 |
| Canvas 레이어 모드와 플레이트가 어울리지 않는다 | M4 착수 전 수동 합성으로 1편 검증 |
| Seedance 3–6분 대기가 UI 를 막는다 | `renders` 가 이미 비동기 잡 모델. 폴링 UI 만 추가 |
| 크레딧 소진 | `credits_spent` 기록 + 제출 전 `get_cost` 프리플라이트. 자동 재시도 금지 |
| **음악 라이선스가 상용을 막는다** | Stable Audio 기본. 출시 전 법적 확인 필수 |
| 오디오 제공자가 사라진다 | 세 층 전부 인터페이스로 격리 |
| 단일 `STUDIO_ADMIN_TOKEN` 으로 외부 개방 불가 | 별도 과제. 그때까지 사내 도구로 운영 |

## 16. 하지 않는 것

- **멀티테넌시·회원가입** — 지금은 공유 토큰 하나. 별도 단계
- **결제·크레딧 정산** — `credits_spent`·`audio_cost_usd` 만 쌓아둔다
- **Seedance 외 생성 백엔드** — 엔진 계약은 열어두되 구현은 하나
- **Cloudflare Workers 에서의 렌더** — Workers 에는 Chromium 도 ffmpeg 도 없다
- **도메인·제품명 변경** — 이름이 내용과 어긋나지만 통합과 독립된 결정이다
- **내레이션·보이스오버** — 5초에 말이 들어갈 자리가 없다
- **사용자 음악 업로드** — 저작권 책임 구조가 상용에서 분쟁 소지가 크다
- **오디오 마스터링 체인** — loudnorm 과 덕킹으로 충분하다

---

# 부록 A · 실측 근거

2026-08-30 세션에서 PLAZION·GreenB 로 16편을 실제 생성하며 측정한 값들.
이 설계의 모든 수치는 여기서 나왔다.

## A.1 루마키 알파 추출 실패

검정 배경 FORGE 영상에 루마키를 걸어 매트를 뽑고 중간 회색 위에 합성해 확인했다.

| 영역 | 휘도 (0–255) |
|---|---|
| 배경 | 3.0 |
| 로고 평균 (중앙값 62.2) | 83.4 |
| **로고 하위 25%** | **44.6** |

로고의 어두운 4분의 1이 휘도 45다. 배경과 벌어지지 않아 루마키가 로고 본체를
반투명으로 판정했다. 합성 시 로고 색이 죽고 글로우 경계에 검은 프린지가 생겼다.
screen 블렌드에서는 어두운 로고가 아예 사라졌다.

**대안도 막혀 있다** — 크로마키는 화염·글로우에 색이 물들고, 더블 패스 매트는 AI 가
같은 프롬프트로 두 번 돌리면 다른 영상을 뱉어 원천 불가능하다.

## A.2 오디오 라우드니스 편차

| 프리셋 계열 | mean_volume |
|---|---|
| VFX (forge·shard·arc) | −21 ~ −24 dB |
| 자연 (dew·growth·mist) | −29 ~ −43 dB |

편차 18dB. 자연 컨셉은 조용한 것이 정상이므로 목표 라우드니스를 계열별로 나눴다.
−41dB 를 −16 LUFS 로 올리면 게인이 25dB 라 노이즈 플로어도 같이 올라온다.

## A.3 출력 규격

| 항목 | 실측 |
|---|---|
| 프레임레이트 | 요청과 무관하게 항상 24 fps |
| 길이 | 5초 요청 → 5.056초 |
| 해상도 | 요청대로 (1080p 상한) |
| 알파 | 없음 |
| 코덱 | hevc / aac 32kHz stereo |

## A.4 로고 소스 오염

애니메이션 시퀀스의 프레임을 로고 소스로 쓸 때의 측정.

| 프레임 | 브랜드 외 색조 | 불투명 픽셀 비율 |
|---|---|---|
| 마지막 (0089) | **39.6 %** | 낮음 |
| 중간 (0042) | 0.2 % | 57 % |
| 브랜드 원본 PNG | **0.00 %** | 100 % |

마지막 프레임이 가장 완성형일 것 같지만 글로우·링 잔광이 알파에 섞인다.
중간 프레임은 오염이 없는 대신 하프톤 디졸브라 로고가 격자로 남는다.
**결론: 시퀀스에서 뽑지 말고 브랜드 원본 에셋을 쓴다.**

## A.5 착지 정확도

`end_image` 를 주고 생성한 결과의 마지막 프레임을 엔드프레임과 비교.

- 워드마크 자획·형태: **보존됨**
- 브랜드 컬러: **보존됨** (단, `start_image` 를 같이 주면 은색으로 변질)
- 위치·크기: **미세하게 이동·축소** → 후반작업의 착지 교체가 필요한 이유

---

# 부록 B · 출처

- MMAudio — <https://github.com/hkchengrex/MMAudio> · <https://ai.sony/blog/unlocking-the-future-of-video-to-audio-synthesis-inside-the-mmaudio-model>
- MMAudio 호스팅 — <https://replicate.com/zsxkib/mmaudio> · <https://www.eachlabs.ai/meta/mm-audio>
- Eleven Music API — <https://elevenlabs.io/docs/api-reference/music/compose> · <https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans>
- ElevenLabs SFX·요금 — <https://elevenlabsmagazine.com/elevenlabs-ai-sound-effects-guide-2026/> · <https://unifically.com/blogs/elevenlabs>
- 음악 제공자 라이선스 비교 — <https://www.chartlex.com/blog/marketing/ai-music-generator-comparison-2026> · <https://musicapi.ai/blog/best-ai-music-api-2026>
