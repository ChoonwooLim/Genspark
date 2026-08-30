# Logo Studio 글로벌 경쟁력 재설계 — Fable 전달 문서

- 작성일: 2026-08-30
- 대상 정본: `docs/logo-studio-design.md`
- 저장소 지침: `CLAUDE.md`

## 1. 이 문서의 목적

이 문서는 현재 Logo Studio 설계를 세계 시장에서 경쟁 가능한 프로·에이전시용 제품 설계로
다듬기 위한 독립 검토 자료다. Fable은 아래 권고를 그대로 복사하지 않는다. 원문, 저장소
현황, 공식 1차 자료를 직접 확인한 뒤 **논리가 타당하고 근거가 충분한 항목은 정본에 직접
수정**한다. 동의하지 않는 항목은 수정하지 않고 이유를 결과 보고서에 남긴다.

이번 작업은 설계 문서 재검토와 수정까지다. 소스 코드 구현, 의존성 설치, 마이그레이션,
배포, 유료 생성 호출은 범위 밖이다.

## 2. 읽기 순서와 수정 권한

1. `CLAUDE.md`를 먼저 읽어 저장소의 현재 사실과 작업 규칙을 이해한다.
2. `docs/logo-studio-design.md`를 처음부터 끝까지 읽는다.
3. 이 전달 문서를 읽고 각 권고를 독립적으로 판정한다.
4. 시점에 따라 변할 수 있는 경쟁 기능·API·가격·라이선스는 공식 자료로 재검증한다.
5. 수용한 항목은 `docs/logo-studio-design.md`의 관련 섹션을 모두 찾아 직접 수정한다.
6. 정본 변경으로 `CLAUDE.md`의 제품 요약이 거짓이 되면 해당 요약만 최소한으로 동기화한다.
7. `docs/fable-logo-studio-revision-report.md`에 수용·부분 수용·기각·미해결 항목을 기록한다.

수정 허용 범위:

- `docs/logo-studio-design.md`
- 필요한 경우에만 `CLAUDE.md`의 정본 요약·마일스톤 요약
- 신규 결과 보고서 `docs/fable-logo-studio-revision-report.md`

수정 금지 범위:

- `src/**`, `app/**`, `public/**`, `package.json`, 데이터베이스, 배포 설정
- `docs/superpowers/**`의 과거 기록
- 사용자가 만든 관련 없는 변경

## 3. 보존해야 할 강점과 경계

다음 원칙은 현재 설계의 강점이다. 명백한 근거가 없는 한 유지한다.

- Seedance 계열 생성 엔진이 로고의 형성 과정을 만드는 **기본 창작 경로**다.
- composite/canvas는 창작 경로를 대체하는 기본 엔진이 아니라 브랜드 안전이 필요한 경우의
  결정론적 안전판이다.
- 생성 모델은 어댑터 뒤에 두고 교체 가능하게 만든다.
- 비싼 히어로 호출 전에 저비용 탐색 단계가 있다.
- 생성 원본은 불변이며 후처리·오디오·납품은 파생 산출물이다.
- 자동 QA는 경고와 증적을 제공하고 최종 승인은 사람이 한다.
- 비용은 제출 전에 보이고, 프로젝트 예산과 실제 비용을 추적한다.
- P2는 첫 번째 end-to-end 제품 목표이며, 완료 후 실제 브랜드·사용자로 검증하고 멈춘다.
- AI 출력에서 루마키로 알파를 억지 추출하지 않는다.
- 부록 A의 실측값은 지우지 않는다. 단, 특정 시점·벤더·표본의 관찰값이지 영구 API 계약은
  아니라는 경계를 명시한다.
- 범용 타임라인 편집기, 장편 영상 편집기, 일반 로고 제작 플랫폼으로 범위를 넓히지 않는다.

## 4. 현재 판정

현재 설계는 내부 제작 도구와 기술 베타로는 강하다. 그러나 세계적 프로·에이전시 제품으로
외부 판매하기에는 다음 계층이 부족하다.

