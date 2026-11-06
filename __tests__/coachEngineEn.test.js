// Английский интерфейс движка и сетевые сценарии погоды (fetch и хранилище мокаются).
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = {};
  return { __esModule: true, default: { getItem: async (k) => (k in m ? m[k] : null), setItem: async (k, v) => { m[k] = v; }, removeItem: async (k) => { delete m[k]; } } };
}, { virtual: true });
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: async () => ({ granted: false }), getLastKnownPositionAsync: async () => null, getCurrentPositionAsync: async () => null, Accuracy: { Lowest: 1 } }), { virtual: true });

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLang } from '../lib/i18n';
import { reply, setCoachWeather } from '../lib/coachBrain';
import { getWeather } from '../lib/weather';
import { SCENARIOS } from '../lib/coach/scenarios';
import { assemble, validate } from '../lib/coach/assemble';
import { buildVars } from '../lib/coach/vars';

const CYR = /[А-Яа-яЁё]/;
const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const j = (r) => r.text.join('\n');
afterEach(() => { setLang('auto'); setCoachWeather(null); jest.restoreAllMocks(); });

describe('английский: движок', () => {
  beforeEach(() => setLang('en'));
  test('защитная пауза: после боли «what should I do?» и «should I train?» — без тренировки, с врачом', () => {
    let session = {};
    const history = [];
    const say = (q) => { const r = reply(q, RESULT, {}, { history: history.slice(), session, tone: 'playful' }); session = r.session; history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId }); return r; };
    say('my knee hurts, should I go for a run?');
    const a = say('what should I do?');
    const b = say('should I train today?');
    [a, b].forEach((r) => { expect(j(r)).not.toMatch(/interval|strength session/i); expect(j(r)).toMatch(/doctor/i); expect(r.humorId).toBeNull(); expect(j(r)).not.toMatch(CYR); });
  });
  test.each(['thanks', 'shorter', 'no jokes', 'ok', 'why', 'Are you a real AI?', 'Do you work offline?', 'there is no data', 'asdfghjk', 'tell me a joke', 'what is the weather like?', 'How do I turn off the jokes?', 'I slept 5 hours', 'what else', 'yes', 'no'])('%s -> без кириллицы', (q) => {
    const r = reply(q, RESULT, {});
    expect(CYR.test(j(r))).toBe(false);
    expect(validate(r.text).ok).toBe(true);
  });
  test('честная фраза о сети', () => { expect(j(reply('Do you work offline?', RESULT, {}))).toBe("The coach's answers are produced locally. For weather the app contacts a weather service."); });
  test('погода: опасно -> перенести, без кириллицы', () => {
    setCoachWeather({ kind: 'storm', temp: 10, day: true, at: Date.now() - 60000, place: 'London' });
    const r = reply('Should I go for a run? What is the weather?', RESULT, {});
    expect(j(r)).toMatch(/postpone/); expect(CYR.test(j(r))).toBe(false);
  });
  test('все варианты каталога имеют английский текст без кириллицы', () => {
    const full = buildVars({ steps7: 8000, steps30: 7000, stepGoal: 8000, sleepH: 7, sleepNorm: 7, sleepScore: 80, active7: 200, readiness: 70, workouts7: 3, sleep7: 6.5 }, { status: 'current', kind: 'rain', temp: 5, place: 'Oslo', ageMin: 3, at: 1 }, { place: 'gym', activity: 'walk' }, { sleep: 5, steps: 1000 }, false);
    ['savedLabel', 'savedAgo', 'baseTrain', 'dangerWhy', 'wxCond', 'curCond', 'curCondCap', 'askPlace', 'askActivity', 'topicList', 'sleepTips', 'rankName', 'questTitle', 'questWhy', 'waterGoal', 'waterNote', 'curLevel', 'curRank'].forEach((n) => { full[n] = { name: n, value: 'text', kind: 'text', available: true }; });
    SCENARIOS.forEach((sc) => sc.variants.forEach((v) => {
      const p = assemble(v, { ru: false, vars: full }).paras;
      expect(p.join(' ')).not.toMatch(CYR); expect(validate(p).ok).toBe(true);
    }));
  });
});

describe('погода: сеть на моках (W11, W14)', () => {
  const settings = { on: true, city: { lat: 55.8, lon: 37.6, name: 'Москва' } };
  beforeEach(async () => { await AsyncStorage.removeItem('weather.v1'); });
  const fresh = (o) => JSON.stringify({ kind: 'rain', code: 61, temp: 7, day: true, at: Date.now(), place: 'Москва', ...(o || {}) });

  test('успешный ответ кладётся в кэш и не помечен stale', async () => {
    global.fetch = jest.fn(async () => ({ json: async () => ({ current: { weather_code: 61, temperature_2m: 7.2, is_day: 1 } }) }));
    const w = await getWeather(settings, true);
    expect(w.kind).toBe('rain'); expect(w.stale).toBeUndefined();
    expect(global.fetch.mock.calls[0][0]).toMatch(/latitude=55\.8&longitude=37\.6/);
  });
  test('ответ без current -> кэш с пометкой stale, а не свежий', async () => {
    await AsyncStorage.setItem('weather.v1', fresh({ at: Date.now() - 3600000 }));
    global.fetch = jest.fn(async () => ({ json: async () => ({ error: true }) }));
    const w = await getWeather(settings, true);
    expect(w.stale).toBe(true); expect(w.kind).toBe('rain');
  });
  test('ошибка сети -> кэш stale; чат продолжает отвечать', async () => {
    await AsyncStorage.setItem('weather.v1', fresh({ at: Date.now() - 3600000 }));
    global.fetch = jest.fn(async () => { throw new Error('offline'); });
    const w = await getWeather(settings, true);
    expect(w.stale).toBe(true);
    setLang('ru');
    setCoachWeather(w);
    const r = reply('Какая сейчас погода?', RESULT, {});
    expect(j(r)).toMatch(/Свежих данных о погоде у меня нет/); expect(j(r)).not.toMatch(/По последним данным/);
    expect(reply('Привет', RESULT, {}).text.length).toBeGreaterThan(0);
  });
  test('таймаут 8 секунд прерывает запрос', async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      global.fetch = jest.fn((url, opt) => new Promise((_, rej) => { opt.signal.addEventListener('abort', () => { aborted = true; rej(new Error('aborted')); }); }));
      const p = getWeather(settings, true);
      await jest.advanceTimersByTimeAsync(8100);
      expect(await p).toBeNull();
      expect(aborted).toBe(true);
    } finally { jest.useRealTimers(); }
  });
  test('отказ геолокации и нет города -> null, без падения', async () => {
    global.fetch = jest.fn();
    expect(await getWeather({ on: true }, true)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('коуч сам ничего не запрашивает', () => {
    global.fetch = jest.fn();
    setLang('ru');
    reply('Какая погода?', RESULT, {});
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
