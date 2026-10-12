# SCENT LAB — 익명 향수 인식 조사 웹애플리케이션

> **"당신은 향을 어떻게 상상하나요?"**  
> 향수 설명을 읽고 머릿속에 떠오르는 향의 상상 방식과 구매 인식 차이를 100% 무료·무인증 환경에서 수집하고 분석하는 익명 설문 조사 웹앱입니다.

---

## 📌 1. 프로젝트 개요 및 기술 구성

본 프로젝트는 복잡한 백엔드 서버나 유료 데이터베이스 없이, **Vercel** 또는 **GitHub Pages**와 **Google Workspace(Apps Script + Sheets)**의 무료 할당량만을 활용하여 영구 무료로 안전하게 운영할 수 있도록 설계되었습니다. iPhone SE(320px)부터 Galaxy S시리즈(360px), 최신 플래그십(390px~430px)까지 전 기종 모바일 뷰포트에 완벽 대응합니다.

### 💡 추천 기술 스택 및 역할

| 구성 요소 | 기술 스택 | 주요 역할 | 비용 |
|:---|:---|:---|:---|
| **웹 프런트엔드** | 순수 HTML5, Vanilla CSS, Vanilla JavaScript | 설문 진행, 분기 처리, 전 기종 반응형 UI, 결과 차트 렌더링 | **0원** (Vercel / GitHub Pages 호스팅) |
| **API 백엔드** | Google Apps Script (HTML Service / ContentService) | 비동기 `fetch` 요청 처리, 서버 유효성 검사, 동시성 제어 | **0원** (Google 무료 할당량 내) |
| **데이터베이스** | Google Sheets (비공개 `Responses` 탭) | 익명 설문 응답(Q1~Q9 선택 코드) 안전 저장 | **0원** (Google 계정 기본 제공) |
| **결과 시각화** | 순수 CSS 가로 막대 그래프 (Zero-dependency) | 제출 완료 후 참여자에게 익명 집계 통계 실시간 표시 | **0원** (외부 라이브러리 0개) |

---

## 📂 2. 프로젝트 파일 구조

```text
scent-lab/
├── PLAN.md                 # 기획 및 아키텍처 정본 사양서 (Single Source of Truth)
├── README.md               # [현재 문서] 설치, 배포, 운영, 폐기 종합 매뉴얼
├── index.html              # GitHub Pages 배포 메인 시맨틱 HTML 웹페이지
├── style.css               # 니치 향수 브랜드 감성의 미니멀 반응형 디자인 시스템
├── app.js                  # 설문 상태 관리, 조건부 분기, 차트 렌더링 및 GAS 비동기 연동
├── Code.gs                 # Google Apps Script 백엔드 로직 (doPost, doGet, 검증, 시트 저장, 집계)
├── appsscript.json         # Apps Script V8 런타임 및 권한 설정 매니페스트
├── Index.html              # Apps Script 자체 단독 호스팅용 HTML 템플릿
├── Styles.html             # Apps Script 자체 단독 호스팅용 CSS 조각
├── Client.html             # Apps Script 자체 단독 호스팅용 JS 조각
└── tests/
    ├── run-tests.js        # Node.js 기반 TDD 단위 테스트 스크립트 (검증 및 집계 로직)
    ├── core-logic.js       # TDD 검증용 핵심 스키마 및 집계 공통 모듈
    ├── TEST_CASES.md       # 기능/보안/접근성 22개 상세 테스트 케이스 명세서
    └── QA_CHECKLIST.md     # 배포 전후 단계별 운영자 점검 체크리스트
```

---

## 🚀 3. 단계별 무료 배포 및 설정 가이드 (10분 완성)

비개발자 운영자도 아래 4단계를 순서대로 따라 하시면 바로 설문 조사를 시작할 수 있습니다.

### [1단계] Google Sheets 데이터베이스 준비

