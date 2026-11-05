// Умные квесты (A–E + безопасность), арки «Хирон устал» / «Возвращение», приветствие с рангом и аркой, «почему?».
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('../lib/i18n', () => ({ ...jest.requireActual('../lib/i18n'), RU: true }));
const mem = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mem ? mem[k] : null)),
    setItem: jest.fn(async (k, v) => { mem[k] = v; }),
    removeItem: jest.fn(async (k) => { delete mem[k]; }),
  },
}), { virtual: true });

import { reply } from '../lib/coachBrain';
import { buildContext, smartQuests, planQuests, keyOf, shiftKey, STREAK_RISK_MIN } from '../lib/coach/quests';
import { arcState, arcAct, normalizeArcs, emptyArcs, arcMarkGreeted, COMEBACK_STEPS, ARC_XP } from '../lib/coach/arcs';
import { buildGreetExtra, rankIndexOf } from '../lib/coach/greetExtra';
import { markRestDay, loadRestKey, loadArcs, saveArcs, loadRankGreeted, saveRankGreeted } from '../lib/coach/dayStore';
import { clearCoachMemory } from '../lib/coach/store';

const NOW = new Date(2026, 10, 5, 12, 0).getTime();            // 5 ноября, полдень
const EVE = new Date(2026, 10, 5, 19, 30).getTime();           // вечер
const TODAY = keyOf(NOW);
const day = (n) => shiftKey(TODAY, n);
const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const scores = (o = {}) => ({
  sleep: { status: 'ok', score: 80, hours: o.sleepH == null ? 7.5 : o.sleepH, norm: 7.5 },
  activity: { status: 'ok', score: 70 },
  readiness: { status: 'ok', score: o.readiness == null ? 75 : o.readiness },
  recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 },
  load: { level: o.load || 'normal' },
});
const RES = (o = {}) => ({
  chrono: 40, bio: 38, pace: 0.9, scores: scores(o),
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 } },
  series: { steps: o.steps || [], sleep: o.sleep || [] },
});
const WX = (kind, temp, now = NOW) => ({ kind, temp, day: true, at: now - 60000, place: 'Москва' });
const ctxOf = (o = {}, extra = {}) => buildContext({ result: RES(o), profile: {}, weather: o.weather || null, now: o.now || NOW, lang: 'ru', ...extra });
const streakSteps = (n, goal = 8000) => Array.from({ length: n }, (_, i) => ({ key: day(-1 - i), v: goal + 100 }));
const ids = (c) => smartQuests(c).map((q) => q.id);
const BAD_WORDS = /виноват|подвёл|подвел|провал|потеря|не сдавайся|через силу|штраф/i;

describe('buildContext', () => {
  test('собирает контракт 2.2 и детерминирован', () => {
    const a = ctxOf({ steps: [{ key: TODAY, v: 3000 }, ...streakSteps(4)], sleepH: 6 });
    const b = ctxOf({ steps: [{ key: TODAY, v: 3000 }, ...streakSteps(4)], sleepH: 6 });
    expect(a).toEqual(b);
    expect(a.dayKey).toBe(TODAY);
    expect(a.hour).toBe(12);
    expect(a.steps).toEqual({ value: 3000, goal: 8000, left: 5000, streakDays: 4 });
    expect(a.sleep.poor).toBe(true);
    expect(a.sleep.norm).toBe(7.5);
    expect(a.body.state).toBe('fresh');
    expect(a.rest).toBe(false);
    expect(a.weather).toEqual({ status: 'none' });
  });
  test('погода: свежая и устаревшая', () => {
    expect(ctxOf({ weather: WX('rain', 10) }).weather.status).toBe('current');
    expect(ctxOf({ weather: { ...WX('rain', 10), at: NOW - 3 * 3600000 } }).weather.status).toBe('stale');
  });
  test('rest из hold, флага и ключа дня', () => {
    expect(ctxOf({}, { hold: { kind: 'soft' } }).rest).toBe(true);
    expect(ctxOf({}, { rest: true }).rest).toBe(true);
    expect(ctxOf({}, { restKey: TODAY }).rest).toBe(true);
    expect(ctxOf({}, { restKey: day(-1) }).rest).toBe(false);
  });
  test('пустой результат не падает', () => {
    const c = buildContext({ result: null, profile: null, weather: null, now: NOW, lang: 'en' });
    expect(smartQuests(c)).toEqual([]);
  });
});

