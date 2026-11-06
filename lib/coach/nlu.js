// Распознавание без модели: признаки (отрицание, время, формат, ограничения), продолжения
// диалога, возможности, ограничения данных, погода, «мусор» и несколько тем в одном сообщении.
// Совпадение подстроки НЕ достаточно: команды проверяются целиком (после снятия вежливых слов),
// «хочу/не хочу», прошедшее время и вопрос о прошлом ответе различаются отдельными признаками.
import { normalize, tokensOf } from './normalize';
import { conceptOf, TOPIC_OF_CONCEPT } from './lexicon';
import { stripBenignDeath } from '../humor/safety';

// Документированный приоритет (сверху вниз). Первый сработавший этап отвечает; остальные признаки
// сохраняются в nlu и могут влиять на подачу (формат, место, ограничения).
export const PRIORITY = [
  'sensitive_red',      // тревожные симптомы, неопределённое «умираю» → осторожный ответ; безопасность всегда первая
  'sensitive_legacy',   // боль/травма, лекарства, тяжёлое состояние, вина за пропуск (существующие правила)
  'joke_about_death',   // шуточное «умер после тренировки, ахаха» → нейтрально, без юмора
  'control',            // короткие команды управления: короче, подробнее, без шуток, спасибо, да, нет …
  'continuation',       // почему / проще / другой вариант / повтори — по сохранённому контексту
  'pending_answer',     // ответ на недавнее уточнение (место, что упростить, тема)
  'capability',         // кто ты, как работаешь, без интернета, как отключить юмор
  'data_limit',         // нет разрешений, нет синхронизации, другой период, свои данные
  'legacy_situation',   // существующие сценарии по ситуациям (about, why_metric, round_chase …)
  'weather',            // погода: текущая / сохранённая / другое место / прогноз
  'multi_topic',        // несколько тем → уточнение, с чего начать
  'scope',              // вне области / неоднозначно / мусор / неизвестно
  'legacy_topic',       // существующий поиск темы по ключевым словам
];

const B0 = '(?:^| )';
const B1 = '(?= |$)';
export const P = (src) => new RegExp(B0 + '(?:' + src + ')' + B1);

const FILLER = new Set(['пожалуйста', 'ну', 'а', 'и', 'тогда', 'хирон', 'давай', 'можешь', 'could you', 'can you', 'please', 'then', 'just', 'so', 'pls', 'hiron', 'chiron']);
const stripFiller = (n) => tokensOf(n).filter((w) => !FILLER.has(w)).join(' ');

// ───────────────────────── команды управления ─────────────────────────
const CONTROL = [
  ['thanks', P('спасибо( большое| тебе| огромное| хирон| вам| за помощь| за ответ| много| друг| за совет)*|благодарен|thanks( a lot| so much)?|thank you( so much)?|🙏')],
  ['nojokes', P('без шуток|не шути|хватит шутить|прекрати шутить|не смешно|шутки в сторону|без юмора|не надо шуток|хватит шуток|убери юмор|(no|stop) jokes|stop joking|not funny|jokes aside|no humor|drop the jokes')],
  ['funnier', P('повеселее|веселее|пошути|пошутить|шути больше|больше шуток|добавь юмора|побольше юмора|можно шутить|more jokes|be funnier|lighten up|more humor|joke( around)?')],
  ['short', P('короче|коротко|кратко|краткий ответ|без подробностей|не так длинно|сократи|в двух словах|тезисно|shorter|short|brief|briefly|keep it short|tldr|too long')],
  ['detailed', P('подробнее|подробно|расскажи подробнее|объясни( подробнее| подробно)?|поясни|разверни|расскажи больше|more detail|in detail|explain( more| it)?|elaborate|tell me more')],
  ['simpler', P('проще|а проще|слишком сложно|сложно|слишком много|поменьше|облегчи|simpler|simplify|easier|make it (simpler|easier)|too (complicated|complex|hard)')],
  ['norepeat', P('не повторяйся|ты повторяешься|(ты )?(это )?уже (это )?(говорил|говорила)|опять то же( самое)?|одно и то же|ты это уже говорил|stop repeating|you (already )?said that|you are repeating|same thing again')],
  ['repeat', P('повтори|скажи еще раз|еще раз|что ты сказал|не расслышал|повтори еще раз|say that again|repeat( that| it)?|again|what did you say')],
  ['why', P('почему|почему так|почему ты так считаешь|почему ты так советуешь|почему ты это советуешь|почему такой совет|почему такая рекомендация|с чего вдруг|зачем|на чем основан\\S*|why|why so|why is that|how come|why do you say that|why do you suggest that')],
  ['other', P('другой( вариант)?|другое|другие варианты|есть другие( варианты)?|есть другой( вариант)?|что нибудь другое|что-нибудь другое|другой вариант есть|давай по другому|по-другому|иначе|что еще|а что еще|еще|а еще|еще вариант\\S*|еще какие нибудь|something else|another( one| option)?|other options?|different one|what else|any other')],
  ['ok', P('ладно|ну ладно|хорошо|ок|понятно|ясно|понял|поняла|принято|ладно хорошо|хорошо понятно|fine|ok|got it|i see|alright|noted|sure thing|👍|👌|🙂')],
  ['no', P('нет|не надо|не нужно|не хочу|не буду|не хочется|не сейчас|нет не надо|пока нет|не хочу так|не хочу этого|не хочу это|так не хочу|не буду так|не хочется так|так не пойдет|не подходит|не то|no|not now|i do not want to|i don\'t want to|no thanks|no thank you')],
  ['yes', P('да|давай|хочу|можно|буду|поехали|да давай|да хочу|yes|sure|let\'s go|go on|go ahead|please do|lets go|of course')],
];

