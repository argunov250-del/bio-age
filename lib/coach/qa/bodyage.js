// Раздел «Возраст тела»: как приложение считает «возраст тела» (lib/formula.js) — входы, что двигает, пределы.
// Контент-файл раздела; реестр и движок — lib/coach/qa/index.js.
const mk = (id, level, q, short, more, sources, follow, tags, humorOk = false) => ({
  id, section: 'bodyage', level,
  q: { ru: q[0], en: q[1] },
  short: short.map((s) => ({ ru: s[0], en: s[1] })),
  more: { ru: more[0], en: more[1] },
  sources, follow, needs: [], humorOk, tags,
});

const KODAMA = { title: 'Kodama et al., JAMA: Cardiorespiratory fitness and all-cause mortality', year: 2009 };
const YIN = { title: 'Yin et al., J Am Heart Assoc: Sleep duration and all-cause mortality', year: 2017 };
const ZHANG = { title: 'Zhang et al., CMAJ: Resting heart rate and mortality', year: 2016 };
const AREM = { title: 'Arem et al., JAMA Intern Med: Leisure time physical activity and mortality', year: 2015 };
const LEE = { title: 'Lee et al., Circulation: Leisure-time physical activity intensity and mortality', year: 2022 };
const SRIK = { title: 'Srikanthan & Karlamangla, Am J Med: Muscle mass index and longevity', year: 2014 };
const KAMINSKY = { title: 'Kaminsky et al., Mayo Clin Proc: FRIEND reference standards for fitness', year: 2015 };
const PALUCH = { title: 'Paluch et al., Lancet Public Health: Daily steps and all-cause mortality', year: 2022 };