- 방어 가능한 경쟁사 비교와 좁은 ICP/JTBD
- 실제 보장 범위와 일치하는 브랜드 충실도 계약
- 다양한 로고 코퍼스와 블라인드 시장 검증
- 승인·수정·납품을 포함한 에이전시 워크플로
- 과금 원자성, 멱등성, 저장소 내구성, 테넌트 격리
- 프로 납품 규격과 색·오디오·출처 메타데이터
- 제공자별 상업 이용 가능성을 출시에 앞서 막는 법적 게이트

권장 포지셔닝은 다음과 같다.

> 범용 AI 영상 편집기가 아니라, 정확한 브랜드 엔드카드와 검수 증적을 제공하는
> 시네마틱 로고 스팅 프로덕션 시스템.

제품 범위도 명확히 한다. 이 제품은 5초 안팎의 시네마틱 래스터 로고 스팅에 집중한다.
Lottie·Rive·SVG 기반 인터랙티브 로고 애니메이션이나 범용 모션 그래픽 편집기를 전부
대체한다고 주장하지 않는다.

## 5. Fable이 독립 판정 후 반영할 핵심 개선안

### 5.1 경쟁사 비교와 마케팅 주장

현재 정본의 다음 주장은 2026년 시장 기준으로 지나치게 절대적일 가능성이 높다.

- 범용 AI 비디오는 오디오가 동기화되지 않는다.
- 범용 AI 비디오에는 프로 납품 포맷이 없다.
- 시작·끝 프레임 또는 `end_image` 제어 자체가 차별점이다.
- 브랜드킷·비율 변형·음악·팀 공유가 주요 해자다.

Veo·Seedance·Luma 등은 동기 오디오나 시작·끝 프레임을 제공하고, Runway와 Luma는
ProRes·PNG/EXR·HDR 등 프로 포맷을 제공한다. Canva·Renderforest·Jitter는 브랜드 자산,
리사이즈, 음악, 협업, 투명 영상, Lottie 같은 인접 기능을 제공한다.

따라서 경쟁 문구는 다음 논리로 재작성하는 것이 적절한지 판단한다.

> 범용 생성·편집 도구는 강력하지만, 로고 최종 충실도 SLA, 로고 ROI 기반 QA 증적,
> 비용·재개 제어, 스팅 전용 승인 및 납품 단위를 하나의 흐름으로 제공하지 않는다.

경쟁사의 부재를 단정하지 않는다. 공식 자료에서 확인되지 않은 경우 “공식 제품 자료에서
확인하지 못했다” 또는 “비교에 근거한 추론”으로 쓴다.

### 5.2 ICP와 JTBD

“프로·에이전시”만으로는 고객이 충분히 좁지 않다. 1차 ICP를 다음과 같이 구체화하는 안을
검토한다.

> 월 5~30개의 브랜드 영상·캠페인 산출물을 납품하며, 크리에이티브 디렉터·디자이너·
> 프로듀서가 함께 일하는 3~30인 브랜딩·콘텐츠 에이전시.

핵심 JTBD 예시:

- 디자이너가 30분 안에 고객 브랜드에 맞는 세 가지 모션 방향을 제시한다.
- 프로듀서가 선택된 방향을 안전한 최종본으로 만들고 비용·수정 이력을 관리한다.
- 고객 승인자가 로그인 없이 버전을 비교하고 변경 요청 또는 승인을 남긴다.
- 납품 담당자가 채널별 마스터·무음본·레이어·오디오·권리 증적을 한 번에 전달한다.

ICP 수치가 근거 없는 사실처럼 보이면 “초기 검증 대상 ICP”로 표기하고 Gate 0에서
인터뷰로 확정한다.

### 5.3 브랜드 충실도 계약: Safe와 Transform

현재의 “워드마크 픽셀 보증”은 착지 교체만으로는 전체 영상에 대해 성립하지 않는다.
보장 범위를 다음처럼 분리하는 것이 적절한지 판단한다.