// Целое сообщение должно быть командой: «почему так» — да, «почему шагов меньше» — нет.
const ANCHORED = CONTROL.map(([id, rx]) => [id, new RegExp('^' + rx.source.replace(/^\(\?:\^\| \)/, '').replace(/\(\?= \|\$\)$/, '') + '$')]);

function controlCmd(norm) {
  const core = stripFiller(norm) || norm;
  if (!core) return null;
  for (const [id, rx] of ANCHORED) if (rx.test(core)) return id;
  // «ладно, спасибо», «хорошо, спасибо большое» → спасибо
  const parts = core.split(' ');
  if (parts.length <= 3 && CONTROL[0][1].test(core) && CONTROL.some(([k, r]) => (k === 'ok' || k === 'yes') && r.test(core))) return 'thanks';
  return null;
}

// «не понял» без контекста шутки — просьба объяснить проще (в detect() это же слово считалось отказом от шуток).
const NOT_UNDERSTOOD = P('не понял|не поняла|не понимаю|i do not understand|i don\'t understand|didn\'t get it|i didn\'t understand');

// ───────────────────────── возможности и данные ─────────────────────────
const CAPABILITY = [
  ['cap_humor_off', P('как (мне )?(отключить|выключить|убрать|отменить|убавить) (юмор|шутки|шутить)|(отключить|выключить|убрать) (юмор|шутки)|как сделать (чтобы )?(ты )?не шутил\\S*|(как|можно) (отключить|выключить) (юмор|шутки)|how (do i|to|can i) (turn off|disable|switch off|stop) (the )?(humor|jokes)|turn off (the )?(humor|jokes)|disable (the )?(humor|jokes)')],
  ['cap_clear', P('как (мне )?(очистить|удалить|стереть|сбросить) (твою |свою )?(память|историю|переписку)|очисти (свою |твою )?память|забудь (все|меня|нашу переписку)|clear (your )?memory|forget (everything|me)|how (do i|to) (clear|reset|erase) (your )?memory')],
  ['cap_ai', P('ты (настоящий |реальный |живой )?(ии|ai|искусственный интеллект|нейросеть|бот|робот|человек|chatgpt|gpt|программа|алгоритм)|ты настоящий|ты живой|ты нейросеть|ты языковая модель|are you (a |an )?(real |actual )?(ai|bot|robot|human|chatgpt|person|llm|language model)|is this (a real )?(ai|chatgpt)|real ai|(у тебя )?есть языковая модель|ты на основе (gpt|нейросети)|на чем ты работаешь|ты chatgpt')],
  ['cap_offline', P('(ты )?работа\\S* без (интернета|сети)|без интернета|без сети|офлайн|оффлайн|нужен ли (тебе )?интернет|нужен (тебе )?интернет|ты онлайн|ты работаешь онлайн|(do you|does it|can you) work (offline|without (the )?internet)|work(s)? offline|offline|without (the )?internet|need (the )?internet')],
  ['cap_privacy', P('где (хранятся|хранишь|лежат) (мои )?(данные|сообщения|переписка)|куда (уходят|отправляются|идут|деваются) (мои |все )?(данные|сообщения|сообщение|вопросы)|(ты )?отправля\\S* (мои |куда то )?(данные|сообщени\\S*|вопросы)|(ты )?(хранишь|сохраняешь|запоминаешь) (мои )?(данные|сообщени\\S*|переписку|вопросы)|кто (видит|читает) (мои )?(данные|сообщения|переписку)|конфиденциальн\\S*|приватн\\S*|мои данные (в безопасности|уходят)|where (does|do) my (data|messages) go|do you (store|send|share|save) my|who (sees|reads) my|privacy|is my data safe')],
  ['cap_whatknow', P('что (ты )?(знаешь|видишь|помнишь) (обо мне|про меня)|что ты обо мне знаешь|какие (мои )?данные (у тебя|ты видишь)|что у тебя (обо мне|есть обо мне)|что ты помнишь|what do you (know|see|remember) about me|what data do you have( on me)?')],
  ['cap_sources', P('откуда (берутся |ты берешь |берешь |у тебя )?(показатели|данные|цифры|шаги|значения|сон|пульс)|откуда эти (цифры|данные|показатели)|источник\\S* данных|что учитывает приложение|что ты учитываешь|where (do|does) (the |your )?(data|numbers|metrics|steps) come from|what (do you|does the app) (use|count|take into account)|data sources?')],
  ['cap_diagnose', P('(ты )?(умеешь|можешь|способен|способна) (ли )?(ставить |поставить )?диагноз\\S*|(ты )?умеешь ли ставить диагноз\\S*|ты врач|ты доктор|ты (можешь )?заменить врача|заменяешь врача|ты диагностируешь|(ты )?диагностируешь болезни|are you a doctor|can you diagnose|do you diagnose|can you replace (a|my) doctor')],
  ['cap_nounderstand', P('почему (ты )?(меня )?(не понимаешь|не понял|не поняла|не понимаете)|ты (меня )?(не понимаешь|не понял|не понимаешь)|ты ничего не понимаешь|ты глупый|ты тупой|ничего не понимает|why (don\'t|do not|can\'t) you understand|you (do not|don\'t) understand( me)?|you are (stupid|dumb)')],
  ['cap_can', P('что (ты )?(умеешь|можешь)|чем (ты )?(можешь )?помочь|чем ты полезен|твои возможности|как (ты )?работаешь|как ты устроен|как ты это делаешь|what can you do|how do you work|what are you able to do|how are you built|what are you good at')],
];

