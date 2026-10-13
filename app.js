/**
 * SCENT LAB — 익명 향수 인식 조사 클라이언트 애플리케이션
 * Single Source of Truth: PLAN.md
 */

// ==========================================================================
// 1. 설정 및 상수
// ==========================================================================

/**
 * Google Apps Script Web App 배포 URL
 * 운영자가 Google Apps Script에서 '새 배포(웹 앱)'를 완료한 후 발급받은 /exec URL을 여기에 입력합니다.
 * 빈 문자열('')인 경우 로컬 테스트 및 시연용 데모 모드로 안전하게 작동합니다.
 */
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwW7beKuroIqoC6iOtAqykMB6ffdlaXduZoGYSB0GMrBYw9YVvwGuaK9vawtmDiDYAS/exec';

/**
 * 향 설명 원문 상수 (A, B, C 정본 - 임의 수정 금지)
 */
const SCENT_DESCRIPTIONS = {
  a: {
    title: '설명 A',
    type: '전문 용어 / 노트 기반',
    text: '알데하이드 탑 노트와 오크모스, 일랑일랑이 어우러지며, 베이스의 애니멀릭한 머스크로 마무리되는 향'
  },
  b: {
    title: '설명 B',
    type: '감성적 / 추상적 묘사',
    text: '햇살이 쏟아지는 주말 아침, 새하얀 침구 위에서 뒹굴 때 느껴지는 나른하고 포근한 분위기의 향'
  },
  c: {
    title: '설명 C',
    type: '경험 / 비유 기반',
    text: '햇볕에 바싹 말린 깨끗한 면 티셔츠에서 나는 뽀송뽀송한 섬유유연제 냄새'
  }
};

/**
 * 설문 문항 및 선택지 표시 라벨 매핑 (집계 차트 렌더링용)
 */
const QUESTION_LABELS = {
  q1: {
    title: 'Q1. 평소 향수 관심도/빈도',
    options: {
      beginner: '입문자 (거의 미사용/관심 시작)',
      general: '일반 (가끔 사용/유명 향수 위주)',
      experienced: '유경험자 (자주 사용/다양한 노트 인지)'
    }
  },
  q2: {
    title: 'Q2. 블라인드 구매 횟수',
    options: {
      '0': '0회 (경험 없음)',
      '1': '1회',
      '2': '2회',
      '3': '3회',
      '4': '4회',
      '5': '5회',
      '6_10': '6~10회',
      '11_plus': '11회 이상'
    }
  },
  q3: {
    title: 'Q3. 최근 블라인드 구매 만족도',
    isScale: true,
    options: {
      '1': '1점 (매우 불만족)',
      '2': '2점 (불만족)',
      '3': '3점 (보통)',
      '4': '4점 (만족)',
      '5': '5점 (매우 만족)'
    }
  },
  q4: {
    title: 'Q4. 전문 설명(A) 상상 선명도',
    isScale: true,
    options: {
      '1': '1점 (전혀 상상 안 됨)',
      '2': '2점 (잘 안 됨)',
      '3': '3점 (보통)',
      '4': '4점 (어느 정도 상상됨)',
      '5': '5점 (매우 선명)'
    }
  },
  q5: {
    title: 'Q5. 전문 설명 상상 시 의존 정보',
    options: {
      ingredient_knowledge: '개별 향료에 대한 사전 지식',
      word_impression: '단어 어감이나 분위기',
      past_smell_memory: '과거에 맡아본 비슷한 향의 기억',
      cannot_imagine: '향이 거의 상상되지 않음'
    }
  },
  q6: {
    title: 'Q6. 상상하기 가장 쉬웠던 설명',
    options: {
      a: '설명 A (전문 용어/노트 기반)',
      b: '설명 B (감성적/추상적 묘사)',
      c: '설명 C (경험/비유 기반)'
    }
  },
  q7: {
    title: 'Q7. 평소 향 상상 방식',
    options: {
      combine_notes: '탑/미들/베이스 향료 조합',
      imagine_mood: '설명이 주는 이미지나 분위기',
      match_memory: '과거 경험한 공간/사물 냄새와 연결'
    }
  },
  q8: {
    title: 'Q8. 구매 시 가장 도움 되는 설명',
    options: {
      professional: '전문적인 향조 구조 제공',
      emotional: '감성적인 분위기와 스토리 제공',
      everyday: '일상적이고 직관적인 비유 제공'
    }
  },
  q9: {
    title: 'Q9. 기존 감성 묘사 신뢰도',
    isScale: true,
    options: {
      '1': '1점 (전혀 신뢰 안 함)',
      '2': '2점 (신뢰 안 함)',
      '3': '3점 (보통)',
      '4': '4점 (신뢰함)',
      '5': '5점 (매우 신뢰함)'
    }
  }
};