describe('сценарии квестов', () => {
  test('нормальный день: замен нет', () => { expect(smartQuests(ctxOf({ weather: WX('clear', 18) }))).toEqual([]); });

  test('A: мало сна + дождь -> дыхание вместо шагов, погода названа', () => {
    const q = smartQuests(ctxOf({ sleepH: 6, weather: WX('rain', 10) }));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ id: 'sq_breathe', replaces: 'steps', xpSource: 'care', scenario: 'A' });
    expect(q[0].why).toMatch(/дождь/);
    expect(q[0].title).toMatch(/Дыхание/);
  });
  test('A: мало сна без свежей погоды -> без упоминания погоды', () => {
    [null, { ...WX('rain', 10), at: NOW - 3 * 3600000 }].forEach((w) => {
      const q = smartQuests(ctxOf({ sleepH: 6, weather: w }));
      expect(q[0].id).toBe('sq_breathe');
      expect(q[0].why).not.toMatch(/дожд|за окном/);
    });
  });
  test('A: порог сна — норма минус 0,5 (границы не включены)', () => {
    expect(ids(ctxOf({ sleepH: 7.0 }))).toEqual([]);
    expect(ids(ctxOf({ sleepH: 6.9 }))).toEqual(['sq_breathe']);
  });
  test('A: при усталости растяжка «если есть силы» только в усталом режиме сна (D главнее)', () => {
    expect(ids(ctxOf({ sleepH: 6, readiness: 30 }))).toEqual(['sq_recovery']);
  });
  test('B: жара 33+ -> домой, без улицы', () => {
    const q = smartQuests(ctxOf({ weather: WX('clear', 34) }));
    expect(q[0]).toMatchObject({ id: 'sq_heat_home', xpSource: 'care', scenario: 'B' });
    expect(q[0].why).toMatch(/Жара \+34°/);
    expect(q[0].hides).toEqual(['steps']);
  });
  test('B: 28–32 -> ранняя прогулка, шаги остаются', () => {
    const q = smartQuests(ctxOf({ weather: WX('clear', 30) }));
    expect(q[0]).toMatchObject({ id: 'sq_early_walk', xpSource: 'steps' });
    expect(q[0].why).toMatch(/рано утром/);
  });
  test('B: устаревшая жара не используется', () => {
    expect(smartQuests(ctxOf({ weather: { ...WX('clear', 35), at: NOW - 5 * 3600000 } }))).toEqual([]);
  });
  test('C: гроза и мороз -> домашняя разминка, уличных нет', () => {
    ['storm', 'clear'].forEach((k, i) => {
      const q = smartQuests(ctxOf({ weather: WX(k, i ? -25 : 20) }));
      expect(q[0]).toMatchObject({ id: 'sq_indoor', replaces: 'steps', xpSource: 'care', scenario: 'C' });
    });
    expect(smartQuests(ctxOf({ weather: WX('storm', 20) }))[0].why).toMatch(/гроза/);
  });
  test('C приоритетнее B: гроза в жару', () => { expect(ids(ctxOf({ weather: WX('storm', 35) }))).toEqual(['sq_indoor']); });
  test('C при усталости: не разминка, а восстановление', () => {
    expect(ids(ctxOf({ weather: WX('storm', 20), readiness: 30 }))).toEqual(['sq_recovery']);
  });
  test('D: высокая нагрузка / низкая готовность -> восстановление без тренировки', () => {
    ['high', 'normal'].forEach((load) => {
      const q = smartQuests(ctxOf({ load, readiness: load === 'high' ? 80 : 30 }));
      expect(q[0]).toMatchObject({ id: 'sq_recovery', xpSource: 'care', scenario: 'D' });
      expect(q[0].hides).toEqual(['steps', 'workout']);
      expect(q[0].why).not.toMatch(/через силу/);
    });
  });
  test('D: усталость только из-за цикла не считается усталостью', () => {
    const r = RES({ readiness: 50 });
    r.scores.recovery.hrvDev = -20;
    r.cycle = { start: NOW - 20 * 86400000, length: 28, period: 5 };
    const c = buildContext({ result: r, profile: { sex: 'f', showCycle: true }, weather: null, now: NOW, lang: 'ru' });
    // независимо от фазы контекст берёт состояние из analyze(): если оно не tired, квестов D нет
    expect(c.body.state === 'tired' ? ids(c) : ids(c)).toEqual(c.body.state === 'tired' ? ['sq_recovery'] : []);
  });
  test('E: серия под угрозой вечером -> минимум дня с остатком шагов', () => {
    const c = ctxOf({ now: EVE, steps: [{ key: keyOf(EVE), v: 5000 }, ...streakSteps(STREAK_RISK_MIN)] });
    const q = smartQuests(c);
    expect(q[0]).toMatchObject({ id: 'sq_minimum', xpSource: 'steps', scenario: 'E', left: 3000 });
    expect(q[0].why).toMatch(/3\s?000 шагов/);
    expect(q[0].why).not.toMatch(BAD_WORDS);
  });
  test('E: не срабатывает днём, при серии < 3, при выполненной цели, без данных шагов, позже 21:00', () => {
    const base = (o) => ctxOf({ steps: [{ key: keyOf(o.now || EVE), v: o.v == null ? 5000 : o.v }, ...streakSteps(o.n == null ? 4 : o.n)], ...o });
    expect(ids(base({ now: NOW }))).toEqual([]);
    expect(ids(base({ now: EVE, n: 2 }))).toEqual([]);
    expect(ids(base({ now: EVE, v: 9000 }))).toEqual([]);
    expect(ids(ctxOf({ now: EVE, steps: streakSteps(4) }))).toEqual([]);
    expect(ids(base({ now: new Date(2026, 10, 5, 22, 0).getTime() }))).toEqual([]);
  });
  test('E уступает опасной погоде и усталости', () => {
    const st = [{ key: keyOf(EVE), v: 5000 }, ...streakSteps(4)];
    expect(ids(ctxOf({ now: EVE, steps: st, weather: WX('storm', 20, EVE) }))).toEqual(['sq_indoor']);
    expect(ids(ctxOf({ now: EVE, steps: st, readiness: 30 }))).toEqual(['sq_recovery']);
  });
  test('двуязычие: EN-тексты без кириллицы, RU-тексты без латинских служебных id', () => {
    const q = smartQuests(ctxOf({ sleepH: 6, weather: WX('rain', 10) }))[0];
    expect(q.i18n.en.title + q.i18n.en.why).not.toMatch(/[А-Яа-я]/);
    expect(q.i18n.ru.why).toMatch(/дождь/);
    const en = smartQuests(buildContext({ result: RES({ sleepH: 6 }), profile: {}, weather: null, now: NOW, lang: 'en' }))[0];
    expect(en.title).toBe(en.i18n.en.title);
    expect(en.why).toMatch(/slept less/);
  });
  test('нет текстов вины и штрафов ни в одном режиме', () => {
    const cs = [ctxOf({ sleepH: 6, weather: WX('rain', 10) }), ctxOf({ weather: WX('clear', 34) }), ctxOf({ weather: WX('clear', 30) }), ctxOf({ weather: WX('storm', 10) }), ctxOf({ readiness: 20 }), ctxOf({}, { rest: true }),
      ctxOf({ now: EVE, steps: [{ key: keyOf(EVE), v: 5000 }, ...streakSteps(5)] })];
    cs.forEach((c) => smartQuests(c).forEach((q) => { expect(JSON.stringify(q.i18n)).not.toMatch(BAD_WORDS); expect(JSON.stringify(q)).not.toMatch(/undefined|NaN/); }));
  });
});