const DATA_LIMIT = [
  ['data_no_permission', P('нет разрешени\\S*|не (дал|дала|давал|давала) разрешени\\S*|разрешени\\S* (не|нет)|запретил\\S* доступ|нет доступа к (данным|health connect|здоровью)|не (дал|дала) доступ|(no|missing) permissions?|permission denied|access denied|did(n\'t| not) (give|grant) (permission|access)')],
  ['data_not_synced', P('(данные |шаги |сон )?не (обновил\\S*|синхронизир\\S*|подтянул\\S*|загрузил\\S*)|нет синхронизаци\\S*|давно не обновля\\S*|старые данные|данные (старые|устарели|не свежие|не свежие)|не обновляются|не подтягиваются|(not|isn\'t|aren\'t) (syncing|updating|updated|synced)|out of date|stale data|no sync')],
  ['data_source_unavailable', P('источник (недоступен|пропал|не работает)|health connect (не работает|недоступен|пропал|не подключ\\S*)|часы не (синхрон\\S*|подключ\\S*|видны|пишут)|браслет не (синхрон\\S*|подключ\\S*)|не вижу данных (с )?(часов|браслета)|нет данных с (часов|браслета)|нет данных|данных нет|нету данных|нет показателей|ничего не показывает|пусто|no data|there is no data|data is missing|nothing shows|watch (is )?not (syncing|connected)')],
  ['data_partial', P('только часть( данных)?|частичн\\S*( данные)?|не все данные|часть данных( есть| нет| пропала)?|неполные данные|данные неполные|partial( data)?|incomplete( data)?|only some( of the)? data|only part of')],
  ['data_period', P('(это |он |она )?за какой период|за какое время|за какие дни|это за (день|неделю|месяц)|(это )?среднее или за (день|вчера|сегодня)|какой период( у этих цифр)?|what period|which period|over what period|is (this|that) (a )?(daily|weekly|an) average')],
];
const USER_DATA = [
  ['sleep', /(?:^| )(?:я )?(?:спал|спала|поспал|поспала|слept|slept)(?: около| примерно| всего| только| about| around| only)? (\d{1,2}(?:[.,]\d)?) ?(?:ч|час\S*|часов|hours?|hrs?|h)(?= |$)/],
  ['steps', /(?:^| )(?:я )?(?:прошел|прошла|набрал|набрала|нашагал|нашагала|walked|did)(?: около| примерно| всего| только| about| around| only)? (\d{3,6}) ?(?:шаг\S*|steps?)(?= |$)/],
];

