jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('../lib/i18n', () => ({ ...jest.requireActual('../lib/i18n'), RU: true }));

import { reply, answer, setCoachWeather } from '../lib/coachBrain';
import { CATALOG } from '../lib/humor/catalog';
import { HUMOR_CONFIG } from '../lib/humor/config';
import { detect } from '../lib/humor/context';
import { selectHumor } from '../lib/humor/select';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: {
    sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 },
    readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' },
  },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const MEME_TEXTS = CATALOG.flatMap((m) => m.variants);
const joined = (r) => r.text.join('\n');
const humorPara = (r) => r.text.find((p) => MEME_TEXTS.some((v) => p === v));
const Q1749 = 'Почему у меня в приложении 1749 шагов?';
const Q9980 = 'У меня 9980 шагов. Обязательно добить до 10000?';
const PLAN = 'Составил план: бег, силовая, растяжка и ещё вечером велосипед. Обычно почти не тренируюсь.';
const STORM = 'На улице гроза. Пойти на пробежку?';
const run = (q, o) => reply(q, RESULT, {}, o);
const coach = (r, extra) => ({ from: 'coach', text: r.text, humorId: r.humorId, ...extra });

afterEach(() => { setCoachWeather(null); });

test('1. без сети: fetch/XMLHttpRequest не вызываются', () => {
  const f = jest.fn(() => { throw new Error('network'); });
  const oldF = global.fetch; const oldX = global.XMLHttpRequest;
  global.fetch = f; global.XMLHttpRequest = f;
  try {
    [Q1749, Q9980, PLAN, STORM, 'Болит колено', 'Привет'].forEach((q) => run(q));
  } finally { global.fetch = oldF; global.XMLHttpRequest = oldX; }
  expect(f).not.toHaveBeenCalled();
});

