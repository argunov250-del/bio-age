// Помощники групп «разговор», «вода/дыхание/стресс» и «справка о приложении».
// W — вся фраза целиком (после «пустых» слов), L — короткая фраза с ключом; обе отсекают отрицание, прошлое и посторонние темы.
import { P } from '../nlu';
import { SC } from './kit';

const FILL = new Set(['ну', 'а', 'и', 'так', 'вот', 'эй', 'слушай', 'послушай', 'хирон', 'хирончик', 'привет', 'пожалуйста', 'плиз', 'тогда', 'же', 'все', 'скажи', 'подскажи', 'блин', 'короче', 'hey', 'hi', 'ok', 'okay', 'well', 'so', 'please', 'pls', 'hiron', 'chiron', 'then', 'just']);
const clean = (n) => n.tokens.filter((w) => !FILL.has(w)).join(' ');
export const NEGW = P('не|нет|ни|no|not|never|dont|isnt|cant|wont|без');

const base = (n) => !n.gibberish && !n.cont && !n.past;
// Вся фраза целиком.
export const W = (src) => { const rx = new RegExp('^(?:' + src + ')$'); return (n) => base(n) && rx.test(clean(n)); };
// Фраза с ключом, не длиннее max слов, без отрицания; extra(n, env) — дополнительное условие.
export const L = (src, max = 9, extra) => { const rx = P(src); return (n, e) => base(n) && n.tokens.length <= max && rx.test(n.norm) && !NEGW.test(n.norm) && (!extra || extra(n, e)); };
// То же, но отрицание допустимо (для «не в настроении», «нет сил»).
export const Ln = (src, max = 9, extra) => { const rx = P(src); return (n, e) => base(n) && n.tokens.length <= max && rx.test(n.norm) && (!extra || extra(n, e)); };

export const noAct = (n) => !n.activity && !n.topics.length;
export const calmEnv = (e) => !e.sens && !(e.mem && e.mem.hold);
// SC с проверкой спокойного состояния.
export const S = (o) => SC({ ...o, match: (n, e) => calmEnv(e) && o.test(n, e) });
// Юмор включён? (режим не «без шуток», нет защитной паузы)
export const humorOn = (e) => !!e && e.tone !== 'off' && !(e.mem && (e.mem.humorMode === 'off' || e.mem.hold)) && !(e.ctx && e.ctx.sensitive && e.ctx.sensitive.noJokes);
