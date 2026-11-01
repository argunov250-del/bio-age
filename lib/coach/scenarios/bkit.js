// Общие помощники для групп 5–9 (шаги, сон, восстановление, привычки, результаты/эмоции).
// Только распознавание и мелкие проверки состояния; тексты и числа — в самих сценариях и vars.js.
import { P } from '../nlu';
import { normalize } from '../normalize';

export const STEPS = P('[шщ][аоэ]г\\S*|steps?|step count|шагомер\\S*|pedometer');
export const SLEEPW = P('сон|сна|сну|сном|сне|спал\\S*|поспал\\S*|сплю|выспа\\S*|sleep\\S*|slept|nap');
// «не хочу знать», «не надо», «хватит»: не отвечаем справкой на отказ от справки.
export const REFUSE = P('не (хочу|надо|нужно|буду|могу) (мне )?(знать|слышать|видеть|смотреть|говорить|обсуждать|показывать|шаг\\S*)|не (показывай|говори|спрашивай|интересует|интересно)|отстань|неважно|(don\'t|do not) (want|need) (to )?(know|hear|see|talk)|(don\'t|do not) (care|tell|show|ask)|stop (asking|telling|showing)|never mind|forget it');
export const WHY = P('почему|отчего|из[ -]за чего|с чего|why|how come');
export const ACTW = P('трен\\S*|занят\\S*|зарядк\\S*|зал|залу|пробежк\\S*|бег\\S*|йог\\S*|растяжк\\S*|плаван\\S*|воркаут|workout\\S*|session\\S*|class|gym|run|running|exercis\\S*|practice|training|train|sport|sports|привыч\\S*|habit\\S*|routine');
export const ILLNESS = P('болею|заболел\\S*|простуд\\S*|температур\\S*|болезн\\S*|болел\\S*|травм\\S*|операци\\S*|головокруж\\S*|тошнит|болит|болят|боль|боли|больно|ноет|ломит|sick|ill|flu|fever|injur\\S*|surgery|dizzy|hurts?|pain\\S*|ache\\S*|sore');

// Темы сообщения не выходят за допустимые: «сплю мало, шагов мало, вес растёт» — это не про один сценарий.
export const only = (n, ...allowed) => !n.gibberish && !n.multiTopic && n.topics.every((t) => allowed.includes(t));
export const test = (rx, n) => rx.test(n.norm);
// Предыдущие реплики человека (нормализованные) — чтобы не переспрашивать уже названное.
export const recentMine = (env, k = 3) => ((env && env.history) || [])
  .filter((h) => h && h.from === 'me').slice(-k).map((h) => normalize([].concat(h.text || []).join(' ')));
export const mentioned = (e, rx) => !!(e && e.env && e.env.nlu && (rx.test(e.env.nlu.norm) || recentMine(e.env).some((x) => rx.test(x))));
export const stateOf = (e) => (e && e.s && e.s.state) || 'unknown';
export const num = (x) => typeof x === 'number' && isFinite(x);