// ==========================================================================
// 2. 상태 관리 (State)
// ==========================================================================

const state = {
  currentSection: 1, // 1 to 5
  answers: {
    q1: null,
    q2: null,
    q3: null, // Q2=0이면 null 고정
    q4: null,
    q5: null,
    q6: null,
    q7: null,
    q8: null,
    q9: null
  },
  isSubmitting: false
};

// ==========================================================================
// 3. DOM 요소 캐시
// ==========================================================================

const elements = {
  // Views
  views: {
    landing: document.getElementById('view-landing'),
    survey: document.getElementById('view-survey'),
    submitting: document.getElementById('view-submitting'),
    success: document.getElementById('view-success'),
    closed: document.getElementById('view-closed'),
    error: document.getElementById('view-error')
  },

  // Buttons & Controls
  btnStart: document.getElementById('btn-start-survey'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnSubmit: document.getElementById('btn-submit'),
  btnRetry: document.getElementById('btn-retry'),
  
  // Progress
  progressLabel: document.getElementById('progress-label'),
  progressStageName: document.getElementById('progress-stage-name'),
  progressPercent: document.getElementById('progress-percent'),
  progressFill: document.getElementById('progress-fill'),
  progressbar: document.getElementById('survey-progressbar'),

  // Sections
  sections: [
    document.getElementById('sec-1'),
    document.getElementById('sec-2'),
    document.getElementById('sec-3'),
    document.getElementById('sec-4'),
    document.getElementById('sec-5')
  ],

  // Reference Panel
  refAccordionBtn: document.getElementById('ref-accordion-btn'),
  refContent: document.getElementById('ref-content'),
  refIntroText: document.getElementById('ref-intro-text'),

  // Validation
  validationAlert: document.getElementById('validation-alert'),
  validationErrorText: document.getElementById('validation-error-text'),

  // Stats
  statsTotalBadge: document.getElementById('stats-total-badge'),
  statsInsufficient: document.getElementById('stats-insufficient'),
  statsInsufficientMsg: document.getElementById('stats-insufficient-msg'),
  statsReady: document.getElementById('stats-ready'),
  chartBarsQ6: document.getElementById('chart-bars-q6'),
  chartBarsQ8: document.getElementById('chart-bars-q8'),
  toggleAllStatsBtn: document.getElementById('toggle-all-stats-btn'),
  allStatsWrapper: document.getElementById('all-stats-wrapper'),
  allStatsIcon: document.getElementById('all-stats-icon'),
  meanBadgeQ3: document.getElementById('mean-badge-q3'),
  meanBadgeQ4: document.getElementById('mean-badge-q4'),
  meanBadgeQ9: document.getElementById('mean-badge-q9'),
  q3HiddenNotice: document.getElementById('q3-hidden-notice'),
  errorMsgText: document.getElementById('error-msg-text')
};

// ==========================================================================
// 4. 화면 전환 및 초기화 함수
// ==========================================================================

function switchView(viewName) {
  Object.keys(elements.views).forEach(name => {
    const el = elements.views[name];
    if (el) {
      if (name === viewName) {
        el.classList.add('active');
        el.style.display = 'block';
      } else {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initApp() {
  bindRadioEvents();
  bindNavigationEvents();
  bindComparisonCardEvents();
  initMobileReferencePanel();
  updateProgress();
}

function initMobileReferencePanel() {
  if (elements.refContent && elements.refAccordionBtn) {
    elements.refAccordionBtn.setAttribute('aria-expanded', 'true');
    elements.refContent.style.display = 'block';
  }
}


// 라디오 버튼 선택 이벤트 바인딩
function bindRadioEvents() {
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  radioInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const name = e.target.name;
      const value = e.target.value;

      // 1~5 정수형 문항(Q3, Q4, Q9)은 숫자로 변환
      if (['q3', 'q4', 'q9'].includes(name)) {
        state.answers[name] = parseInt(value, 10);
      } else {
        state.answers[name] = value;
      }

      // Q2 변경에 따른 조건부 분기 실시간 처리
      if (name === 'q2') {
        if (value === '0') {
          // Q2=0이면 Q3 선택 초기화
          state.answers.q3 = null;
          const q3Radios = document.querySelectorAll('input[name="q3"]');
          q3Radios.forEach(r => {
            r.checked = false;
            r.closest('.scale-btn-label')?.classList.remove('checked');
          });
        }
      }

      // 선택된 라벨 스타일 갱신
      updateRadioVisuals(name);
      hideValidationError();
      updateProgress();
    });
  });
}

function updateRadioVisuals(questionName) {
  const radios = document.querySelectorAll(`input[name="${questionName}"]`);
  radios.forEach(radio => {
    const parentLabel = radio.closest('label');
    if (parentLabel) {
      if (radio.checked) {
        parentLabel.classList.add('checked');
      } else {
        parentLabel.classList.remove('checked');
      }
    }
  });

  // Q6 선택 시 상단 3개 향 비교 카드 활성 상태 동기화 및 부드러운 스크롤
  if (questionName === 'q6') {
    const compareCards = document.querySelectorAll('.compare-mini-card');
    const selectedVal = state.answers.q6;
    const scentKeys = ['a', 'b', 'c'];
    compareCards.forEach((card, idx) => {
      if (scentKeys[idx] === selectedVal) {
        card.classList.add('selected');
        if (window.innerWidth <= 820) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } else {
        card.classList.remove('selected');
      }
    });
  }
}

// 상단 비교 카드 클릭 및 키보드(Enter/Space) 조작 시 Q6 선택 연동
function bindComparisonCardEvents() {
  const compareCards = document.querySelectorAll('.compare-mini-card');
  const scentKeys = ['a', 'b', 'c'];
  compareCards.forEach((card, idx) => {
    card.style.cursor = 'pointer';
    
    const triggerSelect = () => {
      const key = scentKeys[idx];
      const radio = document.getElementById(`q6_${key}`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    card.addEventListener('click', triggerSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerSelect();
      }
    });
  });
}

// ==========================================================================
// 5. 설문 섹션 이동 및 검증 로직
// ==========================================================================

function bindNavigationEvents() {
  // 시작 버튼
  elements.btnStart?.addEventListener('click', () => {
    switchView('survey');
    goToSection(1);
  });

  // 다음 버튼
  elements.btnNext?.addEventListener('click', () => {
    handleNext();
  });

  // 이전 버튼
  elements.btnPrev?.addEventListener('click', () => {
    handlePrev();
  });

  // 제출 버튼
  elements.btnSubmit?.addEventListener('click', () => {
    handleSubmit();
  });

  // 오류 화면 다시 시도
  elements.btnRetry?.addEventListener('click', () => {
    switchView('survey');
  });

  // 참고자료 아코디언 토글 (모바일 및 데스크톱)
  elements.refAccordionBtn?.addEventListener('click', () => {
    const isExpanded = elements.refAccordionBtn.getAttribute('aria-expanded') === 'true';
    const nextState = !isExpanded;
    elements.refAccordionBtn.setAttribute('aria-expanded', String(nextState));
    if (elements.refContent) {
      elements.refContent.style.display = nextState ? 'block' : 'none';
    }
  });

  // 전체 통계 토글 아코디언
  elements.toggleAllStatsBtn?.addEventListener('click', () => {
    const isExpanded = elements.toggleAllStatsBtn.getAttribute('aria-expanded') === 'true';
    elements.toggleAllStatsBtn.setAttribute('aria-expanded', !isExpanded);
    elements.allStatsWrapper.style.display = isExpanded ? 'none' : 'grid';
    elements.allStatsIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
  });

  // 다크 / 라이트 모드 전환 및 저장
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    try {
      localStorage.setItem('scent-theme', theme);
    } catch (e) {}
  }

  const savedTheme = (function() {
    try {
      return localStorage.getItem('scent-theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (e) {
      return 'light';
    }
  })();
  applyTheme(savedTheme);

  themeBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });


}

