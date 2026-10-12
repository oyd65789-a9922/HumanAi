// tests/core-logic.js
// Single Source of Truth for Survey Schema, Validation, and Aggregation

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

function isFormulaInjection(val) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
      return true;
    }
  }
  return false;
}

function validatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Invalid payload format: must be an object'] };
  }

  // 1. Strict key check: reject extra keys
  const keys = Object.keys(payload);
  const extraKeys = keys.filter(k => !ALLOWED_KEYS.includes(k));
  if (extraKeys.length > 0) {
    errors.push(`Payload contains unexpected keys: ${extraKeys.join(', ')}`);
  }

  // 2. Missing key check
  for (const k of ALLOWED_KEYS) {
    if (!(k in payload)) {
      errors.push(`Missing required field: ${k}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. Formula injection check
  for (const [k, val] of Object.entries(payload)) {
    if (isFormulaInjection(val)) {
      errors.push(`Field ${k} contains forbidden formula characters`);
    }
  }

  // 4. Q1 validation
  if (!ALLOWED_VALUES.q1.includes(payload.q1)) {
    errors.push(`Invalid value for Q1: ${payload.q1}`);
  }

  // 5. Q2 validation
  const q2Str = String(payload.q2);
  if (!ALLOWED_VALUES.q2.includes(q2Str)) {
    errors.push(`Invalid value for Q2: ${payload.q2}`);
  }

  // 6. Q3 conditional validation (Branch logic)
  if (q2Str === '0') {
    if (payload.q3 !== null && payload.q3 !== '' && payload.q3 !== undefined) {
      errors.push(`Invalid value for Q3: Q2 is 0, so Q3 must be null`);
    }
  } else {
    const q3Num = Number(payload.q3);
    if (!Number.isInteger(q3Num) || !ALLOWED_VALUES.q3.includes(q3Num)) {
      errors.push(`Missing or invalid required value for Q3: ${payload.q3}`);
    }
  }

  // 7. Q4 validation (1-5 integer)
  const q4Num = Number(payload.q4);
  if (!Number.isInteger(q4Num) || !ALLOWED_VALUES.q4.includes(q4Num)) {
    errors.push(`Invalid value for Q4: ${payload.q4}`);
  }

  // 8. Q5 validation
  if (!ALLOWED_VALUES.q5.includes(payload.q5)) {
    errors.push(`Invalid value for Q5: ${payload.q5}`);
  }

  // 9. Q6 validation
  if (!ALLOWED_VALUES.q6.includes(payload.q6)) {
    errors.push(`Invalid value for Q6: ${payload.q6}`);
  }

  // 10. Q7 validation
  if (!ALLOWED_VALUES.q7.includes(payload.q7)) {
    errors.push(`Invalid value for Q7: ${payload.q7}`);
  }

  // 11. Q8 validation
  if (!ALLOWED_VALUES.q8.includes(payload.q8)) {
    errors.push(`Invalid value for Q8: ${payload.q8}`);
  }

  // 12. Q9 validation (1-5 integer)
  const q9Num = Number(payload.q9);
  if (!Number.isInteger(q9Num) || !ALLOWED_VALUES.q9.includes(q9Num)) {
    errors.push(`Invalid value for Q9: ${payload.q9}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function toRow(payload) {
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

function aggregateResponses(rows, minPublicN = 5) {
  const total = rows ? rows.length : 0;
  if (total < minPublicN) {
    return {
      totalResponses: total,
      statsVisibility: 'insufficient',
      stats: null
    };
  }

  const stats = {};

  // Initialize stats structure for Q1~Q9
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

  // Scale questions have sums for mean calculation
  const scaleSums = { q3: 0, q4: 0, q9: 0 };

  for (const row of rows) {
    // row is [q1, q2, q3, q4, q5, q6, q7, q8, q9]
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

  // Calculate percentages and means
  for (const q of ALLOWED_KEYS) {
    const validN = stats[q].validN;
    if (validN > 0) {
      for (const val of ALLOWED_VALUES[q]) {
        const valStr = String(val);
        const count = stats[q].counts[valStr];
        stats[q].percents[valStr] = Math.round((count / validN) * 1000) / 10; // 1 decimal place
      }
    }

    if (q in scaleSums) {
      stats[q].mean = validN > 0 ? Math.round((scaleSums[q] / validN) * 100) / 100 : 0;
    }
  }

  // Conditional threshold check for Q3
  if (stats.q3.validN < minPublicN) {
    stats.q3.visible = false;
    stats.q3.counts = {};
    stats.q3.percents = {};
    delete stats.q3.mean;
  }

  return {
    totalResponses: total,
    statsVisibility: 'ready',
    stats
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ALLOWED_VALUES,
    ALLOWED_KEYS,
    validatePayload,
    toRow,
    aggregateResponses
  };
}