// ───────────────────────── признаки ─────────────────────────
const ACTS = [
  ['run', P('бег\\S*|побег\\S*|пробеж\\S*|бежат\\S*|run|running|jog|jogging')],
  ['strength', P('силов\\S*|гантел\\S*|штанг\\S*|отжим\\S*|присед\\S*|турник\\S*|качат\\S*|strength|weights?|lifting|push ?ups?|squats?')],
  ['stretch', P('растяжк\\S*|стретч\\S*|йог\\S*|мобильност\\S*|stretch\\S*|yoga|mobility')],
  ['cycle', P('велосипед\\S*|вело|велик\\S*|cycling|bike|biking')],
  ['swim', P('плаван\\S*|плыть|бассейн\\S*|swim\\S*|pool')],
  ['cardio', P('кардио|интервал\\S*|хиит|hiit|cardio|intervals?')],
  ['walk', P('ходьб\\S*|прогулк\\S*|прогуляться|погулять|гулять|ходить|пройтись|walk|walking|hike|hiking|stroll')],
];
const OUTDOOR_ACTS = new Set(['run', 'walk', 'cycle']);
const PLACES = [
  ['home', P('дома|домашн\\S*|в квартире|на дому|в комнате|home|at home|indoors?|inside')],
  ['gym', P('в зале|зал|в зал|спортзал\\S*|в спортзале|тренажерк\\S*|на тренажере|на дорожке|в бассейне|gym|treadmill|at the gym')],
  ['outdoor', P('на улице|на улицу|на воздухе|во дворе|в парке|на стадионе|на природе|outside|outdoors?|in the park')],
];
const WX_WORD = '(?:идет |будет |сейчас |опять |льет |очень |так )?(?:дожд\\S*|гроз\\S*|снег\\S*|ветер|ветрен\\S*|холодно|жарко|мороз\\S*|скользк\\S*|тепло|сыро|мокро|пасмурно|солнечно|ясно|градус\\S*|\\d+)';
const WANT_NEG = P('не хочу|не хочется|не буду|не собираюсь|не получится|неохота|нет желания|не в настроении|лень|не тянет|не могу себя заставить|don\'t want to|do not want to|no desire|can\'t be bothered|not in the mood');
const WANT_POS = P('хочу|хочется|буду|собираюсь|планирую|готов|готова|решил|решила|want to|going to|gonna|plan to|i\'ll|i will|ready to');
const PAST = P('вчера|позавчера|раньше|в прошлый раз|на прошлой неделе|месяц назад|давно|хотел|хотела|хотел бы|был|была|yesterday|last (week|time|month)|earlier|used to|wanted');
const MODAL_Q = P('можно( ли)?|нельзя( ли)?|разрешено|стоит ли|надо ли|нужно ли|мне можно|мне нельзя|should i|can i|may i|is it ok|am i allowed');
const ABOUT_PREV = P('почему ты (так )?(советуешь|говоришь|рекомендуешь|считаешь|предлагаешь|сказал\\S*|ответил\\S*)|почему (такой|такая|такое) (совет|ответ|рекомендация|вывод)|с чего ты взял\\S*|на чем (ты )?основан\\S* (совет|ответ|вывод)|why (do|did) you (suggest|recommend|say|think)|why that (advice|answer|recommendation)');
const TIME_LIMITED = P('мало времени|нет времени|времени нет|некогда|в спешке|быстр\\S*|очень занят\\S*|всего \\d+ мин\\S*|\\d+ мин\\S*|не много времени|short on time|no time|in a hurry|quick(ly)?|only \\d+ min\\S*|\\d+ min\\S*');
const AVOID_VERB = '(?:не хочу|без|не буду|не могу|нельзя|не надо|не хочется|не получится|кроме|не люблю|не бегать|don\'t want|no|without|can\'t|cannot|not)';
// Человек сам сообщает, что симптом прошёл: снимает защитную паузу (только не вопросом «это нормально?»).
const PASSED = P('(?:это |все |оно )?(?:уже )?(?:прошло|прошла|прошел|отпустило|отпустил|полегчало|улеглось)|(?:мне |мне уже )(?:стало )?(?:лучше|легче)|стало (?:лучше|легче)|уже (?:лучше|легче)|все (?:хорошо|нормально|ок|в порядке)|я в порядке|в порядке|нормально себя чувствую|чувствую себя (?:нормально|хорошо|лучше)|головокружение прошло|боль прошла|it (?:has )?passed|it(?:\'s| is) gone|(?:i am|i\'m) (?:fine|ok|okay|better)|feel(?:ing)? (?:fine|better|ok|okay|normal)|all good|everything(?:\'s| is) (?:fine|ok|okay)');
const WORD_PAD = (n) => ' ' + n + ' ';

