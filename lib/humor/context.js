// Чистый разбор текста пользователя: чувствительные темы, ситуации и погода, которую он назвал сам.
// Никаких побочных эффектов и сети.
const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е');

const RX = {
  pain: /(^|[^а-я])(боль|боли|болит|болят|болею|больно)|травм|ушиб|вывих|перелом|надорв|защемил|подвернул|растяжение|растянул|связк|порвал/,
  symptoms: /боль в груди|болит в груди|в груди болит|грудь болит|за грудин|сердце болит|жмет сердце|слабость в (руке|ноге|лице)|онемело лицо|перекос\w* лиц|спутанность|путается сознан|не могу (отдышаться|дышать)|в груди (давит|жмет|колет)|давит в груди|одышк|задыха|не хватает воздуха|головокруж|обморок|упал в обморок|потерял сознан|онемен|немеет|онемел|сильн\w* сердцебиен|сердце (колотит|бешено|выскакив)|в глазах темн|потемнело в глазах|тошнит|тошнот/,
  distress: /депресс|паник|мне тревожно|меня трево|(чувствую|испытываю) (вину|стыд|тревог)|ненавижу себя|подавлен|отчаян|не хочу жить|плачу|я неудачник|мне очень плохо|мне плохо на душе|выгорел|стыдно|расстроен|расстроил/,
  treatment: /лекарств|таблетк|препарат|дозировк|антибиотик|гипертони|диабет|инсулин|лечени|диагноз|рецепт|бета-блокатор|аритми|принимаю .{0,20}(мг|таблет)/,
  noJokes: /без шуток|не шути|хватит шутить|прекрати шутить|не смешно|шутки в сторону|серьезно|не понял|не поняла|не понимаю шутк/,
  positive: /ахах|хаха|хах|лол|😂|🤣|😄|😆|😅|смешно|ржу|кек/,
  tired: /устал|вымотан|нет сил|без сил|болею|заболел|простуд|температур/,
  reason: /потому что|так как|из-за|нет времени|времени нет|работа|завал|дождь|гроза/,
  guilt: /(пропустил|пропустила|не сходил|не сходила|не пошел|не пошла|забил|забила|сорвал|сорвалась|сорвался)[^.!?]{0,40}(трен|занят|пробеж|зал)|(трен|занят|пробеж|зал)[^.!?]{0,30}(пропустил|пропустила|не состоял)/,
  guiltFeel: /ужасно|винов|стыдно|плохо|расстро|корю|ненавижу|переживаю|казню|подвел|подвела/,
};

const ACT = [/бег|пробеж|побегать/, /силов|гантел|штанг|гиря|отжим|присед|турник/, /растяжк|стретч|йог/, /велосипед|(^|[^а-я])вело([^а-я]|$)|велик/, /плаван|бассейн/, /кардио|интервал|хиит|hiit/, /(^|[^а-я])зал([^а-я]|$)|тренажер/, /ходьб|прогулк|скандинав/, /лыж|скакал/];

// Числа из текста: «10 000», «10к» → цифры.
export function numbersIn(text) {
  let s = norm(text).replace(/(\d)[\s  ](\d{3})(?!\d)/g, '$1$2').replace(/(\d)[\s  ](\d{3})(?!\d)/g, '$1$2');
  s = s.replace(/\b(\d+)\s?[кk]\b/g, (_, n) => String(Number(n) * 1000)).replace(/десят\w+ тысяч/g, '10000');
  return (s.match(/\d+/g) || []).map(Number);
}

function roundChase(q, nums) {
  const target = nums.find((n) => n >= 1000 && n <= 100000 && n % 1000 === 0);
  const have = nums.find((n) => n >= 1000 && n % 1000 !== 0 && (target ? target - n > 0 && target - n <= 500 : 1000 - (n % 1000) <= 500));
  const verb = /добит|добра|догнат|докрут|добег|доходить|добавить до|дотянут|округл/.test(q);
  if (have != null && (target != null || verb)) return { n: have, m: target != null ? target : Math.ceil(have / 1000) * 1000 };
  return null;
}