function goToSection(sectionNumber) {
  state.currentSection = sectionNumber;

  // 모든 섹션 숨김 후 대상 섹션만 활성화
  elements.sections.forEach((sec, idx) => {
    if (idx + 1 === sectionNumber) {
      sec.classList.add('active');
      sec.style.display = 'block';
    } else {
      sec.classList.remove('active');
      sec.style.display = 'none';
    }
  });

  // 버튼 상태 제어
  if (sectionNumber === 1) {
    elements.btnPrev.style.display = 'none';
  } else {
    elements.btnPrev.style.display = 'inline-block';
  }

  if (sectionNumber === 5) {
    elements.btnNext.style.display = 'none';
    elements.btnSubmit.style.display = 'inline-block';
  } else {
    elements.btnNext.style.display = 'inline-block';
    elements.btnSubmit.style.display = 'none';
  }

  // 참고자료 패널 안내 문구 업데이트
  updateReferencePanelHints(sectionNumber);

  hideValidationError();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateReferencePanelHints(sectionNumber) {
  if (sectionNumber === 1 || sectionNumber === 2) {
    elements.refIntroText.textContent = '용어 참고: 블라인드 구매란 향수를 직접 시향하지 않고, 온라인 설명이나 후기만을 보고 주문하는 것을 의미합니다.';
  } else {
    elements.refIntroText.textContent = '다음은 향수를 표현하는 세 가지 설명 방식입니다. 각 설명을 읽고 실제로 어떤 향이 날지 상상해 본 뒤 질문에 답변해 주세요.';
  }
}

function validateCurrentSection() {
  const current = state.currentSection;

  if (current === 1) {
    if (!state.answers.q1) {
      showValidationError('Q1 문항에 답변해 주세요.');
      return false;
    }
    if (state.answers.q2 === null || state.answers.q2 === undefined) {
      showValidationError('Q2 문항에 답변해 주세요.');
      return false;
    }
  } else if (current === 2) {
    // Q2가 0이 아닌 경우에만 섹션 2로 진입하므로 Q3 필수
    if (state.answers.q3 === null || state.answers.q3 === undefined) {
      showValidationError('Q3 문항(최근 블라인드 구매 만족도)에 답변해 주세요.');
      return false;
    }
  } else if (current === 3) {
    if (state.answers.q4 === null || state.answers.q4 === undefined) {
      showValidationError('Q4 문항([설명 A] 상상 선명도)에 답변해 주세요.');
      return false;
    }
    if (!state.answers.q5) {
      showValidationError('Q5 문항(정보 의존 방식)에 답변해 주세요.');
      return false;
    }
  } else if (current === 4) {
    if (!state.answers.q6) {
      showValidationError('Q6 문항(가장 상상하기 쉬웠던 설명)에 답변해 주세요.');
      return false;
    }
    if (!state.answers.q7) {
      showValidationError('Q7 문항(평소 향 상상 방식)에 답변해 주세요.');
      return false;
    }
  } else if (current === 5) {
    if (!state.answers.q8) {
      showValidationError('Q8 문항(가장 도움이 되는 설명 방식)에 답변해 주세요.');
      return false;
    }
    if (state.answers.q9 === null || state.answers.q9 === undefined) {
      showValidationError('Q9 문항(감성적 설명 신뢰도)에 답변해 주세요.');
      return false;
    }
  }

  hideValidationError();
  return true;
}

function handleNext() {
  if (!validateCurrentSection()) return;

  const current = state.currentSection;

  // 조건부 분기 처리 (Q2 = 0)
  if (current === 1) {
    if (state.answers.q2 === '0') {
      // Q2=0이면 Q3(섹션 2)를 건너뛰고 섹션 3으로 직행
      state.answers.q3 = null;
      goToSection(3);
      return;
    } else {
      goToSection(2);
      return;
    }
  }

  if (current === 2) {
    goToSection(3);
    return;
  }

  if (current === 3) {
    goToSection(4);
    return;
  }

  if (current === 4) {
    goToSection(5);
    return;
  }
}

function handlePrev() {
  const current = state.currentSection;

  if (current === 3) {
    if (state.answers.q2 === '0') {
      // Q2=0이었던 경우 섹션 2를 건너뛰고 섹션 1로 복귀
      goToSection(1);
      return;
    } else {
      goToSection(2);
      return;
    }
  }

  if (current > 1) {
    goToSection(current - 1);
  }
}

function showValidationError(msg) {
  elements.validationErrorText.textContent = msg;
  elements.validationAlert.classList.add('active');
  elements.validationAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideValidationError() {
  elements.validationAlert.classList.remove('active');
}

function updateProgress() {
  // 실제 활성 문항 수 계산 (Q2=0이면 총 8문항, Q2≠0이면 총 9문항)
  const isQ3Skipped = state.answers.q2 === '0';
  const totalQuestions = isQ3Skipped ? 8 : 9;

  let answeredCount = 0;
  if (state.answers.q1) answeredCount++;
  if (state.answers.q2 !== null) answeredCount++;
  if (!isQ3Skipped && state.answers.q3 !== null) answeredCount++;
  if (state.answers.q4 !== null) answeredCount++;
  if (state.answers.q5) answeredCount++;
  if (state.answers.q6) answeredCount++;
  if (state.answers.q7) answeredCount++;
  if (state.answers.q8) answeredCount++;
  if (state.answers.q9 !== null) answeredCount++;

  const pct = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));

  elements.progressPercent.textContent = `${pct}%`;
  elements.progressFill.style.width = `${pct}%`;
  elements.progressbar.setAttribute('aria-valuenow', pct);

  // 단계 라벨 업데이트
  const currentStep = state.currentSection;
  const totalSteps = isQ3Skipped ? 4 : 5;
  elements.progressLabel.textContent = `진행 상황: ${currentStep}단계 / ${totalSteps}단계`;

  const stageNames = {
    1: '참여자 기본 프로파일',
    2: '블라인드 구매 만족도',
    3: '후각적 상상도 평가',
    4: '설명 텍스트 선호도',
    5: '구매 신뢰도 및 마무리'
  };
  if (elements.progressStageName) {
    elements.progressStageName.textContent = stageNames[currentStep] || '';
  }
}

