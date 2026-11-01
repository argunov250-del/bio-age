// База знаний коуча — вшита в приложение, интернет не нужен. Короткие выводы из
// открытых рекомендаций (ВОЗ, сообщества медицины сна) и крупных исследований.
// Каждый факт — с источником, чтобы было видно, откуда он. Это общие сведения,
// а не медицинские назначения.
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);

export const FACTS = {
  sleepNeed: {
    get text() { return t('Взрослым для здоровья нужно 7–9 часов сна. Меньше 7 часов регулярно — уже недосып, даже если кажется, что привык.',
      'Adults need 7–9 hours of sleep. Regularly sleeping under 7 hours is sleep debt, even if it feels normal.'); },
    source: 'AASM & Sleep Research Society, 2015',
  },
  sleepRegularity: {
    get text() { return t('Регулярность сна важна не меньше длительности: у людей с самым стабильным режимом риск смерти был заметно ниже, чем с самым нерегулярным (60 000 человек).',
      'Sleep regularity matters as much as duration: people with the most regular sleep had a markedly lower mortality risk than the least regular (60,000 people).'); },
    source: 'Windred et al., Sleep, 2024',
  },
  caffeine: {
    get text() { return t('Кофе даже за 6 часов до сна сокращает сон примерно на час — последний кофе лучше пить до обеда.',
      'Caffeine even 6 hours before bed cuts sleep by about an hour — have your last coffee before early afternoon.'); },
    source: 'Drake et al., J Clin Sleep Med, 2013',
  },
  alcohol: {
    get text() { return t('Алкоголь вечером повышает ночной пульс и снижает HRV — восстановление за ночь хуже даже после небольших доз.',
      'Evening alcohol raises night heart rate and lowers HRV — overnight recovery suffers even after small amounts.'); },
    source: 'Pietilä et al., JMIR Mental Health, 2018',
  },
  morningLight: {
    get text() { return t('Дневной свет в первые часы после пробуждения сдвигает внутренние часы и помогает засыпать вовремя.',
      'Daylight in the first hours after waking shifts your body clock and helps you fall asleep on time.'); },
    source: 'Blume et al., Somnologie, 2019',
  },
  nap: {
    get text() { return t('Короткий дневной сон 10–20 минут возвращает бодрость и не мешает ночному сну, если он до 15:00.',
      'A 10–20 minute nap restores alertness without hurting night sleep if taken before 3 pm.'); },
    source: 'Brooks & Lack, Sleep, 2006',
  },
  steps: {
    get text() { return t('Риск смерти снижается с ростом шагов примерно до 6–8 тысяч в день после 60 лет и 8–10 тысяч у более молодых, дальше эффект выходит на плато.',
      'Mortality risk falls as steps rise to about 6–8k a day after 60 and 8–10k for younger adults, then plateaus.'); },
    source: 'Paluch et al., Lancet Public Health, 2022',
  },
  whoActivity: {
    get text() { return t('ВОЗ советует 150–300 минут умеренной или 75–150 минут интенсивной активности в неделю и силовые нагрузки 2 дня в неделю.',
      'WHO recommends 150–300 minutes of moderate or 75–150 minutes of vigorous activity a week, plus strength work 2 days a week.'); },
    source: 'WHO Guidelines on Physical Activity, 2020',
  },
  strength: {
    get text() { return t('30–60 минут силовых в неделю связаны с самым низким риском смерти и болезней сердца.',
      '30–60 minutes of strength training a week is linked to the lowest risk of death and heart disease.'); },
    source: 'Momma et al., Br J Sports Med, 2022',
  },
  vo2: {
    get text() { return t('Кардиореспираторная форма (VO2max) — один из самых сильных признаков долголетия; даже переход из низшей группы формы в следующую заметно снижает риск.',
      'Cardiorespiratory fitness (VO2max) is one of the strongest markers of longevity; even moving up from the lowest fitness group cuts risk markedly.'); },
    source: 'Mandsager et al., JAMA Netw Open, 2018',
  },
  easyHard: {
    get text() { return t('Выносливость лучше всего растёт, когда около 80% тренировок лёгкие (можно разговаривать), а 20% — тяжёлые.',
      'Endurance grows best when about 80% of sessions are easy (you can talk) and 20% are hard.'); },
    source: 'Seiler, Int J Sports Physiol Perform, 2010',
  },
  loadSpike: {
    get text() { return t('Резкий рост нагрузки — больше чем в полтора раза к обычной за последние недели — связан с повышенным риском травм.',
      'A sharp jump in load — more than 1.5× your usual over recent weeks — is linked to a higher injury risk.'); },
    source: 'Gabbett, Br J Sports Med, 2016',
  },
  hrvBaseline: {
    get text() { return t('HRV очень индивидуален: сравнивать его можно только с собственной нормой. Падение ниже нормы на несколько дней — знак, что организм ещё восстанавливается.',
      'HRV is highly individual: compare it only with your own baseline. A drop below baseline for several days means your body is still recovering.'); },
    source: 'Plews et al., Sports Med, 2013',
  },
  restingHr: {
    get text() { return t('Пульс покоя на несколько ударов выше своей нормы часто сопровождает недосып, стресс, алкоголь или начинающуюся простуду.',
      'A resting heart rate a few beats above your norm often comes with poor sleep, stress, alcohol or an oncoming cold.'); },
    source: 'Buchheit, Front Physiol, 2014',
  },
  breathing: {
    get text() { return t('Медленное дыхание около 6 вдохов в минуту в течение 5–10 минут снижает напряжение и повышает HRV.',
      'Slow breathing at about 6 breaths a minute for 5–10 minutes reduces tension and raises HRV.'); },
    source: 'Zaccaro et al., Front Hum Neurosci, 2018',
  },
  walkAfterMeal: {
    get text() { return t('Даже 2–5 минут ходьбы после еды заметно сглаживают скачок сахара в крови.',
      'Even 2–5 minutes of walking after a meal noticeably blunts the blood sugar spike.'); },
    source: 'Buffey et al., Sports Med, 2022',
  },
  habit: {
    get text() { return t('Новая привычка становится автоматической в среднем примерно за 2 месяца — пропуск одного дня этому не мешает.',
      'A new habit becomes automatic in about 2 months on average — missing a single day does not break it.'); },
    source: 'Lally et al., Eur J Soc Psychol, 2010',
  },
  weightLoss: {
    get text() { return t('Для снижения веса больше всего решает питание, а регулярная активность помогает удержать результат и сохранить мышцы.',
      'Diet does most of the work for weight loss; regular activity helps keep the result and preserve muscle.'); },
    source: 'Swift et al., Prog Cardiovasc Dis, 2014',
  },
  sitting: {
    get text() { return t('Чем больше активности в течение дня, тем меньше вредит долгое сидение: 30–40 минут умеренного движения в день заметно снижают риск.',
      'More daily activity offsets long sitting: 30–40 minutes of moderate movement a day markedly reduces the risk.'); },
    source: 'Ekelund et al., Br J Sports Med, 2020',
  },
  smoking: {
    get text() { return t('Отказ от курения в любом возрасте возвращает годы жизни: бросившие до 40 лет почти догоняют никогда не куривших.',
      'Quitting smoking at any age gains back years of life: quitting before 40 nearly matches never-smokers.'); },
    source: 'Jha et al., N Engl J Med, 2013',
  },
  cycleNorm: {
    get text() { return t('Нормальный цикл — от 24 до 38 дней, разница между циклами — до 7–9 дней, месячные — до 8 дней.',
      'A normal cycle is 24–38 days long, varies by up to 7–9 days between cycles, with periods lasting up to 8 days.'); },
    source: 'FIGO: Munro et al., Int J Gynaecol Obstet, 2018',
  },
  cycleLength: {
    get text() { return t('По 600 000 циклов: в среднем цикл длится 29,3 дня и только 13% циклов — ровно 28 дней; овуляция чаще всего не на 14-й день.',
      'From 600,000 cycles: the average cycle is 29.3 days, only 13% are exactly 28 days, and ovulation is usually not on day 14.'); },
    source: 'Bull et al., npj Digital Medicine, 2019',
  },
  cycleHeart: {
    get text() { return t('По 45 000 циклов: пульс покоя минимален около 5-го дня цикла и максимален перед месячными, HRV — наоборот. Во второй половине цикла это норма.',
      'From 45,000 cycles: resting heart rate is lowest around day 5 and highest before the period, HRV the opposite. In the second half of the cycle this is normal.'); },
    source: 'Jasinski et al., npj Digital Medicine, 2024',
  },
  cyclePerformance: {
    get text() { return t('Обзор исследований: в первые дни цикла результаты в спорте могут быть чуть ниже, но эффект очень мал — лучше ориентироваться на своё самочувствие, а не на общие правила.',
      'Research review: performance may be slightly lower in the first days of the cycle, but the effect is tiny — go by how you feel rather than general rules.'); },
    source: 'McNulty et al., Sports Med, 2020',
  },
  fertileWindow: {
    get text() { return t('Забеременеть можно в течение 6 дней, заканчивающихся днём овуляции; а сама овуляция может сдвигаться даже при регулярном цикле.',
      'Pregnancy is possible in a 6-day window ending on ovulation day, and ovulation itself can shift even in regular cycles.'); },
    source: 'Wilcox et al., NEJM, 1995; BMJ, 2000',
  },
  lutealSleep: {
    get text() { return t('После овуляции прогестерон поднимает температуру тела на 0,3–0,5 °C и ночной пульс; у части женщин сон в эти дни поверхностнее.',
      'After ovulation progesterone raises body temperature by 0.3–0.5 °C and night heart rate; some women sleep more lightly in these days.'); },
    source: 'Alzueta et al., Int J Womens Health, 2022',
  },
};

export const FACT_COUNT = Object.keys(FACTS).length;
