// Лексикон синонимов и вариантов (RU + EN) и лёгкий стеммер. Чистые функции, без зависимостей:
// используется match.js (нечёткое совпадение, сравнение с фразами сценариев) и nlu.js (темы, несколько тем в сообщении).
// Правила детерминированные; модель не используется.

// Понятие -> слова и формы (стеммятся тем же stem()). Разговорные формы нужны, чтобы «дрыхнуть» и «выспаться» были «сном».
export const CONCEPTS = {
  sleep: 'сон сна сну сне сном спать спал спала спим сплю спит поспать поспал выспаться выспался выспалась недоспал недосып бессонница бессонница засыпать засыпаю заснуть дрыхнуть дрыхну дрыма дремать подремать ночь ночью sleep slept sleeping asleep nap insomnia bedtime',
  steps: 'шаги шагов шагам шаг ходьба ходить хожу ходил пройти прошел прошла пройтись прогулка прогулки гулять погулять гуляю шагать нашагал steps step walk walking walked stroll hike',
  train: 'тренировка тренировки тренировку тренировать тренироваться трень трена тренька тренинг зал зале качалка качалки качаться спорт спортзал тренажерка нагрузка нагрузки бег бегать побегать пробежка workout workouts training train gym exercise exercising sport lifting run running',
  heart: 'пульс пульса сердце сердца сердечный давление давления тонометр hrv вариабельность heart pulse bpm pressure',
  tired: 'устал устала усталость уставший вымотан вымотана вымотался выжат разбит разбита измотан измотана обессилен сонный вялый вялость tired exhausted drained fatigue fatigued worn wiped sluggish',
  stress: 'стресс стрессую нервы нервничаю тревога тревожно тревожусь выгорание выгорел напряжение stress stressed anxiety anxious burnout nervous tense',
  weight: 'вес веса весу похудеть похудение калории калорий питание еда диета жир weight lose calories diet food fat',
  weather: 'погода погоды погоду дождь снег гроза ветер мороз жара weather rain snow storm wind forecast',
  cycle: 'цикл цикла месячные овуляция менструация пмс cycle period ovulation menstrual pms',
  age: 'возраст возраста биовозраст старость стареть молодость age aging biological longevity',
  lazy: 'лень ленюсь лентяй неохота влом лениво lazy procrastinate',
  data: 'данные данных данным цифры цифр показатели показатель метрики data numbers metrics stats',
  shorter: 'короче кратко коротко сократи brief short shorter concise',
  detail: 'подробнее подробно расскажи объясни поясни detail detailed explain elaborate',
  joke: 'шутка шутки шутить шути юмор юморить анекдот joke jokes humor funny',
  other: 'другой другое другую иначе альтернатива вариант other another different else alternative option',
  plan: 'план плана планы расписание программа plan schedule program',
  why: 'почему отчего зачем why',
  show: 'покажи показать показывает показывай открой выведи show display open',
  how_many: 'сколько много мало how many much',
  good: 'хорошо отлично норма нормально ок okay good fine ok',
  bad: 'плохо ужасно хреново паршиво bad terrible awful poor',
};