describe('безопасность', () => {
  const heavy = { sleepH: 6, weather: WX('rain', 10) };
  test('hold любого вида и флаг дня -> только отдых, ни XP, ни шагов, ни серии', () => {
    ['red', 'pain', 'dizzy', 'soft'].forEach((kind) => {
      const q = smartQuests(ctxOf(heavy, { hold: { kind } }));
      expect(q).toHaveLength(1);
      expect(q[0]).toMatchObject({ id: 'sq_rest', xpSource: null, replaces: '*' });
      expect(q[0].hides).toEqual(expect.arrayContaining(['steps', 'workout', 'water', 'streak']));
    });
    expect(ids(ctxOf({ now: EVE, steps: [{ key: keyOf(EVE), v: 100 }, ...streakSteps(5)] }, { restKey: keyOf(EVE) }))).toEqual(['sq_rest']);
    expect(planQuests(ctxOf({ weather: WX('clear', 34) }, { rest: true })).mode).toBe('rest');
  });
  test('rest.v1 действует только в тот же день', () => {
    expect(ids(ctxOf(heavy, { restKey: day(-1) }))).toEqual(['sq_breathe']);
  });
  test('reply: тревожный симптом -> holdSet; hold виден в контексте квестов', () => {
    const r = reply('у меня болит сердце и тяжело дышать', RES(), {}, { now: NOW });
    expect(r.holdSet).toBeTruthy();
    expect(ids(ctxOf(heavy, { hold: r.session.memory.hold }))).toEqual(['sq_rest']);
    expect(reply('привет', RES(), {}).holdSet).toBe(null);
  });
  test('dayStore: флаг дня отдыха, арки и ранг сохраняются и очищаются', async () => {
    expect(await loadRestKey()).toBe(null);
    expect(await markRestDay(NOW)).toBe(TODAY);
    expect(await loadRestKey()).toBe(TODAY);
    await saveArcs({ ...emptyArcs(), greetedKey: TODAY });
    expect((await loadArcs()).greetedKey).toBe(TODAY);
    await saveRankGreeted(3);
    expect(await loadRankGreeted()).toBe(3);
    await clearCoachMemory();
    expect(await loadRestKey()).toBe(null);
    expect(await loadRankGreeted()).toBe(null);
    expect((await loadArcs()).greetedKey).toBe(null);
  });
});

