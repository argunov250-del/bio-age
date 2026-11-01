// Регрессия по ручной проверке демо-диалогов: защитная пауза после тревожного симптома, головокружение, стыд ≠ кризис,
// короткие продолжения и возвраты к теме, чередование основного блока, текст и порядок шутки в ответах-рекомендациях.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('../lib/i18n', () => ({ ...jest.requireActual('../lib/i18n'), RU: true }));

import { reply, setCoachWeather } from '../lib/coachBrain';
import { analyzeText } from '../lib/coach/nlu';
import { SCENARIOS } from '../lib/coach/scenarios';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const FULL = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const TIRED = { ...FULL, scores: { ...FULL.scores, readiness: { status: 'ok', score: 30 }, sleep: { status: 'ok', score: 45, hours: 5.2, norm: 7.5 } }, metrics: { ...FULL.metrics, sleepDuration: win(5.3) } };
const PARTIAL = { chrono: 40, bio: null, scores: { sleep: { status: 'ok', score: 72, hours: 6.8, norm: 7.5 } }, metrics: { steps: win(6500) } };
const MIN = 60000;
const wx = (kind, temp, extra) => ({ kind, temp, day: true, at: Date.now() - MIN, place: 'Москва', ...(extra || {}) });

function chat(turns, o = {}) {
  let session = {};
  const history = [];
  return turns.map((q) => {
    const r = reply(q, o.result === undefined ? FULL : o.result, {}, { history: history.slice(), session, tone: o.tone });
    session = r.session;
    history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId });
    return { ...r, t: r.text.join(' '), mem: r.session.memory };
  });
}
const TRAIN = /интервальн|силов\S+ (тренировк|с рабочими)|Организм готов к нагрузке|Можно нагружаться|подойдёт интервальная|Идти можно|Готовность высокая|день подходит для нагрузки/i;
const LOST = /Такой формулировки я не знаю|потерял нить|Про что именно|С чем помочь/;
afterEach(() => setCoachWeather(null));

describe('защитная пауза после тревожного симптома / боли', () => {
  test('25: после «боюсь, что умираю» уточнения не предлагают тренировку, повторяют главное и не шутят', () => {
    const [a, b, c, d] = chat(['боюсь, что умираю, мне трудно дышать', 'Что мне делать?', 'Это пройдёт?', 'Тренироваться сегодня?'], { tone: 'playful' });
    expect(a.mem.hold && a.mem.hold.kind).toBe('red');
    [b, c, d].forEach((r) => { expect(r.t).not.toMatch(TRAIN); expect(r.t).toMatch(/103|112/); expect(r.humorId).toBeNull(); expect(r.t).not.toMatch(LOST); });
    expect(c.t).toMatch(/предсказать не могу/);
    expect(c.t).toMatch(/врач/);
  });
  test('пауза держится: план дня, погода для тренировки и «ну давай» не дают нагрузку и не шутят', () => {
    const rs = chat(['Боль в груди после пробежки', 'Что мне делать сегодня?', 'Хочу пробежаться', 'Мне лень идти бегать', 'Идти бегать? Как погода?'], { tone: 'playful' });
    rs.slice(1).forEach((r) => { expect(r.t).not.toMatch(TRAIN); expect(r.humorId).toBeNull(); expect(r.t).toMatch(/безопасн|тренировк|нагруз/i); });
  });
  test('боль/травма тоже включает паузу, а «прошло» снимает её', () => {
    const [a, b, c, d, e] = chat(['Болит колено, идти бегать?', 'А если чуть-чуть?', 'Теперь всё прошло, боль прошла', 'Тренироваться сегодня?', 'Привет']);
    expect(a.mem.hold && a.mem.hold.kind).toBe('pain');
    expect(b.t).toMatch(/Даже понемногу сейчас не стоит/);
    expect(c.mem.hold).toBeNull();
    expect(c.t).toMatch(/отпустило/);
    expect(d.t).toMatch(TRAIN);
    expect(e.t).not.toMatch(/боль|безопасн/i);
  });
  test('«ладно» и «это нормально?» паузу не снимают', () => {
    const rs = chat(['После тренировки кружится голова', 'Ладно', 'Это нормально?', 'Тренироваться сегодня?']);
    expect(rs[2].mem.hold).not.toBeNull();
    expect(rs[2].t).toMatch(/нормальным я не могу/);
    expect(rs[3].t).not.toMatch(TRAIN);
  });
  test('пауза не переносится в новую сессию (память без hold)', () => {
    const r = chat(['боюсь, что умираю, мне трудно дышать'])[0];
    const { deserialize } = require('../lib/coach/memory');
    expect(deserialize(r.mem, { newSession: true }).hold).toBeNull();
  });
});