| 모드 | 생성 방식 | 보장 가능한 범위 | 사용자 고지 |
|---|---|---|---|
| **Safe** | AI는 배경·VFX 플레이트를 만들고 실제 로고 레이어를 합성 | 로고가 표시되는 구간의 실제 로고 레이어, 최종 엔드카드 | 창의적 변형은 제한되지만 브랜드 정확성 우선 |
| **Transform** | AI가 재질·형성 과정에 관여하고 최종 구간을 원본 엔드카드로 착지 | 최종 홀드/엔드카드의 로고 정확성 | 중간 형성 구간은 변형될 수 있으며 사람 검수 필수 |

Seedance Transform을 기본 창작 경로로 유지한다. 다만 composite 안전판은 P5까지 기다리지
않고 P2 베타에서 Safe 모드로 제공하는 안을 검토한다. 이는 기본 우선순위를 뒤집는 것이
아니라 제품 약속에 필요한 fallback을 앞당기는 것이다.

“픽셀 보증”을 유지하려면 정확한 대상 파일·프레임·ROI·코덱을 명시한다. 그렇지 않으면
“최종 엔드카드 브랜드 충실도 보증”처럼 범위를 좁힌다.

### 5.4 Gate 0: 재플랫폼보다 앞선 제품·엔진 검증

정본은 핵심 REST 제약을 P2 첫 태스크에서 재검증하면서도 설계를 확정 상태로 부른다.
대규모 React·큐·스키마 이관 전에 다음 Gate 0을 두는 안을 검토한다.

1. 대표 로고 30~50개로 평가 코퍼스를 만든다.
2. 전체 조합 폭발을 피하도록 로고 유형·룩·비율을 균형 표집해 약 100~150개의 생성 실험을
   설계한다. 수치는 초기 계획이며 예산에 맞게 조정 가능하다.
3. Seedance의 실제 REST 요청, `end_image`, seed, 해상도별 결과 일관성, 대기시간, 실패율,
   실제 비용, 중복 과금 가능성을 측정한다.
4. 긴 워드마크, 얇은 획, 한글/비라틴 문자, 다색·그라디언트, 엠블럼, 흰색 로고,
   복합 락업을 포함한다.
5. Renderforest, Luma, Jitter/AE 템플릿 등 현실적 대체재와 블라인드 평가한다.
6. 에이전시 사용자 인터뷰와 파일럿으로 ICP·승인 흐름·납품 요구를 확인한다.

Gate 0 결과가 기준 미달이면 아키텍처를 완성한 뒤 알게 되는 것이 아니라, 프리셋·모델·
품질 약속을 먼저 바꿀 수 있어야 한다.

### 5.5 Direction IR을 Brand Motion Brief로 강화

현재 자유 문자열 중심 IR은 프롬프트 폼으로 복제하기 쉽다. 다음 구조를 검토한다.

- `irVersion`, `compilerVersion`, preset migration
- 목적, 채널, 대상 사용자, 길이, 비율, fps
- 로고 사용 variant와 Safe/Transform 정책
- 로고 최초 노출·완전 노출·최종 홀드 규칙
- world, material, formation, camera, light의 타입·강도·단위
- 금지 요소와 브랜드 가이드 제약
- 이미지·영상·모션·오디오 레퍼런스
- 색 대비, 배경 정책, safe zone
- `impactAt`, riser, hold, easing/motion intensity
- 승인 기준과 납품 프로파일

일반 `freeText`가 구조화 필드를 조용히 무효화하지 않게 한다. 모델별 직접 프롬프트 수정은
IR의 공통 의미와 분리된 `vendorOverrides` 또는 동등한 구조로 저장하고 충돌을 경고한다.

제출 스냅샷에는 IR뿐 아니라 컴파일된 요청, 컴파일러 버전, 모델 정확 버전, 엔드프레임
콘텐츠 해시, seed, vendor response를 저장한다.

### 5.6 Quick 경로와 프로 UX

“클릭 3번이면 납품”은 내부 단계와 사람 검수를 숨기는 과장으로 읽힐 수 있다. 클릭 수보다
다음 가치를 약속하는 방향을 검토한다.