// ==========================================================================
// 6. 응답 제출 및 API 통신 (CORS 대응)
// ==========================================================================

async function handleSubmit() {
  if (state.isSubmitting) return;
  if (!validateCurrentSection()) return;

  // 전체 필수 입력 최종 검증
  const payload = {
    q1: state.answers.q1,
    q2: String(state.answers.q2),
    q3: state.answers.q2 === '0' ? null : Number(state.answers.q3),
    q4: Number(state.answers.q4),
    q5: state.answers.q5,
    q6: state.answers.q6,
    q7: state.answers.q7,
    q8: state.answers.q8,
    q9: Number(state.answers.q9)
  };

  state.isSubmitting = true;
  elements.btnSubmit.disabled = true;
  switchView('submitting');

  try {
    let result;

    if (GAS_API_URL && GAS_API_URL.trim() !== '') {
      // 1) 실제 Google Apps Script API 전송 모드
      // 브라우저의 OPTIONS preflight 차단을 피하기 위해 text/plain으로 JSON 전송
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      result = await response.json();
    } else {
      // 2) 데모 / 로컬 프리뷰 시연 모드 (GAS_API_URL 미설정 시)
      console.warn('⚠️ [SCENT LAB] GAS_API_URL이 설정되지 않아 로컬 데모 모드로 작동합니다.');
      await new Promise(resolve => setTimeout(resolve, 800)); // 자연스러운 지연 시뮬레이션
      result = getDemoSimulationResult(payload);
    }

    if (result && result.saved) {
      renderStats(result);
      switchView('success');
    } else {
      throw new Error(result ? result.message : '저장에 실패했습니다.');
    }

  } catch (err) {
    console.error('Submission error:', err);
    elements.errorMsgText.textContent = '응답을 서버에 저장하는 중 오류가 발생했습니다. 네트워크 상태를 확인하시거나 잠시 후 다시 시도해 주세요.';
    switchView('error');
  } finally {
    state.isSubmitting = false;
    elements.btnSubmit.disabled = false;
  }
}