// ───────────────────────── арки ─────────────────────────
const poorNights = (n = 2, h = 5.5) => Array.from({ length: n }, (_, i) => ({ key: day(-i), v: h }));
const arcCtx = (o = {}, extra = {}) => buildContext({ result: RES(o), profile: {}, weather: null, now: o.now || NOW, lang: 'ru', ...extra });

describe('арка «Хирон устал»', () => {
  test('предлагается после двух плохих ночей подряд, Хирон усталый, есть мягкая заметка про врача', () => {
    const a = arcState(arcCtx({ sleep: poorNights(2) }), null);
    expect(a).toMatchObject({ id: 'tired', stage: 'offer', chironMood: 'tired', changed: true, blocked: false, reward: null });
    expect(a.title).toBe('Хирон устал');
    expect(a.quests.map((q) => q.id)).toEqual(['ritual', 'bedtime', 'sleep']);
    expect(a.quests.every((q) => !q.done)).toBe(true);
    expect(a.note).toMatch(/врач/);
    expect(a.stored.tired.phase).toBe('offered');
    expect(JSON.stringify(a)).not.toMatch(BAD_WORDS);
  });
  test('не предлагается: одна плохая ночь, ночи не подряд, сон в норме, нет данных', () => {
    expect(arcState(arcCtx({ sleep: poorNights(1) }), null).id).toBe(null);
    expect(arcState(arcCtx({ sleep: [{ key: day(0), v: 5.5 }, { key: day(-2), v: 5.5 }, { key: day(-1), v: 7.5 }] }), null).id).toBe(null);
    expect(arcState(arcCtx({ sleep: [] }), null).id).toBe(null);
    expect(arcState(arcCtx({ sleep: [{ key: day(0), v: 6.9 }, { key: day(-1), v: 7 }] }), null).id).toBe(null);
  });
  test('полный путь: предложение -> принять -> шаги -> «выздоровел» с наградой один раз', () => {
    let st = arcState(arcCtx({ sleep: poorNights(2) }), null).stored;
    st = arcAct(st, 'tired', 'accept', NOW);
    let a = arcState(arcCtx({ sleep: poorNights(2) }), st);
    expect(a).toMatchObject({ stage: 'active', chironMood: 'tired' });
    st = arcAct(a.stored, 'tired', 'check', NOW, { index: 0 });
    st = arcAct(st, 'tired', 'check', NOW, { index: 1 });
    // сон по норме на следующую ночь (автоматически)
    const next = new Date(2026, 10, 6, 12, 0).getTime();
    const sleep2 = [{ key: keyOf(next), v: 7.6 }, ...poorNights(2).map((x) => x)];
    a = arcState(arcCtx({ sleep: [{ key: TODAY, v: 5.5 }], now: next }, {}), st);
    expect(a.stage).toBe('active');
    expect(a.chironMood).toBe('ok');
    expect(a.quests.map((q) => q.done)).toEqual([true, true, false]);
    a = arcState(arcCtx({ sleep: sleep2, now: next }), st);
    expect(a).toMatchObject({ stage: 'healed', chironMood: 'happy', changed: true });
    expect(a.reward).toEqual({ xp: ARC_XP.tired, eventId: `arc.tired.${TODAY}`, journal: { ru: 'Хирон выспался', en: 'Chiron is well rested' } });
    expect(a.stored.tired.phase).toBe('done');
    // повторный вызов в тот же день: показывает выздоровевшего, но награды нет
    const again = arcState(arcCtx({ sleep: sleep2, now: next }), a.stored);
    expect(again).toMatchObject({ stage: 'healed', reward: null });
    // на следующий день карточка уходит и арка не стартует снова (7 дней)
    const later = new Date(2026, 10, 7, 12, 0).getTime();
    expect(arcState(arcCtx({ sleep: [{ key: keyOf(later), v: 5.5 }, { key: keyOf(next), v: 5.5 }], now: later }), a.stored).id).toBe(null);
  });
  test('«позже» прячет на день, «закрыть» даёт паузу 7 дней без упрёков', () => {
    const c = arcCtx({ sleep: poorNights(2) });
    let st = arcState(c, null).stored;
    st = arcAct(st, 'tired', 'later', NOW);
    expect(arcState(c, st).id).toBe(null);
    const tomorrow = new Date(2026, 10, 6, 12, 0).getTime();
    const c2 = arcCtx({ sleep: [{ key: keyOf(tomorrow), v: 5.5 }, { key: TODAY, v: 5.5 }], now: tomorrow });
    expect(arcState(c2, st).stage).toBe('offer');
    st = arcAct(st, 'tired', 'close', tomorrow);
    expect(arcState(c2, st).id).toBe(null);
    const week = new Date(2026, 10, 13, 12, 0).getTime();
    expect(arcState(arcCtx({ sleep: [{ key: keyOf(week), v: 5.5 }, { key: shiftKey(keyOf(week), -1), v: 5.5 }], now: week }), st).stage).toBe('offer');
  });
  test('незавершённая арка тихо закрывается через неделю', () => {
    const st = arcAct(arcState(arcCtx({ sleep: poorNights(2) }), null).stored, 'tired', 'accept', NOW);
    const late = new Date(2026, 10, 14, 12, 0).getTime();
    const a = arcState(arcCtx({ sleep: [], now: late }), st);
    expect(a.id).toBe(null);
    expect(a.stored.tired.phase).toBe('closed');
  });
  test('предложение снимается само через 3 дня', () => {
    const st = arcState(arcCtx({ sleep: poorNights(2) }), null).stored;
    const late = new Date(2026, 10, 10, 12, 0).getTime();
    const a = arcState(arcCtx({ sleep: [], now: late }), st);
    expect(a.id).toBe(null);
    expect(a.stored.tired.phase).toBe('idle');
  });
});