- 빠른 첫 유효 방향
- 비교 가능한 탐색 결과
- 결과를 재현할 수 있는 수정 루프
- 브랜드 위험과 비용을 제출 전에 이해할 수 있는 흐름

Quick은 안전한 기본값과 자동화를 제공하고 Direct는 더 깊은 통제를 제공한다. 두 경로가
같은 파이프라인을 사용하더라도 결과·실패 가능성·사용자 책임까지 “완전히 동일”하다고
단정할 필요는 없다.

Brand 단계에는 사용처, 필수 비율, 권리 확인, Safe/Transform 기본값을 추가하는 안을
검토한다. 심볼/워드마크 자동 분리는 연결 성분 분석 후 반드시 사용자가 확인한다.

Explore/Refine에는 동기 재생, A/B 비교, 차이 축 표시, 선택 이유 기록을 고려한다. 다만
범용 타임라인 편집기로 확장하지 않는다.

### 5.7 QA 정의 교정

전체 프레임 SSIM은 동일한 배경이 큰 경우 작은 로고 오류를 숨길 수 있다. 다음처럼 측정
대상을 구체화하는 안을 검토한다.

- 로고 ROI/알파 마스크 기준 위치·스케일·회전 오차
- 정렬 후 윤곽·획·픽셀 차이
- CIEDE2000, sRGB/white point, 알파 합성 배경을 명시한 색 차이
- 최종 인코딩 파일을 다시 decode한 뒤 실시하는 delivery QA
- 소스 SVG/PNG의 실제 바운딩 박스 기준 품질 검사
- 전체 캔버스 불투명 비율이 아닌 trim 이후 alpha·edge 오염 검사

SSIM 0.6, 0.99, ΔE 5, 오염 2%, 불투명 60%, 800px 같은 값은 현재 실측 휴리스틱으로
표기하고 평가 코퍼스에서 calibration하기 전에는 영구 SLA로 선언하지 않는다.

오디오도 `mean_volume`과 LUFS를 같은 근거로 사용하지 않는다. 5초 클립에 맞는
integrated/short-term LUFS, true peak, event window의 transient 정렬을 구분한다.
`astats`의 가장 큰 피크 하나만으로 음악적 임팩트를 확정하지 않고 사람 청감 평가를
병행한다.

### 5.8 과금·큐·파이프라인 신뢰성

“유료 호출 자동 재시도 금지” 원칙은 유지하되, 응답 유실 후의 모호한 제출 상태를 추가로
설계해야 한다.

- 불변 `submission_id`
- 벤더가 지원하면 idempotency key/client request ID 전달
- `submission_pending`, `submission_unknown`, `submitted`, `reconciled` 등 명시적 상태
- `(engine, vendor_job_id)` 유니크 제약
- 사용자 재제출은 기존 요청의 자동 재시도가 아니라 별도 replacement command
- 제출 전 예산 예약, 실제 비용 settlement, 취소·환불 release/adjustment
- 벤더·모델·가격 버전·통화·견적 유효 시각·실제 청구 ID 기록

단계 산출물 DB 기록과 다음 큐 투입 사이의 유실을 막기 위해 transactional outbox 또는
동등한 원자성 패턴을 검토한다. 단계는 `(run_id, step_name, input_hash)`로 멱등하게 만들고
lease, heartbeat, fencing, 취소·재개 규칙을 문서화한다.

“순수 함수” 표현은 외부 API·파일·DB side effect를 숨기지 않게 조정한다. 계산 코어는
순수할 수 있지만 실행기는 side effect와 멱등성을 책임진다.

### 5.9 데이터 모델과 산출물 계보

다음 필드/개념을 데이터 모델에 반영할 필요가 있는지 검토한다.

- generation submission과 vendor charge/reconciliation
- budget reservation과 ledger settlement
- `renders.parent_render_id` 또는 동등한 파생 계보
- 모든 artifact의 content hash, mime, size, codec/profile, provenance
- IR/compiler/model/request snapshot
- provider license status와 사용 제한
- outbox events와 step attempt/lease
- review token hash, expiry, revoked_at, approver, audit events

