// tests/run-tests.js
// Automated Unit Tests for Survey Validation & Aggregation Logic

const assert = require('assert');
const { validatePayload, aggregateResponses, toRow } = require('./core-logic.js');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('=== Running TDD Unit Tests for SCENT LAB ===');

// 1. Validation Tests
it('should accept valid payload with Q2=0 and Q3=null', () => {
  const payload = {
    q1: 'beginner',
    q2: '0',
    q3: null,
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);
});

it('should accept valid payload with Q2="3" and Q3=4', () => {
  const payload = {
    q1: 'experienced',
    q2: '3',
    q3: 4,
    q4: 5,
    q5: 'ingredient_knowledge',
    q6: 'a',
    q7: 'combine_notes',
    q8: 'professional',
    q9: 5
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, true);
});

it('should reject payload when Q2="0" but Q3 has a value', () => {
  const payload = {
    q1: 'beginner',
    q2: '0',
    q3: 4, // Invalid: Q2 is 0, so Q3 must be null
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('Q3')));
});

it('should reject payload when Q2="1" but Q3 is null', () => {
  const payload = {
    q1: 'general',
    q2: '1',
    q3: null, // Invalid: Q2 is not 0, so Q3 is required
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, false);
});

it('should reject payload with formula injection attack in q1', () => {
  const payload = {
    q1: '=cmd|"/C calc"!A0',
    q2: '0',
    q3: null,
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, false);
});

it('should reject payload with unexpected keys (e.g. email, ip)', () => {
  const payload = {
    q1: 'beginner',
    q2: '0',
    q3: null,
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4,
    email: 'test@example.com'
  };
  const res = validatePayload(payload);
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('unexpected keys')));
});

it('should convert validated payload to 9-element row correctly', () => {
  const payload = {
    q1: 'beginner',
    q2: '0',
    q3: null,
    q4: 3,
    q5: 'word_impression',
    q6: 'b',
    q7: 'imagine_mood',
    q8: 'emotional',
    q9: 4
  };
  const row = toRow(payload);
  assert.deepStrictEqual(row, ['beginner', '0', '', 3, 'word_impression', 'b', 'imagine_mood', 'emotional', 4]);
});

// 2. Aggregation Tests
it('should mark statsVisibility as insufficient when total responses < 5', () => {
  const rows = [
    ['beginner', '0', '', 3, 'word_impression', 'b', 'imagine_mood', 'emotional', 4],
    ['general', '1', 4, 4, 'word_impression', 'c', 'match_memory', 'everyday', 3]
  ];
  const stats = aggregateResponses(rows, 5);
  assert.strictEqual(stats.totalResponses, 2);
  assert.strictEqual(stats.statsVisibility, 'insufficient');
  assert.strictEqual(stats.stats, null);
});

it('should aggregate stats correctly and calculate mean when total responses >= 5', () => {
  const rows = [
    ['beginner', '0', '', 1, 'word_impression', 'a', 'combine_notes', 'professional', 2],
    ['general', '1', 3, 2, 'past_smell_memory', 'b', 'imagine_mood', 'emotional', 3],
    ['experienced', '2', 4, 3, 'ingredient_knowledge', 'c', 'match_memory', 'everyday', 4],
    ['beginner', '0', '', 4, 'cannot_imagine', 'a', 'combine_notes', 'professional', 5],
    ['general', '3', 5, 5, 'word_impression', 'b', 'imagine_mood', 'emotional', 4]
  ];
  const result = aggregateResponses(rows, 5);
  assert.strictEqual(result.totalResponses, 5);
  assert.strictEqual(result.statsVisibility, 'ready');
  assert.ok(result.stats);

  // Q1 breakdown
  assert.strictEqual(result.stats.q1.counts.beginner, 2);
  assert.strictEqual(result.stats.q1.counts.general, 2);
  assert.strictEqual(result.stats.q1.counts.experienced, 1);

  // Q4 mean: (1+2+3+4+5) / 5 = 3.0
  assert.strictEqual(result.stats.q4.mean, 3.0);

  // Q3 has only 3 responses ('', 3, 4, '', 5) -> validN = 3 (< 5 threshold)
  // Therefore Q3 stats should be withheld/hidden
  assert.strictEqual(result.stats.q3.visible, false);
});

it('should calculate Q3 stats when Q3 valid responses >= 5', () => {
  const rows = [
    ['beginner', '1', 2, 3, 'word_impression', 'a', 'combine_notes', 'professional', 3],
    ['general', '2', 3, 3, 'past_smell_memory', 'b', 'imagine_mood', 'emotional', 3],
    ['experienced', '3', 4, 3, 'ingredient_knowledge', 'c', 'match_memory', 'everyday', 3],
    ['beginner', '4', 5, 3, 'cannot_imagine', 'a', 'combine_notes', 'professional', 3],
    ['general', '5', 1, 3, 'word_impression', 'b', 'imagine_mood', 'emotional', 3]
  ];
  const result = aggregateResponses(rows, 5);
  assert.strictEqual(result.stats.q3.visible, true);
  assert.strictEqual(result.stats.q3.validN, 5);
  // (2 + 3 + 4 + 5 + 1) / 5 = 3.0
  assert.strictEqual(result.stats.q3.mean, 3.0);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