// GAS_API_URL 미설정 시 UI 점검을 위한 데모 집계 생성기
function getDemoSimulationResult(currentPayload) {
  return {
    saved: true,
    totalResponses: 18,
    statsVisibility: 'ready',
    stats: {
      q1: { validN: 18, counts: { beginner: 5, general: 9, experienced: 4 }, percents: { beginner: 27.8, general: 50.0, experienced: 22.2 } },
      q2: { validN: 18, counts: { '0': 4, '1': 3, '2': 4, '3': 3, '4': 2, '5': 1, '6_10': 1, '11_plus': 0 }, percents: { '0': 22.2, '1': 16.7, '2': 22.2, '3': 16.7, '4': 11.1, '5': 5.6, '6_10': 5.6, '11_plus': 0 } },
      q3: { validN: 14, counts: { '1': 1, '2': 2, '3': 4, '4': 5, '5': 2 }, percents: { '1': 7.1, '2': 14.3, '3': 28.6, '4': 35.7, '5': 14.3 }, mean: 3.36, visible: true },
      q4: { validN: 18, counts: { '1': 3, '2': 5, '3': 6, '4': 3, '5': 1 }, percents: { '1': 16.7, '2': 27.8, '3': 33.3, '4': 16.7, '5': 5.6 }, mean: 2.67 },
      q5: { validN: 18, counts: { ingredient_knowledge: 2, word_impression: 9, past_smell_memory: 5, cannot_imagine: 2 }, percents: { ingredient_knowledge: 11.1, word_impression: 50.0, past_smell_memory: 27.8, cannot_imagine: 11.1 } },
      q6: { validN: 18, counts: { a: 2, b: 6, c: 10 }, percents: { a: 11.1, b: 33.3, c: 55.6 } },
      q7: { validN: 18, counts: { combine_notes: 3, imagine_mood: 7, match_memory: 8 }, percents: { combine_notes: 16.7, imagine_mood: 38.9, match_memory: 44.4 } },
      q8: { validN: 18, counts: { professional: 3, emotional: 4, everyday: 11 }, percents: { professional: 16.7, emotional: 22.2, everyday: 61.1 } },
      q9: { validN: 18, counts: { '1': 2, '2': 7, '3': 6, '4': 3, '5': 0 }, percents: { '1': 11.1, '2': 38.9, '3': 33.3, '4': 16.7, '5': 0 }, mean: 2.56 }
    }
  };
}

