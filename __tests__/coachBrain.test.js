// health.js тянет react-native / Health Connect — в Node они не нужны.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

import { answer, intro, topicsFor, dailyMessage, matchTopic, analyze, TOPICS } from '../lib/coachBrain';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40,
  bio: 38,
  pace: 0.9,
  scores: {
    sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 },
    activity: { status: 'ok', score: 70 },
    readiness: { status: 'ok', score: 75 },
    recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 },
    load: { level: 'normal' },
  },
  metrics: {
    steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200),
    sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42),
  },
};
const TIRED = { ...RESULT, scores: { ...RESULT.scores, readiness: { status: 'ok', score: 30 } } };
const PROFILES = [undefined, null, {}, { sex: 'm' }, { sex: 'f', showCycle: true }, { sex: 'f', showCycle: false, goal: 'sleep' }];
const RESULTS = [undefined, null, {}, { scores: {} }, { metrics: {} }, { scores: {}, metrics: {} }, RESULT, TIRED];

function expectShape(r) {
  expect(Array.isArray(r.text)).toBe(true);
  expect(r.text.length).toBeGreaterThan(0);
  r.text.forEach((x) => { expect(typeof x).toBe('string'); expect(x.trim()).not.toBe(''); expect(x).not.toMatch(/undefined|NaN|null/); });
  if (r.fact) {
    expect(typeof r.fact.text).toBe('string');
    expect(r.fact.text).not.toBe('');
    expect(typeof r.fact.source).toBe('string');
    expect(r.fact.source).not.toBe('');
  }
}

describe('intro / topics', () => {
  test('intro is a non-empty string', () => {
    expect(typeof intro()).toBe('string');
    expect(intro().length).toBeGreaterThan(10);
  });
  test('cycle topic only for women with showCycle', () => {
    const has = (p) => topicsFor(p).some((x) => x.female);
    expect(has(undefined)).toBe(false);
    expect(has({ sex: 'm', showCycle: true })).toBe(false);
    expect(has({ sex: 'f', showCycle: false })).toBe(false);
    expect(has({ sex: 'f', showCycle: true })).toBe(true);
  });
  test('topic labels are strings', () => {
    TOPICS.forEach((x) => expect(typeof x.label()).toBe('string'));
  });
});

describe('answer', () => {
  test.each(TOPICS.map((x) => x.id))('topic %s works for all results and profiles', (id) => {
    for (const res of RESULTS) {
      for (const prof of PROFILES) {
        const r = answer(id, res, prof);
        expectShape(r);
        expect(r.topic).toBe(id);
      }
    }
  });

  test('keyword routing', () => {
    expect(matchTopic('Как улучшить сон?')).toBe('sleep');
    expect(matchTopic('почему высокий пульс')).toBe('heart');
    expect(matchTopic('как часто тренироваться, нужны ли тренировки')).toBe('train');
    expect(matchTopic('how to sleep better')).toBe('sleep');
    expect(matchTopic('my heart rate')).toBe('heart');
    expect(matchTopic('best workout plan')).toBe('train');
    expect(matchTopic('')).toBeNull();
    expect(matchTopic(null)).toBeNull();
    expect(matchTopic('qwertyuiop')).toBeNull();
  });

  test('free text routes to a topic', () => {
    expect(answer('хочу лучше спать, плохой сон', RESULT, {}).topic).toBe('sleep');
    expect(answer('что с пульсом', RESULT, {}).topic).toBe('heart');
    expect(answer('какие тренировки', RESULT, {}).topic).toBe('train');
  });

  test('unknown text gives a fallback with suggestions', () => {
    const r = answer('qwertyuiop', RESULT, {});
    expect(r.topic).toBeNull();
    expect(r.fact).toBeNull();
    expectShape(r);
    expect(r.next.length).toBeGreaterThan(0);
  });

  test('empty/garbage input does not throw', () => {
    for (const q of [undefined, null, '', 42, {}]) expect(() => answer(q, undefined, undefined)).not.toThrow();
  });
});

describe('dailyMessage / analyze', () => {
  test('returns text, fact and state for any input', () => {
    for (const res of RESULTS) {
      for (const prof of PROFILES) {
        const d = dailyMessage(res, prof);
        expect(typeof d.text).toBe('string');
        expect(d.text.trim()).not.toBe('');
        expect(d.text).not.toMatch(/undefined|NaN/);
        expect(['unknown', 'tired', 'fresh', 'normal']).toContain(d.state);
      }
    }
  });
  test('state follows readiness', () => {
    expect(analyze(undefined, undefined).state).toBe('unknown');
    expect(analyze(RESULT, {}).state).toBe('fresh');
    expect(analyze(TIRED, {}).state).toBe('tired');
    expect(dailyMessage(TIRED, {}).state).toBe('tired');
  });
  test('answer is stable within a day', () => {
    expect(answer('today', RESULT, {})).toEqual(answer('today', RESULT, {}));
  });
});

describe('about intent', () => {
  const { reply } = require('../lib/coachBrain');
  test.each(['Расскажи о себе подробнее', 'кто ты', 'tell me about yourself', 'Who are you?'])('%s', (q) => {
    const r = reply(q, RESULT, {}, { history: [], tone: 'off' });
    expect(r.topic).toBe('about');
    expect(r.text.join(' ')).toMatch(/Chiron|Хирон/);
  });
});
