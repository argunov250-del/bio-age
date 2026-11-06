// Раздел «Цикл»: показывается только при включённом профиле showCycle. Основы фаз, тренировки и цикл, что показывает приложение.
// Не медицинские советы и не метод контрацепции. Контент-файл раздела; реестр — lib/coach/qa/index.js.
const when = (env) => !!(env && ((env.profile && env.profile.showCycle) || (!env.profile && env.showCycle)));

const mk = (id, level, q, short, more, sources, follow, tags, humorOk = false) => ({
  id, section: 'cycle', level,
  q: { ru: q[0], en: q[1] },
  short: short.map((s) => ({ ru: s[0], en: s[1] })),
  more: { ru: more[0], en: more[1] },
  sources, follow, needs: [], when, humorOk, tags,
});

const BULL = { title: 'Bull et al., npj Digital Medicine: Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles', year: 2019 };
const WILCOX = { title: 'Wilcox et al., N Engl J Med: Timing of sexual intercourse in relation to ovulation', year: 1995 };

export default [
  mk('cycle_phases', 'base',
    ['Какие бывают фазы цикла?', 'What are the phases of the cycle?'],
    [
      ['Условно четыре: месячные, фолликулярная фаза, овуляция и лютеиновая фаза. Приложение показывает, где ты сейчас, по отмеченным месячным.',
       'Roughly four: period, follicular phase, ovulation and luteal phase. The app shows where you are, based on the periods you mark.'],
      ['Цикл считается с первого дня месячных. Первая половина — рост эстрогена, вторая — время прогестерона.',
       'The cycle counts from the first day of your period. The first half is rising estrogen, the second is progesterone time.'],
    ],
    ['Менструальная фаза — дни кровотечения. Фолликулярная — от начала месячных до овуляции, растёт эстроген. Овуляция — выход яйцеклетки, около одного дня. Лютеиновая — после овуляции до следующих месячных; её длина стабильнее и в среднем около 12–13 дней, а фолликулярная сильно различается между людьми и циклами (Bull 2019). Приложение оценивает овуляцию от ожидаемого начала следующих месячных назад, поэтому это оценка, а не измерение.',
     'The menstrual phase is the days of bleeding. The follicular phase runs from the start of the period to ovulation, with rising estrogen. Ovulation is the release of the egg, about one day. The luteal phase runs from ovulation to the next period; its length is steadier, on average about 12–13 days, while the follicular phase varies widely between people and cycles (Bull 2019). The app estimates ovulation by counting back from the expected next period, so it is an estimate, not a measurement.'],
    ['cycleLength', BULL], ['cycle_length_norm', 'cycle_app_shows', 'cycle_ovulation'], ['фазы', 'цикл', 'овуляция', 'месячные']),

  mk('cycle_length_norm', 'base',
    ['Какой цикл считается нормальным?', 'What counts as a normal cycle?'],
    [
      ['По руководству FIGO нормальный цикл длится от 24 до 38 дней, а месячные — до 8 дней. Ровно 28 дней бывают у меньшинства.',
       'By FIGO, a normal cycle lasts 24 to 38 days and a period up to 8 days. Exactly 28 days is the minority.'],
      ['Разница между циклами до 7–9 дней — тоже в пределах нормы. Если всё сильно выходит за рамки, это повод обсудить с гинекологом, а не вывод Хирона.',
       'A difference between cycles of up to 7–9 days is also within the norm. If things go well outside these ranges, it is a reason to talk to a gynecologist, not a conclusion from Hiron.'],
    ],
    ['Руководство FIGO (Munro 2018) определяет нормальные параметры маточных кровотечений у небеременных: частота 24–38 дней, вариабельность цикла не более 7–9 дней, длительность кровотечения до 8 дней. По анализу 600 тысяч циклов средняя длина — 29,3 дня и лишь 13% циклов ровно 28 дней (Bull 2019). Приложение помечает средние значения вне диапазона, но не ставит диагнозов.',
     'The FIGO guideline (Munro 2018) defines normal uterine bleeding parameters in non-pregnant women: frequency 24–38 days, cycle variability up to 7–9 days, bleeding up to 8 days. In an analysis of 600 thousand cycles the average length was 29.3 days and only 13% of cycles were exactly 28 days (Bull 2019). The app flags averages outside the range but makes no diagnoses.'],
    ['cycleNorm', 'cycleLength'], ['cycle_irregular', 'cycle_phases', 'cycle_app_shows'], ['норма', '28 дней', 'длина цикла']),

  mk('cycle_irregular', 'base',
    ['Почему цикл нерегулярный?', 'Why is my cycle irregular?'],
    [
      ['Небольшие колебания бывают от стресса, болезни, перелётов, нагрузок и изменения веса. Если нерегулярность держится несколько месяцев, лучше к гинекологу.',
       'Small shifts come from stress, illness, travel, training and weight change. If irregularity lasts for months, see a gynecologist.'],
      ['Одна «сдвинутая» неделя — обычно ничего особенного. Хирон не ставит причину, он только замечает разброс.',
       'One shifted week is usually nothing special. Hiron cannot name the cause; he only notices the spread.'],
    ],
    ['Приложение показывает «нерегулярность», если разброс длин циклов превышает 9 дней, и «вне диапазона», если средний цикл вне 24–38 дней (FIGO 2018). Причин много: стресс, дефицит энергии при тренировках, изменение веса, щитовидная железа, СПКЯ, период после родов или перед менопаузой, контрацепция. Причину определяет врач. Ранние циклы после менархе и перед менопаузой нередко нерегулярны.',
     'The app shows "irregular" if the spread of cycle lengths exceeds 9 days and "out of range" if the average cycle is outside 24–38 days (FIGO 2018). There are many causes: stress, energy deficiency in training, weight change, thyroid, PCOS, postpartum or perimenopause, contraception. A doctor determines the cause. Early cycles after menarche and before menopause are often irregular.'],
    ['cycleNorm'], ['cycle_length_norm', 'cycle_late', 'cycle_app_shows'], ['нерегулярный', 'задержка', 'стресс']),

  mk('cycle_late', 'base',
    ['Месячные задерживаются. Что это значит?', 'My period is late. What does it mean?'],
    [
      ['Небольшие задержки бывают из-за стресса, болезни, перелётов или тренировок. Если задержка больше недели или возможна беременность, сделай тест и при необходимости обратись к врачу.',
       'Small delays happen with stress, illness, travel or heavy training. If it is over a week late or pregnancy is possible, take a test and see a doctor if needed.'],
      ['Приложение просто считает дни задержки по средней длине цикла. Причину оно не определяет.',
       'The app simply counts days late against your average cycle length. It does not identify the cause.'],
    ],
    ['«Задержка» в приложении — это дни после ожидаемой даты, рассчитанной по средней длине циклов, поэтому при малом числе записей прогноз грубее. При задержке прогноз пересчитывается от сегодняшнего дня. Не метод диагностики беременности и не оценка здоровья. Сильная боль, обильное кровотечение или головокружение — повод обратиться к врачу срочно.',
     '"Late" in the app means days after the expected date calculated from your average cycle length, so with few entries the forecast is rougher. With a delay the forecast is recalculated from today. It is not a pregnancy diagnostic and not a health assessment. Severe pain, heavy bleeding or dizziness are reasons to see a doctor urgently.'],
    ['cycleNorm'], ['cycle_irregular', 'cycle_length_norm', 'cycle_app_shows'], ['задержка', 'тест', 'беременность']),

  mk('cycle_ovulation', 'base',
    ['Как узнать день овуляции?', 'How can I know my ovulation day?'],
    [
      ['Приложение оценивает его по средней длине цикла, поэтому он может сдвигаться. Точнее — тесты на овуляцию или измерение базальной температуры.',
       'The app estimates it from your average cycle length, so it can shift. Ovulation tests or basal temperature are more accurate.'],
      ['Овуляция бывает не на 14-й день и может сдвигаться даже при регулярном цикле. Приложение — не метод контрацепции.',
       'Ovulation is not usually on day 14 and can shift even in a regular cycle. The app is not a contraceptive method.'],
    ],
    ['Овуляцию приложение ставит как «ожидаемое начало следующих месячных минус 13 дней» — лютеиновая фаза стабильнее фолликулярной. Это оценка со значимой погрешностью: овуляция бывает раньше или позже (Wilcox 2000). После овуляции базальная температура повышается на 0,3–0,5 °C. При гормональной контрацепции собственной овуляции обычно нет, и приложение прогноз овуляции не показывает.',
     'The app places ovulation as "expected start of the next period minus 13 days" because the luteal phase is steadier than the follicular. This is an estimate with considerable error: ovulation can come earlier or later (Wilcox 2000). After ovulation basal temperature rises by 0.3–0.5 °C. On hormonal contraception there is usually no ovulation of your own, and the app shows no ovulation forecast.'],
    ['fertileWindow', 'cycleLength', WILCOX], ['cycle_fertile', 'cycle_basal_temp', 'cycle_hormonal'], ['овуляция', 'тест', 'температура']),

  mk('cycle_fertile', 'base',
    ['Что такое фертильное окно?', 'What is the fertile window?'],
    [
      ['Это 6 дней, заканчивающихся днём овуляции: в них вероятность беременности самая высокая. Это оценка по среднему циклу, а не метод контрацепции.',
       'It is the 6 days ending on ovulation day, when the chance of pregnancy is highest. It is an estimate from your average cycle, not contraception.'],
      ['Окно можно сместить: овуляция не всегда на одном и том же дне. Поэтому на расчёт приложения нельзя полагаться как на защиту.',
       'The window can shift: ovulation is not always on the same day. So the app calculation cannot be relied on for protection.'],
    ],
    ['Wilcox 1995 (NEJM): беременность возможна при половом акте в 6-дневный период, заканчивающийся днём овуляции; вероятность растёт к двум дням до овуляции. Сама овуляция может сдвигаться и при регулярном цикле (Wilcox 2000). Календарные методы дают невысокую надёжность; для контрацепции или планирования беременности нужна консультация врача.',
     'Wilcox 1995 (NEJM): pregnancy is possible with intercourse in the 6-day period ending on ovulation day; probability peaks in the two days before ovulation. Ovulation itself can shift even in regular cycles (Wilcox 2000). Calendar methods have limited reliability; for contraception or planning a pregnancy, consult a doctor.'],
    ['fertileWindow', WILCOX], ['cycle_ovulation', 'cycle_hormonal', 'cycle_app_shows'], ['фертильное окно', 'беременность', 'контрацепция']),

  mk('cycle_basal_temp', 'pro',
    ['Почему после овуляции растёт температура?', 'Why does temperature rise after ovulation?'],
    [
      ['После овуляции вырабатывается прогестерон, и температура тела повышается примерно на 0,3–0,5 °C. Он же слегка поднимает ночной пульс.',
       'After ovulation progesterone is produced and body temperature rises by about 0.3–0.5 °C. It also slightly raises night heart rate.'],
      ['Поэтому во второй половине цикла пульс покоя выше, а HRV ниже, и это нормально.',
       'That is why in the second half of the cycle resting heart rate is higher and HRV lower, and that is normal.'],
    ],
    ['Прогестерон действует на терморегуляторный центр и повышает базальную температуру на 0,3–0,5 °C, что используется в методе базальной температуры; пульс покоя минимален около 5-го дня цикла и максимален перед месячными, HRV — наоборот (Jasinski 2024, 45 тысяч циклов). Сон в лютеиновой фазе у части женщин поверхностнее (Alzueta 2022). Ночную температуру с запястья можно использовать как косвенный признак, но у неё значимая погрешность; метод не подходит для контрацепции без обучения.',
     'Progesterone acts on the thermoregulatory centre and raises basal temperature by 0.3–0.5 °C, which the basal temperature method uses; resting heart rate is lowest around day 5 of the cycle and highest before the period, HRV the opposite (Jasinski 2024, 45 thousand cycles). Sleep in the luteal phase is lighter in some women (Alzueta 2022). Wrist night temperature can serve as an indirect sign but has significant error; the method is unsuitable for contraception without training.'],
    ['lutealSleep', 'cycleHeart'], ['cycle_hr_hrv', 'cycle_ovulation', 'cycle_sleep'], ['температура', 'прогестерон', 'базальная']),

  mk('cycle_hr_hrv', 'base',
    ['Почему перед месячными пульс выше, а HRV ниже?', 'Why is heart rate higher and HRV lower before my period?'],
    [
      ['Во второй половине цикла пульс покоя обычно выше, а HRV ниже — это нормальный гормональный ритм. Это не признак переутомления.',
       'In the second half of the cycle resting heart rate is usually higher and HRV lower — a normal hormonal rhythm. It is not a sign of overtraining.'],
      ['Приложение учитывает цикл, поэтому не пугает тебя ухудшением в эти дни.',
       'The app takes the cycle into account, so it will not alarm you about the dip in these days.'],
    ],
    ['По данным 45 тысяч циклов (Jasinski 2024) пульс покоя минимален около 5-го дня цикла и растёт к концу лютеиновой фазы, HRV меняется в обратную сторону. Размах небольшой, но сопоставим с эффектом лёгкой нагрузки, поэтому оценку восстановления в эти дни лучше сравнивать с тем же днём предыдущих циклов. Резкие и необычные изменения пульса, а также боль в груди или обмороки — повод к врачу.',
     'In data from 45 thousand cycles (Jasinski 2024) resting heart rate is lowest around day 5 and rises towards the end of the luteal phase, with HRV moving the other way. The range is small but comparable to the effect of light training, so recovery in these days is better compared with the same day in earlier cycles. Sudden, unusual changes in pulse, chest pain or fainting are reasons to see a doctor.'],
    ['cycleHeart', 'lutealSleep'], ['recovery_readiness_meaning', 'cycle_basal_temp', 'cycle_training'], ['пульс', 'HRV', 'пмс', 'цикл']),

  mk('cycle_training', 'base',
    ['Как тренироваться с учётом цикла?', 'How should I train around my cycle?'],
    [
      ['Смотри на самочувствие, а не на жёсткие правила. Исследования показывают, что цикл влияет на результаты слабо и очень по-разному у людей.',
       'Go by how you feel, not by rigid rules. Research shows the cycle influences performance only slightly and very differently between people.'],
      ['Если в какие-то дни сил меньше, сделай нагрузку мягче, а в хорошие дни добавляй. Хирон учитывает цикл только как фон.',
       'If you have less energy on some days, make the load gentler, and add on good days. Hiron treats the cycle only as background.'],
    ],
    ['Обзор McNulty 2020 (Sports Medicine): в ранней фолликулярной фазе результаты могут быть незначительно ниже, но эффект очень мал, различия между людьми велики, качество исследований низкое. Поэтому общие правила «в такой-то день тренируйся так» не обоснованы; практичнее вести заметки о самочувствии. Резкая боль, обильные кровотечения или потеря месячных при тренировках требуют консультации врача (риск дефицита энергии).',
     'The McNulty 2020 review (Sports Medicine): in the early follicular phase performance may be slightly lower, but the effect is very small, individual differences are large and study quality is low. So general rules "train like this on day X" are not supported; keeping notes on how you feel is more practical. Severe pain, heavy bleeding or loss of periods with training call for a doctor (risk of energy deficiency).'],
    ['cyclePerformance'], ['training_zones', 'cycle_hr_hrv', 'cycle_menstrual_activity'], ['тренировки', 'цикл', 'нагрузка']),

  mk('cycle_menstrual_activity', 'base',
    ['Можно ли тренироваться во время месячных?', 'Can I train during my period?'],
    [
      ['Если самочувствие позволяет, да. Пульс покоя в эти дни обычно самый низкий, а HRV самый высокий. При боли помогают лёгкое движение и тепло.',
       'If you feel well, yes. Resting heart rate is usually lowest and HRV highest in these days. With cramps, light movement and warmth help.'],
      ['Нет запрета и нет обязанности: слушай себя. Тяжёлая тренировка при плохом самочувствии не обязательна.',
       'There is no ban and no obligation: listen to yourself. A hard workout while feeling bad is not required.'],
    ],
    ['Нет доказательств, что нагрузка во время месячных вредна у здорового человека, а лёгкая активность может уменьшать боли. Выбор зависит от самочувствия (McNulty 2020: влияние цикла на результат мало). Сильная боль, мешающая жить, обильные кровотечения (смена средств чаще чем раз в 1–2 часа) или головокружение — повод обратиться к врачу.',
     'There is no evidence that exercise during a period is harmful in a healthy person, and light activity may ease cramps. The choice depends on how you feel (McNulty 2020: the cycle has little influence on performance). Severe pain that disrupts life, heavy bleeding (changing products more often than every 1–2 hours) or dizziness are reasons to see a doctor.'],
    ['cyclePerformance', 'cycleHeart'], ['cycle_training', 'cycle_hr_hrv', 'cycle_phases'], ['месячные', 'тренировка', 'боль']),

  mk('cycle_sleep', 'base',
    ['Влияет ли цикл на сон?', 'Does the cycle affect sleep?'],
    [
      ['У части женщин после овуляции сон поверхностнее, а к концу лютеиновой фазы бывает ПМС. Это одна из причин, почему не каждая ночь одинакова.',
       'In some women sleep is lighter after ovulation, and PMS can appear towards the end of the luteal phase. It is one reason nights are not all alike.'],
      ['Если сон испортился перед месячными, это нередко цикл, а не «ты что-то сделала не так». Помогает режим и меньше кофе вечером.',
       'If sleep worsens before your period it is often the cycle, not "you did something wrong". A steady routine and less evening coffee help.'],
    ],
    ['После овуляции прогестерон поднимает температуру тела на 0,3–0,5 °C и ночной пульс; сон у части женщин менее глубокий (Alzueta 2022). Эффект индивидуален. Если сильные симптомы перед месячными (ПМДР) мешают жизни, необходим врач.',
     'After ovulation progesterone raises body temperature by 0.3–0.5 °C and night heart rate; sleep is lighter in some women (Alzueta 2022). The effect is individual. If severe pre-period symptoms (PMDD) interfere with life, see a doctor.'],
    ['lutealSleep'], ['sleep_how_much', 'cycle_hr_hrv', 'cycle_basal_temp'], ['сон', 'пмс', 'лютеиновая']),

  mk('cycle_app_shows', 'base',
    ['Что показывает приложение про цикл?', 'What does the app show about my cycle?'],
    [
      ['День цикла, фазу, прогноз следующих месячных и оценку овуляции с фертильным окном, а также отметки в календаре. Всё считается по отмеченным месячным.',
       'Cycle day, phase, the forecast of your next period and an estimate of ovulation with the fertile window, plus calendar marks. Everything is calculated from the periods you mark.'],
      ['Чем больше циклов записано, тем точнее прогноз; пока их мало, он идёт по средним значениям. Данные остаются на телефоне.',
       'The more cycles recorded, the better the forecast; while there are few, it uses averages. Data stay on the phone.'],
    ],
    ['Месячные берутся из Health Connect или ручных отметок. По ним приложение вычисляет среднюю длину цикла, длительность месячных и разброс, отмечает отклонения от нормы FIGO (24–38 дней, разброс до 9 дней, месячные до 8 дней). Овуляция = следующий старт минус 13 дней, фертильное окно — 6 дней до неё. При гормональной контрацепции овуляция не показывается; в режиме беременности цикл не считается. Это не диагноз и не метод контрацепции.',
     'Periods are taken from Health Connect or manual marks. From them the app computes the average cycle length, period length and spread, and flags deviations from the FIGO norms (24–38 days, spread up to 9 days, period up to 8 days). Ovulation = next start minus 13 days, the fertile window is the 6 days up to it. On hormonal contraception ovulation is not shown; in pregnancy mode the cycle is not calculated. It is not a diagnosis or a contraceptive method.'],
    ['cycleNorm', 'fertileWindow'], ['cycle_phases', 'cycle_forecast_accuracy', 'cycle_privacy'], ['что показывает', 'календарь', 'прогноз']),

  mk('cycle_forecast_accuracy', 'pro',
    ['Насколько точен прогноз цикла?', 'How accurate is the cycle forecast?'],
    [
      ['Прогноз следующих месячных хорош при регулярном цикле, а оценка овуляции — приблизительная. Первые циклы идут по средним значениям, поэтому точность растёт со временем.',
       'The forecast of the next period is good with a regular cycle, while the ovulation estimate is approximate. Early cycles use averages, so accuracy improves over time.'],
      ['При нерегулярном цикле прогноз «плавает». Хирон лучше честно скажет «примерно», чем изобразит точность.',
       'With an irregular cycle the forecast drifts. Hiron would rather honestly say "roughly" than fake precision.'],
    ],
    ['Прогноз — средняя длина цикла по последним записям; ошибка пропорциональна разбросу длин. Овуляция определяется от конца цикла назад (лютеиновая фаза ≈ 12–13 дней, Bull 2019), а фолликулярная фаза сильно варьирует, поэтому окно овуляции может сдвигаться на несколько дней. Для надёжной оценки нужны прямые признаки: тест LH, базальная температура, УЗИ по назначению врача.',
     'The forecast is the average cycle length from recent entries; the error scales with the spread of lengths. Ovulation is determined counting back from the cycle end (luteal phase ≈ 12–13 days, Bull 2019), while the follicular phase varies widely, so the ovulation window can shift by several days. For a reliable estimate direct signs are needed: an LH test, basal temperature, or an ultrasound as ordered by a doctor.'],
    [BULL, WILCOX], ['cycle_ovulation', 'cycle_irregular', 'cycle_app_shows'], ['точность', 'прогноз', 'LH']),

  mk('cycle_hormonal', 'base',
    ['Что показывает приложение при гормональной контрацепции?', 'What does the app show on hormonal contraception?'],
    [
      ['При гормональной контрацепции собственной овуляции обычно нет, а кровотечение — реакция на перерыв в приёме. Поэтому прогноз овуляции не показывается.',
       'On hormonal contraception there is usually no ovulation of your own, and bleeding is a response to the hormone break. So no ovulation forecast is shown.'],
      ['Приложение отмечает цикл как «на контрацепции» и просто считает дни. Вопросы по приёму — к врачу.',
       'The app marks the cycle as "on contraception" and just counts days. Questions about taking it go to your doctor.'],
    ],
    ['Режим «контрацепция» убирает оценку овуляции и фертильного окна, оставляя календарь отметок и длину цикла. Пульс и HRV тоже могут вести себя иначе, чем при естественном цикле, поэтому «правила фаз» применять нельзя. Приложение не даёт советов по выбору или приёму препаратов.',
     'The contraception mode removes the ovulation and fertile window estimate, keeping the calendar of marks and cycle length. Heart rate and HRV may also behave differently from a natural cycle, so "phase rules" cannot be applied. The app gives no advice on choosing or taking medications.'],
    [], ['cycle_app_shows', 'cycle_fertile', 'cycle_privacy'], ['контрацепция', 'таблетки', 'гормоны']),

  mk('cycle_privacy', 'base',
    ['Где хранятся данные о моём цикле?', 'Where are my cycle data stored?'],
    [
      ['Данные цикла остаются на телефоне, Хирон не отправляет их во внешние сервисы. Единственное внешнее обращение приложения — погода.',
       'Cycle data stay on your phone; Hiron does not send them to outside services. The app\'s only external request is weather.'],
      ['Цикл виден только тебе: он включается в профиле и отключается там же.',
       'The cycle is visible only to you: it is turned on in the profile and off there too.'],
    ],
    ['Отметки месячных читаются из Health Connect (только чтение) или записываются вручную в локальное хранилище. Советы по циклу показываются, только если функция включена в профиле. Память коуча можно стереть в профиле. Для погоды приложение обращается к погодному сервису с координатами, округлёнными до 0,1°, но данные здоровья туда не уходят.',
     'Period marks are read from Health Connect (read only) or written manually to local storage. Cycle advice appears only if the feature is enabled in the profile. Coach memory can be erased in the profile. For weather the app contacts a weather service with coordinates rounded to 0.1°, but no health data goes there.'],
    [], ['app_privacy', 'cycle_app_shows', 'cycle_hormonal'], ['приватность', 'данные', 'цикл']),
];
