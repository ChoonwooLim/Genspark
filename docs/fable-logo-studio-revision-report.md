# Fable 독립 리뷰 결과 보고서 — Logo Studio 설계 3차 보정

- 작성일: 2026-08-30
- 입력: `docs/fable-logo-studio-handoff.md` · `docs/fable-logo-studio-verification-instructions.md`
- 출력: `docs/logo-studio-design.md` (3차) · `CLAUDE.md` (요약 동기화)

## 1. 최종 판정 요약

17개 쟁점 중 **수용 12 · 부분 수용 5 · 기각 0 · 보류 0**. 기각이 없는 이유는 전달 문서의
권고 대부분이 공식 자료 검증으로 뒷받침됐기 때문이다. 부분 수용은 범위를 줄인 것이지
논리를 부정한 것이 아니다.

가장 중요한 발견은 전달 문서에 없던 것이다: **2차 설계가 전제한 "Seedance REST 어댑터"의
서버 호출 경로가 공식 자료로 확인되지 않는다.** ByteDance 공식 Seedance 2.5 API 는
"BytePlus ModelArk 를 통해 제공 예정"이고, 실측 16편은 전부 Higgsfield MCP 경유다.
이것을 Gate 0 의 첫 항목으로 올렸고, 통과 전에는 P0 착수를 보류한다.

## 2. 판정표

