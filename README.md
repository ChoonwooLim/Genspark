# PLAZION VFX 로고 인트로 (3초)

## Project Overview
- **Name**: PLAZION VFX Intro
- **Goal**: Genspark Design 핸드오프(`designer2-ba0f67c3-1074-4207-866d-2aa9e792de47`)의
  "PLAZION VFX Intro" 디자인(Variant 03 — Voxel Materialize)을 프로덕션 웹페이지로 재구현.
  메탈릭 Z-플레임 PLAZION 로고가 보크셀 그리드로 조립 → 글리치 → 임팩트 플래시/쇼크웨이브 →
  홀로그램 아이들 상태로 이어지는 3초 루핑 VFX 브랜드 스팅입니다.
- **Features**:
  - Canvas 2D 기반 실시간 렌더링 (디자인 레퍼런스의 타이밍/이징/컬러 값을 그대로 포팅)
  - 16:9(1920×1080) / 9:16(1080×1920) 두 가지 화면비 토글
  - WebAudio로 절차적으로 생성되는 임팩트/휘시 SFX (외부 오디오 파일 불필요)
  - 사운드 온/오프, 다시보기(재시작), 원본 로고 다운로드 컨트롤
  - 현재 화면비의 3초 애니메이션을 30fps(90장) 투명 RGBA PNG 시퀀스로 렌더링
  - Chrome/Edge에서 사용자가 지정한 폴더에 개별 PNG 저장, 미지원 브라우저는 ZIP 다운로드로 자동 대체
  - 루프 카운터 배지, 마스터 스펙 표, 타임라인 상세 설명 섹션

## URLs
- **Sandbox Preview**: https://3000-i0kskzhe4o04pydkfakoh-583b4d74.sandbox.novita.ai
- **Production**: (배포 후 업데이트 예정)
- **Design handoff repo**: `designer2-ba0f67c3-1074-4207-866d-2aa9e792de47`

## Data Architecture
- **Data Models**: 서버 상태 없음 — 전부 클라이언트 사이드 애니메이션/오디오
- **Storage Services**: 없음 (정적 자산만 `public/static/`에서 서빙)
- **Data Flow**: Hono가 정적 HTML 셸을 렌더링 → 브라우저에서 `vfx-intro.js`(애니메이션 엔진) +
  `app.js`(UI 컨트롤 바인딩)가 `<canvas>`에 3초 루프를 그림

## Design Source
디자인 핸드오프 README(`design_handoff_plazion_vfx_intro/README.md`) 스펙을 기준으로 구현:
- Duration: 3.0s 루핑 · 60fps 목표
- 보크셀 셀 크기: 14px(landscape) / 11px(portrait)
- 로고 샘플 폭: 1200px(landscape) / 620px(portrait)
- 색상 토큰: `#020009` 배경, `#7A4DFF → #B782FF` 퍼플 그라디언트, `rgba(230,210,255,.55)` 임팩트 플래시
- 타임라인: 보크셀 팝인(0.15–1.6s) → 글리치(1.42–1.9s) → 임팩트/쇼크웨이브(1.85–2.75s) →
  클린 로고 리빌(1.9–2.2s) → 홀로그램 아이들(2.15–3.0s)
- 결정론적 PRNG(`mulberry32`, seed 4242)로 프레임 재현 가능

## User Guide
1. 페이지 접속 후 "재생 시작" 버튼을 눌러 오디오를 활성화합니다 (브라우저 정책상 사용자 클릭 필요).
2. 상단 16:9 / 9:16 토글로 화면비를 전환할 수 있습니다.
3. "다시보기"로 루프를 즉시 재시작, 우측 상단 배지로 루프 횟수를 확인합니다.
4. **폴더에 PNG 시퀀스 저장** 버튼을 누르고 폴더 선택 창에서 데스크톱 또는 원하는 위치를 선택합니다.
5. 선택한 위치에 `plazion_transparent_[해상도]_30fps` 하위 폴더가 생성되고 `plazion_0000.png`부터 `plazion_0089.png`까지 저장됩니다.
6. Chrome/Edge 외 브라우저처럼 폴더 저장 API가 없는 환경에서는 동일한 파일이 ZIP으로 다운로드됩니다.
7. "로고 원본"으로 PNG 원본 파일을 다운로드하고, 하단 스펙/타임라인에서 프레임별 이벤트를 확인할 수 있습니다.

## Not Yet Implemented
- Safari/Firefox에서의 폴더 직접 저장 (브라우저의 File System Access API 미지원으로 ZIP 자동 대체)
- MP4/MOV 마스터 렌더 파이프라인 (핸드오프에 포함된 `plazion-voxel-remotion/` Remotion 프로젝트로 별도 처리 권장)
- Variant 01(Particle Assembly), Variant 02(Scanner Sweep) 대체 버전 (선택된 Variant 03만 구현)

## Recommended Next Steps
- Remotion 프로젝트(`plazion-voxel-remotion/`)를 별도로 빌드하여 헤드리스 MP4 마스터 렌더 확보
- 실제 배포 도메인 연결 후 OG 이미지/메타 태그 보강

## Deployment
- **Platform**: Cloudflare Pages (Hono + TypeScript + Vite) **또는** 일반 Node.js 컨테이너(Orbitron 등 Docker 기반 자동 배포)
- **Status**: 로컬 샌드박스 및 두 배포 경로(Cloudflare Workers / Node 컨테이너) 모두 동작 확인 완료
- **Tech Stack**: Hono, TypeScript, Vite, Cloudflare Pages, Vanilla Canvas2D/WebAudio JS
- **듀얼 런타임 구조**:
  - `src/app.tsx` — 런타임에 종속되지 않는 공유 Hono 앱/페이지 정의
  - `src/index.tsx` — Cloudflare Workers 진입점 (`hono/cloudflare-workers`의 `serveStatic` 사용, `vite build` → `dist/_worker.js`)
  - `src/server.node.ts` — Node.js 컨테이너 진입점 (`@hono/node-server`, `PORT` 환경변수 사용, `npm run build:node` → `dist-node/server.js`)
  - `npm start` = `npm run build:node && node dist-node/server.js` — Docker/Orbitron 같은 컨테이너 배포가 기대하는 `npm start` 스크립트 제공
- **Last Updated**: 2026-08-29

## PNG Sequence Export
- **출력**: 3초 × 30fps = 90개 PNG 파일, 파일명 `plazion_0000.png`–`plazion_0089.png`
- **투명도**: 배경색, 비네트, 전체 화면 플래시/스캔라인을 제외한 투명 RGBA 캔버스
- **해상도**: 현재 선택된 화면비에 따라 1920×1080 또는 1080×1920
- **폴더 저장**: File System Access API의 `showDirectoryPicker()`와 `FileSystemWritableFileStream` 사용
- **폴백**: 폴더 API 미지원 시 JSZip 기반 무압축 ZIP 다운로드
