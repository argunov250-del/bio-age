// Каталог сценариев, группы 14–16 (разговор и настроение; вода, дыхание, стресс; справка о приложении) и расширение
// частых сценариев (приветствие, план, шаги, сон, мотивация, «спасибо», «не понял»). Распознавание, негативы, ротация,
// юмор, честность данных, отсутствие null/NaN/плейсхолдеров.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

import { setLang } from '../lib/i18n';
import { reply } from '../lib/coachBrain';
import { SCENARIOS, BY_ID, checkCatalog } from '../lib/coach/scenarios';
import { CATALOG } from '../lib/humor/catalog';
import { analyzeText } from '../lib/coach/nlu';
import { buildGreetExtra } from '../lib/coach/greetExtra';

const NEW = ['smalltalk', 'wellness', 'apphelp'];
const MINE = SCENARIOS.filter((s) => NEW.includes(s.group));
const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 } },
};
const isEn = (q) => !/[а-яё]/i.test(q);
function chat(turns, o = {}) {
  let session = {};
  const history = [];
  return turns.map((q) => {
    setLang(isEn(q) ? 'en' : 'ru');
    const r = reply(q, RESULT, o.profile || {}, { history: history.slice(), session, tone: o.tone || 'playful', now: 1, extra: o.extra });
    session = r.session;
    history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId });
    return r;
  });
}
const one = (q, o) => chat([q], o)[0];
const txt = (r) => r.text.join('\n');
const sid = (r) => r.session.memory.lastScenario;
const vid = (r) => r.session.memory.lastVariant;
const BAD = /(^|[^A-Za-zА-Яа-я0-9_])(undefined|null|NaN|Infinity)([^A-Za-zА-Яа-я0-9_]|$)|\[object|\{[^}]*\}/;
afterEach(() => setLang('auto'));

describe('C1. целостность каталога групп 14–16', () => {
  test('каталог без проблем, объём и примеры', () => {
    expect(checkCatalog(SCENARIOS, CATALOG)).toEqual([]);
    expect(MINE.length).toBeGreaterThanOrEqual(30);
    MINE.forEach((sc) => {
      expect(sc.variants.length).toBeGreaterThanOrEqual(2);
      expect(sc.variants.some((v) => v.humorOk === false)).toBe(true);
      if (sc.positives.length) expect(sc.negatives.length).toBeGreaterThanOrEqual(3);
    });
    ['smalltalk', 'wellness', 'apphelp'].forEach((g) => expect(MINE.filter((s) => s.group === g).reduce((a, s) => a + s.variants.length, 0)).toBeGreaterThanOrEqual(30));
  });
  test('все темы покрыты', () => {
    ['st_howdo_you', 'st_bored', 'st_chat', 'st_good_mood', 'st_joy', 'st_bad_mood', 'st_tired_all', 'st_thanks_warm', 'st_character', 'st_joke', 'st_friends', 'st_goodnight', 'st_bye',
      'well_water_goal', 'well_water_log', 'well_vitamins', 'well_vitamins_dose', 'well_breath_how', 'well_breath_why', 'well_stress_light', 'well_pause',
      'app_level', 'app_rank', 'app_quests_help', 'app_quests_none', 'app_smart_quests', 'app_arcs', 'app_secret', 'app_theme', 'app_language', 'app_icon'].forEach((id) => expect(BY_ID[id]).toBeDefined());
  });
  test('чувствительных и юмористических конфликтов нет: у тяжёлых сценариев нет юмора', () => {
    ['st_bad_mood', 'st_tired_all', 'well_stress_light', 'well_vitamins_dose'].forEach((id) => BY_ID[id].variants.forEach((v) => expect(v.humorOk).toBe(false)));
  });
});