test('2. мемы выводятся без кавычек, подписей и пояснений', () => {
  const r = run(Q9980);
  expect(r.humorId).toBeTruthy();
  const h = humorPara(r);
  expect(h).toBeTruthy();
  expect(h).not.toMatch(/[«»"“”']|мем|источник/i);
  expect(joined(r)).not.toMatch(/мем:|источник:|\{|humorId/i);
});

test('3. искренний бытовой вопрос допускает юмор', () => {
  const r = run(Q9980);
  expect(['mozhno_a_zachem', 'jab_round']).toContain(r.humorId);
  expect(r.text).toContain(r.humorId === 'jab_round' ? 'Круглое число красивое, но мы тренируем тебя, а не счётчик.' : 'Можно, а зачем?');
});

test('4. вопрос о 1749 шагах допускает мем', () => {
  const r = run(Q1749);
  expect(r.humorId).toBe('pochemu_1749');
  expect(r.text[0]).toMatch(/^Почему 1749\?/);
});

test('5. совпадение числа не отменяет проверку чувствительного контекста', () => {
  const r = run('Почему 1749 шагов? У меня болит колено');
  expect(r.humorId).toBeNull();
  expect(joined(r)).not.toMatch(/Почему 1749/);
  const r2 = run('Почему 1749 шагов? Кружится голова и одышка');
  expect(r2.humorId).toBeNull();
});

test('6. после шутки есть полезный ответ и уточнение', () => {
  for (const q of [Q1749, Q9980, PLAN, STORM]) {
    const r = run(q);
    expect(r.humorId).toBeTruthy();
    const rest = r.text.filter((p) => p !== humorPara(r));
    expect(rest.join(' ').length).toBeGreaterThan(60);
  }
  const r = run(Q1749);
  expect(r.text.slice(1).join(' ')).toMatch(/\?/);
});

test('7. неизвестная причина показателя не выдумывается', () => {
  const r = run(Q1749, { tone: 'off' });
  const txt = joined(r);
  expect(txt).toMatch(/нельзя|не определ|гадать/);
  expect(txt).not.toMatch(/потому что|из-за|вызван|связан/i);
  expect(txt).toMatch(/\?/);
});

test('8. число из мема не влияет на расчёты и рекомендации', () => {
  const a = run(Q1749, { tone: 'off' });
  const b = run('Почему у меня в приложении мало шагов?', { tone: 'off' });
  expect(joined(a)).not.toMatch(/1749/);
  expect(a.text).toEqual(b.text);
  const m = run('move', { tone: 'playful' });
  expect(m.text).toEqual(answer('move', RESULT, {}).text);
});

test('9. подкол про ситуацию и не унижает: нет тела, веса, возраста, интеллекта', () => {
  const jabs = CATALOG.filter((m) => m.kind === 'jab');
  expect(jabs).toHaveLength(5);
  jabs.forEach((j) => j.variants.forEach((v) => expect(v).not.toMatch(/тел[оау]|вес|жир|стар|возраст|глуп|туп|дурак|ленив|толст|слаб/i)));
  const r = run(PLAN);
  expect(r.humorId).toBe('jab_overload');
  expect(r.text[0]).toBe('План такой подробный, что ему самому нужен выходной.');
});

test('10. нет выдуманных привычек', () => {
  CATALOG.forEach((m) => m.variants.forEach((v) => expect(v).not.toMatch(/опять|как обычно|вечно|снова|всегда/i)));
  [Q1749, Q9980, PLAN, STORM, 'Мне лень идти бегать'].forEach((q) => expect(joined(run(q))).not.toMatch(/опять|как обычно|вечно|как всегда/i));
});

test('11. боль, травма и симптомы отключают юмор и дают понятный совет', () => {
  for (const q of ['У меня болит колено после бега, можно тренироваться?', 'Растянул связки, 9980 шагов, добить до 10000?', 'Боль в груди при беге', 'Закружилась голова и одышка', 'Онемела рука во время тренировки']) {
    const r = run(q, { tone: 'playful' });
    expect(r.humorId).toBeNull();
    expect(r.topic).toBe('safety');
    expect(joined(r)).toMatch(/прекрати|останови/i);
  }
  expect(joined(run('Боль в груди при беге'))).toMatch(/103|112|скорую/);
  expect(joined(run('Болит колено'))).toMatch(/врач/);
});

test('12. эмоциональное неблагополучие отключает подколы; вина за пропуск без юмора', () => {
  const r = run('Я пропустил тренировку и чувствую себя ужасно из-за этого.', { tone: 'playful' });
  expect(r.humorId).toBeNull();
  expect(r.topic).toBe('support');
  expect(joined(r)).toMatch(/Один пропуск не описывает/);
  expect(joined(r)).toMatch(/без наказания/);
  const d = run('Мне очень плохо, ничего не хочу, 9980 шагов, добить до 10000?', { tone: 'playful' });
  expect(d.humorId).toBeNull();
  const lazy = run('Мне лень идти, я устал и болею');
  expect(lazy.humorId).not.toBe('jab_sneakers');
});

test('13. «без шуток» соблюдается сразу и до конца диалога', () => {
  const r1 = run('Хватит шутить, серьёзно', { history: [] });
  expect(r1.session.dampened).toBe(true);
  expect(r1.humorId).toBeNull();
  expect(r1.text[0]).toMatch(/Понял|Принято/);
  const r2 = run(Q9980, { history: [{ from: 'me', text: ['Хватит шутить'] }, coach(r1)], session: r1.session });
  expect(r2.humorId).toBeNull();
  expect(r2.session.dampened).toBe(true);
  expect(r2.text[0]).not.toMatch(/Понял, без шуток/); // признание только на сам отрицательный отклик
  const r3 = run('Без шуток, почему 1749 шагов?');
  expect(r3.humorId).toBeNull();
  expect(r3.session.dampened).toBe(true);
  expect(joined(r3)).toMatch(/нельзя/);
  // даже если сессия потеряна, история запоминает просьбу
  expect(run(Q9980, { history: [{ from: 'me', text: ['не смешно'] }] }).humorId).toBeNull();
});

test('14. режим off полностью отключает юмор', () => {
  for (const q of [Q1749, Q9980, PLAN, STORM]) {
    const r = run(q, { tone: 'off' });
    expect(r.humorId).toBeNull();
    expect(r.text.some((p) => MEME_TEXTS.includes(p))).toBe(false);
  }
});

test('15. частота: окно из 5, без подряд в balanced, повторы в 15', () => {
  const hist = [];
  const flags = [];
  const qs = [Q9980, PLAN, Q1749, PLAN, Q9980, PLAN, 'Привет, как дела со сном?', Q1749, PLAN, Q9980, PLAN, Q1749];
  qs.forEach((q) => {
    hist.push({ from: 'me', text: [q] });
    const r = run(q, { history: hist.slice(0, -1) });
    hist.push(coach(r));
    flags.push(r.humorId);
  });
  for (let i = 0; i < flags.length; i++) {
    const w = flags.slice(Math.max(0, i - 4), i + 1).filter(Boolean);
    expect(w.length).toBeLessThanOrEqual(2);
    if (i && flags[i]) expect(flags[i - 1]).toBeFalsy();
  }
  // повтор одной реплики в 15 ответах недопустим
  const ids = flags.filter(Boolean);
  expect(new Set(ids).size).toBe(ids.length);
  // playful: до 3 из 5, подряд допустимо
  const ph = [];
  const pf = [];
  for (let i = 0; i < 10; i++) {
    const r = run(i % 2 ? PLAN : Q9980, { tone: 'playful', history: ph.slice() });
    ph.push({ from: 'me', text: ['x'] }, coach(r));
    pf.push(r.humorId);
  }
  for (let i = 0; i < pf.length; i++) expect(pf.slice(Math.max(0, i - 4), i + 1).filter(Boolean).length).toBeLessThanOrEqual(3);
  expect(HUMOR_CONFIG.modes.balanced.max).toBe(2);
  // повтор мема в пределах 15 блокируется напрямую
  const h15 = Array.from({ length: 14 }, () => ({ from: 'coach', text: ['x'], humorId: null }));
  h15.unshift({ from: 'coach', text: ['x'], humorId: 'jab_overload' });
  expect(run(PLAN, { history: h15 }).humorId).not.toBe('jab_overload');
  const h16 = [{ from: 'coach', text: ['x'], humorId: 'jab_overload' }, ...Array.from({ length: 15 }, () => ({ from: 'coach', text: ['x'], humorId: null }))];
  expect(run(PLAN, { history: h16 }).humorId).toBe('jab_overload');
});

test('16. нет подходящей шутки — есть обычный полезный ответ', () => {
  for (const q of ['Как улучшить сон?', 'Что с пульсом и HRV?', 'today', 'train', 'неведомая абракадабра']) {
    const r = run(q);
    expect(r.humorId).toBeNull();
    expect(r.text.length).toBeGreaterThan(0);
    expect(joined(r).length).toBeGreaterThan(40);
  }
});

test('17. погода не выдумывается', () => {
  const r = run('Идти бегать сегодня на улице? Как там погода?');
  expect(joined(r)).toMatch(/не знаю|не вижу/);
  expect(joined(r)).not.toMatch(/за окном (дождь|гроза|солнечно|ясно)/i);
  // устаревший кэш не используется
  setCoachWeather({ kind: 'storm', temp: 10, day: true, at: Date.now() - 3 * 3600000 });
  const stale = run('Идти бегать сегодня? Как там погода?');
  expect(joined(stale)).toMatch(/не знаю|не вижу/);
  expect(joined(stale)).not.toMatch(/последним данным/);
  // свежий кэш используется и назван источником
  setCoachWeather({ kind: 'storm', temp: 10, day: true, at: Date.now() - 60000 });
  const fresh = run('Идти бегать сегодня? Как там погода?');
  expect(joined(fresh)).toMatch(/последним данным/);
  expect(joined(fresh)).toMatch(/перенести/);
  // пользовательские условия приоритетнее кэша
  setCoachWeather({ kind: 'storm', temp: 10, day: true, at: Date.now() - 60000 });
  expect(joined(run('Погода хорошая, хочу пробежаться'))).not.toMatch(/перенести/);
});

test('18. дождь не отменяет тренировку в помещении; гроза переносит только улицу', () => {
  const r = run('Идёт дождь. Пойду в зал, тренироваться?');
  expect(joined(r)).toMatch(/в помещении|в зал/i);
  expect(joined(r)).not.toMatch(/отмени(ть|м)? тренировк(у|и)(?! )|перенес/i);
  expect(joined(r)).toMatch(/не повод отменять/);
  const st = run(STORM);
  expect(joined(st)).toMatch(/на улице.*перенести/);
  expect(joined(st)).toMatch(/дома или в зале/);
  const gym = run('Гроза, но я иду в зал, тренироваться?');
  expect(joined(gym)).toMatch(/В помещении заниматься можно/);
  const good = run('Погода хорошая, хочу потренироваться.');
  expect(joined(good)).toMatch(/не повод нагружаться/);
  expect(joined(good)).toMatch(/улицу или зал\?/);
});

test('19. юмор не меняет рекомендацию и факты', () => {
  for (const q of [Q1749, Q9980, PLAN, STORM, 'Мне лень идти, надо бы пробежаться', 'Передумал, отмена тренировки', 'Сегодня сделаю короткую прогулку вместо сложной тренировки.']) {
    const withH = run(q, { tone: 'playful' });
    const without = run(q, { tone: 'off' });
    expect(without.humorId).toBeNull();
    const rest = withH.text.filter((p) => !MEME_TEXTS.includes(p));
    if (withH.humorId === 'pochemu_1749') { expect(rest.length).toBe(without.text.length); continue; }
    expect(rest).toEqual(without.text);
    expect(withH.fact).toEqual(without.fact);
    expect(withH.next).toEqual(without.next);
  }
});

test('20. сломанный каталог не ломает чат', () => {
  const bad = [[], null, 'x', [{ id: 1 }], [{ id: 'a', variants: [], priority: 1, matchingIntents: [], contextualTriggers: [], blockedContexts: [] }], [null]];
  for (const catalog of bad) {
    if (Array.isArray(catalog) && catalog.length === 0) continue;
    const r = run(Q1749, { catalog });
    expect(r.humorId).toBeNull();
    expect(joined(r).length).toBeGreaterThan(40);
  }
  const trap = [{ get id() { throw new Error('boom'); }, variants: ['x'], priority: 9, matchingIntents: [], contextualTriggers: [], blockedContexts: [] }];
  expect(() => run(Q1749, { catalog: trap })).not.toThrow();
  expect(selectHumor({ input: 'x', ctx: null, intent: null, mode: 'balanced', history: [] })).toBeNull();
  expect(() => run(undefined)).not.toThrow();
  expect(() => run(Q1749, { history: 'bad', tone: 42, session: null })).not.toThrow();
});

test('21. первый ответ в диалоге может содержать шутку', () => {
  const r = run(Q1749, { history: [] });
  expect(r.humorId).toBe('pochemu_1749');
  expect(run(Q9980).humorId).toBeTruthy();
});

test('22. воспроизводимость: одинаковые вход, настройки и история дают одинаковый результат', () => {
  const h = [{ from: 'me', text: ['привет'] }, { from: 'coach', text: ['Привет'], humorId: null }];
  for (const q of [Q1749, Q9980, PLAN, STORM]) {
    const a = run(q, { history: h, tone: 'playful' });
    const b = run(q, { history: h.map((x) => ({ ...x })), tone: 'playful' });
    expect(a).toEqual(b);
  }
});

test('контракт reply: поля и ситуации', () => {
  const r = run(Q9980);
  expect(Object.keys(r).sort()).toEqual(['consumed', 'fact', 'holdSet', 'humorId', 'next', 'session', 'text', 'topic']);
  expect(run('today').topic).toBe('today');
  expect(detect('Передумал, вместо этого отмена').situations).toContain('plan_change');
  expect(detect('Вернулся к пробежкам после перерыва').situations).toContain('return_habit');
  expect(detect('Сегодня впервые пробежал 5 км').situations).toContain('achievement');
  expect(detect('Вчера пульс 70, это тренд?').situations).toContain('single_trend');
  expect(detect('Я новичок, хочу сразу бегать каждый день').situations).toContain('beginner_heavy');
  expect(detect('Веду таблицу, расписал всё по минутам').situations).toContain('detailed_tracking');
  expect(run('Мне лень идти бегать').humorId).toBe('jab_sneakers');
  expect(run('Ахах, почему 1749 шагов?', { tone: 'balanced' }).humorId).toBe('pochemu_1749');
});

test('красные флаги: срочная ветка с 103/112, без юмора; опорно-двигательная боль — прежняя ветка', () => {
  for (const q of ['У меня болит в груди после бега', 'Боль в груди и давит', 'Одышка в покое', 'Я потерял сознание на тренировке', 'Сердце колотится, 9980 шагов, добить?']) {
    const r = run(q, { tone: 'playful' });
    expect(r.humorId).toBeNull();
    expect(r.topic).toBe('safety');
    expect(joined(r)).toMatch(/103/);
    expect(joined(r)).toMatch(/112/);
    expect(joined(r)).toMatch(/за руль/);
  }
  expect(joined(run('Болит колено'))).not.toMatch(/103/);
});

test('склонение минут в round_chase', () => {
  const txt = (n) => joined(run('У меня ' + (10000 - n) + ' шагов, добить до 10000?', { tone: 'off' }));
  expect(txt(100)).toMatch(/меньше минуты/);
  expect(txt(200)).toMatch(/примерно 2 минуты/);
  expect(txt(300)).toMatch(/примерно 3 минуты/);
  expect(txt(500)).toMatch(/примерно 5 минут /);
  expect(txt(100)).not.toMatch(/1 минут /);
});
