> ## ⚠ 이 문서는 통합됐다
>
> 정본은 **`docs/logo-studio-design.md`** 다. 이 파일은 통합 이전의 기록이며
> 갱신하지 않는다. 내용을 고칠 일이 있으면 정본을 고칠 것.

---

# 오디오 파이프라인 설계

작성일: 2026-08-30
상태: 설계, 구현 미착수
상위 문서: `2026-08-30-logo-studio-unification-design.md` — 이 문서는 그 M5 에 해당한다

## 1. 문제

`seedance` 엔진이 만든 영상은 그림은 좋은데 **소리가 범용적이다.**
2026-08-30 실측에서 Seedance 내장 오디오는 −21 ~ −41dB 로 편차가 크고,
화면의 임팩트 순간과 소리가 정확히 맞지 않는다.

로고 스팅은 5초 안에 승부가 나므로 **임팩트가 프레임 단위로 맞아야 한다.**
크롬이 착지하는 그 순간에 클랭이 나야지, 0.2초 늦으면 싸구려가 된다.

## 2. Higgsfield 로는 안 된다 — 확인된 사실

Higgsfield 의 `generate_audio` 는 **TTS 전용**이다. 도구 문서에 명시돼 있다.

> This tool only generates speech: it cannot generate music or sound effects for
> general use, and there is no standalone music/SFX model here — decline general
> music or sound-effect requests rather than substituting a speech model.

카탈로그의 `sonilo_music`(음악)과 `mirelo_text_to_audio`(효과음)는 **게임 생성
파이프라인 전용**이라 독립 오디오 생성에 쓸 수 없다.

→ **외부 제공자가 필요하다.** 이것이 이 문서가 존재하는 이유다.

## 3. 3층 구조

한 모델로는 안 된다. 각 층이 다른 문제를 푼다.

| 층 | 제공자 | 무엇을 푸는가 |
|---|---|---|
| **L1 · 동기 SFX** | MMAudio (video-to-audio) | 화면 사건에 붙는 소리. 모델이 프레임을 보고 만들므로 **동기가 자동** |
| **L2 · 설계 SFX** | ElevenLabs SFX v2 | 아트 디렉션이 필요한 히어로 히트 — 임팩트 클랭, 서브베이스 붐, 라이저 |
| **L3 · 음악** | ElevenLabs Music v2 또는 Stable Audio | 5초 시네마틱 베드 |

### 왜 셋 다 필요한가

- **MMAudio 혼자면** 화면에 보이는 것만 소리가 난다. 로고 스팅의 임팩트는
  "들려야 할 소리"가 화면 사건보다 크다. 서브베이스 붐은 화면에 없다
- **ElevenLabs 혼자면** 타이밍을 사람이 매번 잡아야 한다. 화염 크래클·물방울처럼
  화면을 따라가야 하는 소리는 손으로 못 맞춘다
- **음악은 둘 다 못 만든다**

### MMAudio

Sony AI, CVPR 2025. video-to-audio 공개 모델 중 SOTA 이고 **의미 정합과 시간 동기**
둘 다 다룬다. Replicate · fal.ai · WaveSpeed · Eachlabs · PiAPI 등 여러 곳에
호스팅돼 있어 제공자 선택지가 있다.

## 4. 동기화 — 층마다 다르게 푼다

| 층 | 방법 |
|---|---|
| L1 | **자동.** 모델이 프레임을 본다 |
| L2 | **프리셋이 임팩트 시각을 안다.** `impactAt` 파라미터로 배치 |
| L3 | **composition_plan 으로 구성.** 섹션을 나눠 다운비트를 임팩트에 맞춘다 |

### L2 의 `impactAt`

프리셋마다 임팩트 시점이 다르다. 이미 `dissolveSeconds` 를 프리셋 파라미터로 갖고
있으니 같은 자리에 `impactAt` 을 넣는다.

```ts
type PresetAudio = {
  impactAt: number          // 초. 히어로 히트가 터지는 시점
  riserFrom: number         // 라이저가 시작되는 시점
  musicPrompt: string
  heroSfx: Array<{ at: number; prompt: string; gainDb: number }>
}
```

`forge` 는 셰브론이 내리꽂히는 2.2초, `dew` 는 로고가 수면에서 떠오르는 3.1초 —
2026-08-30 세션의 콘택트 시트에서 읽어낸 값을 초기값으로 넣는다.

배치는 ffmpeg `adelay` 로 한다.

### L3 의 composition_plan

ElevenLabs Music v2 의 `composition_plan` 은 섹션 단위로 길이·스타일을 지정한다.
5초 스팅이면 두 섹션이면 충분하다.