const TOPIC_LEX = [
  ['sleep', P('сон\\S*|сна|спат\\S*|сплю|засып\\S*|бессонниц\\S*|просып\\S*|выспа\\S*|sleep\\S*|insomnia')],
  ['train', P('трен\\S*|бег\\S*|побег\\S*|зал\\S*|спорт\\S*|качат\\S*|нагрузк\\S*|интервал\\S*|train\\S*|workout\\S*|gym|exercise')],
  ['steps', P('шаг\\S*|ходь\\S*|гуля\\S*|прогулк\\S*|steps?|walk\\S*')],
  ['heart', P('пульс\\S*|hrv|сердц\\S*|давлен\\S*|heart|pulse|pressure')],
  ['stress', P('стресс\\S*|нерв\\S*|тревог\\S*|устал\\S*|выгор\\S*|stress\\S*|anxi\\S*|tired|burnout')],
  ['weight', P('вес|веса|весу|похуд\\S*|калор\\S*|питани\\S*|еда|еды|диет\\S*|weight|calor\\S*|diet')],
  ['weather', P('погод\\S*|дожд\\S*|гроз\\S*|снег\\S*|weather|rain\\S*|storm')],
  ['cycle', P('цикл\\S*|месячн\\S*|овуляц\\S*|period|cycle|ovulat\\S*')],
  ['age', P('возраст\\S*|биовозраст\\S*|стар\\S*|age|aging')],
];
export const TOPIC_NAMES = {
  sleep: ['сон', 'sleep'], train: ['тренировки', 'training'], steps: ['шаги', 'steps'], heart: ['пульс и HRV', 'heart rate and HRV'], stress: ['стресс', 'stress'],
  weight: ['вес и питание', 'weight and food'], weather: ['погода', 'weather'], cycle: ['цикл', 'cycle'], age: ['возраст тела', 'body age'],
};

const WX = {
  ask: P('погод\\S*|за окном|будет( ли)? (дожд\\S*|снег\\S*|гроз\\S*|ветер|холодно|жарко|тепло)|will it (rain|snow)|is it (raining|snowing)|что на улице|как на улице|какая сейчас погода|weather|what\'s it like outside|how is it outside'),
  forecast: P('завтра|послезавтра|вечером|утром|днем|ночью|попозже|позже|через (час|пару часов|\\d+ \\S+)|на выходных|на неделе|на этой неделе|на следующей неделе|прогноз\\S*|tomorrow|tonight|later|this evening|this morning|this weekend|weekend|this week|next week|forecast'),
  missing: P('ветер|ветра|порывы|ощущается|по ощущениям|влажност\\S*|давление воздуха|осадки|осадков|вероятность (дождя|осадков)|уф|ультрафиолет\\S*|wind|feels like|humidity|precipitation|chance of rain|uv'),
  geo: P('геолокаци\\S*|местоположени\\S*|геопозици\\S*|gps|location'),
  walk: P('прогулк\\S*|погулять|гулять|пройтись|walk|stroll'),
};

const KEY_ROWS = ['qwert', 'werty', 'asdf', 'sdfg', 'zxcv', 'йцук', 'цукен', 'фыва', 'ывап', 'ячсм', 'qaz', 'wsx', 'ghjk', 'jkl'];
const VOWELS = /[аеёиоуыэюяaeiouy]/;