// Погода, названная пользователем. kind: danger | inconvenient | good | null.
export function userWeather(text) {
  const q = norm(text);
  const num = q.match(/([+\-−–]?\s?\d{1,2})\s?(°|градус)/);
  const temp = num ? Number(num[1].replace(/[\s−–]/g, (c) => (c === ' ' ? '' : '-'))) : null;
  let cond = null;
  let level = null;
  if (/гроз|молни/.test(q)) { cond = 'storm'; level = 'danger'; }
  else if (/гололед|гололед|ледян|скользк/.test(q)) { cond = 'ice'; level = 'danger'; }
  else if (/сильн\w* жар|адск\w* жар|нестерпим|зной|жарища/.test(q) || (/жар/.test(q) && temp != null && temp >= 33) || (temp != null && temp >= 33)) { cond = 'heat'; level = 'danger'; }
  else if (/сильн\w* мороз|лютый|жутк\w* холод/.test(q) || (/мороз|холод/.test(q) && temp != null && temp <= -20) || (temp != null && temp <= -20)) { cond = 'frost'; level = 'danger'; }
  else if (/жарко|жара/.test(q)) { cond = 'warm'; level = 'inconvenient'; }
  else if (/мороз|холодно|(^|[^а-я])холод([^а-я]|$)/.test(q)) { cond = 'cold'; level = 'inconvenient'; }
  else if (/дожд|ливень|морос|мокр/.test(q)) { cond = 'rain'; level = 'inconvenient'; }
  else if (/ветер|ветрен|штормов/.test(q)) { cond = 'wind'; level = 'inconvenient'; }
  else if (/снег|метел/.test(q)) { cond = 'snow'; level = 'inconvenient'; }
  else if (/хорош\w+ погод|погода хорош|солнечно|ясно|тепло|солнышк/.test(q)) { cond = 'good'; level = 'good'; }
  const indoor = /(^|[^а-я])зал([^а-я]|$)|в зале|дома|в помещени|тренажер|бассейн|домашн|на дорожк/.test(q);
  const outdoor = /на улиц|пробеж|побегать|бегать|бежать|(^|[^а-я])бег([^а-я]|$)|прогулк|гулять|пойти|выйти|велосипед|парк|на пробежк/.test(q);
  const asked = /погод|за окном/.test(q);
  const training = /трен|бег|бежат|пробеж|прогул|гулят|велосипед|зал|выйти|пойти|заняться|разминк/.test(q);
  return { cond, level, temp, indoor, outdoor, asked, training };
}