describe('арка «Возвращение»', () => {
  const opensGap = (n) => [NOW - n * 86400000 - 3600000, NOW - 60000];
  test('предлагается после паузы >= 3 дней; без паузы нет; мало данных нет', () => {
    const a = arcState(arcCtx({}, { opens: opensGap(3) }), null);
    expect(a).toMatchObject({ id: 'back', stage: 'offer', chironMood: 'ok', changed: true });
    expect(a.title).toBe('Возвращение');
    expect(a.quests.map((q) => q.id)).toEqual(['enter', 'step', 'rhythm']);
    expect(JSON.stringify(a)).not.toMatch(/\d дн|пропуст|вин/);
    expect(arcState(arcCtx({}, { opens: opensGap(2) }), null).id).toBe(null);
    expect(arcState(arcCtx({}, { opens: [NOW - 60000] }), null).id).toBe(null);
    expect(arcState(arcCtx({}, { opens: null }), null).id).toBe(null);
  });
  test('повторное открытие в тот же день не меняет предложение', () => {
    const o = [NOW - 5 * 86400000, NOW - 3600000, NOW - 60000];
    expect(arcState(arcCtx({}, { opens: o }), null).stage).toBe('offer');
  });
  test('после защитной паузы сначала «Как ты?» без заданий', () => {
    const o = opensGap(4);
    const a = arcState(arcCtx({}, { opens: o, restKey: day(-4) }), null);
    expect(a).toMatchObject({ id: 'back', stage: 'checkin', quests: [] });
    expect(a.text).toMatch(/Как ты/);
    expect(arcAct(a.stored, 'back', 'accept', NOW).back.phase).toBe('offered'); // принять нельзя, пока не ответил
    const answered = arcAct(a.stored, 'back', 'answer', NOW);
    expect(arcState(arcCtx({}, { opens: o }), answered).stage).toBe('offer');
  });
  test('прогресс: зайти, 2000 шагов, потом день с целью или записью -> «рад тебе»', () => {
    let st = arcState(arcCtx({}, { opens: opensGap(3) }), null).stored;
    st = arcAct(st, 'back', 'accept', NOW);
    let a = arcState(arcCtx({}, { opens: opensGap(3) }), st);
    expect(a.quests.map((q) => q.done)).toEqual([true, false, false]);
    expect(COMEBACK_STEPS).toBe(2000);
    a = arcState(arcCtx({ steps: [{ key: TODAY, v: 2100 }] }, { opens: opensGap(3) }), a.stored);
    expect(a.quests.map((q) => q.done)).toEqual([true, true, false]);
    expect(a.chironMood).toBe('happy');
    // тот же день с целью: ритм требует другого дня
    a = arcState(arcCtx({ steps: [{ key: TODAY, v: 9000 }] }, { opens: opensGap(3) }), a.stored);
    expect(a.stage).toBe('active');
    const next = new Date(2026, 10, 6, 12, 0).getTime();
    a = arcState(arcCtx({ steps: [{ key: TODAY, v: 2100 }], now: next }, { activities: [{ key: keyOf(next) }] }), a.stored);
    expect(a).toMatchObject({ stage: 'healed', chironMood: 'happy' });
    expect(a.reward).toMatchObject({ xp: ARC_XP.back, journal: { ru: 'Хирон рад тебе' } });
  });
});