describe('C2. распознавание: позитивы и негативы', () => {
  const withPos = MINE.filter((s) => s.positives.length);
  test.each(withPos.map((s) => [s.id, s]))('%s: позитивы', (id, sc) => {
    sc.positives.forEach((q) => {
      const r = one(q, { profile: { weightKg: 70 }, extra: id === 'app_quests_none' ? undefined : undefined });
      expect([q, sid(r)]).toEqual([q, id]);
    });
  });
  test.each(MINE.map((s) => [s.id, s]))('%s: негативы', (id, sc) => {
    // правило сценария не срабатывает (нечёткое сравнение с фразами — отдельный слой, он проверяется своими тестами)
    sc.negatives.forEach((q) => { setLang(isEn(q) ? 'en' : 'ru'); expect([q, !!sc.match(analyzeText(q, {}), { sens: false, mem: {}, extra: null, tone: 'playful', ctx: { sensitive: {} } })]).toEqual([q, false]); });
  });
  test('«какие задания на сегодня» без данных заданий — честный ответ, с данными — прежний сценарий', () => {
    expect(sid(one('какие задания на сегодня'))).toBe('app_quests_none');
    const q = [{ id: 'x', title: 'Прогулка', why: 'Потому что день спокойный.', i18n: { ru: { title: 'Прогулка 10 минут', why: 'День спокойный.' }, en: { title: 'Walk', why: 'Calm day.' } } }];
    expect(sid(one('какие задания на сегодня', { extra: buildGreetExtra({ level: 5, quests: q, dayKey: 'k' }) }))).toBe('quest_today');
  });
});

