// Чистый разбор текста пользователя: чувствительные темы, ситуации и погода, которую он назвал сам.
// Никаких побочных эффектов и сети.
import { safetyScan } from './safety';

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[’‘`´]/g, "'");

const RX = {
  pain: /(^|[^а-я])(боль|боли|болью|болит|болят|болею|больно)(?![а-я])|травм|ушиб|вывих|перелом|надорв|защемил|подвернул|растяжение|растянул|связк|порвал|\b(pain|pains|painful|hurt|hurts|hurting|ache|aches|aching|sore|injur\w*|sprain\w*|strain(ed)?|pulled (a |my )?(muscle|hamstring|calf|groin)|torn|fractur\w*|broke(n)? (my |a |an |the )?(arm|leg|foot|ankle|wrist|rib|ribs|finger|toe|bone|collarbone|nose|hand)|dislocat\w*|swollen|swelling|twisted my)\b/,
  symptoms: /боль в груди|болит в груди|в груди болит|грудь болит|за грудин|сердце болит|жмет сердце|слабость в (руке|ноге|лице)|онемело лицо|перекос\w* лиц|спутанность|путается сознан|не могу (отдышаться|дышать)|в груди (давит|жмет|колет)|давит в груди|одышк|задыха|не хватает воздуха|головокруж|кружится голов|голова кружится|закружил\w* голов|темнеет в глазах|в глазах темнеет|обморок|упал в обморок|потерял сознан|онемен|немеет|онемел|сильн\w* сердцебиен|сердце (колотит|бешено|выскакив)|в глазах темн|потемнело в глазах|тошнит|тошнот|\b(chest (pain|pains|pressure|tightness|hurts|(feels?|is) (tight|heavy|hurting|squeez\w*))|tight chest|(pain|pressure|tightness|tight) (in|around) (my )?chest|heart (is )?(racing|pounding|hurts|fluttering|skipping)|heart palpitations?|palpitations?|irregular (heart|pulse)\w*|skipp\w* (a )?beats?|short(ness)? of breath|can'?t breathe|cannot breathe|can'?t catch my breath|trouble breathing|difficulty breathing|struggling to breathe|breathless|faint(ed|ing)?|passed out|pass(ing)? out|black(ed|ing)? out|dizz\w*|light-?headed|numb(ness)?|tingling|face (is )?droop\w*|slurred|confus\w*|vision (went )?(dark|black|blurr\w*)|seeing (stars|spots)|nausea|nauseous|feel sick|throwing up|vomit\w*)\b/,
  distress: /депресс|паник|мне тревожно|меня трево|(чувствую|испытываю) тревог|ненавижу себя|подавлен|отчаян|плачу|я неудачник|мне очень плохо|мне плохо на душе|выгорел|\b(depress\w*|panic\w*|anxious|anxiety|feel(ing)? (so |really |very )?(hopeless|worthless|awful|miserable|down|terrible about myself)|hate myself|i'?m a failure|such a failure|want to die|don'?t want to (live|be here)|suicid\w*|kill myself|self-?harm|hurt myself|crying|i cry|overwhelmed|burn(ed|t)?[ -]?out|burnout|hopeless|desperate|so sad|feel (really )?bad|very low|i'?m not okay)\b/,
  treatment: /лекарств|таблетк|препарат|дозировк|антибиотик|гипертони|диабет|инсулин|лечени|диагноз|рецепт|бета-блокатор|аритми|принимаю .{0,20}(мг|таблет)|\b(medications?|meds|pills?|prescri\w+|dosage|doses?|antibiotics?|hypertension|diabet\w*|insulin|treatment|diagnos\w+|beta[- ]?blockers?|arrhythmia|i take .{0,20}(mg|tablets?))\b/,
  noJokes: /без шуток|не шути|хватит шутить|прекрати шутить|не смешно|шутки в сторону|серьезно|не понял|не поняла|не понимаю шутк|\b(no jokes|no more jokes|stop (joking|the jokes|with the jokes)|don'?t joke|not funny|jokes aside|be serious|seriously|i don'?t (get|understand) the joke|drop the jokes|cut the jokes)\b/,
  positive: /ахах|хаха|хах|лол|😂|🤣|😄|😆|😅|смешно|ржу|кек|\b(haha\w*|ha ha|lol|lmao|rofl|funny|hilarious)\b/,
  tired: /устал|вымотан|нет сил|без сил|болею|заболел|простуд|температур|\b(tired|exhausted|worn out|no energy|drained|sick|ill|flu|fever|have a cold|got a cold|caught a cold|under the weather)\b/,
  reason: /потому что|так как|из-за|нет времени|времени нет|работа|завал|дождь|гроза|\b(because|due to|no time|busy|at work|deadline|rain|storm|thunder\w*)\b/,
  guilt: /(пропустил|пропустила|не сходил|не сходила|не пошел|не пошла|забил|забила|сорвал|сорвалась|сорвался)[^.!?]{0,40}(трен|занят|пробеж|зал)|(трен|занят|пробеж|зал)[^.!?]{0,30}(пропустил|пропустила|не состоял)|(skipped|missed|didn'?t (go|do|make it)|blew off|bailed on|failed to)[^.!?]{0,40}(workout|training|session|gym|run|exercise)|(workout|training|session|gym|run)[^.!?]{0,30}(skipped|missed)/,
  dizzy: /головокруж|кружится голов|голова кружится|закружил\w* голов|темнеет в глазах|в глазах темнеет|потемнело в глазах|тошнит|тошнот|\b(dizz\w*|light-?headed|nausea|nauseous|feel sick|vision (went )?(dark|black|blurr\w*)|seeing (stars|spots))\b/,
  shame: /стыдно|стыжусь|мне стыд|чувствую вину|чувствую стыд|\b(ashamed|i feel guilty|feel guilty|feeling guilty|i feel bad about)\b/,
  noWorkout: /не (тренировал\w*|занимал\w*|ходил\w*|бегал\w*|двигал\w*)|давно не|заброси\w+|\b(haven'?t (worked out|trained|exercised|moved|been to)|fell off|stopped (training|working out))\b/,
  guiltFeel: /ужасно|винов|стыдно|плохо|расстро|корю|ненавижу|переживаю|казню|подвел|подвела|\b(terrible|awful|guilt\w*|ashamed|bad|upset|hate|blame|beat(ing)? myself|let (myself|you) down|disappointed|failure)\b/,
};

const ACT = [/\b(run|running|jog|jogging)\b/, /\b(strength|weights?|dumbbells?|barbell|kettlebell|push-?ups?|squats?|pull-?ups?|lifting)\b/, /\b(stretch\w*|yoga)\b/, /\b(cycling|bike|biking|bicycle)\b/, /\b(swim\w*|pool)\b/, /\b(cardio|intervals?|hiit)\b/, /\b(gym|treadmill)\b/, /\b(walk|walking|hik\w+)\b/, /\b(skiing|jump rope|skipping rope)\b/,
  /бег|пробеж|побегать/, /силов|гантел|штанг|гиря|отжим|присед|турник/, /растяжк|стретч|йог/, /велосипед|(^|[^а-я])вело([^а-я]|$)|велик/, /плаван|бассейн/, /кардио|интервал|хиит|hiit/, /(^|[^а-я])зал([^а-я]|$)|тренажер/, /ходьб|прогулк|скандинав/, /лыж|скакал/];

// Числа из текста: «10 000», «10к» → цифры.
export function numbersIn(text) {
  let s = norm(text).replace(/(\d)[\s  ](\d{3})(?!\d)/g, '$1$2').replace(/(\d)[\s  ](\d{3})(?!\d)/g, '$1$2');
  s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  s = s.replace(/\b(\d+)\s?[кk]\b/g, (_, n) => String(Number(n) * 1000)).replace(/десят\w+ тысяч|\bten thousand\b/g, '10000');
  return (s.match(/\d+/g) || []).map(Number);
}

function roundChase(q, nums) {
  const target = nums.find((n) => n >= 1000 && n <= 100000 && n % 1000 === 0);
  const have = nums.find((n) => n >= 1000 && n % 1000 !== 0 && (target ? target - n > 0 && target - n <= 500 : 1000 - (n % 1000) <= 500));
  const verb = /добит|добра|догнат|докрут|добег|доходить|добавить до|дотянут|округл|\b(get to|reach|top up|round (it )?up|finish off|make up the)\b/.test(q);
  if (have != null && (target != null || verb)) return { n: have, m: target != null ? target : Math.ceil(have / 1000) * 1000 };
  return null;
}

// Погода, названная пользователем. kind: danger | inconvenient | good | null.
export function userWeather(text) {
  const q = norm(text);
  const num = q.match(/([+\-−–]?\s?\d{1,3})\s?(°|градус|degrees?\b)/);
  let temp = num ? Number(num[1].replace(/[\s−–]/g, (c) => (c === ' ' ? '' : '-'))) : null;
  if (temp != null && /°\s?f\b|fahrenheit|degrees? f\b/.test(q)) temp = Math.round((temp - 32) / 1.8);
  let cond = null;
  let level = null;
  if (/гроз|молни|\b(thunder\w*|lightning)\b/.test(q)) { cond = 'storm'; level = 'danger'; }
  else if (/гололед|гололед|ледян|скользк|\b(ice|icy|black ice|sleet|slippery)\b/.test(q)) { cond = 'ice'; level = 'danger'; }
  else if (/сильн\w* жар|адск\w* жар|нестерпим|зной|жарища|\b(extreme heat|scorching|heat ?wave|unbearabl\w+|sweltering|boiling hot|blistering)\b/.test(q) || (/жар|\b(hot|heat)\b/.test(q) && temp != null && temp >= 33) || (temp != null && temp >= 33)) { cond = 'heat'; level = 'danger'; }
  else if (/сильн\w* мороз|лютый|жутк\w* холод|\b(severe frost|extreme cold|bitter(ly)? cold|freezing cold|arctic)\b/.test(q) || (/мороз|холод|\b(frost|cold|freezing)\b/.test(q) && temp != null && temp <= -20) || (temp != null && temp <= -20)) { cond = 'frost'; level = 'danger'; }
  else if (/жарко|жара|\b(hot|humid|muggy|sweaty)\b/.test(q)) { cond = 'warm'; level = 'inconvenient'; }
  else if (/мороз|холодно|(^|[^а-я])холод([^а-я]|$)|\b(cold|chilly|frost\w*|freezing)\b/.test(q)) { cond = 'cold'; level = 'inconvenient'; }
  else if (/дожд|ливень|морос|мокр|\b(rain\w*|drizzl\w*|shower|showers|pouring|wet)\b/.test(q)) { cond = 'rain'; level = 'inconvenient'; }
  else if (/ветер|ветрен|штормов|\b(wind|windy|breezy|gusts?|gale)\b/.test(q)) { cond = 'wind'; level = 'inconvenient'; }
  else if (/снег|метел|\b(snow\w*|blizzard)\b/.test(q)) { cond = 'snow'; level = 'inconvenient'; }
  else if (/хорош\w+ погод|погода хорош|солнечно|ясно|тепло|солнышк|\b(nice|good|great|lovely|beautiful) (weather|day)\b|\b(sunny|clear sky|clear skies|warm)\b/.test(q)) { cond = 'good'; level = 'good'; }
  const indoor = /(^|[^а-я])зал([^а-я]|$)|в зале|дома|в помещени|тренажер|бассейн|домашн|на дорожк|\b(gym|indoors?|at home|inside|treadmill|pool|home workout)\b/.test(q);
  const outdoor = /на улиц|пробеж|побегать|бегать|бежать|(^|[^а-я])бег([^а-я]|$)|прогулк|гулять|пойти|выйти|велосипед|парк|на пробежк|\b(outside|outdoors?|run|running|jog|jogging|walk|walking|hike|hiking|bike|biking|cycling|park|go out|step out|head out)\b/.test(q);
  const asked = /погод|за окном|\b(weather|outside)\b/.test(q);
  const training = /трен|бег|бежат|пробеж|прогул|гулят|велосипед|зал|выйти|пойти|заняться|разминк|\b(work ?out|train\w*|run|running|jog\w*|walk\w*|gym|bike|biking|cycl\w+|go out|head out|exercis\w+|hike|hiking)\b/.test(q);
  return { cond, level, temp, indoor, outdoor, asked, training };
}

// Главная функция. history — реплики диалога (используются только последние пользовательские).
export function detect(input, history) {
  const q = norm(input);
  const hist = Array.isArray(history) ? history : [];
  const mine = (m) => (Array.isArray(m.text) ? m.text.join(' ') : String(m.text || ''));
  const lastMine = hist.filter((h) => h && h.from === 'me').slice(-2).map(mine).map(norm);
  const everMine = hist.filter((h) => h && h.from === 'me').map(mine).map(norm);

  const sc = safetyScan(input);
  const sensitive = {
    pain: RX.pain.test(q) || sc.pain,
    symptoms: RX.symptoms.test(q) || sc.red,
    distress: RX.distress.test(q) || sc.distress || sc.crisis || sc.eating,
    treatment: RX.treatment.test(q) || sc.treatment,
    noJokes: RX.noJokes.test(q),
    crisis: sc.crisis, // самоповреждение/суицидальные мысли/таблетки: отдельный тёплый ответ и защитная пауза
    eating: sc.eating && !sc.crisis,
  };
  const shame = RX.shame.test(q);
  const guilt = (RX.guilt.test(q) && RX.guiltFeel.test(q)) || shame;
  const dizzy = RX.dizzy.test(q);
  const dizzyOnly = dizzy && !RX.symptoms.test(q.replace(new RegExp(RX.dizzy.source, 'g'), ' '));
  const gap = guilt && RX.noWorkout.test(q);
  const recentSensitive = lastMine.some((x) => { const z = safetyScan(x); return z.crisis || z.red || z.eating || z.distress; }) || lastMine.some((x) => RX.pain.test(x) || RX.symptoms.test(x) || RX.distress.test(x) || RX.treatment.test(x) || RX.shame.test(x) || (RX.guilt.test(x) && RX.guiltFeel.test(x)));
  const earlierNoJokes = everMine.some((x) => RX.noJokes.test(x));
  const humorPositive = !sensitive.noJokes && RX.positive.test(q);

  const nums = numbersIn(q);
  const rc = roundChase(q, nums);
  const w = userWeather(q);
  const tired = RX.tired.test(q);
  const reason = RX.reason.test(q) || w.cond != null;
  const acts = ACT.filter((r) => r.test(q)).length;
  const planWord = /план|составил|расписал|график|программ|буду|собираюсь|хочу|решил|\b(plan|planning|planned|schedule|program|routine|i'?ll|i will|going to|gonna|want to|decided)\b/.test(q);

  const sit = new Set();
  if (/(^|\D)1749(\D|$)/.test(q)) sit.add('number_1749');
  if (!sit.has('number_1749') && !rc && /почему|откуда|странн|нормально ли|это (мало|много|плохо)|\b(why|how come|weird|strange|odd|is (it|that) normal|too (low|high|many|few|much))\b/.test(q) && nums.some((n) => n >= 100 && n % 100 !== 0) && /шаг|пульс|калор|ккал|\b(steps?|pulse|heart rate|bpm|calor\w*|kcal)\b/.test(q)) sit.add('odd_number');
  if (rc) sit.add('round_chase');
  if (acts >= 3 && planWord) sit.add('overloaded_plan');
  if (/таблиц|excel|эксел|трекер|по минутам|подробн\w+ (план|таблиц|расписан)|расписал.{0,15}по|\b(spreadsheet|tracker|minute[- ]by[- ]minute|every minute|detailed (plan|schedule|spreadsheet|table))\b/.test(q)) sit.add('detailed_tracking');
  if (/(новичок|начинаю|первый день|впервые|только начал|никогда не (бегал|тренир)|\b(beginner|just (starting|started)|starting out|first day|never (ran|run|worked out|trained|exercised)|first time)\b)/.test(q) && /(марафон|каждый день|двойн|тяжел|максимум|сразу|10 ?км|по 2 час|до отказа|на износ|\b(marathon|every day|daily|double|heavy|max|maximum|straight away|right away|all[- ]out|10 ?km|2 hours|to failure|until exhaustion)\b)/.test(q)) sit.add('beginner_heavy');
  const simplify = /вместо|попроще|проще|упрост|облегч|только прогулк|лишь прогулк|коротк\w+ (прогулк|трен)|сократ\w+ (план|трен)|\b(instead of|simpler|simplify|keep it simple|just a walk|only a walk|short walk|short workout|make it easier|scale (it )?back)\b/.test(q) && !w.cond;
  if (simplify) { sit.add('simplify'); sit.add('simple_plan'); sit.add('short_practical'); }
  if (/оказывается|можно было проще|а можно проще|так можно было|нашел способ|лайфхак|\b(turns out|easier way|life ?hack|found a way|didn'?t know (it|you) (was|were|could)|that easy|so simple)\b/.test(q)) sit.add('easier_way');
  if (/(снизил|уменьшил|сократил|урезал|убрал).{0,20}(план|нагрузк|объем)|буду делать меньше|не потяну|слишком (много|амбициозн)|\b(reduc\w+|cut|lower\w*|scal\w+ down|trim\w*|dropp\w+) (the |my )?(plan|load|volume|workouts?)|\bdo less\b|can'?t manage|won'?t manage|too (much|ambitious)|bit(e)? off more/.test(q)) sit.add('plan_reduce');
  if (/передумал|передумала|отмен|не буду|поменял\w* план|изменил\w* план|решил\w* (не|вместо)|отложу|не пойду|\b(changed my mind|cancel\w*|won'?t (go|do)|not going to|chang\w+ (the |my )?plan|switch\w* (the |my )?plan|postpon\w+|i'?ll skip|skip it)\b/.test(q) && !guilt && !tired) sit.add('plan_change');
  if (sit.has('plan_change') && /неожиданн|вдруг|внезапн|оказал|поворот|\b(unexpected\w*|suddenly|out of nowhere|plot twist|surprise|surprising)\b/.test(q)) sit.add('plan_surprise');
  if (/(завтра|сегодня|вечером|утром).{0,30}(пойду|буду|сделаю).{0,30}(гулят|прогул|растяж|ходить)|\b(tomorrow|today|tonight|this evening|in the morning|this morning)\b.{0,30}(i'?ll|i will|going to|gonna|plan to).{0,30}\b(walk|stretch\w*|stroll)\b/.test(q) && !simplify) sit.add('plan_ok');
  if (/не дотянул|недотянул|чуть-чуть|слегка|на (пару|несколько) (минут|шагов)|немного (отстал|не дошел)|\b(just short|a bit short|slightly (short|under|behind)|few (minutes|steps) short|almost (made|hit|reached)|didn'?t quite|a little short|missed by)\b/.test(q) && planWord) sit.add('minor_deviation');
  if (/(не хочется|лень|ленюсь|откладыва|тяну|никак не (начн|вы)|не могу заставить|идти ли|стоит ли идти|сомневаюсь|кроссовки|собираюсь,? но|\b(don'?t feel like|can'?t be bothered|lazy|procrastinat\w*|putting (it )?off|keep (putting|delaying)|can'?t (get|make) myself|should i (even )?(go|bother)|not sure (if|whether) i should|sneakers|trainers|running shoes|want to,? but)\b)/.test(q) && !tired && !RX.reason.test(q) && !sensitive.distress) sit.add('procrastination');
  if (/(тренд|тенденци|вывод|значит ли|это нормально|ухудшил|улучшил|\b(trend|pattern|does (this|it) mean|is (this|it) normal|got worse|worse|improved)\b)/.test(q) && /(вчера|сегодня|один раз|одно измерение|только что|утром|одн\w+ значени|\b(yesterday|today|once|one (reading|measurement|value)|just now|this morning|single (value|reading))\b)/.test(q) && nums.length) sit.add('single_trend');
  if (/(впервые|наконец|смог|получилось|пробежал|прошел|побил|рекорд|достиг|выполнил|\b(i (finally )?(ran|walked|beat|reached|achieved|completed|finished|managed|did)|for the first time|personal best|new record|pr)\b)/.test(q) && /(км|шаг|мин|тренир|подтяг|отжим|%|кг|\b(km|miles?|steps?|min|minutes?|workouts?|pull-?ups?|push-?ups?|kg|lbs?)\b)/.test(q) && !sensitive.pain && !sensitive.symptoms) sit.add('achievement');
  if (/вернул(ся|ась) к|снова начал|возобновил|после (перерыва|паузы|отпуска)|вернулся в зал|вернулась в зал|\b(back (to|at|in) (the )?(gym|training|running|workouts?|exercis\w+)|(started|starting) (again|over)|restart\w*|resum\w+|after (a |my )?(break|pause|holiday|vacation|layoff|time off)|getting back into)\b/.test(q)) sit.add('return_habit');
  if (guilt) sit.add('skip_guilt');
  const dangerOutdoor = w.level === 'danger' && w.cond && (w.outdoor || !w.indoor);
  if (dangerOutdoor && w.training && !w.indoor) sit.add('danger_weather_outdoor');

  const flags = [];
  for (const k of ['pain', 'symptoms', 'distress', 'treatment', 'noJokes']) if (sensitive[k]) flags.push(k);
  if (tired) flags.push('tired');
  if (/болею|заболел|простуд|температур|\b(sick|ill|flu|fever|have a cold|got a cold|caught a cold)\b/.test(q)) flags.push('illness');
  if (RX.distress.test(q)) flags.push('upset');
  if (reason) flags.push('reason_given');
  if (guilt) flags.push('skip_guilt');
  if (w.level === 'danger') { flags.push('danger_weather'); flags.push('danger'); }
  const blocked = sensitive.crisis || sensitive.eating || sensitive.pain || sensitive.symptoms || sensitive.distress || sensitive.treatment || sensitive.noJokes || guilt || recentSensitive || earlierNoJokes;
  return { sensitive, blocked, guilt, gap, dizzy, dizzyOnly, humorPositive, situations: [...sit], flags, weather: w, nums, roundChase: rc, recentSensitive, earlierNoJokes };
}