export default [
  mk('bodyage_what', 'base',
    ['Что такое «возраст тела»?', 'What is "body age"?'],
    [
      ['{bioAgeLine} Это оценка: приложение берёт твои привычки и показатели, смотрит, как они связаны с риском смерти в крупных исследованиях, и переводит разницу в годы. Не медицинский показатель.',
       '{bioAgeLine} It is an estimate: the app takes your habits and metrics, looks at how they relate to mortality risk in large studies, and converts the difference into years. Not a medical indicator.'],
      ['«Возраст тела» — это сравнение твоих привычек с типичными для твоего возраста. Лучше сон, шаги, форма — тело «моложе» паспорта, хуже — «старше». Это ориентир, а не диагноз.',
       'Body age compares your habits with typical ones for your age. Better sleep, steps and fitness put it below your real age, worse puts it above. It is a guide, not a diagnosis.'],
    ],
    ['Формула в приложении (lib/formula.js) устроена так. Для каждой метрики (длительность и регулярность сна, шаги, минуты умеренной и интенсивной нагрузки, силовые, VO2max, пульс покоя, безжировая масса) взято отношение рисков смертности (hazard ratio) из опубликованных работ относительно типичного значения. Риск смерти взрослого растёт примерно на 9–10% за год жизни (закон Гомпертца), поэтому HR 1,10 соответствует +1 году, а HR 0,91 — минус одному. Поправки по метрикам складываются в годы, с учётом перекрытия и общего предела. Итог: твой возраст по паспорту плюс сумма поправок. Это статистика по группам, а не предсказание для конкретного человека, и не медицинский показатель.',
     'The formula in the app (lib/formula.js) works like this. For each metric (sleep duration and regularity, steps, minutes of moderate and vigorous activity, strength training, VO2max, resting heart rate, lean mass) it takes the mortality hazard ratio from published studies relative to a typical value. Adult mortality risk rises about 9–10% per year of age (the Gompertz law), so an HR of 1.10 equals +1 year and an HR of 0.91 equals minus one. The per-metric corrections are summed into years, with overlap handling and an overall cap. The result is your calendar age plus the sum of corrections. It is group statistics, not a prediction for an individual, and not a medical indicator.'],
    [{ title: 'Gompertz, Philosophical Transactions of the Royal Society', year: 1825 }, PALUCH, YIN, KODAMA],
    ['bodyage_inputs', 'bodyage_medical', 'bodyage_moves'], ['возраст тела', 'биологический возраст', 'формула', 'что это']),

  mk('bodyage_inputs', 'base',
    ['Из чего складывается возраст тела?', 'What goes into body age?'],
    [
      ['Из сна (сколько и насколько регулярно), шагов, минут нагрузки, силовых, VO2max, пульса покоя и состава тела. Что приложение не знает, то просто не учитывается.',
       'From sleep (how much and how regular), steps, minutes of activity, strength training, VO2max, resting heart rate and body composition. Whatever the app does not know is simply left out.'],
      ['Девять метрик: длительность и регулярность сна, шаги, умеренная и интенсивная нагрузка, силовые, VO2max, пульс покоя, безжировая масса. Нет данных по метрике — она молчит, а не считается нулём.',
       'Nine metrics: sleep duration and regularity, steps, moderate and vigorous activity, strength, VO2max, resting heart rate, lean mass. If a metric has no data it stays silent rather than counting as zero.'],
    ],
    ['Метрики: sleepDuration, sleepRegularity, steps, zones13 (умеренная нагрузка, минуты в неделю), zones45 (интенсивная), strength, vo2max, restingHr и leanMass. Данные берутся из Health Connect и ручных записей. Метрика участвует в расчёте, только если у неё есть достаточно надёжное значение; иначе её поправка не добавляется. Поэтому возраст тела при малом числе подключённых данных менее информативен.',
     'The metrics are sleepDuration, sleepRegularity, steps, zones13 (moderate activity, minutes per week), zones45 (vigorous), strength, vo2max, restingHr and leanMass. Data comes from Health Connect and manual entries. A metric takes part only if it has a reliable enough value; otherwise no correction is added. So with few connected data sources, body age is less informative.'],
    ['sleepRegularity', 'steps'], ['bodyage_what', 'bodyage_missing', 'bodyage_moves'], ['метрики', 'входы', 'данные']),

  mk('bodyage_moves', 'base',
    ['Что сильнее всего двигает возраст тела?', 'What moves body age the most?'],
    [
      ['Чаще всего решают сон, шаги и физическая форма: пульс покоя, VO2max, регулярные нагрузки. Сила привычки важнее одного рекордного дня.',
       'Most often sleep, steps and fitness decide it: resting heart rate, VO2max, regular training. Habit consistency matters more than one record day.'],
      ['Ощутимо двигают регулярный сон в норме, 8–11 тысяч шагов, 150–300 минут умеренной нагрузки в неделю и сила. Один хороший день почти ничего не меняет, а месяц привычек меняет.',
       'Regular sleep in the normal range, 8–11 thousand steps, 150–300 minutes of moderate activity a week and strength count noticeably. One good day changes almost nothing; a month of habits does.'],
    ],
    ['Метрики растут по разным кривым. Шаги: от ~3,5 тыс. к ~7,8 тыс. риск заметно падает, к ~10,9 тыс. — ещё немного. Сон: штраф начинается ниже 7 часов и выше 8. Регулярность сна по SRI: от 41 до 87 разница в рисках довольно велика. Пульс покоя: каждые +10 уд/мин ≈ +9% риска (от 65 уд/мин). VO2max: +1 MET (3,5 мл/кг/мин) ≈ −13% риска. Из-за кривых «насыщения» выгоднее подтягивать самое слабое звено, а не улучшать то, что уже хорошо.',
     'The metrics follow different curves. Steps: from ~3.5k to ~7.8k risk falls markedly, to ~10.9k a little more. Sleep: the penalty starts below 7 hours and above 8. Sleep regularity (SRI): from 41 to 87 the risk gap is fairly large. Resting heart rate: every +10 bpm is about +9% risk (from 65 bpm). VO2max: +1 MET (3.5 ml/kg/min) is about −13% risk. Because the curves saturate, it pays more to lift the weakest link than to polish what is already good.'],
    [PALUCH, YIN, ZHANG, KODAMA], ['bodyage_goal', 'bodyage_pace', 'bodyage_fast'], ['что влияет', 'шаги', 'сон', 'форма']),

  mk('bodyage_pace', 'base',
    ['Что такое темп старения?', 'What is the aging pace?'],
    [
      ['Темп показывает, сколько «биологических лет» проходит за календарный год, если привычки последних 30 дней сохранятся. Меньше 1 — хорошо, больше 1 — привычки просели.',
       'Pace shows how many "biological years" pass per calendar year if the habits of the last 30 days stay. Below 1 is good, above 1 means habits slipped.'],
      ['Это скорость, а не возраст: сравнение последнего месяца с полугодом. Лучше стало — темп ниже 1, хуже — выше.',
       'It is speed, not age: the last month compared with six months. Better lately means below 1, worse means above.'],
    ],
    ['Темп = 1 + (поправка за 30 дней − поправка за 180 дней) / 0,5 года. То есть считается, что за полгода поправка сместится от значения за 6 месяцев к значению за 30 дней. В сравнение попадают только метрики, которые есть в обоих окнах. Результат ограничен диапазоном от −1 до 3. Короткие скачки (болезнь, отпуск) заметно качают темп, поэтому смотреть стоит на тенденцию за несколько недель.',
     'Pace = 1 + (30-day correction − 180-day correction) / 0.5 years. It assumes that within half a year the correction shifts from the 6-month value to the 30-day value. Only metrics present in both windows are compared. The result is limited to the range −1 to 3. Short swings (illness, vacation) move the pace noticeably, so look at the trend over several weeks.'],
    [], ['bodyage_what', 'bodyage_fast', 'bodyage_accuracy'], ['темп', 'скорость старения', 'pace']),

  mk('bodyage_vs_real', 'base',
    ['Почему возраст тела отличается от паспортного?', 'Why does body age differ from my real age?'],
    [
      ['Потому что считается по привычкам, а не по паспорту: сон, движение и форма сдвигают оценку вверх или вниз. Паспортный возраст — только точка отсчёта.',
       'Because it is based on habits, not the passport: sleep, movement and fitness push the estimate up or down. Your real age is only the starting point.'],
      ['Разница — это сумма поправок по метрикам. Привычки лучше типичных для твоего возраста дают минус годы, хуже — плюс.',
       'The difference is the sum of metric corrections. Habits better than typical for your age give minus years, worse give plus.'],
    ],
    ['Возраст тела = календарный возраст + сумма поправок (от −10 до +15 лет). Поправка метрики — это ln(HR) / ln(1,10): для шагов, например, типичным считается около 7,8 тыс. в день, для VO2max — медиана по возрасту и полу (данные FRIEND). Поэтому у 25-летнего и 60-летнего одинаковый VO2max даёт разные поправки: оценка относительная.',
     'Body age = calendar age + the sum of corrections (from −10 to +15 years). A metric correction is ln(HR) / ln(1.10): for steps, about 7.8k a day counts as typical; for VO2max, the median for age and sex (FRIEND data). So the same VO2max gives different corrections for a 25-year-old and a 60-year-old: the estimate is relative.'],
    [KAMINSKY, PALUCH], ['bodyage_what', 'bodyage_cap', 'bodyage_vo2'], ['паспортный возраст', 'разница', 'поправка']),

  mk('bodyage_medical', 'base',
    ['Это медицинский показатель?', 'Is it a medical indicator?'],
    [
      ['Нет. Это информационная оценка по статистике, а не диагноз и не прогноз. Тревожит самочувствие — идти нужно к врачу, а не сверяться с цифрой.',
       'No. It is an informational estimate from statistics, not a diagnosis or a forecast. If you are worried about how you feel, see a doctor rather than check a number.'],
      ['Не медицинский показатель: это прототип, который переводит исследования в понятные годы. Врач оценивает тебя целиком, а я — только то, что видят часы и записи.',
       'Not a medical indicator: it is a prototype that turns research into understandable years. A doctor looks at you as a whole; I only see what the watch and entries show.'],
    ],
    ['Формула опирается на групповые данные: отношение рисков в когортах говорит о популяции, а не о тебе. Метрики часов измеряются с погрешностью (сон, пульс, VO2max по оценке), а многие связи в исследованиях — ассоциации, не доказанная причинность. Поэтому цифра подходит для мотивации и отслеживания тенденции, но не для решений о лечении и не для сравнения с чужими результатами.',
     'The formula rests on group data: cohort hazard ratios describe a population, not you. Watch metrics carry measurement error (sleep, heart rate, estimated VO2max), and many links in studies are associations, not proven causation. So the number suits motivation and trend tracking, not treatment decisions or comparison with other people.'],
    [], ['bodyage_accuracy', 'bodyage_what', 'bodyage_goal'], ['не медицинский', 'диагноз', 'врач', 'ограничения']),

  mk('bodyage_accuracy', 'base',
    ['Насколько точен возраст тела?', 'How accurate is body age?'],
    [
      ['Как ориентир на несколько лет — разумно, как точное число — нет. Данные носимых устройств неидеальны, а формула усредняет по группам.',
       'As a rough guide within a few years it is reasonable; as an exact number it is not. Wearable data is imperfect and the formula averages over groups.'],
      ['Смотри на направление, а не на десятые: растёт или падает за месяцы. Разница в год-два внутри погрешности.',
       'Watch the direction, not the decimals: rising or falling over months. A difference of a year or two is within the error.'],
    ],
    ['Источники погрешности: оценка сна по часам (особенно фазы), VO2max, рассчитанный устройством, а не по газоанализу, пульс покоя зависит от дня; значения метрик не независимы, из-за чего вклад перекрывающихся метрик ослаблен весами. Сами коэффициенты округлены из публикаций, кривые между точками интерполированы. Поэтому полезно сравнивать себя с собой, а не с другими людьми.',
     'Sources of error: sleep from a watch (phases especially), VO2max estimated by the device rather than gas analysis, resting heart rate varying by day; metrics are not independent, so overlapping ones are down-weighted. The coefficients are rounded from publications and curves are interpolated between points. So compare yourself with yourself, not with other people.'],
    [KODAMA, ZHANG], ['bodyage_medical', 'bodyage_pace', 'bodyage_overlap'], ['точность', 'погрешность']),

  mk('bodyage_missing', 'base',
    ['Почему возраст тела не считается или «прыгает»?', 'Why is body age missing or jumpy?'],
    [
      ['Скорее всего, данных пока мало: без надёжных значений метрики не участвуют в расчёте. Подключи часы или добавь записи вручную, и оценка стабилизируется.',
       'Most likely there is not much data yet: without reliable values, metrics are left out. Connect a watch or add manual entries and the estimate settles.'],
      ['Когда метрик мало, каждая добавленная или пропавшая заметно сдвигает итог. С ростом числа данных скачки стихают.',
       'With few metrics, each one added or dropped shifts the total noticeably. As data grows the jumps calm down.'],
    ],
    ['Метрика попадает в расчёт, только если у неё есть валидное число; без него поправка просто отсутствует. Если за неделю появились шаги и пульс покоя, а сна не было, итог меняется только из-за состава метрик. Чтобы оценка была стабильной, нужны хотя бы сон, шаги и пульс покоя за несколько недель. Нет данных по сну — открой «Записать вручную».',
     'A metric takes part only with a valid number; without one, its correction is simply absent. If steps and resting heart rate appear in a week but sleep was missing, the total changes only because the set of metrics changed. For a stable estimate you need at least sleep, steps and resting heart rate over a few weeks. If sleep is missing, open Log manually.'],
    [], ['bodyage_inputs', 'bodyage_accuracy', 'bodyage_pace'], ['нет данных', 'прыгает', 'пропал']),

  mk('bodyage_goal', 'base',
    ['Как улучшить возраст тела?', 'How can I improve body age?'],
    [
      ['Подтяни самое слабое звено: обычно это сон 7–8 часов в стабильном режиме, шаги и 150 минут нагрузки в неделю. Результат придёт за недели, а не за дни.',
       'Lift your weakest link: usually sleep of 7–8 hours on a steady schedule, steps and 150 minutes of activity a week. Results come in weeks, not days.'],
      ['Лучше всего работают скучные вещи: ложиться в одно время, ходить каждый день, пару раз в неделю добавить силовую. Хирон не обещает чудес, только динамику.',
       'Boring things work best: bed at the same time, walking daily, adding strength twice a week. Hiron promises no miracles, only direction.'],
    ],
    ['Приоритеты по логике формулы: сон (7–8 часов и регулярность), активность (150–300 минут умеренной или 75–150 интенсивной в неделю — ориентиры ВОЗ), шаги (около 8–11 тыс.), силовые 30–60 минут в неделю, затем пульс покоя и VO2max, которые обычно улучшаются от регулярной аэробной нагрузки. Курение не входит в формулу, но отказ от него возвращает годы жизни по независимым данным.',
     'Priorities by the formula logic: sleep (7–8 hours and regularity), activity (150–300 minutes moderate or 75–150 vigorous a week — WHO guidance), steps (about 8–11k), strength 30–60 minutes a week, then resting heart rate and VO2max, which usually improve with regular aerobic training. Smoking is not in the formula, but quitting gains back years of life by independent data.'],
    ['whoActivity', 'strength', 'sleepNeed', 'smoking'], ['bodyage_moves', 'bodyage_fast', 'bodyage_sleep_part'], ['улучшить', 'как снизить', 'советы']),

  mk('bodyage_fast', 'base',
    ['За сколько можно омолодить возраст тела?', 'How fast can body age drop?'],
    [
      ['Быстро — не получится: оценка смотрит на месяцы, а не на дни. Заметный сдвиг обычно виден через 4–8 недель стабильных привычек.',
       'Not fast: the estimate looks at months, not days. A noticeable shift usually shows after 4–8 weeks of steady habits.'],
      ['Неделя хорошего сна почти не меняет цифру, зато тенденция темпа начнёт улучшаться раньше.',
       'A week of good sleep barely changes the number, but the pace trend will start to improve earlier.'],
    ],
    ['Показатели считаются по окнам (30 дней и полгода), поэтому плохие недели «забываются» постепенно, а новые привычки накапливаются медленно. Физиологические метрики тоже инертны: пульс покоя и VO2max заметно меняются за недели и месяцы тренировок. Первым реагирует темп старения, потом сам возраст тела. Не стоит гнаться за ежедневной цифрой.',
     'Metrics use windows (30 days and six months), so bad weeks fade gradually and new habits accumulate slowly. Physiological metrics are inert too: resting heart rate and VO2max change over weeks and months of training. The aging pace responds first, then body age itself. Do not chase a daily number.'],
    [{ title: 'Lally et al., Eur J Soc Psychol: How are habits formed', year: 2010 }], ['bodyage_pace', 'bodyage_goal', 'bodyage_accuracy'], ['сколько времени', 'быстро', 'омолодить'], true),

  mk('bodyage_sleep_part', 'base',
    ['Как сон влияет на возраст тела?', 'How does sleep affect body age?'],
    [
      ['Учитываются два параметра: сколько спишь (идеально 7–8 часов) и насколько регулярно ложишься и встаёшь. Меньше 7 часов и хаотичный режим добавляют годы.',
       'Two things count: how long you sleep (ideally 7–8 hours) and how regular your bedtime and wake-up are. Under 7 hours and a chaotic schedule add years.'],
      ['Сон — отдельная группа в формуле. Регулярность по данным UK Biobank оказалась даже важнее длительности.',
       'Sleep is its own group in the formula. In UK Biobank data, regularity turned out even more important than duration.'],
    ],
    ['Длительность: ниже 7 часов каждый недостающий час даёт рост риска примерно на 6%, выше 8 — около 13% за час (метаанализ Yin 2017). Регулярность (индекс SRI): значение около 41 — HR ≈ 1,53, медиана около 71 — 1,0, около 87 — ≈ 0,90 (Windred 2024). Эти две метрики в одной группе, поэтому берётся большая поправка полностью, а вторая — с весом 1/2.',
     'Duration: below 7 hours each missing hour raises risk by about 6%, above 8 about 13% per hour (Yin 2017 meta-analysis). Regularity (SRI): a value near 41 gives HR ≈ 1.53, the median near 71 gives 1.0, near 87 about 0.90 (Windred 2024). These two sit in one group, so the larger correction counts fully and the second at weight 1/2.'],
    ['sleepNeed', 'sleepRegularity', YIN], ['sleep_how_much', 'bodyage_goal', 'bodyage_overlap'], ['сон', 'регулярность', 'SRI']),

  mk('bodyage_steps_part', 'base',
    ['Сколько шагов нужно для возраста тела?', 'How many steps help body age?'],
    [
      ['Приложение считает типичным около 7,8 тысяч шагов в день, а польза растёт до 10–11 тысяч. Дальше выгода слабеет.',
       'The app treats about 7.8 thousand steps a day as typical, and the benefit grows up to 10–11 thousand. Beyond that the gain fades.'],
      ['Больше шагов — моложе тело, но кривая пологая: самый заметный выигрыш при подъёме с малых значений.',
       'More steps, younger body, but the curve is shallow: the biggest gain comes from raising low counts.'],
    ],
    ['Опорные точки (метаанализ Paluch 2022, 15 когорт): около 3,6 тыс. шагов — HR 1,0, 5,8 тыс. — 0,60, 7,8 тыс. — 0,55, 10,9 тыс. — 0,47. В приложении пересчитано относительно ~7,8 тыс.: 3,6 тыс. дают HR ≈ 1,82, 10,9 тыс. — ≈ 0,86. Шаги входят в группу «форма» вместе с зонами пульса, VO2max и пульсом покоя, их вклады перекрываются.',
     'Anchor points (Paluch 2022 meta-analysis, 15 cohorts): about 3.6k steps is HR 1.0, 5.8k is 0.60, 7.8k is 0.55, 10.9k is 0.47. The app rescales to ~7.8k: 3.6k gives HR ≈ 1.82, 10.9k ≈ 0.86. Steps sit in the "fitness" group with heart rate zones, VO2max and resting heart rate, so contributions overlap.'],
    ['steps', PALUCH], ['activity_steps_goal', 'bodyage_fitness_part', 'bodyage_moves'], ['шаги', 'ходьба']),

  mk('bodyage_fitness_part', 'base',
    ['При чём тут пульс покоя и VO2max?', 'What do resting heart rate and VO2max have to do with it?'],
    [
      ['Это показатели формы сердца и лёгких. Ниже пульс покоя и выше VO2max — ниже риск, поэтому тело «моложе».',
       'They reflect heart and lung fitness. A lower resting heart rate and higher VO2max mean lower risk, so a younger body.'],
      ['Оба улучшаются от регулярной аэробной нагрузки, но за недели и месяцы, не за пару дней.',
       'Both improve with regular aerobic training, but over weeks and months, not a few days.'],
    ],
    ['Пульс покоя: +10 уд/мин ≈ HR 1,09, отсчёт от 65, учёт в пределах 45–100 (Zhang 2016). VO2max: +1 MET ≈ HR 0,87 от медианы для возраста и пола, учёт в пределах ±3 MET (Kodama 2009; Mandsager 2018 не нашёл верхнего порога пользы). VO2max на часах — оценка алгоритма, поэтому неточность тут выше всего.',
     'Resting heart rate: +10 bpm is about HR 1.09, counted from 65 and limited to 45–100 (Zhang 2016). VO2max: +1 MET is about HR 0.87 from the age- and sex-specific median, limited to ±3 METs (Kodama 2009; Mandsager 2018 found no upper limit of benefit). Watch VO2max is an algorithm estimate, so the uncertainty here is the highest.'],
    ['restingHr', ZHANG, KODAMA], ['heart_resting', 'bodyage_vo2', 'bodyage_overlap'], ['пульс покоя', 'VO2max', 'форма']),

  mk('bodyage_vo2', 'pro',
    ['Как VO2max превращается в годы?', 'How does VO2max turn into years?'],
    [
      ['VO2max сравнивается с медианой для твоего возраста и пола, и каждая «ступень» выше медианы убирает годы. Ниже медианы — добавляет.',
       'VO2max is compared with the median for your age and sex, and each step above the median removes years. Below the median adds.'],
      ['Нужен не абсолютный рекорд, а положение относительно сверстников и пола.',
       'It is not an absolute record that matters, but your position relative to peers of your sex.'],
    ],
    ['HR = 0,87^((VO2 − медиана) / 3,5), разница ограничена ±10,5 мл/кг/мин (±3 MET). Медиана — по таблицам FRIEND (Kaminsky 2015): например, у мужчин 25 лет ≈ 48, 45 лет ≈ 37,8; у женщин 25 лет ≈ 37,6, 45 лет ≈ 26,7. Годы = ln(HR) / ln(1,10). Целевое значение приложение ставит как медиана + 7. Ограничения: измерение на часах — оценка по пульсу и движению, а в FRIEND — тест на дорожке.',
     'HR = 0.87^((VO2 − median) / 3.5), the difference limited to ±10.5 ml/kg/min (±3 METs). The median comes from FRIEND tables (Kaminsky 2015): for example men aged 25 about 48, aged 45 about 37.8; women aged 25 about 37.6, aged 45 about 26.7. Years = ln(HR) / ln(1.10). The app sets the target as median + 7. Limitation: watch measurement is an estimate from heart rate and motion, while FRIEND used treadmill tests.'],
    [KODAMA, KAMINSKY], ['bodyage_fitness_part', 'bodyage_overlap', 'training_zones'], ['VO2max', 'FRIEND', 'MET']),

  mk('bodyage_hazard', 'pro',
    ['Почему отношение рисков переводится в годы именно так?', 'Why is hazard ratio converted to years this way?'],
    [
      ['Риск смерти растёт примерно на 9–10% за год жизни, поэтому +10% риска приравнено к +1 году. Это упрощение, но удобное.',
       'Mortality risk rises about 9–10% per year of age, so +10% risk is equated to +1 year. It is a simplification, but a handy one.'],
      ['Формула: годы = ln(HR) / ln(1,10). HR 0,91 даёт примерно −1 год.',
       'The formula: years = ln(HR) / ln(1.10). An HR of 0.91 gives about minus one year.'],
    ],
    ['Закон Гомпертца: смертность растёт экспоненциально с возрастом, у взрослых удвоение примерно каждые 7–8 лет (≈ 9–10% в год). Поэтому разница в относительном риске эквивалентна сдвигу по возрасту: ln(HR) / ln(1,10). Допущения: HR из разных когорт переносятся на одного человека, эффекты аддитивны в логарифмической шкале, причинность принимается условно. Для метрик с HR из мета-анализов это грубая, но воспроизводимая оценка; не эпигенетические часы и не биомаркёры крови.',
     'The Gompertz law: mortality rises exponentially with age, doubling roughly every 7–8 years in adults (≈ 9–10% a year). So a relative risk difference is equivalent to an age shift: ln(HR) / ln(1.10). Assumptions: HRs from different cohorts transfer to one person, effects add on the log scale, causality is accepted provisionally. For metrics with meta-analysis HRs it is a crude but reproducible estimate; not epigenetic clocks and not blood biomarkers.'],
    [{ title: 'Gompertz, Philosophical Transactions of the Royal Society', year: 1825 }, ZHANG], ['bodyage_what', 'bodyage_overlap', 'bodyage_cap'], ['Гомпертц', 'HR', 'hazard ratio', 'логарифм']),

  mk('bodyage_overlap', 'pro',
    ['Как учитывается перекрытие метрик?', 'How are overlapping metrics handled?'],
    [
      ['Шаги, пульсовые зоны, VO2max и пульс покоя во многом измеряют одно и то же. Поэтому внутри группы самая большая поправка берётся полностью, остальные — с понижающим весом.',
       'Steps, heart rate zones, VO2max and resting heart rate largely measure the same thing. So within a group the largest correction counts fully and the rest are down-weighted.'],
      ['Это защита от двойного счёта: хорошая форма не должна давать минус пять лет четыре раза подряд.',
       'It guards against double counting: good fitness should not give minus five years four times over.'],
    ],
    ['Группы: сон (длительность, регулярность), форма (шаги, умеренная и интенсивная нагрузка, силовые, VO2max, пульс покоя) и состав тела (безжировая масса). Внутри группы отдельно для прибавок и отдельно для убавок поправки сортируются по модулю: первая с весом 1, вторая 1/2, третья 1/3 и так далее. Это эвристика, а не статистическая модель совместного риска; на самом деле эффекты частично независимы, поэтому оценка скорее консервативна.',
     'Groups: sleep (duration, regularity), fitness (steps, moderate and vigorous activity, strength, VO2max, resting heart rate) and body composition (lean mass). Within a group, separately for additions and subtractions, corrections are sorted by magnitude: the first with weight 1, the second 1/2, the third 1/3 and so on. This is a heuristic, not a joint risk model; in reality effects are partly independent, so the estimate tends to be conservative.'],
    [AREM, LEE], ['bodyage_cap', 'bodyage_hazard', 'bodyage_fitness_part'], ['перекрытие', 'группы', 'двойной счёт']),

  mk('bodyage_cap', 'pro',
    ['Есть ли у возраста тела пределы?', 'Does body age have limits?'],
    [
      ['Да: итоговая поправка ограничена от −10 до +15 лет, а темп — от −1 до 3. Это страховка от нереальных цифр.',
       'Yes: the total correction is capped from −10 to +15 years and the pace from −1 to 3. It guards against absurd numbers.'],
      ['Минус двадцать лет приложение не покажет: формула честно признаёт, что точность ограничена.',
       'The app will not show minus twenty years: the formula honestly admits its precision is limited.'],
    ],
    ['Итог = clamp(сумма поправок, −10, +15). Границы заданы вручную как страховка от нереалистичных значений, а не выведены из исследований; оценки у краёв кривых опираются на небольшие группы. Кривые метрик за пределами опорных точек не экстраполируются (значение «приклеивается» к последней точке). Темп ограничен [−1; 3].',
     'Total = clamp(sum of corrections, −10, +15). The limits are set by hand as a safeguard against unrealistic values, not derived from studies; estimates near the curve edges rest on small groups. Metric curves are not extrapolated beyond their anchor points (the value sticks to the last point). The pace is limited to [−1; 3].'],
    [AREM, KODAMA], ['bodyage_overlap', 'bodyage_vs_real', 'bodyage_pace'], ['предел', 'ограничения', 'clamp']),

  mk('bodyage_strength_lean', 'pro',
    ['Как силовые и мышцы учитываются в возрасте тела?', 'How do strength training and muscle count?'],
    [
      ['Силовые 30–60 минут в неделю дают заметный плюс; безжировая масса сравнивается с нормой для пола. Больше мышц — ниже риск.',
       'Strength training of 30–60 minutes a week gives a clear benefit; lean mass is compared with the norm for your sex. More muscle means lower risk.'],
      ['Сила — одна из немногих привычек, где «чуть-чуть» уже работает. Перебор пользы не добавляет.',
       'Strength is one of the few habits where "a little" already works. Excess adds no benefit.'],
    ],
    ['Силовые: J-образная связь (Momma 2022): максимум около −10…−17% риска при 30–60 минутах в неделю, после ~140 минут эффект слабеет. Безжировая масса: индекс (FFMI) = безжировая масса / рост²; нормы по Schutz 2002: мужчины ≈ 16 / 18,9 / 21, женщины ≈ 13 / 15,4 / 17,5 кг/м²; верхний квартиль против нижнего — HR около 0,80 (Srikanthan 2014). Оценка состава тела с бытовых весов неточна, поэтому метрика зависит от качества источника.',
     'Strength: a J-shaped relation (Momma 2022): the peak is about −10 to −17% risk at 30–60 minutes a week, fading after ~140 minutes. Lean mass: index (FFMI) = lean mass / height²; Schutz 2002 norms: men ≈ 16 / 18.9 / 21, women ≈ 13 / 15.4 / 17.5 kg/m²; top quartile versus bottom has an HR of about 0.80 (Srikanthan 2014). Body composition from consumer scales is imprecise, so this metric depends on the source quality.'],
    ['strength', { title: 'Momma et al., Br J Sports Med: Muscle-strengthening activities and mortality', year: 2022 }, SRIK, { title: 'Schutz, Kyle, Pichard, Int J Obes: Fat-free mass index percentiles', year: 2002 }], ['bodyage_fitness_part', 'bodyage_overlap'], ['силовые', 'мышцы', 'FFMI', 'безжировая масса']),
];
