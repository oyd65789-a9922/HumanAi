# Error History & Correction Log

| Date | Issue / Error | Root Cause | Solution Summary |
|------|---------------|------------|------------------|
| 2026-10-12 | 모바일 기기(320px~390px)에서 히어로 섹션 및 우측 레이아웃 잘림 현상 | `.hero-stats-banner`의 `repeat(3, 1fr)` 및 `white-space: nowrap`, 컨테이너의 `min-width: 0` 누락으로 최소 고유 너비가 450px를 초과하여 모바일 뷰포트 밖으로 오버플로우 발생 | CSS Grid 트랙을 `minmax(0, 1fr)`로 전환, 텍스트 줄바꿈 허용(`white-space: normal`, `word-break: keep-all`), 컨테이너 및 카드 `min-width: 0`, 320px~480px 전 기종 반응형 패딩/폰트 세분화 적용 및 `Styles.html` 동기화 |
| 2026-10-13 | `Client.html` 및 `Styles.html` 한글 인코딩 깨짐 (CP949/ANSI 변환 오류) | 윈도우 환경 셸 스크립트 작성 시 기본 인코딩 불일치로 UTF-8 한글 문자열 손상 발생 | Node.js `fs.writeFileSync(..., 'utf8')` 기반의 자동화 번들링 파이프라인 구축 및 무결성 검증 완료 |
| 2026-10-13 | AI 생성 스톡 이미지로 인한 학술 연구 신뢰도 저하 및 시각적 노이즈(AI 슬롭) | 향 설명 시각화 명목의 AI 이미지들이 참여자에게 인지적 편향(Bias)을 유발하고 첫 화면 스크롤 낭비 초래 | 작위적인 AI 스톡 이미지를 전면 배제하고, 니치 향수 아카이브 감성의 순수 타이포그래피 에디토리얼 시스템(`Cinzel` + `Plus Jakarta Sans`)으로 전환하여 모바일 올인원 핏 달성 |
