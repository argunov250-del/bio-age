// Правила безопасности: кризис (самоповреждение, суицидальные мысли), тревожные симптомы, боль/травма,
// расстройства пищевого поведения, тяжёлое состояние, лекарства. Только правила, без модели и сети.
// Устойчивость к опечаткам: слова от 5 букв сравниваются с допуском в одну правку (замена, вставка, пропуск, перестановка);
// слипшиеся слова ищутся подстрокой; порядок слов не важен (все признаки правила в окне из WIN слов).
// Правило неоднозначного случая: сомнение -> осторожный ответ.

const WIN = 8;

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[’‘`´]/g, "'")
  .replace(/([a-zа-я])\1{2,}/g, '$1')
  .replace(/[^a-zа-я0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ed <= 1 (замена, вставка, пропуск, перестановка соседних)
function near(a, b) {
  if (a === b) return true;
  const la = a.length; const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

// spec: 'a|b*|~c'. 'x*' — основа (начало слова), 'x' — слово целиком, '~' — допуск правки и для коротких.
const compiled = new Map();
function alts(spec) {
  let c = compiled.get(spec);
  if (!c) {
    c = spec.split('|').map((a) => {
      const force = a[0] === '~'; const exact = a[0] === '='; if (force || exact) a = a.slice(1);
      const stem = a.endsWith('*'); if (stem) a = a.slice(0, -1);
      // правка допускается для русских слов от 5 букв и латинских от 7 (короткие английские слишком близки к другим словам)
      return { w: a, stem, fuzz: !exact && (force || a.length >= (/^[a-z'-]+$/.test(a) ? 8 : 5)) };
    });
    compiled.set(spec, c);
  }
  return c;
}
function tokHit(tok, a) {
  const { w, stem, fuzz } = a;
  if (stem ? tok.startsWith(w) : tok === w) return true;
  if (!fuzz) return false;
  if (stem) {
    for (let L = w.length - 1; L <= w.length + 1; L++) if (tok.length >= L && near(tok.slice(0, L), w)) return true;
  } else if (near(tok, w)) return true;
  if (tok.length >= w.length + 4 && w.length >= 5) { // слипшиеся слова: «грудидовит»
    if (tok.includes(w)) return true;
    if (w.length < 7) return false;
    for (let L = w.length - 1; L <= w.length + 1; L++) for (let s = 0; s + L <= tok.length; s++) if (near(tok.substr(s, L), w)) return true;
  }
  return false;
}
function positions(toks, spec) {
  const al = alts(spec); const out = [];
  for (let i = 0; i < toks.length; i++) if (al.some((a) => tokHit(toks[i], a))) out.push(i);
  return out;
}
function ruleHit(toks, specs, win) {
  const ps = specs.map((s) => positions(toks, s));
  if (ps.some((p) => !p.length)) return false;
  if (specs.length === 1) return true;
  for (const start of ps[0]) {
    let ok = true;
    for (let k = 1; k < ps.length && ok; k++) ok = ps[k].some((p) => Math.abs(p - start) < win);
    if (ok) {
      // все признаки в одном окне, а не только близко к первому
      const all = ps.map((p) => p.filter((x) => Math.abs(x - start) < win));
      const mn = Math.min(...all.map((p) => Math.min(...p))); const mx = Math.max(...all.map((p) => Math.max(...p)));
      if (mx - mn < win * 2) return true;
    }
  }
  return false;
}

// R(класс, [признаки], { not }) — правило: все признаки в одном окне, порядок не важен.
const R = (cls, specs, o) => ({ cls, specs, not: o && o.not });

const ACHE = 'боль|боли|болит|болят|=больно|болью|болело|заболело|~жжет|жжение|давит|давление|тянет|отдает|отдаёт|жмет|жмут|колет|кольнуло|сдавило|сжимает|сжало|теснит|печет|тяжесть|ноет|стреляет|режет|прихватило|схватило|сдавлен*|~боль|~болит';
const CHEST = 'грудь|груди|грудью|грудной|грудин*';
const HEART = 'сердце|сердца|сердцу|сердцем';
const RULES = [
  // ───── кризис: самоповреждение, суицидальные мысли, таблетки ─────
  R('crisis', ['не|нет|нету|незачем|никакого', 'жить|жизнь|жизни', 'хочу|хочется|хотел|хотела|хотелось|смысла|смысл|вижу|зачем|надоело|устал|устала|сил|ценности|стоит|стоило'],
    { not: /жить (в|на|у|с|со|при|рядом|отдельно|здесь|там|за|без|дома|тут|вместе|одному|одна|один)(?![а-я])/ }),
  R('crisis', ['нехочу|нехочется', 'жить'], { not: /жить (в|на|у|с|со|при|рядом|отдельно|здесь|там|за|без|дома|тут|вместе)(?![а-я])/ }),
  R('crisis', ['надоело|устал|устала|задолбало|осточертело|расхотелось|расхотел|расхотела', 'жить'], { not: /жить (в|на|у|с|со|при|рядом|отдельно|здесь|там|за|без|дома|тут|вместе)(?![а-я])/ }),
  R('crisis', ['хочу|хочется|хотел|хотела|хотелось|мечтаю|лучше|желаю|решил|решила|собираюсь|мысли|мыслей', 'умереть|умирать|сдохнуть|подохнуть|смерти|исчезнуть|самоубийство|суицид']),
  R('crisis', ['покончить|покончу|покончил|покончила', 'собой|жизнью|всем|собою']),
  R('crisis', ['свести|сведу|свела|свел', 'счеты|счеты*', 'жизнью|жизни|собой']),
  R('crisis', ['суицид*|самоубийств*|самоубий*|самоповрежд*|селфхарм*|самоубиться|суицидальн*']),
  R('crisis', ['убить|убью|убиться|убьюсь', 'себя|собой']),
  R('crisis', ['лишить|лишу|лишил|лишила', 'себя', 'жизни|жизнь']),
  R('crisis', ['наложить|наложу', 'руки', 'себя']),
  R('crisis', ['повеситься|повешусь|застрелиться|застрелюсь|утопиться|утоплюсь|отравлюсь|выброситься|выброшусь|спрыгнуть|спрыгну|броситься']),
  R('crisis', ['прыгнуть|прыгну|шагнуть|шагну|сброситься|брошусь', 'крыши|крыша|моста|мост|окна|окно|балкона|балкон|рельсы|поезд|высотки|высоты'], {}),
  R('crisis', ['вскрыть|вскрою|вскрыла|вскрыл|вскрываю|перерезать|перережу|режу|режусь|порезал*|порезаться|резал*|царапаю|жгу', 'вены|вен|себя|себе|руки|руку|запястья|запястье|кожу|бедра|предплечье|руках']),
  R('crisis', ['навредить|навредил|навредила|причинить|причиняю|причинил|причинила|наношу|нанести|делаю|сделать|сделал|сделала', 'себе', '=больно|вред|вреда']),
  R('crisis', ['без', 'меня', 'лучше|легче|проще', 'всем|всех|будет|станет|бы']),
  R('crisis', ['обуза|обузой|обузу|тягость', 'всем|всех|близких|семье|родным|я']),
  R('crisis', ['лучше', 'меня', 'не', 'было|бы|существовало']),
  R('crisis', ['жалею|жаль', 'родился|родилась|родиться']),
  R('crisis', ['закончить|закончу|кончить|оборвать|завершить', 'все|всё|жизнь|жизни|страдания|мучения', 'хочу|пора|решил|решила|хочется|хватит|надо'], {}),
  R('crisis', ['не', 'вижу|нахожу', 'выхода|выход|смысла|смысл|будущего'], { not: /выход(ные|ных|ным)/ }),
  R('crisis', ['нет|нету', 'выхода', 'совсем|никакого|вообще|нигде'], {}),
  R('crisis', ['сил|силы', 'жить|существовать']),
  R('crisis', ['больше', 'не', 'хочу|могу|буду|смогу', 'жить|существовать|дышать|просыпаться|проснуться']),
  R('crisis', ['никогда|навсегда', 'не', 'проснуться|проснусь|просыпаться|очнуться'], { not: /утр|будильник|раньше|работ|школ|вставать|сон|спать|выспат/ }),
  R('crisis', ['наглотал*|напилась|напился|выпил|выпила|принял|приняла|съел|съела|проглотил|проглотила', 'таблеток|таблетки|таблетку|пилюль|снотворного|снотворное|пачку|пачки|горсть|горсти|упаковку|упаковки|капсул', 'много|все|всё|всю|весь|пачку|пачки|горсть|горсти|лишнего|слишком|целую|кучу|десять|двадцать|тридцать|сразу|нарочно|специально|упаковку|упаковки']),
  R('crisis', ['наглотал*|наглоталась', 'таблеток|таблетки|пилюль|лекарств|снотворн*|лекарства']),
  R('crisis', ['передозировк*|передоз|~overdos*', 'я|у|мне|меня|случайно|специально|нарочно|кажется|похоже|принял|выпил|приняла|выпила|подозреваю'], { not: /что такое|как избежать|как не получить/ }),
  // EN
  R('crisis', ['want|wanna|wish|wished|rather|ready|planning|thinking|thoughts', 'die|dead|suicide|suicidal|disappear'], { not: /\b(wish|want|rather) .{0,12}dead (tired|serious|beat|slow)|dead(lift|line|end|pan)/ }),
  R('crisis', ['kill|=killing|hang|poison|shoot|drown|end|ending|take|taking', 'own', 'life|self|alive|living']),
  R('crisis', ['kill|killing|hang|harm|harming|poison|shoot|drown', 'myself']),
  R('crisis', ['~suicid*|selfharm|self-harm|unalive|selfinjur*']),
  R('crisis', ['end', 'it', 'all', 'myself|tonight|everything|now']),
  R('crisis', ['end|ending', 'my', 'life|existence']),
  R('crisis', ["don't|dont|do|not|cant|can't|cannot|never|no", 'want|wanna|wish|reason|point|worth|longer|anymore', 'live|living|alive|exist|existing|here'], {}),
  R('crisis', ['no', 'reason|point', 'live|living|alive|go|continue']),
  R('crisis', ["not|isnt|isn't", 'worth', 'living|life|alive']),
  R('crisis', ['everyone|everybody|they|family', 'better', 'without', 'me']),
  R('crisis', ['burden', 'everyone|everybody|family|friends|everyone|others', 'am|being|just|be']),
  R('crisis', ['wish|wished|rather', 'never|wasnt|werent', 'born|woke|wake|alive|exist|existed']),
  R('crisis', ['took|taken|swallowed|swallow|downed|overdosed|consumed|popped', 'pills|tablets|meds|medication|sleeping|painkillers|aspirin|paracetamol|handful|bottle', 'many|much|whole|entire|all|handful|bottle|too|lots']),
  R('crisis', ['~overdos*|overdosed', 'on|accidentally|purpose|think|might|took|taking|me|my|i']),
  R('crisis', ['cut|cutting|cuts|burn|burning|harm|harming|hurt|hurting', 'myself|wrists|wrist|thighs|veins'], { not: /\b(run|running|gym|workout|training|lifting|squat|exercise|yesterday|ankle|knee|back|leg|shaving|cooking|kitchen|accidentally|stove|oven)\b/ }),

  // ───── тревожные симптомы (скорая) ─────
  R('red', [CHEST + '|' + HEART, ACHE + '|колотится|бешено|выпрыгивает|останавливается|замирает|екает|сбоит|перебои|останавливалось|замерло|выскакивает|трепыхается|барахлит|срывается|стучит']),
  R('red', [CHEST, 'тяжело|нечем|жжет|жжение']),
  R('red', ['сердцебиен*|тахикарди*|~сердцебиение']),
  R('red', ['пульс', 'зашкаливает|скачет|бешеный|нащупать|рвется|лупит|барабанит|неровный|нерегулярный|перебои|бешено']),
  R('red', ['перебои|перебоях', HEART + '|груди|пульсе']),
  R('red', ['~тошнит|тошнота|тошноту']),
  R('red', ['одышк*|задыха*|задохн*|удушье|удушья|одышка']),
  R('red', ['нечем|трудно|тяжело|сложно|=больно|мешает|не', 'дышать|вдохнуть|вдох|дышу|дышится|воздуха|выдохнуть|отдышаться'], { not: /нечем дышать (в|на) (поезд|метро)|не дышит/ }),
  R('red', ['дыхание|дыхания', 'перехватило|перехватывает|сбилось|сбивается|затруднено|прерывается|пропадает|пропало']),
  R('red', ['воздуха|воздух', 'не|нет|мало|нехватка|хватает|нехватает']),
  R('red', ['обморок*|обмороки|обмороку|обмороком|обмороке|обморока']),
  R('red', ['потерял*|потеряла|теряю|теряла|потеряю|теряет|потеряет', 'сознания|сознание|сознан*|сознанье|зрение|зрения|речь|речи']),
  R('red', ['упал|упала|падаю|упаду|свалился|свалилась|рухнул|рухнула|чуть|едва|вот-вот', 'обморок|обмороки|сознание|сознания|сознан*', 'не|в|упал|упала|потерял|потеряла|упаду'], {}),
  R('red', ['чуть', 'не', 'упал|упала', 'обморок|обмороки|обмороке|обморока']),
  R('red', ['темнеет|потемнело|темнело|потемнеет|мутнеет|помутнело|плывет|поплыло|пелена|мушки|звездочки|искры', 'глазах|глаза|глаз|глазами|зрение|перед']),
  R('red', ['зрение|зрения|вижу', 'двоится|пропало|пропадает|размылось|мутное|мутно|потерял|потеряла|резко|внезапно|упало']),
  R('red', ['головокруж*|головокруженье|головокружение']),
  R('red', ['голова|голову|голове|головой|мир|комната|земля|ноги', 'кружится|кружиться|кружит|закружилась|закружилось|кружилась|плывет|шатает|качает|вертится|вращается|кружатся|куржится|кружтися|кружитсе|кружется|кружеться'], {}),
  R('red', ['онемел*|онемен*|=немеет|=немеют|=немею|занемел*|онемело|онемела|онемели|онемение|онеметь|онемею|=немела|=немело|=немели|=неметь']),
  R('red', ['рука|руки|руку|рукой|нога|ноги|ногу|ногой|лицо|лица|лицу|лицом|половина|язык|языка|щека|щеку|щеки|губа|губы|левая|правая|левой|правой', 'отнялась|отнялось|слушается|поднимается|шевелится|парализ*|парализовало|подкосилась|подкосились|повисла|повисло|висит|слабеет|слабость|слабая|слабой|ватная|ватные']),
  R('red', ['перекос*|перекосило|перекосилась', 'лицо|лица|лицу|лицом|рта|рот|губы|губа|глаз|глаза|щека|щеку'], {}),
  R('red', ['перекосило|перекосилась|перекосился|перекос*', 'лицо|лицу|лица|рот|рта|лица*'], {}),
  R('red', ['опустился|опустилась|провис*|провисло|провисает|повисло|повис', 'уголок|рта|рот|лицо|лица|губы|щека|веко|глаз']),
  R('red', ['речь|речи|слова|слов|язык|языка', 'невнятная|невнятно|заплетается|заплетаются|путаются|путается|пропала|пропало|нарушилась|смазанная|косноязычная|исчезла']),
  R('red', ['не', 'могу|могла|получается', 'говорить|выговорить|связать|сказать|вспомнить', 'слова|слов|слово|вообще|внезапно|вдруг'], {}),
  R('red', ['спутанность|спутанно|спутанное|помутнение|помутнело', 'сознания|сознание|мысли|мыслей|в|голове']),
  R('red', ['путается|путаются', 'сознание|сознания|мысли|мыслей'], {}),
  R('red', ['слабость|слабеет|слабая|слабой|слабую|ослабла|ослабли|ослабело', 'рука|руке|руки|руку|ноге|нога|ноги|ногу|лице|лицо|половине|стороне|одной|внезапная|внезапно|резко|вдруг|левой|правой'], {}),
  R('red', ['сильная|сильно|жуткая|жуткой|жуткие|нестерпимая|нестерпимо|нестерпим*|невыносимая|невыносимо|невыносим*|адская|адской|острая|острой|резкая|резкой|дикая|страшная|ужасная|кинжальная|внезапная|внезапно|мучительная|мучительно', 'боль|боли|болит|болят|=больно|болью|головная|головной|головную|~боль']),
  R('red', ['кровь|кровью|крови|кровотечение|кровотечения|кровоточит|кровит', 'идет|идёт|течет|течёт|хлещет|хлынула|сильно|сильное|обильное|много|остановить|останавливается|кашляю|кашель|рвота|рвет|рвёт|рвало|вырвало|стул|моче|мочи|горла|горлом'], {}),
  R('red', ['отравил*|отравлен*|отравление|отравилась|отравился|отравились|отравляюсь|отравлена|отравлены|отравилась*', 'я|мы|меня|мне|мной|нас|ребенок|ребенка|ребенку|дочь|сын|кажется|похоже|возможно|вроде|сильно|тяжело|грибами|газом|угарным|алкоголем|спиртом|таблетками|химией|рыбой|мясом|едой|продуктами']),
  R('red', ['отравил*|отравилась|отравился|отравились|отравление|отравлен*', 'не|тошнит|рвота|рвет|болит|живот|кружится|плохо'], {}),
  R('red', ['передозировк*|передоз|~overdos*', 'я|у|мне|меня|случайно|специально|нарочно|кажется|похоже|принял|выпил|приняла|выпила|подозреваю|боюсь'], { not: /что такое|как избежать|как не получить/ }),
  R('red', ['сломал*|сломала|сломан*|перелом*|вывихнул*|вывихн*|раздробил*', 'открытый|открытая|открытое|кость|кости|костей|костью|торчит|торчат|видна|видно|виден|кровь|кровью|крови|позвоночник|позвоночника|череп|шея|шею|шее|голова|голову|головы|ребро|ребра|ребер']),
  R('red', ['ударился|ударилась|ударил|ударила|упал|упала|свалился|свалилась|врезался|врезалась|разбил|разбила|разбился|разбилась', 'головой|голове|голову|головы|затылком|затылок|затылке|виском|висок|лбом|лоб|шеей|шея|шее|спиной|позвоночником|позвоночник', 'тошнит|тошнота|рвота|рвет|рвёт|рвало|вырвало|сознание|сознания|потерял|потеряла|отключился|отключилась|кружится|темнеет|помню|сильно'], {}),
  R('red', ['chest|heart', 'pain|pains|hurts|hurt|pressure|tightness|tight|squeezing|squeeze|racing|pounding|fluttering|skipping|palpitations|stabbing|crushing|aching|ache|stopped|stopping|irregular|thumping|painful|discomfort|pian|~pain']),
  R('red', ['palpitation*|palpitations']),
  R('red', ['short|shortness', 'breath|breathe|breathing']),
  R('red', ["can't|cant|cannot|trouble|difficulty|hard|struggling|unable", 'breathe|breathing|breath|catch'], {}),
  R('red', ['breathless|breathlessness|suffocating|gasping']),
  R('red', ['faint|fainted|fainting|faint*']),
  R('red', ['passed|pass|passing|blacked|blacking|collapsed|collapse|collapsing|lost|losing|lose', 'out|consciousness|conscious'], {}),
  R('red', ['unconscious|unconsciousness']),
  R('red', ['dizzy|dizziness|lightheaded|light-headed|vertigo|woozy']),
  R('red', ['numb|numbness|tingling|paralyzed|paralysis|paralysed|=droop|=drooping|=droops|=drooped|slurred|slurring|slur']),
  R('red', ['face', '=droop*|=drooping|numb|crooked|lopsided|sagging|paralyzed|paralysis|weak|weakness']),
  R('red', ['severe|extreme|intense|unbearable|excruciating|worst|sharp|stabbing|crushing|sudden|terrible|agonizing|agony|massive', 'pain|pains|painful|headache|headaches|bleeding']),
  R('red', ['bleeding|bleed|bleeds|blood', 'heavy|heavily|badly|lot|lots|stop|stopping|stops|stopped|everywhere|profuse|profusely|uncontrollable|uncontrollably|nonstop'], {}),
  R('red', ['coughing|coughed|cough|vomiting|vomited|vomit|throwing|threw|puking|puked', 'blood|bloody'], {}),
  R('red', ['poison|poisoned|poisoning', 'i|me|my|we|child|kid|baby|son|daughter|accidentally|think|might|maybe|suspect|believe|food|mushrooms|mushroom|gas|alcohol|fumes|monoxide|pills'], {}),
  R('red', ['confused|confusion|disoriented|disorientation', 'suddenly|sudden|severe|speech|talk|speak|words|face|arm|vision'], {}),
  R('red', ['vision', 'went|blurry|blurred|double|dark|black|lost|loss', 'suddenly|sudden|went|dark|black|lost|loss'], {}),

  // ───── расстройства пищевого поведения ─────
  R('eating', ['не|ничего|почти|совсем', 'ем|ела|кушаю|кушал|кушала|питаюсь|питался|питалась|ел|еду', 'днями|сутками|неделю|недели|неделями|двое|трое|четверо|пять|шесть|семь|дня|дней|суток|сутки|несколько|третий|четвертый|пятый|второй|день'], {}),
  R('eating', ['голодаю|голодал|голодала|голодать|голодовк*|голодом', 'себя|нарочно|специально|неделю|днями|сутками|чтобы|похудеть|худеть|морю|морить|морил|морила|третий|четвертый|пятый|второй|день|дня|дней|суток|сутки'], {}),
  R('eating', ['морю|морить|морил|морила|мучаю|мучить|мучил|мучила', 'себя', 'голодом|голод|голода|диетой|голодовкой|едой|нагрузками|нагрузкой']),
  R('eating', ['вызываю|вызвал|вызвала|вызвать|вызывать|провоцирую|спровоцировал|спровоцировала|провоцировать|заставляю|заставил|заставила|заставить|заставлять', 'рвоту|рвота|рвать|рвет|рвёт|рвало|вырвало|блевать|блюю|блевал|блевала|вырвать']),
  R('eating', ['рвота|рвоту|рвоты|рвать|рвет|рвёт|вырвало|блюю|блевать|блевал|блевала|вырвать', 'после|специально|нарочно', 'еды|еда|ем|ела|ел|поел|поела|съел|съела|съедаю|ужина|ужин|обеда|обед|завтрака|завтрак|пищи'], {}),
  R('eating', ['булими*|анорекси*|орторекси*|слабительн*|мочегонн*|жиросжигател*|чищусь|очищаюсь']),
  R('eating', ['слабительные|слабительное|мочегонные|мочегонное', 'чтобы|похудеть|худеть|сбросить|вес|веса|кг']),
  R('eating', ['purge|purging|purged|bulimi*|anorexi*|anorexic|laxatives|laxative|starving|=starve|=starved|starvation']),
  R('eating', ['make|making|force|forcing|forced|induce|inducing', 'myself|me|self', 'vomit|vomiting|puke|puking|throw|sick|vomited|puked']),
  R('eating', ["don't|dont|haven't|havent|hasn't|hasnt|not|never|barely|hardly|stopped|refuse|refusing|refused|skipping|skipped", 'eat|eating|eaten|ate|eats|food|meals', 'days|week|weeks|several|few|three|four|five|six|seven|whole|entire'], {}),

  // ───── тяжёлое состояние ─────
  R('distress', ['депресс*|депрессия|депрессии|депрессию|депрессией|депрессивн*|подавлен*|подавлена|подавлено|отчаян*|отчаяние|безнадег*|безнадежность|безнадежно|безнадёжность|безнадёжно|безысходн*|выгорел*|выгорание|выгорела|выгорело|выгорели|выгорю']),
  R('distress', ['ненавижу|ненавидеть|ненавидит|~ненавижу', 'себя|себе|собой|сея|себы'], {}),
  R('distress', ['паник*|паническ*|паника|паники|панике|панику|паникой|паникую|паниковать']),
  R('distress', ['тревожно|тревога|тревоги|тревоге|тревогу|тревогой|тревожусь|тревожиться|тревожный|тревожная|тревожное', 'мне|меня|очень|сильно|постоянно|всё|все|время|чувствую|испытываю|ощущаю|сильная|сильное|не|могу|могла|остановиться|успокоиться'], {}),
  R('distress', ['мне|меня', 'очень|оень|очнь|очеень|так|совсем|ужасно|невыносимо|кошмарно|жутко|сильно|реально|правда', 'плохо|тяжело|тошно|тоскливо|одиноко|невыносимо|ужасно|кошмарно|жутко|хреново|паршиво'], {}),
  R('distress', ['неудачник*|неудачница|неудачником|неудачнице|никчемн*|никчёмн*|ничтожеств*|ничтожество']),
  R('distress', ['~depress*|depressed|depression|hopeless|hopelessness|worthless|worthlessness|miserable|anxious|anxiety|panic|panicking|panicked|overwhelmed|burnout|deprassed|dapressed|depresed']),
  R('distress', ['hate|hating|hated|hates', 'myself']),
  R('distress', ['terrible|awful|horrible|worthless|useless|pathetic|disgusting|miserable', 'myself|about'], {}),
  R('distress', ['feel|feeling|felt|fael|fefl|feeel|i|am', 'failure|loser|worthless|hopeless|~failure'], { not: /\b(not|no|never) (a )?(failure|loser)/ }),
  R('distress', ['hate|hata|haye|hyte|hating', '~myself']),
  R('distress', ['мне', '=плохо|=тошно'], { not: /плохо (спал|сплю|спится|спала|видно|слышно|знаком|идет|идёт|получается|работает|понимаю|помню|ем|ела|ел)|мне плохо (в|на) (зале|тренировк)|не плохо/ }),
  R('distress', ['=плохо', 'душе|надуше']),
  R('distress', ['feel|feeling|felt|fael|fefl|feeel', 'terrible|awful|horrible|hopeless|worthless|miserable|useless|depressed|deprassed|depresed|dapressed|anxious|empty|alone|lonely|broken'], {}),
];

const TREAT = [
  R('treatment', ['лекарств*|таблетк*|препарат*|антибиотик*|дозировк*|гипертони*|диабет*|инсулин*|аритми*|бета-блокатор*|рецепт*|диагноз*|лечени*']),
  R('treatment', ['medication*|meds|pills|prescri*|dosage|antibiotic*|hypertension|~diabet*|~insulin|arrhythmia|beta-blocker*|treatment|diagnos*']),
];

const PAIN = [
  R('pain', ['болит|болят|=больно|боль|боли|болею|ноет|ломит|=травма|травму|травмы|травмой|травме|=травм*|=ушиб*|вывих*|вывихн*|перелом*|растяжен*|=растянул*|=надорв*|=защемил*|=подвернул*|=порвал*|=связк*']),
  R('pain', ['pulled|pull|strained', '~muscle*|hamstring|calf|groin|back|shoulder|neck']),
  R('pain', ['hurt|hurts|hrt|hurting|sore', 'knee|back|ankle|leg|arm|shoulder|neck|wrist|foot|hip|elbow|head']),
  R('pain', ['pain|pains|painful|hurts|hurting|ache|aches|aching|injur*|~sprain*|=strain*|fractur*|dislocat*|swollen|swelling|torn']),
];

function hitsAny(toks, rules, q) {
  for (const r of rules) {
    if (r.not && r.not.test(q)) continue;
    if (ruleHit(toks, r.specs, WIN)) return true;
  }
  return false;
}

// Шутки/идиомы про «умираю» и «убил» — не кризис. Возвращает строку без безобидных оборотов.
const BENIGN_DEATH = /умира\S* (со смех\S*|от смех\S*|от смен\S*|от скуки|от голода|от усталости|от жары|от любопытства|от нетерпения|от стыда|от счастья|как (хочу|хочется))|(до смерти|смертельно) (устал|рад|скучн)|убил\S* (весь |все |целый |полдня |пол |кучу |много |два |три |несколько )?(вечер|день|время|час|часа|часов|выходн|неделю|ночь|утро|уикенд|субботу|воскресенье)|(тренировк\S*|работ\S*|жара|жару|жары|зной|экзамен\S*|дорога|дорогу|пробк\S*|подъем|подъём|спуск|лестниц\S*|ноги|день|неделя|смена|смену|нагрузк\S*|кроссфит\S*|забег|марафон|бег|пробежк\S*) (меня |нас |мен )?(убил\S*|добил\S*|прикончил\S*)|(меня |нас )(убил\S*|добил\S*|прикончил\S*) (эт\S+ )?(тренировк\S*|работ\S*|жара|жару|жары|зной|экзамен\S*|дорога|дорогу|пробк\S*|подъем|подъём|спуск|лестниц\S*|нагрузк\S*|кроссфит\S*|забег|марафон|бег|пробежк\S*)|dying (of|from) (laughter|boredom|hunger|heat|embarrassment)|killed (the|my) (evening|day|time|weekend)|(workout|training|run|gym|heat|exam|hike|commute) (is |was )?killing me|(workout|training|run|gym|heat|exam|hike|commute) (killed|destroyed) me|dead tired|i'?m dead (lol|haha)/;

export function benignDeath(raw) { return BENIGN_DEATH.test(norm(raw)); }
export function stripBenignDeath(raw) { return String(raw == null ? '' : raw).toLowerCase().replace(/ё/g, 'е').replace(BENIGN_DEATH, ' '); }

// Русский текст, набранный в английской раскладке: «,jkm d uhelb» -> «боль в груди».
const EN2RU = {};
'qwertyuiop[]asdfghjkl;\'zxcvbnm,.'.split('').forEach((c, i) => { EN2RU[c] = 'йцукенгшщзхъфывапролджэячсмитьбю'[i]; });
export const fixLayout = (q) => String(q).toLowerCase().replace(/[a-z[\];',.]/g, (c) => EN2RU[c] || c);

const cache = new Map();
// -> { crisis, red, eating, distress, pain, treatment }
export function safetyScan(input) {
  const raw = String(input == null ? '' : input);
  if (cache.has(raw)) return cache.get(raw);
  const q = norm(raw);
  const toks = q ? q.split(' ') : [];
  // вторая попытка: возможно, это русский текст в английской раскладке (только если в тексте нет кириллицы и есть знаки раскладки)
  const alt = !/[а-я]/.test(raw.toLowerCase()) && /[,;.[\]'][a-z]|[a-z][,;[\]']/i.test(raw) ? norm(fixLayout(raw)) : null;
  const altToks = alt ? alt.split(' ') : null;
  const by = (cls) => { const rs = RULES.filter((r) => r.cls === cls); return hitsAny(toks, rs, q) || (!!altToks && hitsAny(altToks, rs, alt)); };
  const out = { crisis: false, red: false, eating: false, distress: false, pain: false, treatment: false };
  if (toks.length && q.length <= 600) {
    out.crisis = by('crisis');
    out.red = by('red');
    out.eating = by('eating');
    out.distress = by('distress');
    out.pain = hitsAny(toks, PAIN, q) || (!!altToks && hitsAny(altToks, PAIN, alt));
    out.treatment = hitsAny(toks, TREAT, q) || (!!altToks && hitsAny(altToks, TREAT, alt));
  }
  if (cache.size > 500) cache.clear();
  cache.set(raw, out);
  return out;
}

// Отладка/тесты: какие правила сработали.
export function explainSafety(input) {
  const q = norm(input);
  const toks = q ? q.split(' ') : [];
  return [...RULES, ...PAIN, ...TREAT].filter((r) => !(r.not && r.not.test(q)) && ruleHit(toks, r.specs, WIN)).map((r) => r.cls + ': ' + r.specs.map((x) => x.slice(0, 40)).join(' & '));
}