모든 render가 source generation만 가리키면 landed→sounded→delivery 중 어떤 파생본을
사용했는지 모호해질 수 있다. generation과 render lineage를 함께 유지한다.

### 5.10 저장소·SSE·보안 기본선

web과 worker가 별도 컨테이너라면 둘이 실제로 같은 영구 볼륨을 안전하게 공유할 수 있는지
Orbitron에서 검증해야 한다. 외부 리뷰와 다중 replica를 고려하면 object storage를 너무
늦게 미루지 않는 안을 검토한다.

필수 보안 항목:

- 모든 조회·변경의 workspace/project 범위 강제 또는 RLS
- storage key의 tenant prefix와 짧은 만료 signed URL
- 공개 리뷰 토큰은 충분한 엔트로피, DB에는 hash, 만료·폐기·회전
- 공개 댓글 XSS 방지, 다운로드 권한, 워터마크, 감사 로그
- SVG script·외부 참조 차단, MIME sniffing, 이미지 디코더 sandbox
- ffmpeg/Playwright CPU·메모리·시간 제한
- vendor raw 응답의 secret·개인정보 redaction
- SSE의 인증, `Last-Event-ID`, DB replay, 재연결, 다중 web replica fan-out
- 브랜드 자산 보관·삭제·복구·모델 학습 사용 여부 정책

P4 공개 리뷰가 P6 인증보다 먼저 나오는 현재 순서의 모순을 해소한다. 최소 권한과 리뷰
보안은 P2에, 고급 협업과 SSO는 뒤 단계에 둘 수 있다.

### 5.11 프로 납품 계약

납품 키트는 결과 파일명 목록이 아니라 delivery profile로 정의하는 안을 검토한다.

- H.264 웹 마스터와 원본/중간 mezzanine 분리
- ProRes 422 HQ 또는 4444가 가능한 경로의 명확한 표시
- alpha-capable source에서만 WebM/ProRes 4444 alpha 허용
- PNG sequence 또는 편집자용 프레임 시퀀스
- clean plate와 logo-only alpha layer
- 무음본과 48kHz WAV 음악/SFX stems
- fps/timebase/frame count, pixel format, Rec.709 primaries/transfer/matrix, range
- poster, loop, intro/outro, 비율별 safe reframe
- 최종 파일 decode 후 화질·색·길이·오디오 QA
- README/manifest에 모델·프롬프트 해시·소스 로고 해시·라이선스·파생 이력

Jitter·Runway·Luma 등은 이미 다양한 프로 포맷을 제공한다. 따라서 “포맷이 있다”보다
“로고 전용으로 안전하고 검증된 납품 세트”가 차별점이어야 한다.

### 5.12 리뷰·승인 워크플로

내부 크리에이티브 승인과 외부 고객 승인을 구분한다.

- 내부 상태: draft selection, creative approved, production approved
- 외부 상태: review open, changes requested, client approved, superseded
- 내부/외부 코멘트 분리
- A/B 동기 비교, 타임코드·영역 마크업
- 승인자 지정, 버전 잠금, 승인 취소 정책
- 변경 요청이 새 Direction/Render/비용으로 이어지는 계보
- 승인 이력과 납품본 고정

P2의 완료 조건은 단순히 “내부 승인된다”가 아니라 최소 리뷰 링크로 실제 고객이 방향을
비교하고 승인 가능한 결과를 받는 것까지 포함하는 안을 검토한다.

### 5.13 오디오와 라이선스

MMAudio는 코드와 체크포인트의 라이선스가 다르다. 공식 저장소는 체크포인트를
CC BY-NC 4.0으로 배포하고 사전학습 모델의 상업 이용 적합성을 보증하지 않는다. 따라서
상용 기본 L1 제공자로 단정해서는 안 된다.

가능한 수정 방향:

- 상용 V2A 제공자로 교체
- 별도 상용 체크포인트 계약을 release prerequisite로 지정
- 상용 빌드에서는 L1을 끄고 L2/L3만 제공