| # | 권고 | 판정 | 수정 위치 | 근거 | 남은 검증 |
|---|---|---|---|---|---|
| 1 | 경쟁사 표의 절대 주장 | **수용** | §1.1, 부록 B | Runway Gen-4.5 ProRes·PNG/EXR·HDR [B3], Veo 3.1 네이티브 오디오·프레임 지정 [B4], Jitter ProRes4444·투명·Lottie [B2] 확인. "오디오 무동기"·"납품 포맷 없음" 삭제. 부재 주장은 "비교에 근거한 추론"으로 표기 | Luma 는 미열람 — 표에서 이름만 언급 |
| 2 | ICP·JTBD 구체화 | **수용** | §2 | "초기 검증 대상 ICP" 로 표기, Gate 0 #6 인터뷰로 확정 | Gate 0 |
| 3 | 픽셀 보증 범위 / Safe·Transform | **수용** | §4, §7.5, §10.2, §12, §17 P2 | 착지 교체만으로 영상 전체 보증 불가 — 논리적으로 타당. Safe 를 P2 로 앞당김. CLAUDE.md 의 "composite 는 안전판" 원칙과 충돌 없음(우선순위 유지) | Gate 0 #4 로 계약 문구 데이터 확인 |
| 4 | Gate 0 | **부분 수용** | §16 | 수용. 단 생성 실험 규모를 100–150 → **60–100편, 예산에 맞게 조정**으로 축소. 유료 호출은 사람 승인 후(CLAUDE.md 규칙). Seedance 호출 경로 검증(#1)과 Orbitron 볼륨 공유(#7)를 추가 | 사용자 예산 결정 |
| 5 | Brand Motion Brief | **부분 수용** | §7.2 | `irVersion`·`compilerVersion`·logo policy·references·`vendorOverrides`·우선순위 규칙·스냅샷 필드 수용. **승인 기준·delivery profile 은 IR 에서 제외** — IR 은 "무엇을 만들 것인가"만 담고 납품·승인은 프로젝트/deliverable 단위(§9, §12, §13)에 둔다. 그래야 IR 버전이 납품 설정 변경으로 오염되지 않는다 | 없음 |
| 6 | "클릭 3번"·"완전히 동일" | **수용** | §3, §5.7 | 두 문구 삭제. "같은 파이프라인·같은 품질 설정, 검수·비용·승인 단계 생략 없음, 결과·책임까지 같다고 주장하지 않음"으로 교체. Quick 의 약속을 클릭 수가 아닌 4가지 가치로 재정의 | 없음 |
| 7 | QA 교정 | **수용** | §10 | ROI 기준 기하·형태·CIEDE2000(sRGB/D65, 합성 배경 명시)·delivery decode QA·trim 후 오염 검사·integrated/short-term LUFS 와 transient 분리·사람 청감. 모든 임계값 "실측 휴리스틱, calibration 전 SLA 아님" | Gate 0 #2 calibration |
| 8 | submit timeout·예약/정산·idempotency | **수용** | §7.1, §8.1, §8.2, §9, §21 | `submission_unknown` + `reconcile()` + `submission_id` 유니크 + replacement 명령 + reserve/settle/release/adjust 원장 + quote 가격 버전 | 벤더 idempotency·조회 API 지원 여부 — Gate 0 #1 |
| 9 | transactional outbox | **수용** | §6.1 #3, §9, §19 | 같은 트랜잭션 원칙 채택. pg-boss 외부 트랜잭션 전달 vs outbox 테이블은 P0 첫 태스크에서 pg-boss 버전으로 확정 | pg-boss 버전별 API 확인 |
| 10 | 계보·해시·provenance | **수용** | §9 | `artifacts` 테이블(sha256·mime·codec·provenance), `renders.parent_render_id`, `generations.snapshot`, `deliverables.manifest/license_snapshot` | 없음 |
| 11 | 리뷰 링크 보안·내부/외부 승인 분리 | **수용** | §9, §13, §17 P2 | 토큰 hash·만료·폐기·scope·감사 로그·XSS·signed URL. 내부 3단계 / 외부 4단계 상태 분리. 최소 리뷰 보안을 P2 로, 역할·알림은 P4 | 없음 |
| 12 | object storage·SSE·tenant·보안 | **부분 수용** | §6.1 #1/#7/#9, §8.4, §8.5 | tenant 강제·signed URL·SVG sanitize·리소스 제한·redaction·SSE replay 는 P2 전 완료로 수용. **object storage 즉시 전환은 보류** — P0 은 볼륨, Gate 0 #7 실패 시 또는 P2 종료 시 결정(Orbitron 에 MinIO 가 이미 있어 전환 비용 낮음) | Gate 0 #7 |
| 13 | delivery profile·clean plate·stems·색 관리 | **수용** | §12 | profile 표(web-master·mezzanine·alpha-master·frames·clean-plate·logo-layer·stems·파생), decode 후 QA, manifest | 없음 |
| 14 | MMAudio 비상업 라이선스·provider 게이트 | **수용** | §3, §11.2, §11.3, §19, §21 | 공식 저장소: 코드 MIT, **체크포인트 CC-BY-NC 4.0**, "상업 적합성 보증 안 함" [B6]. L1 기본 꺼짐, 게이트 통과 제공자만. Stable Audio Community(연매출 $1M 미만) [B8]. ElevenLabs Music 은 Music Terms 확인 전 미채택 [B9] | ElevenLabs SFX 요금 페이지·Music Terms·Stable Audio 호스팅 API 약관 미열람 |
| 15 | 테스트 부재·P0 수용 기준 | **수용** | §17 P0 | `package.json` 에 React·pg-boss·test 스크립트 없음 확인. fake engine E2E·golden/ROI regression·chaos·동시성·마이그레이션 테스트를 P0 완료 조건에 | 없음 |
| 16 | Gate 0 + P0–P6 재배치 | **수용** | §16, §17 | 전달 문서 §6 구조 채택. P2 = Transform + Safe + 최소 보안 리뷰 + 최소 납품. P4 공개 리뷰/P6 인증 순서 모순 해소 | 없음 |
| 17 | 파일럿 KPI·go/no-go | **수용** | §18 | "제안 목표"로 표기 | 파일럿에서 보정 |

## 3. 수정한 섹션과 핵심 변경

- **§0–§4 신설/재작성**: 포지셔닝 문장, 범위 한정(래스터 스팅), 검증 기반 경쟁표, ICP/JTBD, Safe/Transform 계약
- **§5 워크플로**: 사용자 확인 단계(심볼 분리·권리 체크), Explore A/B·선택 이유, 내부 검수 상태, Quick 재정의, 모니터에 `submission_unknown`·해시·정산
- **§6–§8**: web/worker 볼륨 검증, 멱등 step·lease·fence, 트랜잭션 큐 투입, tenant 강제, 보안 기본선 표, 예약/정산, 제출 상태기계, SSE replay
- **§7.2 IR**: 버전형 Brand Motion Brief, 우선순위 규칙, `vendorOverrides`, 스냅샷
- **§7.3**: Seedance 경로 **미검증** 명시, 실측 파라미터를 계약이 아닌 관찰로 강등
- **§9**: artifacts·계보·review_events·license_snapshot·outbox·원장 kind
- **§10**: ROI QA·CIEDE2000·delivery decode·LUFS/transient 분리, 임계값 휴리스틱 표기
- **§11**: 제공자 라이선스 게이트 표, L1 기본 꺼짐
- **§12–§13**: delivery profile, 내부/외부 승인 분리, 리뷰 보안
- **§16–§18**: Gate 0(8항목), P0–P6 재정의, KPI
- **부록 A**: 표본·시점·경로 범위 배너, `mean_volume`≠LUFS, 45크레딧 가격 버전 미기록 명시
- **부록 B**: 확인일과 미열람 표시

## 4. 사용한 공식 출처 (확인일 2026-08-30)

| 출처 | 확인 내용 |
|---|---|
| github.com/hkchengrex/MMAudio | 코드 MIT, 체크포인트 CC-BY-NC 4.0, 상업 적합성 미보증 |
| docs.dev.runwayml.com/guides/models | Gen-4.5: ProRes mov, PNG zip, HDR10/HLG, 12-bit 4:4:4, EXR 시퀀스. first/last frame·오디오 동기는 해당 페이지에 미기재 |
| help.jitter.video (export) | GIF/MP4/Lottie/WebM/ProRes4444, 투명 배경(Max/Ultra), 4K·120fps |
| seed.bytedance.com (Seedance 2.5) | 멀티모달 레퍼런스(이미지 30·영상 10·오디오 10), 최대 30초, **API "coming soon via BytePlus ModelArk"** |
| ai.google.dev/gemini-api/docs/video | Veo 3.1 네이티브 오디오, 프레임 지정 생성, 이미지 기반 방향 |
| elevenlabs.io/docs/eleven-creative/products/music | "certain subscriptions and conditions" 하 광범위 상용, 세부는 Music Terms |
| stability.ai/license | Community: 연매출 USD 1M 미만 무료, Stable Audio 포함, 산출물 소유 |
| renderforest.com/logo-animation | MP4, 360p–1080p, 투명 PNG 입력 |

## 5. 아직 검증되지 않은 것

| 항목 | 상태 | 검증 시점 |
|---|---|---|
| Higgsfield 서버 REST API 존재·파라미터·idempotency·조회 | **미검증** | Gate 0 #1 |
| BytePlus ModelArk Seedance 2.5 가용성·가격 | 미검증("coming soon") | Gate 0 #1 |
| 45 크레딧/편의 가격 버전·통화 체계 | 미기록 | Gate 0 #3 |
| ElevenLabs SFX 요금·플랜 조건 | 미열람 | Gate 0 #8 |
| ElevenLabs Music Terms(광고 용도) | 미열람 | Gate 0 #8 |
| Stable Audio 호스팅 API 약관(Community License 와 별개) | 미확인 | Gate 0 #8 |
| Luma 프로 포맷·협업 | 미열람 | 필요 시 |
| pg-boss 외부 트랜잭션 전달 API | 미확인 | P0 첫 태스크 |
| Orbitron 컨테이너 2개 볼륨 공유 | 미확인 | Gate 0 #7 |

## 6. 구현 전에 사용자가 결정할 사항

1. **Gate 0 예산** — 생성 실험 60–100편(편당 45cr 관측 기준 2,700–4,500cr) 승인 여부와 상한
2. **Seedance 경로가 없을 때의 대안 엔진** — Veo 3.1(프레임 지정 생성 확인) 을 같은 게이트로 돌릴지
3. **Safe 모드의 P2 포함** 승인 — 범위는 최소(레이어 모드 1종)
4. **object storage 전환 시점** — Gate 0 #7 결과에 따름
5. **ICP 인터뷰 대상 에이전시 3–5곳** 섭외
6. **L1(V2A) 정책** — 상용 제공자 탐색 vs L2+L3 만으로 출시

## 7. 변경한 파일

- `docs/logo-studio-design.md` — 3차 전면 보정
- `CLAUDE.md` — "지금 무엇을 하고 있는가" 요약 동기화(Gate 0, Safe/Transform, P 단계명)
- `docs/fable-logo-studio-revision-report.md` — 신규(이 문서)

수정하지 않음: `src/**`, `public/**`, `package.json`, `docs/superpowers/**`, 전달 문서 2개.
