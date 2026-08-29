# 서버 보관함 (PNG 시퀀스 → Orbitron)

브라우저가 만든 90장 투명 PNG 시퀀스를 ZIP으로 묶어 Orbitron 서버에 저장하고,
메타데이터를 PostgreSQL에 기록한 뒤 토큰 URL로 다시 내려받는 기능입니다.

폴더 직접 저장(`showDirectoryPicker`)은 그대로 유지되고, 이 기능은 **추가 선택지**입니다.

## 구조

| 조각 | 위치 | 비고 |
|---|---|---|
| API | [src/sequences.node.ts](../src/sequences.node.ts) | Node 컨테이너 전용 |
| 마운트 | [src/server.node.ts](../src/server.node.ts) | `app.route('/api/sequences', …)` |
| 클라이언트 | [public/static/app.js](../public/static/app.js) | 업로드 + 보관함 렌더링 |
| 마크업 | [src/app.tsx](../src/app.tsx) | `#upload-sequence`, `#library-section` |

`src/app.tsx`(공유 앱)에는 런타임 의존 코드가 없습니다. Cloudflare Workers 빌드
(`src/index.tsx`)는 이 API를 마운트하지 않으므로 `/api/sequences`가 404이고,
클라이언트는 상태 조회에 실패하면 UI를 숨긴 채로 둡니다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/sequences/status` | `{enabled, chunkSize, maxBytes, retention}` |
| `POST` | `/api/sequences/init` | 메타데이터 등록 → `{uploadId, chunkSize}` |
| `PUT` | `/api/sequences/:uploadId/chunk?index=N` | 청크 append (순서 강제) |
| `POST` | `/api/sequences/:uploadId/complete` | sha256 검증 → 행 삽입 → 다운로드 URL |
| `GET` | `/api/sequences` | 최근 50건 |
| `GET` | `/api/sequences/:id/download?token=` | ZIP 스트리밍 |

### 왜 청크 업로드인가

Orbitron이 생성한 nginx vhost(`genspark.conf`)에 `client_max_body_size 50M`이
걸려 있습니다. 1920×1080 투명 PNG 90장 ZIP은 이를 넘길 수 있어, 8MB 청크로
나눠 보냅니다. nginx 설정은 Orbitron이 재생성하므로 손대지 않습니다.

## 설정

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | — | 우선순위 1 |
| `DATABASE_URL_FILE` | — | 우선순위 2 (Orbitron 표준 — 다른 프로젝트도 이 형식) |
| `/app/data/database-url` | — | 우선순위 3 (볼륨 파일, 재배포 없이 연결) |
| `UPLOAD_DIR` | `/app/uploads` (없으면 `./uploads`) | ZIP 저장 위치 |
| `SEQUENCE_MAX_BYTES` | `536870912` (512MB) | 업로드 상한 |
| `SEQUENCE_RETENTION` | `50` | 최신 N건만 보관, 초과분은 행·파일 모두 삭제 |

셋 중 아무것도 없으면 API는 503을 반환하고 UI는 숨겨집니다. **사이트 본체는
영향받지 않습니다** — DB가 죽어 있어도 인트로 페이지는 정상 동작합니다.

## Orbitron 배포 메모

- 영구 볼륨은 Orbitron이 이미 마운트합니다:
  `~/WORK/orbitron/deployments/genspark/_volumes/uploads` → `/app/uploads`
- 앱 컨테이너는 `orbitron_internal` 네트워크, 공용 `dev-postgres`는
  `infrastructure_dev-network`에 있어 **컨테이너 이름으로는 통신 불가**입니다.
  호스트 LAN IP(`192.168.219.101:5432`)로는 도달 가능함을 확인했습니다.

## 남은 작업

- PostgreSQL 프로비저닝 (`scripts/provision-db.sh` 참고) — 실행 전에는 기능이 비활성입니다.
- DB 연결 이후의 업로드/다운로드 경로는 아직 실환경 검증 전입니다.
