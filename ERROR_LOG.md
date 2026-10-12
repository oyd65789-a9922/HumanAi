# Error History & Correction Log

| Date | Issue / Error | Root Cause | Solution Summary |
|------|---------------|------------|------------------|
| 2026-10-12 | 모바일 기기(320px~390px)에서 히어로 섹션 및 우측 레이아웃 잘림 현상 | `.hero-stats-banner`의 `repeat(3, 1fr)` 및 `white-space: nowrap`, 컨테이너의 `min-width: 0` 누락으로 최소 고유 너비가 450px를 초과하여 모바일 뷰포트 밖으로 오버플로우 발생 | CSS Grid 트랙을 `minmax(0, 1fr)`로 전환, 텍스트 줄바꿈 허용(`white-space: normal`, `word-break: keep-all`), 컨테이너 및 카드 `min-width: 0`, 320px~480px 전 기종 반응형 패딩/폰트 세분화 적용 및 `Styles.html` 동기화 |
