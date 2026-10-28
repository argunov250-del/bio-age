// База знаний коуча — вшита в приложение, интернет не нужен. Короткие выводы из
// открытых рекомендаций (ВОЗ, сообщества медицины сна) и крупных исследований.
// Каждый факт — с источником, чтобы было видно, откуда он. Это общие сведения,
// а не медицинские назначения.
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);

export const FACTS = {
  sleepNeed: {
    text: t('Взрослым для здоровья нужно 7–9 часов сна. Меньше 7 часов регулярно — уже недосып, даже если кажется, что привык.',
      'Adults need 7–9 hours of sleep. Regularly sleeping under 7 hours is sleep debt, even if it feels normal.'),
    source: 'AASM & Sleep Research Society, 2015',
  },
  sleepRegularity: {
    text: t('Регулярность сна важна не меньше длительности: у людей с самым стабильным режимом риск смерти был заметно ниже, чем с самым нерегулярным (60 000 человек).',
      'Sleep regularity matters as much as duration: people with the most regular sleep had a markedly lower mortality risk than the least regular (60,000 people).'),
    source: 'Windred et al., Sleep, 2024',
  },
  caffeine: {
    text: t('Кофе даже за 6 часов до сна сокращает сон примерно на час — последний кофе лучше пить до обеда.',
      'Caffeine even 6 hours before bed cuts sleep by about an hour — have your last coffee before early afternoon.'),
    source: 'Drake et al., J Clin Sleep Med, 2013',
  },
  alcohol: {
    text: t('Алкоголь вечером повышает ночной пульс и снижает HRV — восстановление за ночь хуже даже после небольших доз.',
      'Evening alcohol raises night heart rate and lowers HRV — overnight recovery suffers even after small amounts.'),
    source: 'Pietilä et al., JMIR Mental Health, 2018',
  },
  morningLight: {
    text: t('Дневной свет в первые часы после пробуждения сдвигает внутренние часы и помогает засыпать вовремя.',
      'Daylight in the first hours after waking shifts your body clock and helps you fall asleep on time.'),
    source: 'Blume et al., Somnologie, 2019',
  },
  nap: {
    text: t('Короткий дневной сон 10–20 минут возвращает бодрость и не мешает ночному сну, если он до 15:00.',
      'A 10–20 minute nap restores alertness without hurting night sleep if taken before 3 pm.'),
    source: 'Brooks & Lack, Sleep, 2006',
  },
  steps: {
    text: t('Риск смерти снижается с ростом шагов примерно до 6–8 тысяч в день после 60 лет и 8–10 тысяч у более молодых, дальше эффект выходит на плато.',
      'Mortality risk falls as steps rise to about 6–8k a day after 60 and 8–10k for younger adults, then plateaus.'),
    source: 'Paluch et al., Lancet Public Health, 2022',
  },
  whoActivity: {
    text: t('ВОЗ советует 150–300 минут умеренной или 75–150 минут интенсивной активности в неделю и силовые нагрузки 2 дня в неделю.',
      'WHO recommends 150–300 minutes of moderate or 75–150 minutes of vigorous activity a week, plus strength work 2 days a week.'),
    source: 'WHO Guidelines on Physical Activity, 2020',
  },
  strength: {
    text: t('30–60 минут силовых в неделю связаны с самым низким риском смерти и болезней сердца.',
      '30–60 minutes of strength training a week is linked to the lowest risk of death and heart disease.'),
    source: 'Momma et al., Br J Sports Med, 2022',
  },
  vo2: {
    text: t('Кардиореспираторная форма (VO2max) — один из самых сильных признаков долголетия; даже переход из низшей группы формы в следующую заметно снижает риск.',
      'Cardiorespiratory fitness (VO2max) is one of the strongest markers of longevity; even moving up from the lowest fitness group cuts risk markedly.'),
    source: 'Mandsager et al., JAMA Netw Open, 2018',
  },
  easyHard: {
    text: t('Выносливость лучше всего растёт, когда около 80% тренировок лёгкие (можно разговаривать), а 20% — тяжёлые.',
      'Endurance grows best when about 80% of sessions are easy (you can talk) and 20% are hard.'),
    source: 'Seiler, Int J Sports Physiol Perform, 2010',
  },
  loadSpike: {
    text: t('Резкий рост нагрузки — больше чем в полтора раза к обычной за последние недели — связан с повышенным риском травм.',
      'A sharp jump in load — more than 1.5× your usual over recent weeks — is linked to a higher injury risk.'),
    source: 'Gabbett, Br J Sports Med, 2016',
  },
  hrvBaseline: {
    text: t('HRV очень индивидуален: сравнивать его можно только с собственной нормой. Падение ниже нормы на несколько дней — знак, что организм ещё восстанавливается.',
      'HRV is highly individual: compare it only with your own baseline. A drop below baseline for several days means your body is still recovering.'),
    source: 'Plews et al., Sports Med, 2013',
  },
  restingHr: {
    text: t('Пульс покоя на несколько ударов выше своей нормы часто сопровождает недосып, стресс, алкоголь или начинающуюся простуду.',
      'A resting heart rate a few beats above your norm often comes with poor sleep, stress, alcohol or an oncoming cold.'),
    source: 'Buchheit, Front Physiol, 2014',
  },
  breathing: {
    text: t('Медленное дыхание около 6 вдохов в минуту в течение 5–10 минут снижает напряжение и повышает HRV.',
      'Slow breathing at about 6 breaths a minute for 5–10 minutes reduces tension and raises HRV.'),
    source: 'Zaccaro et al., Front Hum Neurosci, 2018',
  },
  walkAfterMeal: {
    text: t('Даже 2–5 минут ходьбы после еды заметно сглаживают скачок сахара в крови.',
      'Even 2–5 minutes of walking after a meal noticeably blunts the blood sugar spike.'),
    source: 'Buffey et al., Sports Med, 2022',
  },
  habit: {
    text: t('Новая привычка становится автоматической в среднем примерно за 2 месяца — пропуск одного дня этому не мешает.',
      'A new habit becomes automatic in about 2 months on average — missing a single day does not break it.'),
    source: 'Lally et al., Eur J Soc Psychol, 2010',
  },
  weightLoss: {
    text: t('Для снижения веса больше всего решает питание, а регулярная активность помогает удержать результат и сохранить мышцы.',
      'Diet does most of the work for weight loss; regular activity helps keep the result and preserve muscle.'),
    source: 'Swift et al., Prog Cardiovasc Dis, 2014',
  },
  sitting: {
    text: t('Чем больше активности в течение дня, тем меньше вредит долгое сидение: 30–40 минут умеренного движения в день заметно снижают риск.',
      'More daily activity offsets long sitting: 30–40 minutes of moderate movement a day markedly reduces the risk.'),
    source: 'Ekelund et al., Br J Sports Med, 2020',
  },
  smoking: {
    text: t('Отказ от курения в любом возрасте возвращает годы жизни: бросившие до 40 лет почти догоняют никогда не куривших.',
      'Quitting smoking at any age gains back years of life: quitting before 40 nearly matches never-smokers.'),
    source: 'Jha et al., N Engl J Med, 2013',
  },
};

export const FACT_COUNT = Object.keys(FACTS).length;