1. 개인 Google 계정으로 로그인 후 [Google 스프레드시트](https://sheets.google.com)에 접속하여 **새 스프레드시트**를 만듭니다.
2. 스프레드시트 제목을 `SCENT_LAB_Responses`로 지정합니다.
3. 좌측 하단 시트 탭 이름을 **`Responses`**로 변경합니다. (대소문자 정확히 일치)
4. **1행(A1:I1)**에 다음 9개 헤더를 순서대로 한 칸씩 입력합니다:
   ```csv
   q1, q2, q3, q4, q5, q6, q7, q8, q9
   ```
5. 우측 상단 **[공유]** 버튼을 눌러 공유 상태가 **`제한됨`**으로 유지되어 있는지 확인합니다. (절대 공개하지 마세요)
6. 브라우저 주소창의 URL에서 **스프레드시트 ID**를 복사해 둡니다.
   - 예: `https://docs.google.com/spreadsheets/d/`**`1AbCdEfGhIjKlMnOpQrStUvWxYz...`**`/edit` 중 굵은 글씨 부분

---

### [2단계] Google Apps Script 백엔드 API 설정 및 배포

1. [Google Apps Script 대시보드](https://script.google.com)에 접속하여 **[새 프로젝트]**를 클릭합니다.
2. 프로젝트 제목을 `SCENT_LAB_Backend`로 변경합니다.
3. 에디터 좌측의 `Code.gs` 파일을 열고, 기존 코드를 모두 지운 뒤 본 저장소의 **[`Code.gs`](file:///c:/OGH/CODING/HumanAi/Code.gs)** 내용을 그대로 복사하여 붙여넣습니다.
4. 좌측 메뉴에서 **프로젝트 설정(톱니바퀴 아이콘)**으로 이동합니다.
5. 페이지 하단의 **[스크립트 속성(Script Properties)]** 섹션에서 **[스크립트 속성 추가]**를 클릭하고 다음 5개 항목을 등록합니다:

| 속성(Property) | 값(Value) | 설명 |
|:---|:---|:---|
| `SPREADSHEET_ID` | *[1단계에서 복사한 시트 ID]* | 비공개 데이터 저장소 식별자 |
| `SHEET_NAME` | `Responses` | 데이터가 기록될 탭 이름 |
| `SURVEY_OPEN` | `true` | 설문 접수 허용 여부 (`true`/`false`) |
| `MIN_PUBLIC_N` | `5` | 통계 집계 공개 최소 응답 수 (기본: 5건) |
| `MAX_RESPONSES` | `2000` | 운영 안전을 위한 최대 접수 한도 |

6. 상단 **[배포(Deploy)] > [새 배포(New deployment)]**를 클릭합니다.
7. 유형 선택(톱니바퀴)에서 **[웹 앱(Web app)]**을 선택하고 다음 설정을 입력합니다:
   - **설명**: `SCENT LAB v1.0`
   - **다음 사용자로 실행(Execute as)**: **`나(Me / 배포자 계정)`**
   - **액세스 권한이 있는 사용자(Who has access)**: **`모든 사용자(Anyone)`** *(로그인 없는 익명 접근 허용)*
8. **[배포]**를 클릭하고, Google 계정 권한 승인 창이 뜨면 승인합니다.
9. 배포 완료 후 발급되는 **웹 앱 URL (`https://script.google.com/macros/s/.../exec`)**을 복사합니다.

---

### [3단계] GitHub Pages 웹 프런트엔드 연결 및 활성화

1. 로컬 프로젝트의 **[`app.js`](file:///c:/OGH/CODING/HumanAi/app.js)** 파일을 엽니다.
2. 최상단의 `GAS_API_URL` 상수에 [2단계]에서 복사한 웹 앱 URL을 붙여넣고 저장합니다:
   ```javascript
   const GAS_API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
3. 코드를 GitHub 저장소에 커밋 및 푸시합니다:
   ```bash
   git add app.js
   git commit -m "chore: connect Google Apps Script Web App URL"
   git push origin main
   ```
4. GitHub 저장소 페이지의 **Settings > Pages** 메뉴로 이동합니다.
5. **Build and deployment > Source**에서 **`Deploy from a branch`**를 선택하고, 브랜치를 **`main` / `root`**로 지정한 후 **[Save]**를 클릭합니다.
6. 약 1~2분 후 다음과 같은 공식 무료 배포 주소가 생성됩니다:
   ```text
   https://[사용자명].github.io/[저장소명]/
   ```

---

### [4단계] 정상 작동 검증 및 테스트

1. 웹 브라우저를 **시크릿 모드(로그아웃 상태)**로 열고 발급된 GitHub Pages 주소로 접속합니다.
2. Google 로그인 요구 없이 설문 첫 화면이 바로 열리는지 확인합니다.
3. **분기 테스트**:
   - Q2에서 `0회`를 선택하면 Q3가 건너뛰어지고 바로 Q4로 이동하는지 확인합니다.
   - 설문 제출 후 Google Sheet `Responses` 탭에 한 줄이 저장되고, C열(q3)이 **빈 칸**으로 남는지 확인합니다.
4. **통계 공개 테스트**:
   - 총 응답이 5건 미만일 때는 "최소 5건부터 집계 공개" 안내가 표시되는지 확인합니다.
   - 5건 이상 제출되면 Q6, Q8 강조 차트 및 전체 문항별 CSS 막대 그래프가 표시되는지 확인합니다.

---

## 🔒 4. 보안 및 익명성 보장 원칙

1. **식별 정보 0개 수집**:
   - 이름, 이메일, 전화번호는 물론 접속 IP, 브라우저 지문, User-Agent, 쿠키, 위치 정보를 일체 수집하거나 저장하지 않습니다.
2. **CORS 프리플라이트 차단 회피**:
   - 브라우저가 Google Apps Script와 통신할 때 불필요한 `OPTIONS` preflight 요청으로 차단되는 문제를 방지하기 위해 `text/plain` 페이로드로 전송하여 안정적인 양방향 통신을 보장합니다.
3. **엄격한 화이트리스트 및 수식 주입 방어**:
   - 클라이언트에서 조작된 데이터나 엑셀 수식 주입(`=`, `+`, `-`, `@`) 시도를 서버 사이드에서 원천 차단합니다.
4. **동시성 잠금 (Race Condition 방지)**:
   - `LockService.tryLock(10000)`을 적용하여 다수의 참여자가 동시에 제출하더라도 데이터 유실이나 덮어쓰기 없이 순차적으로 저장됩니다.
5. **스프레드시트 비공개 격리**:
   - 참여자의 브라우저에는 오직 통계 집계 숫자만 전달되며, 스프레드시트 원본 링크나 개별 응답자 행은 절대 노출되지 않습니다.

---

## 🛑 5. 설문 종료 및 데이터 백업/폐기 절차

조사 기간이 종료되면 아래 순서에 따라 안전하게 마감하고 백업을 진행합니다.

1. **설문 접수 즉시 차단**:
   - Google Apps Script의 **프로젝트 설정 > 스크립트 속성**에서 `SURVEY_OPEN` 값을 **`false`**로 변경합니다.
   - 이제 웹페이지에서 설문 제출 시도시 "설문 조사가 종료되었습니다" 안내와 함께 서버에서 저장이 거절됩니다.
2. **데이터 백업 (CSV 추출)**:
   - Google 스프레드시트 `SCENT_LAB_Responses`를 열고 **파일 > 다운로드 > 쉼표로 구분된 값(.csv)**을 선택하여 연구 분석용 데이터를 안전하게 로컬로 내려받습니다.
3. **배포 중단 및 삭제**:
   - Apps Script의 **[배포 관리]** 메뉴에서 웹 앱 배포를 [보관] 또는 [삭제] 처리합니다.
   - 더 이상 조사를 진행하지 않는다면 스프레드시트와 스크립트를 휴지통으로 이동하여 완전히 폐기합니다.

---

## 🧪 6. 자동화 단위 테스트 실행

본 프로젝트는 핵심 검증 및 통계 집계 로직에 대해 100% TDD(Test-Driven Development)로 검증되었습니다. 로컬 환경에서 언제든지 다음 명령어로 자동화 테스트를 실행할 수 있습니다:

```bash
node tests/run-tests.js
```

---

## 📄 7. 라이선스

본 프로젝트는 오픈소스 연구 목적으로 자유롭게 수정 및 배포가 가능합니다.
