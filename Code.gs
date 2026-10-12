/**
 * SCENT LAB — 익명 향수 인식 조사 웹앱 백엔드 (Google Apps Script)
 * 
 * GitHub Pages 연동(doPost / CORS) 및 Apps Script 자체 호스팅(doGet) 하이브리드 지원
 * Single Source of Truth: PLAN.md
 */

// 허용된 응답 코드 및 정수 범위 상수 (화이트리스트)
const ALLOWED_VALUES = {
  q1: ['beginner', 'general', 'experienced'],
  q2: ['0', '1', '2', '3', '4', '5', '6_10', '11_plus'],
  q3: [1, 2, 3, 4, 5],
  q4: [1, 2, 3, 4, 5],
  q5: ['ingredient_knowledge', 'word_impression', 'past_smell_memory', 'cannot_imagine'],
  q6: ['a', 'b', 'c'],
  q7: ['combine_notes', 'imagine_mood', 'match_memory'],
  q8: ['professional', 'emotional', 'everyday'],
  q9: [1, 2, 3, 4, 5]
};

const ALLOWED_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'];

/**
 * 1. GET 요청 핸들러 (doGet)
 * - GitHub Pages 연동 시: 상태 확인 및 통계 조회 API로 동작 (?action=stats 등)
 * - Apps Script 단독 호스팅 시: Index.html 웹페이지 렌더링
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : null;
    
    // API 상태 및 통계 확인 모드
    if (action === 'status' || action === 'stats') {
      const config = getConfig_();
      const sheet = getSheet_(config);
      const rows = sheet.getLastRow() > 1 
        ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues() 
        : [];
      const aggregated = aggregateResponses_(rows, config.MIN_PUBLIC_N);
      
      const responseData = {
        status: config.SURVEY_OPEN ? 'OPEN' : 'CLOSED',
        totalResponses: aggregated.totalResponses,
        statsVisibility: aggregated.statsVisibility,
        stats: aggregated.stats
      };
      
      return ContentService.createTextOutput(JSON.stringify(responseData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 기본 모드: HTML Service 템플릿 렌더링 (Apps Script 자체 호스팅 시)
    const template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle('SCENT LAB — 당신은 향을 어떻게 상상하나요?')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: 'SERVER_ERROR',
      message: '요청을 처리하는 중 오류가 발생했습니다.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. POST 요청 핸들러 (doPost)
 * GitHub Pages(또는 외부 클라이언트)에서 fetch()로 전송된 설문 응답을 처리
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    // 동시 제출 경합 방지 (최대 10초 대기)
    const hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return jsonResponse_({
        saved: false,
        error: 'BUSY',
        message: '서버 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
      });
    }

    // 요청 페이로드 파싱
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse_({
          saved: false,
          error: 'INVALID_JSON',
          message: '유효하지 않은 요청 데이터 형식입니다.'
        });
      }
    } else {
      return jsonResponse_({
        saved: false,
        error: 'EMPTY_PAYLOAD',
        message: '전송된 데이터가 없습니다.'
      });
    }

    // 서버 사이드 유효성 검사 (화이트리스트 및 분기 규칙)
    const validation = validatePayload_(payload);
    if (!validation.valid) {
      return jsonResponse_({
        saved: false,
        error: 'VALIDATION_FAILED',
        message: '응답 데이터 검증에 실패했습니다.',
        details: validation.errors
      });
    }

    // 설정 확인 (설문 열림 여부 및 상한 건수)
    const config = getConfig_();
    if (!config.SURVEY_OPEN) {
      return jsonResponse_({
        saved: false,
        error: 'SURVEY_CLOSED',
        message: '설문 조사가 종료되었습니다. 참여해 주셔서 감사합니다.'
      });
    }

    const sheet = getSheet_(config);
    const lastRow = sheet.getLastRow();
    const currentResponses = Math.max(0, lastRow - 1); // 헤더 1행 제외

    if (currentResponses >= config.MAX_RESPONSES) {
      return jsonResponse_({
        saved: false,
        error: 'MAX_RESPONSES_REACHED',
        message: '최대 응답 수에 도달하여 접수가 마감되었습니다.'
      });
    }

    // 스프레드시트에 1행 저장 (Q1~Q9 순서 엄수)
    const rowData = toRow_(payload);
    sheet.appendRow(rowData);
    SpreadsheetApp.flush(); // 즉시 쓰기 강제

    // 통계 집계 산출 (방금 저장된 응답 포함)
    let aggregated = null;
    try {
      const allRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
      aggregated = aggregateResponses_(allRows, config.MIN_PUBLIC_N);
    } catch (aggErr) {
      // 저장은 성공했으나 집계 계산만 실패한 경우
      return jsonResponse_({
        saved: true,
        totalResponses: currentResponses + 1,
        statsVisibility: 'unavailable',
        stats: null,
        message: '응답이 정상 저장되었으나 통계 산출 중 일시적 오류가 발생했습니다.'
      });
    }

    return jsonResponse_({
      saved: true,
      totalResponses: aggregated.totalResponses,
      statsVisibility: aggregated.statsVisibility,
      stats: aggregated.stats
    });

  } catch (err) {
    return jsonResponse_({
      saved: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류로 인해 응답을 저장하지 못했습니다.'
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

/**
 * 3. Apps Script 단독 호스팅 시 클라이언트(Client.html)에서 호출하는 헬퍼 함수
 */