// ==========================================================================
// 7. 통계 결과 시각화 렌더러 (순수 CSS 막대 그래프)
// ==========================================================================

function renderStats(result) {
  const total = result.totalResponses || 0;
  elements.statsTotalBadge.textContent = `총 접수: ${total}건`;

  // 1) 표본 수 5건 미만인 경우
  if (result.statsVisibility === 'insufficient' || !result.stats) {
    elements.statsInsufficient.style.display = 'block';
    elements.statsReady.style.display = 'none';
    elements.statsInsufficientMsg.textContent = `현재 총 ${total}건이 접수되었습니다. (최소 5건부터 집계 공개)`;
    return;
  }

  // 2) 표본 수 5건 이상 준비 완료
  elements.statsInsufficient.style.display = 'none';
  elements.statsReady.style.display = 'block';

  const stats = result.stats;

  // Q6, Q8 상단 강조 렌더링
  renderChartBars(elements.chartBarsQ6, 'q6', stats.q6);
  renderChartBars(elements.chartBarsQ8, 'q8', stats.q8);

  // 나머지 문항 렌더링 (Q1, Q2, Q3, Q4, Q5, Q7, Q9)
  renderChartBars(document.getElementById('chart-bars-q1'), 'q1', stats.q1);
  renderChartBars(document.getElementById('chart-bars-q2'), 'q2', stats.q2);
  renderChartBars(document.getElementById('chart-bars-q4'), 'q4', stats.q4);
  renderChartBars(document.getElementById('chart-bars-q5'), 'q5', stats.q5);
  renderChartBars(document.getElementById('chart-bars-q7'), 'q7', stats.q7);
  renderChartBars(document.getElementById('chart-bars-q9'), 'q9', stats.q9);

  // 평균 점수 뱃지 표시
  if (stats.q4 && stats.q4.mean !== undefined) {
    elements.meanBadgeQ4.textContent = `평균 ${stats.q4.mean.toFixed(1)} / 5.0`;
  }
  if (stats.q9 && stats.q9.mean !== undefined) {
    elements.meanBadgeQ9.textContent = `평균 ${stats.q9.mean.toFixed(1)} / 5.0`;
  }

  // Q3 조건부 문항 처리
  const q3Container = document.getElementById('chart-bars-q3');
  if (stats.q3 && stats.q3.visible !== false) {
    elements.q3HiddenNotice.style.display = 'none';
    q3Container.style.display = 'flex';
    elements.meanBadgeQ3.style.display = 'inline-block';
    elements.meanBadgeQ3.textContent = `평균 ${stats.q3.mean ? stats.q3.mean.toFixed(1) : '-'} / 5.0`;
    renderChartBars(q3Container, 'q3', stats.q3);
  } else {
    // Q3 유효 응답 5건 미만인 경우
    q3Container.style.display = 'none';
    elements.meanBadgeQ3.style.display = 'none';
    elements.q3HiddenNotice.style.display = 'block';
  }
}