describe('головокружение — тревожный симптом', () => {
  test.each(['После тренировки кружится голова', 'у меня темнеет в глазах на пробежке', 'тошнит при нагрузке', 'головокружение после зала', 'голова кружится, идти на тренировку?'])('«%s»', (q) => {
    const r = chat([q], { tone: 'playful' })[0];
    expect(r.topic).toBe('safety');
    expect(r.t).not.toMatch(TRAIN);
    expect(r.humorId).toBeNull();
    expect(r.t).toMatch(/врач/);
    expect(r.mem.hold).not.toBeNull();
  });
});

describe('стыд и вина — поддержка, а не кризис', () => {
  test('26: «неделю не тренировался, мне стыдно» — мягкая поддержка без кризисного текста и без паузы', () => {
    const [a, b] = chat(['Я неделю не тренировался, мне стыдно', 'Но я правда ленивый'], { tone: 'playful' });
    expect(a.topic).toBe('support');
    expect(a.t).not.toMatch(/навредить|103|112|специалист|близким/);
    expect(a.t).toMatch(/Перерыв|пропуск/i);
    expect(a.humorId).toBeNull();
    expect(a.mem.hold && a.mem.hold.kind).toBe('soft');
    expect(b.t).not.toMatch(LOST);
    expect(b.humorId).toBeNull();
  });
  test.each(['Пропустил тренировку, мне ужасно стыдно', 'мне стыдно', 'I skipped my workout and feel guilty'])('«%s» — не кризис', (q) => {
    const r = chat([q])[0];
    expect(r.t).not.toMatch(/навредить|поговори с близким/);
  });
  test('настоящие сигналы безнадёжности остаются кризисным ответом', () => {
    const r = chat(['мне очень плохо, не хочу жить'])[0];
    expect(r.t).toMatch(/навредить|специалист|112/);
  });
});

describe('распознавание коротких вопросов и возвратов к теме', () => {
  test.each(['Что по сну?', 'А что по сну?', 'Вернёмся ко сну', 'Как мой сон?', 'сон'])('сон: «%s»', (q) => {
    const r = chat([q])[0];
    expect(r.t).toMatch(/7 ч 30 мин|Данных о сне/);
    expect(r.t).not.toMatch(LOST);
  });
  test('«Как у меня дела?» при частичных данных отвечает и называет то, что есть', () => {
    const r = chat(['Как у меня дела?'], { result: PARTIAL })[0];
    expect(r.t).not.toMatch(LOST);
    expect(r.t).toMatch(/6 ч 48 мин/);
    expect(r.t).not.toMatch(/Готовность/);
  });
  test('возврат к теме после другой темы', () => {
    const rs = chat(['Как мой сон?', 'А теперь про шаги', 'Кстати, кто ты?', 'Вернёмся ко сну']);
    expect(rs[3].t).toMatch(/7 ч 30 мин/);
  });
  test('NLU: признаки продолжений', () => {
    expect(analyzeText('А если ненадолго?').shortTime).toBe(true);
    expect(analyzeText('А если очень хочется?').wantMore).toBe(true);
    expect(analyzeText('хочу тренироваться').wantMore).toBe(false);
    expect(analyzeText('Но так хочется на улицу').wantMore).toBe(true);
    expect(analyzeText('Почему их нет?').whyShort).toBe(true);
    expect(analyzeText('Почему шагов меньше, чем в другом приложении?').whyShort).toBe(false);
    expect(analyzeText('Мне уже лучше, всё прошло').passed).toBe(true);
    expect(analyzeText('Лучше расскажи про сон').passed).toBe(false);
    expect(analyzeText('Это нормально?').passed).toBe(false);
    expect(analyzeText('Что мне делать вечером?').dayPart).toBe('evening');
  });
});