export function isGibberish(raw, norm) {
  const r = String(raw || '').trim();
  if (!r) return false;
  const words = tokensOf(norm).filter((w) => /[a-zа-я]/.test(w));
  if (!words.length) return !/\d/.test(norm || '') && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(r); // только знаки препинания
  return words.every((w) => {
    if (w.length < 4) return false;
    if (!VOWELS.test(w)) return true;
    if (KEY_ROWS.some((k) => w.includes(k))) return true;
    if (w.length >= 6 && new Set(w).size <= 3) return true;
    const cons = w.match(/[^аеёиоуыэюяaeiouy\d\-']{5,}/);
    return !!cons && w.length <= 9; // «прпрпрщ»
  });
}

function findAct(norm) {
  for (const [id, rx] of ACTS) if (rx.test(norm)) return id;
  return null;
}

function avoidedAct(norm) {
  for (const [id, rx] of ACTS) {
    const src = rx.source.replace(/^\(\?:\^\| \)/, '').replace(/\(\?= \|\$\)$/, '');
    const w = new RegExp(B0 + AVOID_VERB + '(?: \\S+){0,2} (?:' + src + ')' + B1);
    if (w.test(norm)) return id;
  }
  // «не хочу бегать» → run, «без бега» → run
  if (P('(?:не хочу|без|не буду|не могу|нельзя) (?:бегать|бега|бег|пробежек|пробежку)').test(norm)) return 'run';
  return null;
}

export function userNumbers(norm) {
  const out = {};
  for (const [kind, rx] of USER_DATA) {
    const m = norm.match(rx);
    if (m) out[kind] = Number(String(m[1]).replace(',', '.'));
  }
  return out;
}

// Главная функция. mem — память диалога (может быть null), env — { weatherPlace }.
export function analyzeText(raw, mem, env) {
  const rawStr = typeof raw === 'string' ? raw : '';
  const norm0 = normalize(rawStr);
  // «на улице дождь» — это погода, а не место занятия
  const norm = norm0.replace(new RegExp(B0 + 'на улице ' + WX_WORD, 'g'), (m) => m.replace('на улице', 'за окном'));
  const padded = WORD_PAD(norm);
  const tokens = tokensOf(norm);
  const emojiOnly = !norm && /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(rawStr);
  const f = {
    raw: rawStr, norm, tokens, len: rawStr.length, isQuestion: /\?/.test(rawStr),
    empty: !rawStr.trim(),
    cont: emojiOnly ? 'ok' : null, pure: emojiOnly,
    capability: null, dataLimit: null, userData: userNumbers(norm),
    want: null, past: false, modalQuestion: false, aboutPrev: false,
    format: null, place: null, outdoorAct: false, timeLimited: false, minutes: null,
    activity: null, avoid: null, topics: [], multiTopic: false, gibberish: false, ambiguous: false, unsupported: null,
    notUnderstood: false, altRequest: false, nothingHard: false, passed: false, reject: false, dayPart: null, whyShort: false, tomorrow: false, shortTime: false, wantMore: false,
    wx: { askCond: false, geo: false, ask: false, forecast: false, missing: false, walk: false, otherPlace: null },
  };
  if (f.empty) return f;
  f.gibberish = isGibberish(rawStr, norm) || /^([a-zа-яё])\1{4,}$/i.test(rawStr.trim());
  if (!emojiOnly) {
    const c = controlCmd(norm);
    if (c) { f.cont = c; f.pure = true; }
    else if (NOT_UNDERSTOOD.test(norm) && stripFiller(norm).split(' ').length <= 4) { f.cont = 'simpler'; f.pure = true; f.notUnderstood = true; }
    else if (ABOUT_PREV.test(norm)) { f.cont = 'why'; f.pure = true; f.aboutPrev = true; }
  }
  f.passed = PASSED.test(norm);
  f.reject = P('не хочу (?:так|этого|это)|так не хочу|не буду так|не хочется так|не подходит|не то|не вариант|so no|not like that').test(norm);
  f.format = f.cont === 'short' ? 'short' : f.cont === 'detailed' ? 'detailed' : f.cont === 'simpler' ? 'simpler' : null;
  if (!f.format) {
    if (P('коротко|кратко|в двух словах|briefly|short answer').test(norm)) f.format = 'short';
    else if (P('подробно|развернуто|с объяснением|in detail|detailed').test(norm)) f.format = 'detailed';
    else if (P('простыми словами|попроще|проще|simply|in simple words').test(norm)) f.format = 'simpler';
  }
  for (const [id, rx] of CAPABILITY) if (rx.test(norm)) { f.capability = id; break; }
  for (const [id, rx] of DATA_LIMIT) if (rx.test(norm)) { f.dataLimit = id; break; }
  f.want = WANT_NEG.test(norm) ? 'neg' : WANT_POS.test(norm) ? 'pos' : null;
  f.past = PAST.test(norm);
  f.modalQuestion = MODAL_Q.test(norm);
  f.aboutPrev = f.aboutPrev || ABOUT_PREV.test(norm);
  for (const [id, rx] of PLACES) if (rx.test(norm)) { f.place = id; break; }
  f.avoid = avoidedAct(norm);
  f.activity = (() => { const a = findAct(norm); return a && a !== f.avoid ? a : (a ? ACTS.map(([i, r]) => (i !== f.avoid && r.test(norm) ? i : null)).find(Boolean) || null : null); })();
  f.outdoorAct = !!f.activity && OUTDOOR_ACTS.has(f.activity);
  f.timeLimited = TIME_LIMITED.test(norm);
  const mm = norm.match(/(\d{1,3}) ?(?:мин\S*|min\S*)/);
  if (mm) f.minutes = Number(mm[1]);
  f.topics = TOPIC_LEX.filter(([, rx]) => rx.test(norm)).map(([id]) => id);
  // синонимы и разговорные формы из лексикона («дрыхнуть» -> сон, «качалка» -> тренировка, «вымотан» -> стресс/усталость)
  for (const w of tokens) { const t = TOPIC_OF_CONCEPT[conceptOf(w)]; if (t && !f.topics.includes(t)) f.topics.push(t); }
  {
    const core = stripFiller(norm).replace(/^(но|а|ну) /, '');
    f.whyShort = !f.cont && /^(почему|отчего|зачем|why)( |$)/.test(core) && core.split(' ').length <= 4 && !f.topics.some((x) => x !== 'weather');
  }
  const sentences = rawStr.split(/[.!?;\n]+/).filter((x) => x.trim()).length;
  // длинное сообщение делится на части («.», «;», «и ещё», «а также», «плюс»): разные темы в разных частях = несколько тем
  const parts = norm.split(/ (?:и еще|а также|плюс|and also|as well as|plus) |(?<=[^ ])[.!?;\n]+/).length > 1 ? rawStr.toLowerCase().replace(/ё/g, 'е').split(/[.!?;\n]+| и еще | а также | плюс | and also | as well as /) : [norm];
  const partTopics = new Set();
  let partsWithTopic = 0;
  for (const part of parts) {
    const pn = normalize(part);
    const ts = new Set(TOPIC_LEX.filter(([, rx]) => rx.test(pn)).map(([id]) => id));
    for (const w of tokensOf(pn)) { const t = TOPIC_OF_CONCEPT[conceptOf(w)]; if (t) ts.add(t); }
    if (ts.size) partsWithTopic++;
    ts.forEach((t) => partTopics.add(t));
  }
  f.multiTopic = f.topics.length >= 3 || (f.topics.length >= 2 && (f.len > 120 || sentences >= 3)) || (parts.length >= 2 && partsWithTopic >= 2 && partTopics.size >= 2 && f.len > 40);
  // погода
  f.wx.ask = WX.ask.test(norm);
  f.wx.forecast = WX.forecast.test(norm);
  f.wx.missing = WX.missing.test(norm);
  f.wx.walk = WX.walk.test(norm);
  f.wx.geo = WX.geo.test(norm);
  f.altRequest = P('предложи\\S*|что нибудь|что-нибудь|чем заменить|альтернатив\\S*|вместо|suggest\\S*|alternative\\S*|instead').test(norm);
  f.nothingHard = P('не хочу( сегодня)? (ничего )?(сложн\\S*|тяжел\\S*)|ничего (сложного|тяжелого)|без сложного|nothing (hard|complicated|heavy)|don\'t want anything (hard|complicated|heavy)').test(norm);
  const city = rawStr.match(/погод\S*\s+(?:в|во|для|у)\s+([A-ZА-ЯЁ][a-zа-яё-]{2,})/) || rawStr.match(/(?:в|во)\s+([A-ZА-ЯЁ][a-zа-яё-]{2,})\s+(?:сейчас\s+)?(?:погод|дожд|гроз|снег|холодн|жарко)/);
  const wxFollow = !!(mem && /^wx_/.test(String(mem.lastScenario || '')));
  if (!city && wxFollow) {
    const c2 = rawStr.match(/^\s*[аА]?\s*(?:в|во|для)\s+([A-ZА-ЯЁ][a-zа-яё-]{2,})\s*[?!.]*\s*$/);
    if (c2) { f.wx.otherPlace = normalize(c2[1]); f.wx.ask = true; }
  }
  if (city) f.wx.otherPlace = normalize(city[1]);
  // «А дождь идёт?» — вопрос о текущих условиях и без слова «погода»
  f.wx.askCond = P('будет( ли)? (дожд\\S*|снег\\S*|гроз\\S*|ветер|холодно|жарко|тепло)|will it (rain|snow)').test(norm);
  if (f.isQuestion && tokens.length <= 5 && P('(дождь|снег|гроза|град|ветер) (идет|идут|есть|будет)|(идет|есть|будет) (ли )?(дождь|снег|гроза|град)|is it (raining|snowing)').test(norm)) f.wx.ask = true;
  // продолжения: «а если ненадолго?», «а если очень хочется?», «тренироваться завтра?»
  f.shortTime = tokens.length <= 7 && P('(?:а )?(?:если )?(?:совсем |очень )?(?:ненадолго|недолго|чуть[ -]чуть|немного|совсем немного|на минутку|на пару минут|на (?:пять|десять|\\d+) минут\\S*)|на короткое время|just (?:for )?a (?:bit|little|short)|only briefly|for a (?:bit|short time)|a little bit').test(norm);
  f.wantMore = tokens.length <= 7 && f.want !== 'neg' && P('(?:а )?(?:если )?(?:но )?(?:очень|так|сильно) хочется(?: \\S+){0,3}|(?:а )?если (?:очень |сильно )?(?:хочется|хочу)(?: \\S+){0,3}|но (?:так |очень )?(?:хочется|хочу)(?: \\S+){0,3}|все равно (?:хочу|пойду|буду)(?: \\S+){0,3}|but i (?:really |still )?want(?: \\S+){0,3}|i still want(?: \\S+){0,3}|i really want(?: \\S+){0,3}').test(norm);
  f.dayPart = P('вечером|вечер|к вечеру|сегодня вечером|на вечер|tonight|this evening|in the evening').test(norm) ? 'evening' : P('утром|с утра|утро|на утро|this morning|in the morning').test(norm) ? 'morning' : null;
  f.tomorrow = P('завтра|послезавтра|tomorrow').test(norm);
  // неоднозначные короткие сообщения
  f.ambiguous = !f.cont && !f.gibberish && tokens.length <= 3 && P('помоги\\S*|помощь|подскажи\\S*|хочу|мне надо|мне нужно|не знаю|ну|хм+|эм+|слушай|вопрос|вот|это|так|что то|что-то|и что|и как|как быть|как мне быть|help( me)?|i need|hmm+|well|idk|question').test(norm);
  f.unsupported = [
    ['recipe', P('рецепт\\S*|приготов\\S*|как (сварить|пожарить|испечь)|recipe\\S*|how to cook')],
    ['news', P('новост\\S*|политик\\S*|выбор\\S*|президент\\S*|news|politic\\S*|election\\S*')],
    ['money', P('курс (доллара|евро|валют\\S*)|биткоин\\S*|акци\\S*|кредит\\S*|налог\\S*|exchange rate|bitcoin|stocks?|taxes')],
    ['code', P('напиши (код|программу|скрипт)|python|javascript|sql|write (some )?code|program')],
    ['translate', P('переведи\\S*|перевод\\S*|translate')],
    ['math', P('посчитай|сколько будет \\d+|реши (задач\\S*|пример)|\\d+ ?[+*/x×] ?\\d+|calculate|solve')],
    ['joke_order', P('расскажи (анекдот|шутку)|анекдот|tell (me )?a joke|joke')],
    ['culture', P('фильм\\S*|кино|сериал\\S*|музык\\S*|песн\\S*|стих\\S*|книг\\S*|movie\\S*|song\\S*|poem|music')],
  ].find(([, rx]) => rx.test(norm));
  f.unsupported = f.unsupported ? f.unsupported[0] : null;
  f.padded = padded;
  return f;
}

// Ответ ли это на уточнение (место, что упростить, тема)? Вернёт значение параметра или null.
export function answersPending(nlu, pending) {
  if (!pending || !nlu) return null;
  const n = nlu.norm;
  if (pending.key === 'place') return nlu.place || (nlu.outdoorAct ? 'outdoor' : null);
  if (pending.key === 'simplify_what') {
    if (P('тренировк\\S*|занят\\S*|зал\\S*|workout\\S*|training').test(n)) return 'workout';
    if (P('повседневн\\S*|быт\\S*|день|дела|дел|активност\\S*|daily|everyday|activity').test(n)) return 'daily';
    return null;
  }
  if (pending.key === 'which_topic') return nlu.topics.length === 1 ? nlu.topics[0] : (P('первое|первое по списку|с первого|first one|the first').test(n) ? 'first' : null);
  if (pending.key === 'activity') return nlu.activity || null;
  return null;
}

// Различение шуточного и тревожного «умираю». -> 'red' | 'cautious' | 'joke' | null
export function deathCheck(rawStr) {
  const n = normalize(stripBenignDeath(rawStr)); // «умираю со смеху», «убил вечер», «тренировка меня убила» — не тревога
  const death = P('умер\\S*|умира\\S*|умру|помер\\S*|сдох\\S*|убил\\S*|убьет|умрем|dead|die|died|dying|kill(ed|ing)? me|i am dying|i\'m dying').test(n);
  const hardBreath = P('(трудно|тяжело|нечем|сложно|больно) (дышать|вдохнуть)|не могу (вдохнуть|дышать)|задыха\\S*|сердце (останавлива\\S*|замира\\S*|не бьется)|(hard|difficult|trouble) (to )?breath\\S*|can\'t breathe|cannot breathe|struggling to breathe').test(n);
  const sympt = P('груд\\S*|сердц\\S*|дыш\\S*|дыха\\S*|воздух\\S*|созна\\S*|давит|жмет|онемел\\S*|chest|heart|breath\\S*|faint\\S*|pressure|numb\\S*').test(n);
  const fear = P('боюсь|страшно|кажется|чувствую|мне (плохо|страшно)|помогите|помоги|реально|серьезно|по настоящему|скорая|скорую|afraid|scared|i feel|help|really|seriously|ambulance').test(n);
  const joke = /ахах|хаха|хех|лол|ржу|шучу|шутка|😂|🤣|😄|😆|😅|\blol\b|\blmao\b|\bhaha|\bjk\b|\bjoking\b/.test(String(rawStr).toLowerCase());
  if (hardBreath) return 'red';
  if (death && (sympt || fear) && !joke) return 'red';
  if (death && joke && !sympt) return 'joke';
  if (death && joke && sympt) return 'red';
  if (death) return 'cautious';
  return null;
}