describe('блокировка арок', () => {
  const c = { sleep: poorNights(2) };
  test('hold / день отдыха / усталость по здоровью: арка не начинается', () => {
    [arcCtx(c, { hold: { kind: 'pain' } }), arcCtx(c, { rest: true }), arcCtx(c, { restKey: TODAY }), arcCtx({ ...c, readiness: 30 })].forEach((x) => {
      const a = arcState(x, null);
      expect(a).toMatchObject({ id: null, stage: 'none', blocked: true, quests: [] });
      expect(a.stored).toEqual(emptyArcs());
    });
    expect(arcState(arcCtx({}, { hold: { kind: 'soft' }, opens: [NOW - 9 * 86400000, NOW - 60000] }), null).blocked).toBe(true);
  });
  test('активная арка не продолжается и не награждает во время паузы, состояние сохраняется', () => {
    const st = arcAct(arcState(arcCtx(c), null).stored, 'tired', 'accept', NOW);
    const a = arcState(arcCtx(c, { hold: { kind: 'red' } }), st);
    expect(a).toMatchObject({ id: null, blocked: true, reward: null });
    expect(a.stored.tired.phase).toBe('active');
    expect(arcState(arcCtx(c), a.stored).stage).toBe('active');
  });
  test('мусорное хранилище нормализуется', () => {
    ['', '{', 'null', 5, { v: 2 }, { v: 1, tired: { phase: 'zzz', done: 'x', startKey: 7 } }].forEach((x) => expect(normalizeArcs(x).tired.phase).toBe('idle'));
    expect(arcState(arcCtx(c), 'junk').stage).toBe('offer');
  });
  test('детерминизм', () => {
    const x = arcCtx(c);
    expect(arcState(x, null)).toEqual(arcState(x, null));
  });
});