describe('короткие уточнения используют контекст (pending + последняя тема)', () => {
  test('6: «А если совсем чуть-чуть?» после лени — минимальный шаг', () => {
    const rs = chat(['Мне лень идти бегать', 'Ну не хочу', 'А если совсем чуть-чуть?']);
    expect(rs[2].t).toMatch(/10 минут ходьбы/);
    expect(rs[2].t).not.toMatch(LOST);
  });
  test('8: «А если очень хочется?» при усталости — мягкий вариант, а не меню', () => {
    const rs = chat(['Тренироваться сегодня?', 'А если очень хочется?'], { result: TIRED });
    expect(rs[1].t).toMatch(/мягкий вариант/);
    expect(rs[1].t).not.toMatch(TRAIN);
  });
  test('39: «Но так хочется на улицу» при усталости и хорошей погоде — спокойная прогулка', () => {
    setCoachWeather(wx('clear', 20));
    const rs = chat(['Тренироваться сегодня? Погода хорошая', 'Но так хочется на улицу'], { result: TIRED });
    expect(rs[1].t).toMatch(/прогулка или лёгкий велосипед/);
  });
  test('17: «Почему их нет?» после «нет данных» объясняет возможные причины без выдумок', () => {
    const rs = chat(['Нет данных о сне', 'Почему их нет?'], { result: null });
    expect(rs[1].t).toMatch(/разрешени|синхронизац/);
    expect(rs[1].t).not.toMatch(LOST);
  });
  test('24: реплика после шутки «умер после тренировки» — без юмора и без потери нити', () => {
    const rs = chat(['умер после тренировки, ахаха', 'Ага, завтра повторим', 'Тренироваться завтра?'], { tone: 'playful' });
    expect(rs[1].t).toMatch(/завтра/);
    expect(rs[1].humorId).toBeNull();
    expect(rs[2].t).toMatch(/На завтра заранее не отвечу/);
  });
  test('32: «А если ненадолго?» после грозы — ограничение по времени к тому же плану, а не возраст тела', () => {
    setCoachWeather(wx('storm', 18));
    const rs = chat(['Хочу пробежаться', 'А если ненадолго?', 'А в зале?']);
    expect(rs[1].t).toMatch(/небезопасно/);
    expect(rs[1].t).not.toMatch(/Возраст тела|VO2max/);
    expect(rs[2].t).toMatch(/В помещении заниматься можно/);
  });
  test('31: «А если пойти на пробежку?» после зала и дождя — условия те же, место новое', () => {
    setCoachWeather(wx('rain', 8));
    const rs = chat(['Что за окном? Пойду в зал, тренироваться?', 'А если пойти на пробежку?']);
    expect(rs[1].t).toMatch(/На улице можно|одеться по погоде/);
    expect(rs[1].t).not.toMatch(LOST);
  });
  test('37/38: «А дождь идёт?», «А в Москве?», «А завтра будет дождь?» понимаются в погодном контексте', () => {
    setCoachWeather(wx('rain', 8, { stale: true }));
    const a = chat(['Какая сейчас погода?', 'А дождь идёт?']);
    expect(a[1].t).not.toMatch(LOST);
    expect(a[1].t).toMatch(/устарело|нет/);
    setCoachWeather(wx('rain', 8));
    const b = chat(['Какая погода в Париже?', 'А в Москве?', 'А завтра будет дождь?']);
    expect(b[1].t).toMatch(/Москва: дождь, \+8°/);
    expect(b[2].t).toMatch(/Прогноза у меня нет/);
  });
  test('28: «Что мне делать вечером?» — вечерний план, а не принудительная тренировка', () => {
    const r = chat(['Что мне делать вечером?'])[0];
    expect(r.t).not.toMatch(TRAIN);
    expect(r.t).toMatch(/вечер|сон/i);
  });
  test('7/29: «почему» и «другой вариант» после ответов старых builders не теряют нить', () => {
    const a = chat(['У меня 9980 шагов. Обязательно добить до 10000?', 'А почему?', 'Другой вариант']);
    expect(a[1].t).toMatch(/сумма движения/);
    expect(a[2].t).not.toMatch(LOST);
    const b = chat(['Как улучшить сон?', 'Попроще', 'Не хочу так', 'Другой вариант']);
    expect(b[2].t).not.toMatch(/С чем помочь/);
    expect(b[3].t).toMatch(/нет|другой/i);
    expect(b[3].t).not.toMatch(LOST);
  });
  test('«почему» после запроса не про рекомендацию не объясняет старую рекомендацию', () => {
    const rs = chat(['Тренироваться сегодня?', 'У меня 9980 шагов. Обязательно добить до 10000?', 'А почему?']);
    expect(rs[2].t).not.toMatch(/Готовность сегодня/);
  });
  test('каталог: сценарии продолжений объявлены и не требуют памяти для позитивных примеров', () => {
    ['follow_short_time', 'follow_want_anyway', 'follow_why_data', 'follow_banter', 'follow_self_label', 'train_tomorrow', 'sens_hold_followup', 'sens_hold_release', 'sleep_overview', 'plan_evening', 'ctl_no_other'].forEach((id) => expect(SCENARIOS.some((s) => s.id === id)).toBe(true));
    SCENARIOS.filter((s) => s.group === 'hold').forEach((s) => s.variants.forEach((v) => expect(v.humorOk).toBe(false)));
  });
});