function submitSurvey(payload) {
  // doPost와 동일한 로직을 내부 객체로 직접 실행
  const mockEvent = {
    postData: {
      contents: JSON.stringify(payload)
    }
  };
  const responseOutput = doPost(mockEvent);
  return JSON.parse(responseOutput.getContent());
}

/**
 * 4. HTML Service 템플릿 포함 헬퍼 (Apps Script 자체 호스팅용)
 */
function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== 비공개 내부 헬퍼 함수 (이름 끝 '_' 붙임) ====================

/**
 * Script Properties 환경 설정 로드
 */
function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    SPREADSHEET_ID: props.getProperty('SPREADSHEET_ID') || '',
    SHEET_NAME: props.getProperty('SHEET_NAME') || 'Responses',
    SURVEY_OPEN: props.getProperty('SURVEY_OPEN') !== 'false', // 기본값 true
    MIN_PUBLIC_N: parseInt(props.getProperty('MIN_PUBLIC_N') || '5', 10),
    MAX_RESPONSES: parseInt(props.getProperty('MAX_RESPONSES') || '2000', 10)
  };
}

/**
 * 비공개 스프레드시트 탭 및 헤더 검증
 */
function getSheet_(config) {
  if (!config.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID 설정이 누락되었습니다.');
  }
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(config.SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`시트 탭 '${config.SHEET_NAME}'을(를) 찾을 수 없습니다.`);
  }

  // 1행 헤더가 비어 있으면 자동 생성
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ALLOWED_KEYS);
  }

  return sheet;
}

/**
 * 수식 주입(=, +, -, @) 방지 검사
 */
function isFormulaInjection_(val) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
      return true;
    }
  }
  return false;
}

/**
 * 페이로드 검증 (정본 문항 및 분기 규칙)
 */