// ───────────────────────── чат ─────────────────────────
const R = RES();
const OLD = { v: 1, turn: 3, lastAt: NOW - 86400000 };
const say = (q, o = {}) => reply(q, R, {}, { now: NOW, memory: o.memory === undefined ? OLD : o.memory, history: o.history || [], tone: 'balanced', ...o });
const j = (r) => r.text.join(' ');
const extraOf = (o = {}) => buildGreetExtra({ level: 34, rankGreeted: 2, dayKey: TODAY, ...o });

describe('приветствие: ранг и арка', () => {
  test('rankIndexOf и buildGreetExtra', () => {
    expect([0, 9, 10, 39, 89, 90, 100].map(rankIndexOf)).toEqual([0, 0, 1, 3, 8, 9, 9]);
    expect(extraOf().rank).toMatchObject({ index: 3, ru: 'Травник', en: 'Herbalist' });
    expect(extraOf({ rankGreeted: 3 }).rank).toBe(null);
    expect(extraOf({ level: 5, rankGreeted: null }).rank).toBe(null);
    expect(extraOf({ level: 25, rankGreeted: null }).rank.index).toBe(2);
  });
  test('новый ранг: упомянут, consumed.rank отдаётся для rank.greeted.v1; «почему?» объясняет', () => {
    const extra = extraOf();
    const r = say('Привет', { extra });
    expect(j(r)).toMatch(/Травник/);
    expect(r.consumed).toEqual({ rank: 3, arc: null });
    const r2 = say('почему?', { extra, memory: r.session.memory, history: [{ from: 'me', text: ['Привет'] }, { from: 'coach', text: r.text }] });
    expect(j(r2)).toMatch(/уровн/);
    // после сохранения флага ранг больше не упоминается
    const again = say('Привет', { extra: extraOf({ rankGreeted: 3 }) });
    expect(j(again)).not.toMatch(/Травник/);
    expect(again.consumed.rank).toBe(null);
  });
  test('активная арка в приветствии: «Хирон устал», один раз в день', () => {
    const arc = arcState(arcCtx({ sleep: poorNights(2) }), null);
    const extra = buildGreetExtra({ arc, level: 5, dayKey: TODAY });
    const r = say('Привет', { extra });
    expect(j(r)).toMatch(/Хирон устал|выспаться/);
    expect(r.consumed).toEqual({ rank: null, arc: 'tired' });
    const stored = arcMarkGreeted(arc.stored, TODAY);
    const again = say('Привет', { extra: buildGreetExtra({ arc, level: 5, dayKey: TODAY, stored }) });
    expect(again.consumed.arc).toBe(null);
    expect(j(r)).not.toMatch(BAD_WORDS);
  });
  test('арка «Возвращение» и «Как ты?» после паузы отдыха', () => {
    const a1 = arcState(arcCtx({}, { opens: [NOW - 5 * 86400000, NOW - 60000] }), null);
    expect(j(say('Привет', { extra: buildGreetExtra({ arc: a1, dayKey: TODAY }) }))).toMatch(/Дни не считаю|скучал/);
    const a2 = arcState(arcCtx({}, { opens: [NOW - 5 * 86400000, NOW - 60000], restKey: day(-5) }), null);
    expect(a2.stage).toBe('checkin');
    expect(j(say('Привет', { extra: buildGreetExtra({ arc: a2, dayKey: TODAY }) }))).toMatch(/Как ты\?/);
  });
  test('выздоровевший Хирон', () => {
    const extra = buildGreetExtra({ arc: { id: 'tired', stage: 'healed' }, dayKey: TODAY });
    expect(j(say('Привет', { extra }))).toMatch(/выспался|Мне хорошо/);
  });
  test('при hold, дне отдыха, первом контакте и чувствительном — без ранга и арки', () => {
    const extra = extraOf();
    const arcExtra = { ...extra, arc: { id: 'tired', stage: 'offer' } };
    expect(j(say('Привет', { extra: { ...arcExtra, rest: true } }))).not.toMatch(/Травник|Хирон устал|выспаться/);
    expect(j(say('Привет', { extra: arcExtra, memory: { ...OLD, hold: { kind: 'pain', turn: 3 } } }))).not.toMatch(/Травник|Хирон устал|выспаться/);
    expect(j(say('Привет', { extra: arcExtra, memory: null, history: [] }))).not.toMatch(/Травник|выспаться/);
    expect(say('Привет', { extra: arcExtra, memory: null }).consumed).toEqual({ rank: null, arc: null });
  });
  test('без extra приветствия прежние', () => {
    const r = say('Привет');
    expect(r.consumed).toEqual({ rank: null, arc: null });
    expect(j(r)).not.toMatch(/Травник|ранг/i);
  });
  test('все ответы на разные сиды без мусора', () => {
    const extra = extraOf();
    for (let i = 0; i < 12; i++) {
      const h = Array.from({ length: i }, (_, k) => ({ from: 'coach', text: ['x' + k] }));
      const r = say('Привет', { extra, history: h, memory: { ...OLD, recent: [] } });
      expect(j(r)).not.toMatch(/undefined|NaN|\{|\}/);
    }
  });
});