describe('вариативность: меняется основной блок, а не только хвост', () => {
  const rec = (t) => (t.match(/[^.!?]*(интервальн|силов|кардио|Лёгкая)[^.!?]*[.!?]/) || [''])[0].trim();
  test('4: пять одинаковых «Тренироваться сегодня?» — разные формулировки рекомендации', () => {
    const rs = chat(Array(4).fill('Тренироваться сегодня?'));
    expect(new Set(rs.map((r) => r.t)).size).toBe(4);
    expect(new Set(rs.map((r) => rec(r.t))).size).toBeGreaterThanOrEqual(3);
  });
  test('4: факты рекомендации те же (30–45 минут, интервальная или силовая) в каждой формулировке', () => {
    chat(Array(4).fill('Тренироваться сегодня?')).forEach((r) => expect(r.t).toMatch(/интервальная или силовая тренировка 30–45 минут/));
  });
  test('5: «Как мой сон?» четыре раза — четыре разных ответа с теми же цифрами', () => {
    const rs = chat(Array(4).fill('Как мой сон?'));
    expect(new Set(rs.map((r) => r.t)).size).toBe(4);
    rs.forEach((r) => expect(r.t).toMatch(/7 ч 30 мин/));
  });
  test('28/30: «Не повторяйся», «Другой вариант», «Ты это уже говорил», «Ещё» дают другой основной блок', () => {
    ['Не повторяйся', 'Другой вариант', 'Ты это уже говорил', 'Ещё'].forEach((cmd) => {
      const [a, b] = chat(['Тренироваться сегодня?', cmd]);
      expect(rec(b.t)).toBeTruthy();
      expect(rec(b.t)).not.toBe(rec(a.t));
    });
    const rs = chat(['Что мне делать вечером?', 'Другой вариант', 'Ты это уже говорил']);
    expect(rs[1].t).not.toBe(rs[0].t);
    expect(rs[2].t).not.toBe(rs[1].t);
  });
  test('когда другого варианта нет — честно говорим об этом и предлагаем сменить тему', () => {
    const rs = chat(['Что с пульсом и HRV?', 'Другой вариант']);
    expect(rs[1].t).toMatch(/честно нет/);
    expect(rs[1].t).toMatch(/Один шаг|назови тему/);
  });
  test('3: «подробнее» про пульс добавляет релевантное, а не общую отписку', () => {
    const rs = chat(['Что с пульсом и HRV?', 'А подробнее?']);
    expect(rs[1].t).toMatch(/HRV/);
    expect(rs[1].t).not.toMatch(/общий совет из базы знаний/);
  });
});

