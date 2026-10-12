# SCENT LAB — 배포 전후 QA 점검표 (QA_CHECKLIST.md)

운영자가 GitHub Pages 및 Google Apps Script를 통해 설문 조사를 배포하고 운영 및 마감할 때 점검하는 단계별 체크리스트입니다.

---

## 1. 배포 전 사전 준비 점검표 (Pre-Deployment Checklist)

- [ ] **Google Sheets 생성**:
  - 파일명: `SCENT_LAB_Responses` 생성 완료
  - 첫 번째 시트 탭 이름을 정확히 **`Responses`**로 변경
  - 1행(A1:I1) 헤더에 `q1,q2,q3,q4,q5,q6,q7,q8,q9`를 각 열에 입력 (대소문자 일치)
  - 스프레드시트 공유 권한이 **`제한됨(Restricted)`** 상태인지 확인 (링크가 있어도 다른 사람이 볼 수 없어야 함)
  - URL에서 `SPREADSHEET_ID` 추출하여 보관
- [ ] **Google Apps Script 프로젝트 생성**:
  - `https://script.google.com/` 접속 후 새 프로젝트 생성
  - 프로젝트명 입력 (예: `SCENT_LAB_Backend`)
  - `Code.gs`, `appsscript.json` 코드 복사 및 붙여넣기
  - **프로젝트 설정 > 스크립트 속성(Script Properties)** 추가:
    - `SPREADSHEET_ID`: 위에서 복사한 시트 ID
    - `SHEET_NAME`: `Responses`
    - `SURVEY_OPEN`: `true`
    - `MIN_PUBLIC_N`: `5`
    - `MAX_RESPONSES`: `2000`
- [ ] **Apps Script 웹 앱 배포**:
  - 상단 **배포 > 새 배포(New deployment)** 클릭
  - 유형: **웹 앱(Web app)** 선택
  - 다음 사용자로 실행: **나(Me / 배포자)**
  - 액세스 권한: **모든 사용자(Anyone)** 선택
  - 배포 완료 후 발급된 웹 앱 URL (`/exec`로 끝남) 복사
- [ ] **GitHub Pages 정적 사이트 설정**:
  - `app.js` 최상단의 `GAS_API_URL` 상수에 위에서 복사한 `/exec` 주소를 입력
  - 변경 사항을 GitHub 저장소(main 또는 master 브랜치)에 push
  - GitHub 저장소 설정(**Settings > Pages**)에서 Source를 `Deploy from a branch` (main / root)로 지정하여 GitHub Pages 활성화

---

## 2. 실서비스 배포 직후 검증 점검표 (Post-Deployment Verification)

- [ ] **시크릿 모드(로그아웃) 접속 확인**:
  - 브라우저 시크릿 창(Incognito)에서 GitHub Pages URL (`https://사용자명.github.io/저장소명/`) 접속
  - 구글 로그인 화면 요구 없이 랜딩 페이지가 즉시 표시되는지 확인
- [ ] **Q2=0 분기 동작 테스트 (1회차 제출)**:
  - Q1 선택 후 Q2에서 `0회 (구매 경험 없음)` 선택
  - [다음] 클릭 시 Q3를 건너뛰고 Q4로 직행하는지 확인
  - 9번 문항까지 완료 후 제출
  - Google Sheet `Responses` 탭의 2행에 Q1~Q9가 기록되고, `q3` 열(C열)이 **정확히 빈 칸**으로 저장되었는지 확인
  - 제출 직후 화면에 "총 1건 접수 (최소 5건부터 집계 공개)" 안내가 표시되는지 확인
- [ ] **Q2≠0 분기 및 1~5점 척도 테스트 (2회차 제출)**:
  - Q2에서 `2회` 선택 후 [다음] 클릭
  - Q3 문항이 정상 노출되는지 확인하고 점수(예: 4점) 선택 후 제출
  - 시트 3행에 `q3` 열이 숫자 `4`로 올바르게 저장되었는지 확인
- [ ] **모바일 뷰포트 반응형 확인**:
  - 스마트폰(또는 개발자도구 모바일 모드 375px/430px)에서 접속
  - 가로 스크롤 없이 모든 텍스트와 버튼이 깔끔하게 정렬되는지 확인
  - 상단 참고자료 아코디언 열기/닫기 작동 확인
- [ ] **표본 수 5건 달성 후 집계 차트 활성화 확인**:
  - 5번째 응답 제출 시, 숨겨져 있던 CSS 가로 막대 차트가 정상 활성화되는지 확인
  - Q6(가장 쉬운 설명), Q8(도움 되는 설명)이 상단에 배치되어 있는지 확인
  - Q4, Q9의 평균 점수가 정상 계산되어 표시되는지 확인

---

## 3. 조사 종료 및 데이터 폐기 점검표 (Teardown & Cleanup)

- [ ] **설문 접수 마감**:
  - Apps Script 스크립트 속성에서 `SURVEY_OPEN` 값을 `false`로 변경
  - 웹 페이지 접속 및 제출 시도시 "설문 조사가 종료되었습니다" 안내와 함께 추가 저장이 차단되는지 확인
- [ ] **데이터 안전 백업**:
  - Google Sheets에서 **파일 > 다운로드 > 쉼표로 구분된 값(.csv)**으로 분석용 데이터 다운로드
- [ ] **배포 중단 및 프로젝트 정리**:
  - Apps Script 배포 관리에서 활성 배포 보관/삭제
  - 필요 시 Google 드라이브 휴지통 및 테스트 데이터 완전 삭제