describe('«почему?» про умные квесты', () => {
  test('«какие задания на сегодня» называет замену, «почему?» отдаёт голос Хирона', () => {
    const quests = smartQuests(ctxOf({ sleepH: 6, weather: WX('rain', 10) }));
    const r = say('какие задания на сегодня?', { extra: { quests } });
    expect(j(r)).toMatch(/дыхание 3 минуты/);
    expect(j(r)).not.toMatch(/Ты спал/);
    const hist = [{ from: 'me', text: ['какие задания на сегодня?'] }, { from: 'coach', text: r.text }];
    const why = say('почему?', { extra: { quests }, memory: r.session.memory, history: hist });
    expect(j(why)).toMatch(/спал\(а\) меньше обычного/);
    expect(j(why)).toMatch(/дождь/);
  });
  test('день отдыха: «почему?» без нажима', () => {
    const quests = smartQuests(ctxOf({}, { rest: true }));
    const r = say('какие задания на сегодня', { extra: { quests, rest: true } });
    expect(j(r)).toMatch(/день отдыха/);
    const why = say('почему', { extra: { quests }, memory: r.session.memory, history: [{ from: 'me', text: ['x'] }, { from: 'coach', text: r.text }] });
    expect(j(why)).toMatch(/отдыхаем/);
  });
  test('без квестов сценарий не срабатывает', () => {
    const r = say('какие задания на сегодня', { extra: { quests: [] } });
    expect(j(r)).not.toMatch(/Сегодня для тебя|Дыхание/);
  });
  test('при hold квесты не озвучиваются', () => {
    const quests = smartQuests(ctxOf({ sleepH: 6 }));
    const r = say('какие задания на сегодня', { extra: { quests }, memory: { ...OLD, hold: { kind: 'red', turn: 3 } } });
    expect(j(r)).not.toMatch(/Дыхание|Сегодня для тебя/);
  });
});