// Главная функция. history — реплики диалога (используются только последние пользовательские).
export function detect(input, history) {
  const q = norm(input);
  const hist = Array.isArray(history) ? history : [];
  const mine = (m) => (Array.isArray(m.text) ? m.text.join(' ') : String(m.text || ''));
  const lastMine = hist.filter((h) => h && h.from === 'me').slice(-2).map(mine).map(norm);
  const everMine = hist.filter((h) => h && h.from === 'me').map(mine).map(norm);

  const sensitive = {
    pain: RX.pain.test(q),
    symptoms: RX.symptoms.test(q),
    distress: RX.distress.test(q),
    treatment: RX.treatment.test(q),
    noJokes: RX.noJokes.test(q),
  };
  const guilt = RX.guilt.test(q) && RX.guiltFeel.test(q);
  const recentSensitive = lastMine.some((x) => RX.pain.test(x) || RX.symptoms.test(x) || RX.distress.test(x) || RX.treatment.test(x));
  const earlierNoJokes = everMine.some((x) => RX.noJokes.test(x));
  const humorPositive = !sensitive.noJokes && RX.positive.test(q);

  const nums = numbersIn(q);
  const rc = roundChase(q, nums);
  const w = userWeather(q);
  const tired = RX.tired.test(q);
  const reason = RX.reason.test(q) || w.cond != null;
  const acts = ACT.filter((r) => r.test(q)).length;
  const planWord = /план|составил|расписал|график|программ|буду|собираюсь|хочу|решил/.test(q);

  const sit = new Set();
  if (/(^|\D)1749(\D|$)/.test(q)) sit.add('number_1749');
  if (!sit.has('number_1749') && !rc && /почему|откуда|странн|нормально ли|это (мало|много|плохо)/.test(q) && nums.some((n) => n >= 100 && n % 100 !== 0) && /шаг|пульс|калор|ккал/.test(q)) sit.add('odd_number');
  if (rc) sit.add('round_chase');
  if (acts >= 3 && planWord) sit.add('overloaded_plan');
  if (/таблиц|excel|эксел|трекер|по минутам|подробн\w+ (план|таблиц|расписан)|расписал.{0,15}по/.test(q)) sit.add('detailed_tracking');
  if (/(новичок|начинаю|первый день|впервые|только начал|никогда не (бегал|тренир))/.test(q) && /(марафон|каждый день|двойн|тяжел|максимум|сразу|10 ?км|по 2 час|до отказа|на износ)/.test(q)) sit.add('beginner_heavy');
  const simplify = /вместо|попроще|проще|упрост|облегч|только прогулк|лишь прогулк|коротк\w+ (прогулк|трен)|сократ\w+ (план|трен)/.test(q) && !w.cond;
  if (simplify) { sit.add('simplify'); sit.add('simple_plan'); sit.add('short_practical'); }
  if (/оказывается|можно было проще|а можно проще|так можно было|нашел способ|лайфхак/.test(q)) sit.add('easier_way');
  if (/(снизил|уменьшил|сократил|урезал|убрал).{0,20}(план|нагрузк|объем)|буду делать меньше|не потяну|слишком (много|амбициозн)/.test(q)) sit.add('plan_reduce');
  if (/передумал|передумала|отмен|не буду|поменял\w* план|изменил\w* план|решил\w* (не|вместо)|отложу|не пойду/.test(q) && !guilt && !tired) sit.add('plan_change');
  if (sit.has('plan_change') && /неожиданн|вдруг|внезапн|оказал|поворот/.test(q)) sit.add('plan_surprise');
  if (/(завтра|сегодня|вечером|утром).{0,30}(пойду|буду|сделаю).{0,30}(гулят|прогул|растяж|ходить)/.test(q) && !simplify) sit.add('plan_ok');
  if (/не дотянул|недотянул|чуть-чуть|слегка|на (пару|несколько) (минут|шагов)|немного (отстал|не дошел)/.test(q) && planWord) sit.add('minor_deviation');
  if (/(не хочется|лень|ленюсь|откладыва|тяну|никак не (начн|вы)|не могу заставить|идти ли|стоит ли идти|сомневаюсь|кроссовки|собираюсь,? но)/.test(q) && !tired && !RX.reason.test(q) && !sensitive.distress) sit.add('procrastination');
  if (/(тренд|тенденци|вывод|значит ли|это нормально|ухудшил|улучшил)/.test(q) && /(вчера|сегодня|один раз|одно измерение|только что|утром|одн\w+ значени)/.test(q) && nums.length) sit.add('single_trend');
  if (/(впервые|наконец|смог|получилось|пробежал|прошел|побил|рекорд|достиг|выполнил)/.test(q) && /(км|шаг|мин|тренир|подтяг|отжим|%|кг)/.test(q) && !sensitive.pain && !sensitive.symptoms) sit.add('achievement');
  if (/вернул(ся|ась) к|снова начал|возобновил|после (перерыва|паузы|отпуска)|вернулся в зал|вернулась в зал/.test(q)) sit.add('return_habit');
  if (guilt) sit.add('skip_guilt');
  const dangerOutdoor = w.level === 'danger' && w.cond && (w.outdoor || !w.indoor);
  if (dangerOutdoor && w.training && !w.indoor) sit.add('danger_weather_outdoor');

  const flags = [];
  for (const k of ['pain', 'symptoms', 'distress', 'treatment', 'noJokes']) if (sensitive[k]) flags.push(k);
  if (tired) flags.push('tired');
  if (/болею|заболел|простуд|температур/.test(q)) flags.push('illness');
  if (RX.distress.test(q)) flags.push('upset');
  if (reason) flags.push('reason_given');
  if (guilt) flags.push('skip_guilt');
  if (w.level === 'danger') { flags.push('danger_weather'); flags.push('danger'); }
  const blocked = sensitive.pain || sensitive.symptoms || sensitive.distress || sensitive.treatment || sensitive.noJokes || guilt || recentSensitive || earlierNoJokes;
  return { sensitive, blocked, guilt, humorPositive, situations: [...sit], flags, weather: w, nums, roundChase: rc, recentSensitive, earlierNoJokes };
}
