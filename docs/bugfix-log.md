# 버그 수정 로그

| 날짜 | 버그 | 원인 | 수정 내용 | 관련 파일 |
|------|------|------|-----------|-----------|
| 2026-08-30 | 핸드오프 적용 후 미리보기에서 로고가 기본값으로 되돌아감 | 작업실→미리보기 이동 시 로고를 blob URL로만 들고 있어 페이지 로드와 함께 소실 | IndexedDB `session` 스토어로 작업 중 로고·설정·애니메이션을 영속화 | public/static/core.js, studio.js, preview.js |
| 2026-08-30 | 핸드오프 "원본 재생" 클릭 시 검은 화면 | previews[0]이 임의 순서(9:16 파일)였고, 고정 캔버스 크기를 iframe이 잘라내기만 함 | 프로토타입을 원본 픽셀 크기로 렌더 후 양축 비율로 스케일, 컨셉 선택기 추가 | public/static/handoff.js, system.css |
| 2026-08-30 | 작업실에서 로고 적용/저장이 무한 대기 (오류 없음) | IndexedDB v1→v2 스키마 업그레이드가 다른 탭이 v1을 점유해 영원히 미해결 Promise | openDb()에 onblocked 핸들러 + 4초 타임아웃, 실패 시 사용자 안내 문구 | public/static/core.js, studio.js |
| 2026-08-30 | 핸드오프 "압축 푼 폴더 선택" 버튼이 아무 반응 없음 | 리팩터링 커밋(306b73d)이 importFolder 등 4개 함수를 통째로 삭제 (호출부는 남음) | 원 커밋에서 함수 4종 복원 | public/static/handoff.js |
| 2026-08-30 | design_handoff_ 접두사 없는 zip에서 "HTML 미리보기 없음" 오류 | detectEntrypoints가 previews/variants 탐지에 접두사를 필수 조건으로 요구 | 접두 있으면 우선, 없으면 있는 파일 그대로 사용하도록 완화 | src/handoff.node.ts |
| 2026-08-30 | Orbitron 배포가 계속 Alpine 이미지로 되돌아감 | 저장소 Dockerfile 첫 줄이 `# CUSTOM`이 아니라 Orbitron 자동생성본으로 덮어써짐 | Dockerfile 첫 줄에 `# CUSTOM` 마커 추가 | Dockerfile |
| 2026-08-30 | 컨테이너 배포 실패 (esbuild 등 devDependency 누락) | Dockerfile에서 NODE_ENV=production을 npm install보다 앞에 배치 | Orbitron 자동복구가 npm ci --include=dev + 빌드 타임 번들 방식으로 수정, 반영 | Dockerfile |
| 2026-08-30 | 서버 렌더 MP4의 전 프레임이 동일(최종 정지 상태)하게 캡처됨 | CDP 가상시간은 메인 스레드만 제어, transform/opacity 애니메이션은 컴포지터 스레드에서 실시간 진행 | Web Animations API로 프레임마다 currentTime 직접 지정 | src/render.node.ts |