/**
 * 특정 질문에 대한 CSS 가로 막대 그래프 생성
 */
function renderChartBars(container, qKey, qStat) {
  if (!container || !qStat) return;
  container.innerHTML = '';

  const meta = QUESTION_LABELS[qKey];
  if (!meta || !meta.options) return;

  const validN = qStat.validN || 0;

  Object.keys(meta.options).forEach(optKey => {
    const labelText = meta.options[optKey];
    const count = qStat.counts ? (qStat.counts[optKey] || 0) : 0;
    const pct = qStat.percents ? (qStat.percents[optKey] || 0) : 0;

    const itemEl = document.createElement('div');
    itemEl.className = 'chart-bar-item';

    itemEl.innerHTML = `
      <div class="bar-label-line">
        <span class="bar-label-name" title="${escapeHtml(labelText)}">${escapeHtml(labelText)}</span>
        <span class="bar-val-text">${pct}% (${count}명)</span>
      </div>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" style="width: 0%;" data-pct="${pct}"></div>
      </div>
    `;

    container.appendChild(itemEl);
  });

  // 애니메이션 효과로 width 채우기
  setTimeout(() => {
    const fills = container.querySelectorAll('.bar-fill');
    fills.forEach(f => {
      const targetPct = f.getAttribute('data-pct');
      f.style.width = `${targetPct}%`;
    });
  }, 50);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// DOM 콘텐츠 로드 완료 시 애플리케이션 시작
document.addEventListener('DOMContentLoaded', initApp);