Stable Audio와 ElevenLabs도 제품·모델·플랜·용도별 약관이 다를 수 있다. 공급자 이름만
보고 안전하다고 선언하지 않고, 산출물별 provider/model/license snapshot을 기록한다.
라이선스 확인은 P6 문서 작업이 아니라 해당 provider를 제품에 넣기 전 gate다.

### 5.14 현재 저장소와 테스트 현실

현재 `package.json`에는 React와 pg-boss가 없고 테스트 스크립트도 없다. P0는 작은 기반
작업이 아니라 재플랫폼이므로 다음 완료 기준을 포함하는 안을 검토한다.

- fake engine 기반 end-to-end pipeline test
- recorded vendor response contract test
- migration forward/rollback test
- 고정 런타임에서 golden hash, 교차 환경에서 perceptual/ROI regression
- worker kill, 중복 큐 전달, submit timeout, SSE reconnect chaos test
- 동시 요청이 예산 상한을 넘지 않는 concurrency test
- 공개 리뷰의 cross-workspace, XSS, token expiry/revocation test
- 각 delivery profile의 encode→decode 검증

## 6. 권장 마일스톤 재배치

Fable은 기존 P0~P6을 아래 구조로 재정렬하는 것이 전체 논리와 맞는지 판단한다. 기존 번호를
유지할지 새 Gate 0을 추가할지는 문서 가독성을 기준으로 선택한다.

| 단계 | 목표 | 핵심 완료 조건 |
|---|---|---|
| **Gate 0** | 제품·엔진·시장 검증 | 대표 코퍼스, Seedance API/비용/재현성 scorecard, 에이전시 인터뷰, Safe/Transform 계약 확정 |
| **P0 신뢰 코어** | 재시작·중복·과금에 안전한 실행 기반 | web/worker, 멱등 step, submission reconciliation, budget reservation, outbox, artifact hash, 테스트 기반 |
| **P1 Brand Motion Brief** | 임의 브랜드의 검증 가능한 연출 의도 | 브랜드 스캔·사용자 확인, 버전형 IR, reference, safe zone, endframe, Safe/Transform 선택 |
| **P2 승인 가능한 베타** | 첫 end-to-end 고객 가치 | Seedance 탐색·히어로, Safe fallback, ROI QA, 최소 보안 리뷰/A-B 승인, 최소 프로 납품, 실제 파일럿 후 중지 |
| **P3 상용 사운드·납품** | 라이선스가 명확한 사운드와 편집자용 패키지 | stems, 48kHz, loudness QA, delivery profiles, provenance manifest |
| **P4 협업·파일럿 확장** | 반복 가능한 에이전시 운영 | 역할, 내부/외부 코멘트, 감사, 알림, 승인 이력, 반복 프로젝트 지표 |
| **P5 멀티모델** | 실측에 근거한 벤더 복원력 | 두 번째 엔진 scorecard, router, circuit breaker, canary, provider failover |
| **P6 출시·엔터프라이즈** | 외부 상용 운영 | 결제/패키징 결정, SSO·DPA·retention, backup restore, 운영 SLO, 법무·보안 sign-off |

P2가 여전히 첫 제품 목표다. Gate 0은 구현 마일스톤이 아니라 잘못된 제품 가설에 대규모
재플랫폼 비용을 쓰지 않기 위한 선행 의사결정이다.

## 7. 제안 수용 기준

아래 수치는 확정 사실이 아니라 Fable이 논리와 실현 가능성을 검토해야 할 초기 release
gate다. 근거가 부족하면 “제안 목표”로 표시하고 파일럿에서 보정한다.