```
[0.0 – impactAt]        긴장을 쌓는 라이저. 저역 드론 + 상승하는 텍스처
[impactAt – 5.0]        임팩트 후 잔향과 해소. 여운으로 끝난다
```

**임팩트에 다운비트가 오도록 구성으로 강제한다.** 생성된 음악을 나중에 밀어
맞추는 것보다 훨씬 정확하다.

`compose` 엔드포인트는 3000–600000ms 를 받는다. 5초는 범위 안이다.

## 5. 믹스

ffmpeg 한 번에 끝낸다. 이미 이미지에 들어 있다.

```
[music] → volume + 임팩트 순간 사이드체인 덕킹
[l1]    → 동기 SFX. 기본 게인
[l2..n] → 설계 SFX 각각 adelay 로 배치
                    ↓ amix
              loudnorm (프리셋 목표)
                    ↓
              AAC 192k → 영상에 mux
```

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

**사이드체인 덕킹이 핵심이다.** 임팩트가 터지는 순간 음악을 눌러야 히트가 크게
들린다. 이것 하나로 아마추어와 헐리우드가 갈린다.

라우드니스 목표는 기존 프리셋 값을 그대로 쓴다 — VFX 계열 −16 LUFS,
자연 계열 −20 LUFS. 트루피크는 −1.0dBTP.

## 6. Seedance 내장 오디오는 끈다

`generate_audio: false` 로 제출한다. 범용 오디오가 설계된 3층과 싸운다.

다만 지우지는 않는다. 엔진 파라미터로 남긴다.

```ts
audioMode: 'designed' | 'seedance' | 'silent'
```

- `designed` — 기본값. 이 문서의 3층 파이프라인
- `seedance` — 빠르고 싸게 볼 때. 내장 오디오 그대로
- `silent` — 편집자가 직접 붙일 때

## 7. 제공자 추상화 — 선택이 아니라 필수

**Udio 는 2025년 10월 29일에 다운로드를 전면 중단했다.** 라이선스 정비 때문이다.
제공자는 바뀐다. 그것도 예고 없이.

```ts
interface SfxProvider  { generate(prompt: string, seconds: number): Promise<Buffer> }
interface MusicProvider{ compose(plan: CompositionPlan): Promise<Buffer> }
interface V2AProvider  { fromVideo(video: Path, hint?: string): Promise<Buffer> }
```

각 층을 인터페이스로 격리하고 환경변수로 구현을 고른다.
`AUDIO_SFX_PROVIDER` · `AUDIO_MUSIC_PROVIDER` · `AUDIO_V2A_PROVIDER`.

한 제공자가 죽어도 나머지 두 층은 계속 돈다.

## 8. 라이선스 — 상용 출시 전 반드시 확인

이 제품은 상용 SaaS 를 목표로 하므로 **생성된 오디오의 상업적 사용권이 곧 제품
리스크**다. 검색으로 확인한 현황을 남긴다.

| 제공자 | 상업 이용 | 주의 |
|---|---|---|
| ElevenLabs SFX v2 | 유료 플랜에서 royalty-free | 무료 플랜은 출처 표기 의무. 효과당 $0.0194 |
| ElevenLabs Music v2 | 광범위하게 클리어됨 | **광고·영화·TV·게임·엔터프라이즈 배포는 추가 라이선스 필요** |
| Stable Audio | AudioSparx 등 라이선스 데이터셋 | 프레임워크가 더 명확. 기악 중심이라 스팅에 적합 |
| MMAudio | 오픈 모델 | **가중치 라이선스를 확인해야 한다.** 호스팅 제공자 약관도 별개 |

**로고 스팅은 광고에 해당할 소지가 크다.** ElevenLabs Music 의 "추가 라이선스"
조항이 이 제품의 기본 경로를 막을 수 있다.

→ **음악 층의 기본 제공자를 Stable Audio 로 두고**, ElevenLabs Music 은 옵션으로
연다. 상용 출시 전에 두 약관을 법적으로 확인하고 결론을 이 문서에 갱신한다.
이것을 확인하지 않은 채로 외부 고객에게 팔면 안 된다.

## 9. 비용

| 항목 | 대략 |
|---|---|
| Seedance 영상 1편 | 45 크레딧 |
| ElevenLabs SFX (히어로 히트 2–3개) | 효과당 $0.0194 |
| ElevenLabs Music / Stable Audio 5초 | 크레딧제, 편당 소액 |
| MMAudio (Replicate·fal 호스팅) | 초당 과금, 5초는 소액 |

**오디오는 영상 대비 무시할 만한 비용이다.** 아끼려 들 이유가 없다.
`credits_spent` 와 별개로 `audio_cost_usd` 를 `renders` 에 기록해 원가를 추적한다.