describe('текст и порядок шутки', () => {
  test('38: нет неграмматичного «для местного места»', () => {
    setCoachWeather(wx('rain', 8));
    const r = chat(['Какая погода в Париже?'])[0];
    expect(r.t).not.toMatch(/местного места/);
    expect(r.t).toMatch(/Местная погода сейчас: дождь, \+8°/);
  });
  test('33/46: в ответе о погоде и тренировке шутка идёт только после совета (или её нет)', () => {
    [['rain', 8, 'Тренироваться сегодня? Что там за окном?'], ['storm', 18, 'Хочу пробежаться'], ['storm', 18, 'Идти бегать? Что за окном?'], ['rain', 8, 'На улице дождь. Тренироваться сегодня?']].forEach(([kind, temp, q]) => {
      setCoachWeather(wx(kind, temp));
      ['playful', 'balanced'].forEach((tone) => {
        const r = chat([q], { tone })[0];
        if (!r.humorId) return;
        const advice = r.text.findIndex((p) => /Подойдёт|тренировк|помещени|перенести|зал/i.test(p));
        const joke = r.text.findIndex((p) => p === 'Погода решила добавить спецэффектов.' || /Можно, а зачем|Кроссовки готовы/.test(p));
        expect(joke).toBeGreaterThan(advice);
        expect(r.text[0]).not.toMatch(/спецэффект|Можно, а зачем|Кроссовки готовы/);
      });
    });
  });
  test('опасная погода (гроза): рекомендация идёт первой', () => {
    setCoachWeather(wx('storm', 18));
    const r = chat(['Хочу пробежаться'], { tone: 'playful' })[0];
    expect(r.text.join(' ')).toMatch(/перенести/);
    expect(r.text[0]).not.toMatch(/Погода решила|Можно, а зачем/);
  });
});

describe('мягкая пауза после тяжёлых переживаний', () => {
  test('без шуток и без давления с тренировкой, истекает через 3 хода', () => {
    const rs = chat(['мне очень плохо, я подавлен', 'Тренироваться сегодня?', 'Мне лень идти бегать', 'Как мой сон?', 'Тренироваться сегодня?'], { tone: 'playful' });
    expect(rs[0].mem.hold && rs[0].mem.hold.kind).toBe('soft');
    [1, 2].forEach((i) => { expect(rs[i].t).not.toMatch(TRAIN); expect(rs[i].humorId).toBeNull(); });
    expect(rs[1].t).toMatch(/без давления|важнее ты/);
    expect(rs[4].mem.hold).toBeNull();
    expect(rs[4].t).toMatch(TRAIN);
  });
  test('слова «я в порядке» снимают мягкую паузу сразу', () => {
    const rs = chat(['мне очень плохо, я подавлен', 'Я в порядке', 'Тренироваться сегодня?']);
    expect(rs[1].mem.hold).toBeNull();
    expect(rs[2].t).toMatch(TRAIN);
  });
  test('красный флаг не заменяется мягкой паузой', () => {
    const rs = chat(['Боль в груди после пробежки', 'мне очень плохо, я подавлен']);
    expect(rs[1].mem.hold.kind).toBe('red');
  });
});

describe('шаблоны и «Как улучшить сон?»', () => {
  test('после двоеточия подставленная рекомендация со строчной буквы', () => {
    const rs = chat(['Что мне делать сегодня?', 'Другой вариант', 'Ещё', 'Ещё', 'Ещё']);
    rs.forEach((r) => expect(r.t).not.toMatch(/: (Организм|День|Идти|Обычный|Тренироваться можно)/));
  });
  test('«Как улучшить сон?» четыре раза — четыре разных ответа', () => {
    const rs = chat(Array(4).fill('Как улучшить сон?'));
    expect(new Set(rs.map((r) => r.t)).size).toBe(4);
    expect(new Set(rs.map((r) => r.variant || r.mem.lastVariant)).size).toBe(4);
  });
});
