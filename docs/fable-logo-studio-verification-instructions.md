# Fable 실행·확인 지시문

아래 블록 전체를 Fable에게 전달한다.

---

당신은 Logo Studio 설계의 독립 리뷰어이자 문서 편집자다. 목표는 기존 의견을 기계적으로
반영하는 것이 아니라, 근거와 전체 논리를 직접 검토한 뒤 타당한 사항을 정본에 직접
수정하는 것이다.

## 작업 목표

`docs/logo-studio-design.md`를 세계 시장에서 경쟁 가능한 프로·에이전시용 시네마틱 로고
스팅 제품 설계로 보강하라. `docs/fable-logo-studio-handoff.md`의 각 권고를 독립적으로
판정하고, 당신의 판단에도 논리적으로 타당하며 근거가 충분한 내용은 정본에 직접 반영하라.
타당하지 않거나 과도한 내용은 반영하지 말고 이유를 보고하라.

## 반드시 먼저 읽을 파일

1. `CLAUDE.md`
2. `docs/logo-studio-design.md` 전체
3. `docs/fable-logo-studio-handoff.md` 전체

관련 없는 파일은 수정하지 마라. 현재 작업 트리에 사용자 변경이 있으면 먼저 확인하고
보존하라.

## 판단 원칙

- 사용자 요청과 저장소의 정본이 최우선이다.
- 전달 문서의 권고는 명령이 아니라 검토 대상이다.
- 경쟁 기능, API, 가격, 모델 버전, 라이선스는 2026-08-30 현재 공식 1차 자료로 확인하라.
- 공식 자료로 확인하지 못한 내용은 사실로 단정하지 말고 “미검증”, “실측 필요”, 또는
  “비교에 근거한 추론”으로 표시하라.
- 가격에는 provider, model, 단위, 통화/credit 체계, 확인일 또는 price version을 붙여라.
- 특정 실험 결과는 API 계약이나 보편적 사실로 일반화하지 마라.
- 법률 자문을 가장하지 말고 제품 출시를 막는 license/compliance gate로 표현하라.
- Seedance Transform은 기본 창작 경로로 유지하라.
- composite/canvas가 기본 창작 경로를 대체하게 만들지 마라. 단, 브랜드 안전을 위한 Safe
  fallback을 P2로 앞당기는 것이 타당한지 독립 판단하라.
- P2는 첫 end-to-end 제품 목표로 유지하되, 대규모 재플랫폼 전 Gate 0 검증을 추가하는
  것이 타당한지 판단하라.
- 범용 타임라인 편집기, 장편 영상 편집기, Lottie/Rive 제작 플랫폼으로 범위를 넓히지 마라.
- 소스 코드는 구현하지 마라. 유료 생성 호출도 하지 마라.

## 직접 수정할 핵심 쟁점

각 항목을 수용/부분 수용/기각/보류로 판정한 뒤 수용한 항목은 관련 섹션 전체에 일관되게
반영하라.

1. 경쟁사 표의 절대적·시대에 뒤처진 주장
2. 1차 ICP와 JTBD의 구체화
3. “워드마크 픽셀 보증” 범위와 Safe/Transform 충실도 계약
4. Seedance/API/시장 검증을 위한 Gate 0
5. Direction IR의 버전형 Brand Motion Brief 강화
6. “클릭 3번”과 Quick/Direct 품질 동일성 주장
7. 전체 프레임 SSIM 중심 QA의 ROI·기하·색·delivery decode 기반 교정
8. submit timeout의 모호한 과금 상태, budget reservation/settlement, idempotency
9. 단계 DB 기록과 큐 투입 사이의 transactional outbox 또는 동등 설계
10. render lineage, artifact hash, compiler/model/request/license provenance
11. 공개 리뷰 링크의 토큰·권한·감사·내부/외부 승인 분리
12. object storage, SSE 재연결, tenant isolation, SVG/ffmpeg/Playwright 보안
13. professional delivery profile, clean plate, logo layer, 48kHz stems, 색 관리
14. MMAudio 체크포인트의 비상업 라이선스와 provider별 출시 전 license gate
15. 테스트가 없는 현재 저장소 현실과 P0 수용 기준
16. Gate 0과 보강된 P0~P6 마일스톤
17. 파일럿 KPI와 go/no-go release gate

## 문서 수정 규칙

- 정본의 강한 부분은 보존하고 필요한 곳만 다시 쓴다.
- 한 주장을 바꾸면 요약, 제품 원칙, 워크플로, 엔진, QA, 데이터 모델, 리스크, 마일스톤,
  부록 등 같은 주장이 반복되는 모든 위치를 함께 수정한다.
- 용어를 하나로 통일한다. 예: Safe/Transform, internal approval/client approval,
  generation/render/deliverable.
- 새 표와 상태를 추가했으면 데이터 모델과 상태기계에도 반영한다.
- 새 완료 조건을 추가했으면 해당 리스크와 테스트도 연결한다.
- `TBD`, `TODO`, “나중에 확인”만 남기지 않는다. 지금 확정할 수 없는 것은 책임자·검증
  시점·실패 시 fallback이 있는 명시적 gate로 쓴다.
- 부록 A의 실측값은 삭제하지 말고 표본·시점·provider/model 범위를 명시한다.
- 출처는 주장 가까이 또는 부록 B에 공식 URL로 남긴다.
- 기존 `docs/superpowers/**` 과거 문서는 수정하지 않는다.
- 정본 요약이 달라져 `CLAUDE.md`가 거짓이 되는 경우에만 그 요약을 최소 수정한다.

## 단계별 실행 절차

### A. 사전 감사