// Частые слова разговора вне словаря сценариев: цели нечёткого исправления опечаток (не понятия).
export const COMMON_WORDS = 'round goal goals reached reach history chat delete clear health connect working work worry remember about necessary readiness score stopped repeating yourself telling again please thanks thank understand misunderstood explain question answer tomorrow today tonight yesterday week month night morning evening average daily weekly period turn funny jokes humor serious easier harder lighter heavier break rest recovery habit habits start begin finish quit giving gave tried failed missed skipped quickly minutes minute hours hour time little much many more less enough maybe really actually something anything nothing everything everyone someone somewhere where which because without within between through during before after again always never sometimes usually often rarely только сегодня завтра вчера сейчас потом всегда никогда иногда обычно очень сильно слишком немного чуть сколько почему зачем когда куда откуда какой какая какое какие чтобы потому поэтому можно нужно нельзя должен хочется получилось получается выполнить выполнил сделать сделал сделала делать делаю начать начал начала закончить закончил бросить бросил забросил цель цели привычка привычку привычки задание задания задач день дня дни недели неделя месяц неделю утром вечером ночью спасибо пожалуйста привет здравствуй пока ладно хорошо понятно понял объясни расскажи покажи скажи подскажи помоги помощь вопрос ответ совет советы программа приложение данные данных пульс шагов шагами шаги часы браслет телефон разные разный отличается отличаются больше меньше лучше хуже легче сложнее проще сложная сложный лёгкая простая тяжелая тяжёлая слабая слабый другой другие другое другую вариант варианты диагноз диагноз врач доктор человек человеком создатель создателя зовут говорю говорить говоришь понимаешь помнишь знаешь умеешь можешь отключить включить убрать добавить удалить очистить память историю переписку дождь снег гроза ветер холодно жарко тепло улице погода погоду погоды прогноз'.split(' ');
// Обычные слова вне лексикона коуча: если слово (или его основа) есть здесь, опечаткой оно не считается и не исправляется.
export const VALID_WORDS = 'смех смеха смеху смехом смеяться смеюсь смеется смешной смешно смеялся мама мамы маме маму папа папы зима зимой зимы лето летом весна весной осень осенью мир мира миру дом дома домой дому город города страна семья семьи друг друга друзья подруга брат сестра сын дочь ребенок дети детей муж жена работа работы работе работать работаю учеба учиться школа книга книги кино фильм музыка песня игра игры играть гулять кошка собака кот пес рыба птица цветок цветы дерево лес море река озеро гора горы небо солнце луна звезда звезды ветер огонь вода воды чай кофе молоко хлеб масло мясо суп каша сыр яйцо яйца яблоко яблоки фрукты овощи сахар соль конфета шоколад пиво вино деньги цена рубль магазин банк дорога машина автобус поезд самолет билет отпуск праздник подарок день ночь утро вечер час минута секунда неделя год века время место люди человек мужчина женщина парень девушка мальчик девочка голова рука руки нога ноги глаза глаз лицо спина живот шея грудь зубы волосы тело кожа кровь любовь жизнь смерть радость счастье грусть страх злость скука мечта идея мысль слово слова язык имя вопрос ответ правда ложь мало много часто редко далеко близко рядом высоко низко быстро медленно громко тихо тепло холодно светло темно красиво вкусно дорого дешево смена смену смены менять поменять сменить sauce home house family mother father brother sister friend friends city country world water coffee bread milk music movie book game dog cat fish bird tree river sea sun moon star night day week year time money price shop store car bus train ticket holiday gift head hand hands leg legs eyes face back body skin blood love life death joy happy sad fear anger laugh laughing laughter smile mind idea word words name truth little often rarely near far high low fast slow loud quiet warm cold light dark'.split(' ');
const RU_SUFFIXES = ['ироваться', 'ировать', 'ование', 'ования', 'ением', 'ениями', 'ения', 'ении', 'ений', 'ение', 'остью', 'ости', 'ость', 'ками', 'ими', 'ыми', 'ого', 'его', 'ому', 'ему', 'ать', 'ять', 'ить', 'еть', 'уть', 'ться', 'ешь', 'ишь', 'ете', 'ите', 'ают', 'яют', 'ует', 'уют', 'ает', 'яет', 'ала', 'ила', 'али', 'или', 'ыть', 'ами', 'ями', 'ах', 'ях', 'ов', 'ев', 'ой', 'ей', 'ый', 'ий', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ом', 'ем', 'ам', 'ям', 'ою', 'ею', 'ал', 'ил', 'ыл', 'ть', 'ет', 'ут', 'ют', 'ит', 'ат', 'ят', 'ем', 'им', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й'].sort((a, b) => b.length - a.length);
const EN_SUFFIXES = ['ing', 'ed', 'es', 'ly', 's'];
const isCyr = (w) => /[а-я]/.test(w);

// Лёгкий стеммер: отбрасывает самое длинное окончание, но не короче 3 букв основы; слова из ≤4 букв не трогает.
export function stem(w) {
  if (w.length <= 4 || /\d/.test(w)) return w;
  const sfx = isCyr(w) ? RU_SUFFIXES : /^[a-z]+$/.test(w) ? EN_SUFFIXES : null;
  if (!sfx) return w;
  for (const s of sfx) if (w.length - s.length >= 3 && w.endsWith(s)) return w.slice(0, w.length - s.length);
  return w;
}

// stem(слово) -> понятие. Слова ≤4 букв сравниваются как есть («сон», «зал», «вес»).
export const CONCEPT_OF = (() => {
  const m = new Map();
  for (const [id, words] of Object.entries(CONCEPTS)) for (const w of words.split(' ')) { const k = stem(w); if (!m.has(k)) m.set(k, id); }
  return m;
})();
export const conceptOf = (word) => CONCEPT_OF.get(stem(word)) || CONCEPT_OF.get(word) || null;
export const LEXICON_WORDS = Object.values(CONCEPTS).join(' ').split(' ');

// Темы для nlu.js (TOPIC_LEX): понятие -> тема.
export const TOPIC_OF_CONCEPT = { sleep: 'sleep', steps: 'steps', train: 'train', heart: 'heart', tired: 'stress', stress: 'stress', weight: 'weight', weather: 'weather', cycle: 'cycle', age: 'age' };

// Расстояние Дамерау — Левенштейна (с транспозицией соседних символов) с ранним выходом при превышении max.
export function dl(a, b, max) {
  const n = a.length; const m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  let p2 = null; let p1 = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= m; j++) {
      const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + c);
      if (p2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, p2[j - 2] + 1);
      cur.push(v); if (v < best) best = v;
    }
    if (best > max) return max + 1;
    p2 = p1; p1 = cur;
  }
  return p1[m];
}
// Допустимое число правок: 0 для коротких слов, 1 для ≥5 букв, 2 для ≥9.
export const maxEdits = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0);