describe('C3. содержание и честность', () => {
  test('цель по воде: по весу из профиля и общий ориентир без веса; не «норма»', () => {
    const a = txt(one('сколько воды пить?', { profile: { weightKg: 90 } }));
    expect(a).toMatch(/2,95 л/);
    const b = txt(one('сколько воды пить?', { profile: {} }));
    expect(b).toMatch(/2 л/);
    expect(BAD.test(a + b)).toBe(false);
    setLang('en');
    expect(txt(one('how much water should i drink', { profile: { weightKg: 60 } }))).toMatch(/L/);
  });
  test('витамины: без доз, дозировочный вопрос — к врачу', () => {
    const r = one('сколько принимать витамины?');
    expect(sid(r)).toBe('well_vitamins_dose');
    expect(txt(r)).toMatch(/врач|фармацевт/);
    expect(txt(r)).not.toMatch(/\d+ ?мг/);
  });
  test('ранг и уровень: текущие из данных, а без данных варианты без них', () => {
    const extra = buildGreetExtra({ level: 34, rankGreeted: 3, dayKey: 'k' });
    const seen = new Set();
    chat(Array(8).fill('что такое ранги?'), { extra, tone: 'off' }).forEach((r) => seen.add(txt(r)));
    expect([...seen].join(' ')).toMatch(/Травник/);
    chat(Array(8).fill('что такое ранги?'), { tone: 'off' }).forEach((r) => expect(txt(r)).not.toMatch(/«\s*»|undefined|\{/));
    const lv = chat(Array(6).fill('как растёт уровень?'), { extra, tone: 'off' }).map(txt).join(' ');
    expect(lv).toMatch(/уровень 34/);
  });
  test('секретные достижения: без спойлеров', () => {
    const t = chat(Array(4).fill('есть секретные достижения?'), { tone: 'off' }).map(txt).join(' ');
    ['steps20k', 'earlyBird', 'sleepNorm30', '20 000', '20000'].forEach((x) => expect(t).not.toMatch(new RegExp(x)));
  });
  test('приватность и память: локально, погода через сервис; очистка в Профиле', () => {
    expect(chat(Array(3).fill('приватность'), { tone: 'off' }).map(txt).join(' ')).toMatch(/Профил|телефон/);
    expect(txt(one('как очистить память?'))).toMatch(/Очистить память Хирона/);
    expect(txt(one('как убрать шутки'))).toMatch(/Юмор Хирона/);
  });
  test('«расскажи шутку»: при включённом юморе одна шутка, при «без шуток» — отказ без шутки; humorId не ставится', () => {
    const on = chat(Array(5).fill('расскажи шутку'), { tone: 'playful' });
    on.forEach((r) => { expect(sid(r)).toBe('st_joke'); expect(vid(r)).not.toBe('st_joke_off'); expect(r.humorId).toBe(null); });
    const off = one('расскажи шутку', { tone: 'off' });
    expect(vid(off)).toBe('st_joke_off');
    const afterNo = chat(['без шуток', 'расскажи шутку']);
    expect(vid(afterNo[1])).toBe('st_joke_off');
  });
  test('плохое настроение и усталость: мягко, без юмора, дыхание 4–6 в числе вариантов', () => {
    const t = chat(Array(5).fill('устал от всего'), { tone: 'playful' });
    t.forEach((r) => { expect(r.humorId).toBe(null); expect(BAD.test(txt(r))).toBe(false); });
    expect(t.map(txt).join(' ')).toMatch(/дыхани|пауз|воды/);
    const m = chat(Array(5).fill('у меня плохое настроение'), { tone: 'playful' });
    m.forEach((r) => expect(r.humorId).toBe(null));
  });
  test('тяжёлое состояние по-прежнему уходит в чувствительный сценарий, а не в разговор', () => {
    ['мне очень плохо, не хочу жить', 'у меня сильная боль в груди', 'паническая атака, не могу дышать'].forEach((q) => {
      expect(MINE.map((s) => s.id)).not.toContain(sid(one(q)));
    });
  });
});

describe('C4. ротация и качество текста', () => {
  const rot = ['как у тебя дела', 'скучно', 'поговори со мной', 'сколько воды пить', 'как делать дыхание 4-6', 'у меня стресс', 'что такое цифровая пауза', 'как растёт уровень', 'какой у тебя характер', 'спокойной ночи'];
  test.each(rot.map((q) => [q]))('«%s»: разные варианты подряд, текст без мусора', (q) => {
    const rs = chat(Array(6).fill(q), { tone: 'off', profile: { weightKg: 70 }, extra: buildGreetExtra({ level: 12, dayKey: 'k' }) });
    const vids = new Set(rs.map(vid));
    expect(vids.size).toBeGreaterThanOrEqual(3);
    rs.forEach((r) => { expect(BAD.test(txt(r))).toBe(false); expect(txt(r).length).toBeLessThan(700); });
    expect(vid(rs[0])).not.toBe(vid(rs[1]));
  });
  test('все варианты всех сценариев собираются без мусора на RU и EN', () => {
    MINE.forEach((sc) => {
      const q = (sc.positives.find((p) => !/[a-z]{3}/i.test(p)) || sc.phrasings && sc.phrasings[0] || sc.positives[0]);
      if (!q) return;
      const rs = chat(Array(Math.min(sc.variants.length + 1, 8)).fill(q), { tone: 'off', profile: { weightKg: 80 }, extra: buildGreetExtra({ level: 34, dayKey: 'k' }) });
      rs.forEach((r) => { expect(BAD.test(txt(r))).toBe(false); expect(txt(r).trim().length).toBeGreaterThan(0); });
    });
    const en = ['how are you feeling', 'i am bored', 'how much water should i drink', 'how do ranks work', 'tell me a joke', 'good night', 'bye', 'i am so stressed', 'digital pause', 'privacy'];
    en.forEach((q) => { const r = one(q, { tone: 'off', extra: buildGreetExtra({ level: 34, dayKey: 'k' }) }); expect(txt(r)).not.toMatch(/[А-Яа-яЁё]/); expect(BAD.test(txt(r))).toBe(false); });
  });
  test('«короче» после ответа сокращает, «почему» не ломается', () => {
    const rs = chat(['сколько воды пить?', 'короче', 'почему?'], { profile: { weightKg: 70 } });
    rs.forEach((r) => expect(BAD.test(txt(r))).toBe(false));
  });
});

describe('C5. расширение частых сценариев', () => {
  const nlu = (q) => analyzeText(q, {});
  test('новые варианты добавлены, рекомендации прежние', () => {
    const grew = { greet_hello: 13, plan_today: 15, steps_today: 12, sleep_last_night: 9, mot_lazy: 10, ctl_thanks: 14, scope_unknown: 14 };
    Object.entries(grew).forEach(([id, n]) => expect(BY_ID[id].variants.length).toBeGreaterThanOrEqual(n));
    const base = [];
    chat(Array(14).fill('что делать сегодня?'), { tone: 'off' }).forEach((r) => { expect(BAD.test(txt(r))).toBe(false); base.push(txt(r)); });
    expect(new Set(base).size).toBeGreaterThanOrEqual(8);
    // советы по тренировке в новых вариантах берутся из прежней логики ({baseTrain}), а не пишутся заново
    ['plan_today_b1', 'plan_today_b3', 'plan_today_b4'].forEach((id) => expect(JSON.stringify(BY_ID.plan_today.variants.find((v) => v.id === id))).toMatch(/baseTrain/));
  });
  test('новые формулировки распознаются прежними сценариями (с их условиями)', () => {
    const env = (mem) => ({ sens: false, mem: mem || {}, extra: null, history: [], tone: 'playful', ctx: { sensitive: {} }, s: { state: 'normal', hour: 10 }, now: 1 });
    ['какие планы на сегодня', 'что у нас на сегодня', 'what is the plan today', 'что планируем сегодня', 'whats the plan'].forEach((q) => expect([q, BY_ID.plan_today.match(nlu(q), env())]).toEqual([q, true]));
    ['шагов сколько', 'сколько щас шагов', 'сколько нашагал', 'step count today', 'how many steps have i done'].forEach((q) => expect([q, BY_ID.steps_today.match(nlu(q), env())]).toEqual([q, true]));
    ['в лом', 'впадлу сегодня', 'мне в лом', 'so lazy today', 'cant be bothered'].forEach((q) => expect([q, BY_ID.mot_lazy.match(nlu(q), env())]).toEqual([q, true]));
    ['хэлоу', 'дарова', 'салам', 'ку', 'hello there'].forEach((q) => expect([q, BY_ID.greet_first.match(nlu(q), env())]).toEqual([q, true]));
    ['какие планы на сегодня', 'шагов сколько'].forEach((q) => expect(BY_ID.mot_lazy.match(nlu(q), env()) || BY_ID.greet_first.match(nlu(q), env())).toBe(false));
    expect(BY_ID.steps_today.match(nlu('сколько шагов нужно в день'), env())).toBe(false);
  });
  test('«спасибо» в сленге и «не понял»: ответы без мусора, ротация', () => {
    chat(Array(5).fill('благодарочка'), { tone: 'off' }).forEach((r) => { expect(sid(r)).toBe('st_thanks_slang'); expect(BAD.test(txt(r))).toBe(false); });
    const vs = new Set(chat(Array(8).fill('спасибо'), { tone: 'off' }).map(vid));
    expect(vs.size).toBeGreaterThanOrEqual(5);
    const u = chat(Array(6).fill('неведомая абракадабра'), { tone: 'off' });
    expect(new Set(u.map(vid)).size).toBeGreaterThanOrEqual(5);
    u.forEach((r) => expect(BAD.test(txt(r))).toBe(false));
  });
  test('юмор выключен: ни мемов, ни шуток в новых группах', () => {
    ['скучно', 'как у тебя дела', 'я очень рад', 'расскажи шутку', 'пока', 'мне в лом'].forEach((q) => chat(Array(4).fill(q), { tone: 'off' }).forEach((r) => expect(r.humorId).toBe(null)));
  });
});

describe('C6. сквозные проверки через reply() (разговорные формы)', () => {
  const rid = (r) => r.route && r.route.id;
  const E2E = {
    st_chat: ['давай поболтать', 'давай потреплемся', 'хочу поболтать', 'поболтай со мной', 'поговори со мной', 'давай пообщаемся'],
    st_laugh: ['умираю со смеху', 'ахаха умираю со смеху', 'ору', 'ахах', 'ржу', 'лол'],
    st_workout_killed: ['эта тренировка меня убила', 'тренировка убила меня', 'меня убила эта пробежка', 'после зала я труп', 'ноги отваливаются после бега', 'тренировка меня доконала'],
  };
  Object.entries(E2E).forEach(([id, qs]) => test.each(qs.map((q) => [q]))(id + ' <- «%s»', (q) => {
    const r = one(q, { tone: 'playful' });
    expect(rid(r)).toBe(id);
    expect(BAD.test(txt(r))).toBe(false);
    if (id !== 'st_chat') expect(txt(r)).not.toMatch(/103|112|правда плохо/);
    if (id === 'st_workout_killed') { expect(r.humorId).toBe(null); expect(txt(r)).toMatch(/тренировк|нагрузк|отдох|восстанов/); }
  }));
  test('тревожные формулировки не уходят в шутливые сценарии', () => {
    ['после тренировки боль в груди и тренировка меня убила', 'я умираю, не могу дышать'].forEach((q) => expect(['st_laugh', 'st_workout_killed', 'st_chat']).not.toContain(rid(one(q))));
  });
});