function validatePayload_(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['유효하지 않은 데이터 구조입니다.'] };
  }

  // 허용되지 않은 추가 키 차단
  const keys = Object.keys(payload);
  const extraKeys = keys.filter(k => !ALLOWED_KEYS.includes(k));
  if (extraKeys.length > 0) {
    errors.push(`허용되지 않은 필드가 포함되어 있습니다: ${extraKeys.join(', ')}`);
  }

  // 필수 키 누락 확인
  for (const k of ALLOWED_KEYS) {
    if (!(k in payload)) {
      errors.push(`필수 문항 필드 누락: ${k}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors: errors };
  }

  // 수식 주입 체크
  for (const [k, val] of Object.entries(payload)) {
    if (isFormulaInjection_(val)) {
      errors.push(`금지된 특수문자가 포함되었습니다: ${k}`);
    }
  }

  // Q1
  if (!ALLOWED_VALUES.q1.includes(payload.q1)) {
    errors.push(`Q1 유효하지 않은 선택: ${payload.q1}`);
  }

  // Q2
  const q2Str = String(payload.q2);
  if (!ALLOWED_VALUES.q2.includes(q2Str)) {
    errors.push(`Q2 유효하지 않은 선택: ${payload.q2}`);
  }

  // Q3 분기 검증
  if (q2Str === '0') {
    if (payload.q3 !== null && payload.q3 !== '' && payload.q3 !== undefined) {
      errors.push('Q2가 0회인 경우 Q3은 반드시 null이어야 합니다.');
    }
  } else {
    const q3Num = Number(payload.q3);
    if (!Number.isInteger(q3Num) || !ALLOWED_VALUES.q3.includes(q3Num)) {
      errors.push(`Q3 유효하지 않은 선택: ${payload.q3}`);
    }
  }

  // Q4 (1~5 정수)
  const q4Num = Number(payload.q4);
  if (!Number.isInteger(q4Num) || !ALLOWED_VALUES.q4.includes(q4Num)) {
    errors.push(`Q4 유효하지 않은 선택: ${payload.q4}`);
  }

  // Q5
  if (!ALLOWED_VALUES.q5.includes(payload.q5)) {
    errors.push(`Q5 유효하지 않은 선택: ${payload.q5}`);
  }

  // Q6
  if (!ALLOWED_VALUES.q6.includes(payload.q6)) {
    errors.push(`Q6 유효하지 않은 선택: ${payload.q6}`);
  }

  // Q7
  if (!ALLOWED_VALUES.q7.includes(payload.q7)) {
    errors.push(`Q7 유효하지 않은 선택: ${payload.q7}`);
  }

  // Q8
  if (!ALLOWED_VALUES.q8.includes(payload.q8)) {
    errors.push(`Q8 유효하지 않은 선택: ${payload.q8}`);
  }

  // Q9 (1~5 정수)
  const q9Num = Number(payload.q9);
  if (!Number.isInteger(q9Num) || !ALLOWED_VALUES.q9.includes(q9Num)) {
    errors.push(`Q9 유효하지 않은 선택: ${payload.q9}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 페이로드를 Google Sheets 저장용 1행 배열로 변환
 */
function toRow_(payload) {
  return [
    String(payload.q1),
    String(payload.q2),
    (payload.q3 === null || payload.q3 === '' || payload.q3 === undefined) ? '' : Number(payload.q3),
    Number(payload.q4),
    String(payload.q5),
    String(payload.q6),
    String(payload.q7),
    String(payload.q8),
    Number(payload.q9)
  ];
}

/**
 * 응답 행 배열로부터 통계 집계 계산
 */
function aggregateResponses_(rows, minPublicN) {
  const total = rows ? rows.length : 0;
  if (total < minPublicN) {
    return {
      totalResponses: total,
      statsVisibility: 'insufficient',
      stats: null
    };
  }

  const stats = {};

  // 초기화
  for (const q of ALLOWED_KEYS) {
    stats[q] = {
      validN: 0,
      counts: {},
      percents: {},
      visible: true
    };
    for (const val of ALLOWED_VALUES[q]) {
      stats[q].counts[String(val)] = 0;
      stats[q].percents[String(val)] = 0;
    }
  }

  const scaleSums = { q3: 0, q4: 0, q9: 0 };

  for (const row of rows) {
    ALLOWED_KEYS.forEach((q, idx) => {
      const val = row[idx];
      if (val !== undefined && val !== null && val !== '') {
        const valStr = String(val);
        if (stats[q].counts[valStr] !== undefined) {
          stats[q].counts[valStr]++;
          stats[q].validN++;
          if (q in scaleSums) {
            scaleSums[q] += Number(val);
          }
        }
      }
    });
  }

  // 백분율 및 평균 산출
  for (const q of ALLOWED_KEYS) {
    const validN = stats[q].validN;
    if (validN > 0) {
      for (const val of ALLOWED_VALUES[q]) {
        const valStr = String(val);
        const count = stats[q].counts[valStr];
        stats[q].percents[valStr] = Math.round((count / validN) * 1000) / 10;
      }
    }

    if (q in scaleSums) {
      stats[q].mean = validN > 0 ? Math.round((scaleSums[q] / validN) * 100) / 100 : 0;
    }
  }

  // Q3 조건부 문항 임계값 검사 (5건 미만 시 Q3만 비공개)
  if (stats.q3.validN < minPublicN) {
    stats.q3.visible = false;
    stats.q3.counts = {};
    stats.q3.percents = {};
    delete stats.q3.mean;
  }

  return {
    totalResponses: total,
    statsVisibility: 'ready',
    stats: stats
  };
}

/**
 * JSON 반환 헬퍼 (ContentService)
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