| 축 | 제안 기준 |
|---|---|
| Safe 충실도 | 최종 delivery decode 후 정의된 로고 ROI·기하·색 기준 100% 통과 |
| Transform 충실도 | 최종 엔드카드 기준 통과 + 중간 변형 위험 고지 + 사람 승인 |
| 속도 | 첫 유효 방향 p50 30분 이내, 최종 납품 p50 60분 이내 |
| 비용 신뢰 | 예상/실제 비용 차이 추적, 중복 과금 0, 모호한 제출 100% 대사 가능 |
| 파이프라인 | 중복 전달·worker crash 후 artifact/ledger 중복 0 |
| 시장 | 초기 에이전시 5곳, 실제 프로젝트 25건에서 승인시간·재생성률·반복 사용 측정 |
| 보안 | 만료/폐기 링크 차단, cross-workspace artifact 접근 0 |
| 권리 | 모든 납품본에 provider/model/license/provenance 상태 존재 |

세계적 경쟁력의 최종 판단은 기능 개수보다 다음 결과로 한다.

- 현재 도구보다 첫 승인 시간이 줄었는가?
- 클라이언트 수정 횟수와 재생성 비용이 줄었는가?
- 브랜드 안전 때문에 사용을 포기하는 비율이 낮은가?
- 에이전시가 다음 고객 프로젝트에도 반복해 사용하는가?
- 한 프로젝트의 매출총이익이 유지되는가?

## 8. 공식 1차 자료 출발점

다음 링크는 재검증을 위한 출발점이다. Fable은 실제 수정 시 다시 열어 현재 내용을
확인하고, 주장 가까이에 공식 링크를 둔다. 가격·모델·라이선스는 확인일 또는 버전을
기록한다.

- Runway 모델·프로 포맷: <https://docs.dev.runwayml.com/guides/models/>
- Runway API 가격: <https://docs.dev.runwayml.com/guides/pricing/>
- Luma 영상 기능: <https://lumalabs.ai/learning-center/articles/luma-video-capabilities>
- Luma 협업: <https://lumalabs.ai/learning-hub/team-collaboration-real-time-shareable-workspace>
- Canva 기능·브랜드킷: <https://www.canva.com/features/>
- Renderforest 로고 애니메이션: <https://www.renderforest.com/logo-animation>
- Jitter 제품·협업·출력: <https://etienne.jitter.video/product/>
- Jitter 출력 명세: <https://help.jitter.video/en/articles/5369843-export-your-work>
- Google Veo/Flow 업데이트: <https://blog.google/innovation-and-ai/products/veo-updates-flow/>
- Gemini API Veo: <https://ai.google.dev/gemini-api/docs/video>
- ByteDance Seedance 2.0: <https://seed.bytedance.com/en/seedance2_0>
- ByteDance Seedance 2.5: <https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5>
- MMAudio 코드·체크포인트 라이선스: <https://github.com/hkchengrex/MMAudio>
- Stability AI 라이선스: <https://stability.ai/license>
- ElevenLabs API 가격: <https://elevenlabs.io/pricing/api>
- ElevenLabs Music 개요: <https://elevenlabs.io/docs/eleven-creative/products/music>

공식 자료로 확인할 수 없는 Higgsfield/Seedance의 정확한 REST 파라미터와 계정별 크레딧은
사실로 확정하지 않는다. 실측 스파이크 항목으로 남긴다. 블로그·제휴 기사·가격 비교
사이트는 공식 자료가 없을 때도 근거의 정본으로 사용하지 않는다.

## 9. Fable의 최종 산출물

1. 직접 수정된 `docs/logo-studio-design.md`
2. 정본 요약이 달라졌을 때만 최소 수정된 `CLAUDE.md`
3. `docs/fable-logo-studio-revision-report.md`

결과 보고서에는 다음 표를 포함한다.

| 권고 | 판정 | 수정 위치 | 근거 | 남은 검증 |
|---|---|---|---|---|
| 항목명 | 수용/부분 수용/기각/보류 | 섹션·라인 | 원문 논리·공식 URL·실측 | 없으면 `없음` |

보고서 마지막에는 다음을 별도로 적는다.

- 수정한 핵심 제품 약속
- 마일스톤 순서 변경
- 아직 검증되지 않은 벤더/API/가격/라이선스
- 구현 전에 사용자가 결정해야 할 사항
- 변경한 파일 목록