## 10. 데이터 모델

```sql
ALTER TABLE renders ADD COLUMN audio_mode     text NOT NULL DEFAULT 'designed';
ALTER TABLE renders ADD COLUMN audio_manifest jsonb;   -- 층별 제공자·프롬프트·게인·배치
ALTER TABLE renders ADD COLUMN audio_cost_usd numeric(10,4) NOT NULL DEFAULT 0;
```

`audio_manifest` 를 남기는 이유 — **오디오만 다시 만들 수 있어야 한다.**
음악이 마음에 안 들어서 45크레딧짜리 영상을 재생성하는 일은 없어야 한다.
매니페스트가 있으면 같은 영상에 다른 오디오를 얹는 것이 무료에 가깝다.

## 11. 새로 만드는 모듈

| 파일 | 책임 |
|---|---|
| `src/audio/providers/mmaudio.ts` | V2A 제공자 |
| `src/audio/providers/elevenlabs.ts` | SFX + Music |
| `src/audio/providers/stable-audio.ts` | Music 대체 |
| `src/audio/plan.ts` | 프리셋 `PresetAudio` → 층별 요청 조립 |
| `src/audio/mix.ts` | ffmpeg 믹스·덕킹·라우드니스 |

`post` 체인의 **라우드니스 정규화 단계를 이 믹스가 흡수한다.** 두 번 정규화하면
덕킹이 뭉개진다. 기존 `post.normalizeAudio` 는 `audioMode: 'seedance'` 일 때만 쓴다.

## 12. QA 확장

| 지표 | 기준 |
|---|---|
| 출력 라우드니스 | 프리셋 목표 ±1 LUFS |
| 트루피크 | ≤ −1.0 dBTP |
| 임팩트 정렬 | 오디오 최대 피크 시각이 `impactAt` ±80ms |
| 무음 검사 | 각 층이 −50dB 이하면 생성 실패로 간주 |

**임팩트 정렬을 자동 검사한다.** 80ms 는 사람이 어긋남을 느끼기 시작하는 경계다.
`ffmpeg astats` 로 피크 시각을 뽑아 비교한다.

들어보는 것은 여전히 사람의 일이다. 검수 화면에 콘택트 시트와 함께
**파형 + 임팩트 마커**를 그려 눈으로도 정렬을 볼 수 있게 한다.

## 13. 마이그레이션에서의 위치

상위 문서의 M1–M4 뒤에 **M5** 로 붙인다.

| 단계 | 내용 |
|---|---|
| M5a | 제공자 인터페이스 + ElevenLabs SFX 한 층만. 히어로 히트를 `impactAt` 에 배치 |
| M5b | 음악 층 + 사이드체인 덕킹 |
| M5c | MMAudio 동기 층 |

**M5a 부터 하는 이유** — 임팩트 클랭 하나만 제대로 박혀도 체감 품질이 가장 크게
오른다. 음악과 동기 SFX 는 그 위에 얹는 것이다.

M5c 를 마지막에 두는 이유 — V2A 는 세 층 중 결과 예측이 가장 어렵다.
앞의 두 층으로 기준선을 만들어 두고 비교해야 실제로 좋아졌는지 판정할 수 있다.

## 14. 하지 않는 것

- **내레이션·보이스오버** — 로고 스팅은 5초다. 말이 들어갈 자리가 없다.
  TTS 는 Higgsfield 로 이미 가능하지만 이 파이프라인의 범위가 아니다
- **사용자 음악 업로드** — 저작권 책임이 사용자에게 넘어가는 구조는 상용에서
  분쟁 소지가 크다. 필요해지면 별도로 설계한다
- **오디오 마스터링 체인** (EQ·멀티밴드 컴프) — loudnorm 과 덕킹으로 충분하다.
  더 필요하면 편집자에게 넘긴다

## 출처

- MMAudio — <https://github.com/hkchengrex/MMAudio> · <https://ai.sony/blog/unlocking-the-future-of-video-to-audio-synthesis-inside-the-mmaudio-model>
- MMAudio 호스팅 — <https://replicate.com/zsxkib/mmaudio> · <https://www.eachlabs.ai/meta/mm-audio>
- Eleven Music API — <https://elevenlabs.io/docs/api-reference/music/compose> · <https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans>
- ElevenLabs SFX·요금 — <https://elevenlabsmagazine.com/elevenlabs-ai-sound-effects-guide-2026/> · <https://unifically.com/blogs/elevenlabs>
- 음악 제공자 라이선스 비교 — <https://www.chartlex.com/blog/marketing/ai-music-generator-comparison-2026> · <https://musicapi.ai/blog/best-ai-music-api-2026>
