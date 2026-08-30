# 업그레이드 로그

| 날짜 | 변경 내용 | 카테고리 | 관련 파일 |
|------|-----------|----------|-----------|
| 2026-08-30 | 렌더링용 Dockerfile 신설 (Debian + chromium + ffmpeg) | infra | Dockerfile |
| 2026-08-30 | 서버 사이드 렌더링 파이프라인 (헤드리스 캡처 + ffmpeg 인코딩) | feat | src/render.node.ts, src/server.node.ts |
| 2026-08-30 | 출력 포맷 확장: MP4(기본)·WebM(VP9 alpha)·MOV(ProRes 4444 alpha)·PNG 시퀀스 | feat | src/render.node.ts, public/static/preview.js |
| 2026-08-30 | 미리보기 페이지에 렌더 시작·진행 폴링·다운로드 UI | feat | src/pages.tsx, public/static/preview.js |
| 2026-08-30 | 미리보기 플레이어를 소스 선택형으로 전환 (내장 엔진 / 핸드오프 컨셉) | feat | public/static/preview.js, core.js |
| 2026-08-30 | 핸드오프 컨셉-파일 매핑 표 파싱 및 정확한 이름 부여 | feat | src/handoff.node.ts, public/static/preview.js, studio.js |
| 2026-08-30 | 보관함 페이지 재설계: 업로드+렌더 결과 통합, 실명, 삭제 기능 | feat | src/pages.tsx, public/static/archive.js, src/sequences.node.ts |
| 2026-08-30 | 핸드오프 적용 시 로고와 함께 애니메이션 자체를 인계·저장·복원 | feat | public/static/studio.js, core.js, preview.js |
| 2026-08-30 | 작업실 방문 시 작업 상태 자동 복원 (새 프로젝트 시에만 초기화) | feat | public/static/studio.js, core.js |
| 2026-08-30 | 프리셋 행에 "작업실에 적용"·"미리보기" 액션 | feat | public/static/library.js, studio.js, preview.js |
| 2026-08-30 | 새 프로젝트 생성 인라인 패널 (이름/프리셋/화면비/렌더 FPS·길이) | feat | src/pages.tsx, public/static/studio.js |
| 2026-08-30 | 작업실 워크벤치 구조 재편 (프로젝트 바 + 3열 레이아웃) | style | src/pages.tsx |
| 2026-08-30 | 작업실 디자인 전면 개선 (Cohere 디자인 시스템, 커스텀 폼 컨트롤) | style | src/pages.tsx, public/static/system.css, stage.css |
| 2026-08-30 | 전 페이지 디자인 통일 + 상단 메뉴바 다크모드 | style | src/pages.tsx, src/renderer.tsx, public/static/*.js, system.css |
| 2026-08-30 | 제품명 "PLAZION Studio" → "Logo Studio" | style | src/renderer.tsx, src/app.tsx, src/pages.tsx |
| 2026-08-30 | 홈 히어로 카피·타이포 재작업 | style | src/pages.tsx, public/static/system.css |