1. 현재 git 상태와 기존 사용자 변경을 확인한다.
2. 세 필수 파일을 전체 읽는다.
3. 전달 문서의 각 권고에 대해 잠정 판정을 만든다.
4. 시점에 따라 변할 수 있는 주장만 공식 웹 자료로 검증한다.
5. 수정 전에 문서 내부 모순 지도를 만든다.

### B. 직접 수정

1. 포지셔닝·ICP·보장 계약부터 수정한다.
2. 워크플로와 Direction IR을 그 계약에 맞춘다.
3. QA·오디오·납품·리뷰를 수정한다.
4. 데이터 모델·상태기계·아키텍처의 운영 신뢰성을 수정한다.
5. Gate 0과 P0~P6을 재정렬한다.
6. 리스크·하지 않는 것·작업 규칙·부록을 새 설계와 동기화한다.
7. 필요한 경우 `CLAUDE.md` 요약만 동기화한다.

### C. 필수 확인

수정 후 다음 문자열을 다시 검색하고, 남아 있다면 각각 문맥상 정당한지 확인하라.

- `워드마크 픽셀 보증`
- `오디오 무동기`
- `납품 포맷 없음`
- `클릭 3번`
- `완전히 동일`
- `composite 엔진 — 안전판 (P5)`
- `P2 첫 태스크`
- `MMAudio`
- `45크레딧`
- `3–6분`
- `확인 전 외부 판매 금지`
- `리뷰 링크`
- `P6 협업`

다음 일관성 체크를 수행하라.

#### 제품 약속

- 제품 범위가 시네마틱 래스터 로고 스팅으로 명확한가?
- ICP와 JTBD가 실제 화면·마일스톤에 연결되는가?
- Safe와 Transform의 생성 방식·보장·고지가 서로 모순되지 않는가?
- “보증” 문구가 실제 QA 및 납품 경로로 증명 가능한가?
- 경쟁사 비교가 공식 자료와 충돌하거나 부재를 과장하지 않는가?

#### 워크플로와 데이터

- Brand/Direct/Explore/Refine/Sound/Deliver가 새 Brand Motion Brief와 맞는가?
- Quick이 사람 검수와 비용 단계를 거짓으로 숨기지 않는가?
- IR, compiled request, compiler/model version, endframe hash가 스냅샷되는가?
- generation→render→deliverable의 파생 계보가 식별 가능한가?
- 내부 승인과 외부 고객 승인이 별도 상태·감사 이력을 갖는가?

#### 품질과 납품

- 전체 프레임 SSIM만으로 픽셀 보증을 주장하지 않는가?
- ROI·기하·색·최종 delivery decode QA가 정의됐는가?
- ΔE 종류, 색공간, 프레임레이트, 코덱, alpha 가능 조건이 명확한가?
- audio loudness와 transient sync 측정이 분리됐는가?
- clean plate, logo layer, stems, provenance가 필요한 단계에 연결되는가?

#### 운영과 보안

- 유료 submit의 응답 유실을 `failed`로만 처리하지 않는가?
- idempotency, unknown/reconciliation, budget reservation/settlement가 연결되는가?
- DB 상태 변경과 다음 큐 투입 사이의 유실 방지가 있는가?
- 단계가 중복 실행돼도 artifact와 ledger가 중복되지 않는가?
- 공개 리뷰가 인증 P6보다 먼저 등장하면서 무방비 상태가 되지 않는가?
- workspace/스토리지/SSE/upload/vendor raw 보안이 최소 P2 전에 정의되는가?

#### 라이선스와 시장 검증

- MMAudio pretrained checkpoint를 상용 기본 경로로 단정하지 않는가?
- 각 provider를 도입하기 전에 license gate가 있는가?
- 2개 브랜드 16편 실험을 세계 시장 보증으로 일반화하지 않는가?
- Gate 0과 파일럿 KPI가 기능 구현보다 먼저 제품 가설을 검증하는가?
- 수용 기준이 측정 가능하며 근거 없는 수치를 확정 사실로 쓰지 않는가?

#### 마일스톤

- Gate 0→P0→P1→P2의 입력·출력 의존성이 명확한가?
- P2에 Transform 창작 경로, Safe fallback, 최소 보안 리뷰, 최소 납품이 함께 있는가?
- P3 이후는 P2 파일럿 결과로 재우선순위하게 되어 있는가?
- P4 공개 리뷰/P6 인증과 같은 기존 순서 모순이 해소됐는가?
- 각 단계 완료 조건에 테스트와 go/no-go가 있는가?

### D. 결과 보고서

`docs/fable-logo-studio-revision-report.md`를 만들고 다음을 기록하라.

1. 최종 판정 요약
2. 수용/부분 수용/기각/보류 표
3. 수정한 섹션과 핵심 변경
4. 사용한 공식 출처와 확인일
5. 아직 검증되지 않은 API·가격·라이선스
6. 구현 전에 사용자가 결정할 사항
7. 변경한 파일 목록

## 종료 조건

다음이 모두 충족되기 전에는 완료라고 보고하지 마라.

- 수정 파일의 diff를 처음부터 끝까지 검토했다.
- placeholder, 상충하는 보장, 중복된 옛 마일스톤을 검색했다.
- 경쟁·가격·라이선스 주장을 공식 자료와 대조했다.
- 제품 약속과 QA·데이터·납품·마일스톤이 서로 일치한다.
- 관련 없는 사용자 파일과 코드를 수정하지 않았다.
- 결과 보고서에 반영하지 않은 권고와 이유까지 남겼다.

최종 응답은 변경 파일, 가장 중요한 설계 결정, 기각·보류 항목, 남은 사용자 결정을 짧게
요약하라.

---
