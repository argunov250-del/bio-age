// Раздел «Стресс и дыхание»: дыхание 4–6, цифровая пауза, мягкие способы справляться. Не клиническая помощь.
// Контент-файл раздела; реестр — lib/coach/qa/index.js.
const mk = (id, level, q, short, more, sources, follow, tags, humorOk = false) => ({
  id, section: 'stress', level,
  q: { ru: q[0], en: q[1] },
  short: short.map((s) => ({ ru: s[0], en: s[1] })),
  more: { ru: more[0], en: more[1] },
  sources, follow, needs: [], humorOk, tags,
});

const ZACCARO = { title: 'Zaccaro et al., Front Hum Neurosci: How breath-control can change your life', year: 2018 };
const LEHRER = { title: 'Lehrer & Gevirtz, Front Psychol: Heart rate variability biofeedback', year: 2014 };
const WHO_MH = { title: 'WHO: Doing What Matters in Times of Stress', year: 2020 };
const PLEWS = { title: 'Plews et al., Sports Med: Training adaptation and heart rate variability', year: 2013 };

export default [
  mk('stress_breath', 'base',
    ['Как подышать, чтобы успокоиться?', 'How can I breathe to calm down?'],
    [
      ['Попробуй дыхание 4–6: вдох на 4 счёта, выдох на 6, пять минут. Длинный выдох успокаивает, примерно шесть вдохов в минуту — удобный ритм.',
       'Try 4–6 breathing: inhale for 4, exhale for 6, for five minutes. A long exhale calms, and about six breaths a minute is a comfortable rhythm.'],
      ['Сядь удобно, дыши носом и без усилия: вдох на 4, выдох на 6. Если закружилась голова, вернись к обычному дыханию. Это не лечение, а простая пауза.',
       'Sit comfortably, breathe through the nose and without strain: in for 4, out for 6. If you feel dizzy, return to normal breathing. This is not treatment, just a simple pause.'],
      ['В приложении есть таймер дыхания: пять минут дают XP за привычку. Но и без него хватит одной минуты на ровный выдох.',
       'The app has a breathing timer: five minutes earn habit XP. But even without it, one minute of an even exhale will do.'],
    ],
    ['Медленное дыхание около 6 вдохов в минуту в течение 5–10 минут снижает ощущение напряжения и повышает вариабельность сердечного ритма (HRV): так работает рефлекс барорецепторов и активация парасимпатики (Zaccaro 2018, Lehrer 2014). Схема 4–6 даёт примерно 6 циклов в минуту. Эффект умеренный и сохраняется недолго, это инструмент саморегуляции, а не метод лечения тревожных расстройств. Не форсируй: при головокружении, одышке или болях в груди остановись; при повторяющихся симптомах обратись к врачу.',
     'Slow breathing at about 6 breaths a minute for 5–10 minutes reduces felt tension and raises heart rate variability (HRV), through the baroreflex and parasympathetic activation (Zaccaro 2018, Lehrer 2014). The 4–6 pattern gives about 6 cycles a minute. The effect is moderate and short-lived; it is a self-regulation tool, not a treatment for anxiety disorders. Do not force it: stop if you feel dizzy, short of breath or have chest pain; with recurring symptoms see a doctor.'],
    ['breathing', ZACCARO, LEHRER], ['stress_breath_how_often', 'stress_digital_pause', 'stress_acute_calm', 'stress_when_help'], ['дыхание', 'стресс', '4-6', 'успокоиться']),

  mk('stress_breath_how_often', 'base',
    ['Как часто стоит делать дыхательные упражнения?', 'How often should I do breathing exercises?'],
    [
      ['Лучше коротко и регулярно: 5 минут в день легче превратить в привычку, чем час раз в неделю. Бонус в приложении начисляется за 5 минут и больше.',
       'Short and regular is better: 5 minutes a day is easier to turn into a habit than an hour once a week. The in-app bonus is for 5 minutes or more.'],
      ['Выбери привычное время: после пробуждения или перед сном. Пропустил день — ничего страшного.',
       'Pick a familiar time: after waking or before bed. Missed a day — no harm.'],
    ],
    ['Привычка формируется в среднем примерно за 2 месяца (Lally 2010), пропуск одного дня не ломает процесс. Чем проще условия, тем выше вероятность повтора: привязка к существующему действию (кофе, чистка зубов) помогает. Не стоит мерить результат ежедневным HRV: он зависит от сна, алкоголя, нагрузки и шумит по дням.',
     'A habit forms in about 2 months on average (Lally 2010), and missing a day does not break it. The simpler the conditions, the more likely repetition: tying it to an existing action (coffee, brushing teeth) helps. Do not judge results by daily HRV: it depends on sleep, alcohol and training and fluctuates by day.'],
    ['habit', { title: 'Lally et al., Eur J Soc Psychol: How are habits formed', year: 2010 }], ['stress_breath', 'stress_habit_stack', 'heart_resting'], ['привычка', 'дыхание', 'регулярность']),

  mk('stress_digital_pause', 'base',
    ['Что такое цифровая пауза?', 'What is a digital pause?'],
    [
      ['Это 15 минут и больше без телефона и экранов: можно пройтись, помолчать, выглянуть в окно. В приложении пауза от 15 минут даёт 4 XP.',
       'It is 15 minutes or more without phone and screens: walk, sit quietly, look out of the window. In the app, a pause of 15 minutes gives 4 XP.'],
      ['Цифровая пауза — маленький перерыв для головы. Ничего отключать насовсем не нужно, достаточно выбрать время, когда экран не нужен.',
       'A digital pause is a small break for the mind. You do not have to disconnect for good; just choose a time when you do not need the screen.'],
    ],
    ['Пауза — поведенческий приём, а не лечение. Практика: убрать телефон из поля зрения, отключить уведомления на время, заняться чем-то без экрана. Хорошо сочетается с прогулкой или дыханием. Научные данные о «цифровом детоксе» неоднозначны и зависят от того, как использовалось устройство; поэтому приложение не обещает конкретного эффекта, а лишь поддерживает привычку.',
     'A pause is a behavioural technique, not a treatment. Practice: put the phone out of sight, mute notifications for a while, do something screen-free. It pairs well with a walk or breathing. Scientific evidence on "digital detox" is mixed and depends on how the device was used; so the app promises no specific effect and only supports the habit.'],
    [], ['stress_breath', 'stress_evening_screen', 'stress_light_coping'], ['цифровая пауза', 'телефон', 'экран']),

  mk('stress_evening_screen', 'base',
    ['Мешает ли телефон вечером расслабиться?', 'Does my phone stop me from relaxing in the evening?'],
    [
      ['Часто да: новости и ленты держат внимание и не дают голове «выключиться». Попробуй цифровую паузу за полчаса до сна.',
       'Often yes: news and feeds hold attention and keep the mind switched on. Try a digital pause half an hour before bed.'],
      ['Дело не только в свете, но и в содержании. Если вечером тянет в ленту, замени её чем-то тихим.',
       'It is not only light but content. If you feel pulled into the feed in the evening, swap it for something quiet.'],
    ],
    ['Влияние экрана на сон складывается из света, возбуждающего содержимого и вытеснения времени сна. Данные по исследованиям неоднозначные, а размер эффекта заметно различается у людей. Практичный подход: фиксированное время «экран выключен», будильник вне кровати, спокойное занятие перед сном. Это не заменяет работу с бессонницей: если не получается заснуть долго, нужен врач.',
     'Screen influence on sleep combines light, stimulating content and displacement of sleep time. Study results are mixed and effect sizes differ between people. A practical approach: a fixed "screens off" time, alarm outside the bed, a calm pre-sleep activity. It does not replace insomnia treatment: if falling asleep takes long and persists, see a doctor.'],
    [{ title: 'AASM & Sleep Research Society: Recommended amount of sleep for a healthy adult', year: 2015 }], ['sleep_how_much', 'stress_digital_pause', 'stress_breath'], ['вечер', 'телефон', 'сон', 'экран']),

  mk('stress_light_coping', 'base',
    ['Как мягко справляться с ежедневным стрессом?', 'How can I gently cope with everyday stress?'],
    [
      ['Работают простые вещи: прогулка, ровное дыхание, сон, разговор с близким, список дел на один шаг. Не всё сразу: выбери одно.',
       'Simple things work: a walk, steady breathing, sleep, a chat with someone close, a one-step to-do list. Not all at once: pick one.'],
      ['Начни с тела: вода, движение, выдох подлиннее. Голова обычно подтягивается следом.',
       'Start with the body: water, movement, a longer exhale. The mind usually follows.'],
    ],
    ['Общие рекомендации по самопомощи в стрессе (ВОЗ, «Doing What Matters in Times of Stress»): заземление, медленное дыхание, отдых, поддерживающие контакты, посильные действия, спорт. Это техники для обычного напряжения, а не лечение депрессии или тревожных расстройств. Физическая активность связана с меньшим стрессом и лучшим настроением, но требует регулярности.',
     'General self-help guidance for stress (WHO, "Doing What Matters in Times of Stress"): grounding, slow breathing, rest, supportive contact, manageable actions, exercise. These are techniques for ordinary tension, not treatment for depression or anxiety disorders. Physical activity is linked with lower stress and better mood, but needs regularity.'],
    [WHO_MH, 'breathing'], ['stress_walk', 'stress_breath', 'stress_when_help', 'stress_social'], ['стресс', 'самопомощь', 'расслабиться']),

  mk('stress_acute_calm', 'base',
    ['Что делать, если накрыло прямо сейчас?', 'What can I do if stress hits right now?'],
    [
      ['Остановись, выдохни подлиннее и назови пять вещей, которые видишь вокруг. Потом сделай три медленных выдоха на 6 счётов.',
       'Stop, exhale longer and name five things you can see around you. Then take three slow exhales of six counts.'],
      ['Опусти плечи, поставь ноги на пол и дыши с длинным выдохом. Если сильно давит в груди или трудно дышать, нужна помощь врача или 112.',
       'Drop your shoulders, put your feet on the floor and breathe with a long exhale. If the chest feels tight or breathing is hard, get medical help or call 112.'],
    ],
    ['«Заземление» (назвать 5 предметов, 4 звука и т. п.) переключает внимание на настоящее; длинный выдох активирует парасимпатическую реакцию. Это приёмы для обычной острой тревоги, не для панической атаки с болью в груди или нарушением дыхания: эти состояния нужно оценивать врачу. Хирон не диагностирует и не заменяет специалиста.',
     'Grounding (naming 5 objects, 4 sounds and so on) shifts attention to the present; a long exhale activates the parasympathetic response. These are techniques for ordinary acute anxiety, not for a panic attack with chest pain or breathing difficulty: those must be assessed by a doctor. Hiron does not diagnose or replace a specialist.'],
    [WHO_MH, ZACCARO], ['stress_breath', 'stress_when_help', 'stress_light_coping'], ['паника', 'тревога', 'заземление', 'сейчас']),

  mk('stress_walk', 'base',
    ['Помогает ли прогулка от стресса?', 'Does a walk help with stress?'],
    [
      ['Часто да: десять минут неспешной ходьбы снижают напряжение и дают шаги. Особенно хорошо на свежем воздухе и без телефона.',
       'Often yes: ten minutes of easy walking reduce tension and add steps. Especially good outside and without the phone.'],
      ['Прогулка — самый доступный способ переключиться. Темп спокойный, цели не нужны.',
       'A walk is the most accessible way to switch. Keep an easy pace, no goals needed.'],
    ],
    ['Регулярная ходьба связана с лучшим настроением и меньшим риском смертности (шаги: до 8–11 тысяч в день, Paluch 2022). Для стресса важны не рекорды, а регулярность и приятные условия. Прогулка при депрессивных симптомах — помощь, но не замена лечения.',
     'Regular walking is linked with better mood and lower mortality risk (steps: up to 8–11 thousand a day, Paluch 2022). For stress, regularity and pleasant conditions matter, not records. A walk with depressive symptoms is a help, not a replacement for treatment.'],
    ['steps'], ['activity_steps_goal', 'stress_digital_pause', 'stress_light_coping'], ['прогулка', 'ходьба', 'настроение']),

  mk('stress_sleep', 'base',
    ['Как стресс связан со сном?', 'How are stress and sleep linked?'],
    [
      ['Стресс мешает засыпать, а недосып усиливает стресс: получается круг. Помогает стабильный режим и спокойный вечер.',
       'Stress makes falling asleep harder and sleep loss amplifies stress: a loop. A steady routine and a calm evening help.'],
      ['Если голова не выключается, запиши дела на завтра на бумаге и сделай несколько длинных выдохов.',
       'If your mind will not switch off, write tomorrow\'s tasks on paper and take a few long exhales.'],
    ],
    ['Недосып повышает реактивность на стресс, а напряжение удлиняет засыпание. Для разрыва круга полезны регулярное время сна и подъёма, утренний свет, ограничение кофеина и алкоголя вечером. Устойчивая бессонница (несколько недель) — повод для консультации врача; когнитивно-поведенческая терапия бессонницы считается основным методом.',
     'Sleep loss raises stress reactivity and tension lengthens time to fall asleep. To break the loop: regular sleep and wake times, morning light, limited caffeine and evening alcohol. Persistent insomnia (several weeks) is a reason to see a doctor; cognitive behavioural therapy for insomnia is considered the first-line treatment.'],
    ['sleepRegularity', 'morningLight'], ['sleep_how_much', 'stress_breath', 'stress_evening_screen'], ['сон', 'засыпание', 'бессонница']),

  mk('stress_social', 'base',
    ['Помогает ли разговор с людьми?', 'Does talking to people help?'],
    [
      ['Да: простой разговор с близким человеком снижает ощущение одиночества с проблемой. Не нужно решать вопрос, достаточно рассказать.',
       'Yes: a simple talk with someone close reduces the feeling of being alone with a problem. You do not have to solve it, just share it.'],
      ['Поддержка — часть самопомощи. Если рядом никого нет, подойдут телефонные линии доверия.',
       'Support is part of self-help. If no one is nearby, helplines can help.'],
    ],
    ['Социальная поддержка — один из главных защитных факторов при стрессе; это общепризнанный пункт руководств по психологической самопомощи (ВОЗ). Если тяжело долго, если пропал интерес к жизни или возникают мысли о самоповреждении, нужно обратиться к специалисту или на линию помощи, а не справляться в одиночку.',
     'Social support is one of the main protective factors against stress; it is a standard item in psychological self-help guidance (WHO). If it is hard for a long time, if interest in life has gone or thoughts of self-harm appear, contact a specialist or a helpline instead of coping alone.'],
    [WHO_MH], ['stress_when_help', 'stress_light_coping', 'stress_breath'], ['разговор', 'поддержка', 'одиночество']),

  mk('stress_when_help', 'base',
    ['Когда стресс — повод идти к специалисту?', 'When is stress a reason to see a specialist?'],
    [
      ['Если тяжело долго (недели), мешает работе, сну и отношениям или появились тревожные мысли, лучше к специалисту. Приложение и дыхание это не заменяют.',
       'If it stays hard for a long time (weeks), disrupts work, sleep and relationships, or worrying thoughts appear, see a specialist. The app and breathing do not replace that.'],
      ['Если тяжело долго, не нужно терпеть: это нормальный повод обратиться к психологу или врачу. Хирон лишь рядом и не оценивает состояние.',
       'If it is hard for long, you do not have to endure it: it is a normal reason to see a psychologist or doctor. Hiron is only alongside and does not assess your condition.'],
    ],
    ['Признаки, при которых нужна профессиональная оценка: устойчивое подавленное настроение или потеря интереса более 2 недель, сильная тревога или панические приступы, нарушение сна и аппетита, трудности в повседневной жизни, злоупотребление алкоголем, мысли о самоповреждении. При угрозе жизни — срочно вызывать экстренную помощь (112). Приложение не диагностирует и не ставит оценок состояния.',
     'Signs that call for professional assessment: persistent low mood or loss of interest for more than 2 weeks, severe anxiety or panic attacks, disturbed sleep and appetite, difficulty in daily life, alcohol misuse, thoughts of self-harm. If life is at risk, call emergency services at once (112). The app does not diagnose or rate your condition.'],
    [WHO_MH], ['stress_social', 'stress_acute_calm', 'stress_light_coping'], ['специалист', 'психолог', 'врач', 'тяжело']),

  mk('stress_hrv_link', 'base',
    ['Видит ли приложение мой стресс по HRV?', 'Can the app see my stress from HRV?'],
    [
      ['Не напрямую: HRV отражает общую нагрузку на организм, а не «уровень стресса». Низкий HRV может быть от недосыпа, алкоголя, тренировок или простуды.',
       'Not directly: HRV reflects overall load on the body, not a "stress level". Low HRV can come from poor sleep, alcohol, training or a cold.'],
      ['Приложение сравнивает HRV с твоей собственной нормой. Одно низкое утро — не повод для тревоги.',
       'The app compares HRV with your own baseline. One low morning is no reason to worry.'],
    ],
    ['HRV (RMSSD) связан с парасимпатической активностью, но не является диагностическим тестом на стресс: на него влияют сон, алкоголь, болезнь, цикл, положение тела и способ измерения. Информативна тенденция относительно собственной базы (Plews 2013), а не сравнение с другими людьми. Запястные датчики дают оценку со значимой погрешностью.',
     'HRV (RMSSD) is linked with parasympathetic activity, but is not a diagnostic test for stress: sleep, alcohol, illness, cycle, body position and measurement method all affect it. The trend relative to your own baseline is informative (Plews 2013), not comparison with other people. Wrist sensors give an estimate with substantial error.'],
    ['hrvBaseline', PLEWS], ['heart_resting', 'stress_breath', 'recovery_readiness_meaning'], ['HRV', 'стресс', 'пульс']),

  mk('stress_habit_stack', 'base',
    ['Как встроить паузы в день?', 'How can I fit pauses into my day?'],
    [
      ['Привяжи паузу к тому, что уже делаешь: минута выдохов после кофе или перед письмом. Так привычка закрепляется легче.',
       'Tie the pause to something you already do: a minute of exhales after coffee or before an email. That makes the habit stick.'],
      ['Начни с самого маленького: одна минута. Расширить всегда успеешь.',
       'Start with the smallest: one minute. You can always extend it.'],
    ],
    ['Привязка нового поведения к существующему «якорю» (implementation intentions, «если — то») повышает вероятность выполнения в исследованиях по формированию привычек. Среднее время формирования — около двух месяцев с большим разбросом (Lally 2010).',
     'Tying a new behaviour to an existing anchor (implementation intentions, "if–then") improves follow-through in habit-formation research. Average formation time is about two months with a wide range (Lally 2010).'],
    ['habit'], ['stress_breath_how_often', 'stress_digital_pause', 'app_quests'], ['привычка', 'пауза', 'якорь']),

  mk('stress_hrv_breath_pro', 'pro',
    ['Почему медленное дыхание поднимает HRV?', 'Why does slow breathing raise HRV?'],
    [
      ['При дыхании около шести раз в минуту пульс и дыхание входят в резонанс, и колебания пульса усиливаются. Отсюда и рост HRV.',
       'At about six breaths a minute heart rate and breathing fall into resonance and heart rate oscillations grow. Hence the rise in HRV.'],
      ['Эффект острый и короткий; на долгую тренировку HRV он напрямую не влияет.',
       'The effect is acute and brief; it does not directly change long-term HRV.'],
    ],
    ['Резонансная частота сердечно-сосудистой системы у большинства взрослых около 0,1 Гц (≈ 6 дыханий в минуту): колебания ЧСС через дыхательную синусовую аритмию и барорефлекс усиливаются (Lehrer & Gevirtz 2014). В обзорах с биофидбеком HRV показан умеренный эффект на тревожность и стресс, но качество исследований неоднородное. Мгновенный рост HRV во время дыхания не равен улучшению базового уровня. Носимые датчики дают лишь приблизительную оценку.',
     'The cardiovascular resonance frequency in most adults is about 0.1 Hz (≈ 6 breaths a minute): heart rate oscillations via respiratory sinus arrhythmia and the baroreflex are amplified (Lehrer & Gevirtz 2014). Reviews of HRV biofeedback show a moderate effect on anxiety and stress, but study quality is mixed. A momentary HRV rise during breathing does not equal an improvement of baseline. Wearable sensors give only an approximate estimate.'],
    [LEHRER, ZACCARO], ['stress_hrv_link', 'heart_resting', 'stress_breath'], ['резонанс', 'барорефлекс', 'RSA', 'HRV']),

  mk('stress_load_pro', 'pro',
    ['Как отличить стресс от перетренированности по пульсу?', 'How do I tell stress from overtraining by heart rate?'],
    [
      ['По пульсу покоя и HRV их не различить: оба повышают пульс и снижают HRV. Различают контекст, сон и самочувствие.',
       'Resting heart rate and HRV cannot tell them apart: both raise the pulse and lower HRV. Context, sleep and how you feel do.'],
      ['Если несколько дней подряд пульс выше нормы, а настроение и сон хуже, разгрузи день, независимо от причины.',
       'If for several days heart rate is above normal and mood and sleep are worse, lighten the day regardless of the cause.'],
    ],
    ['Пульс покоя на несколько ударов выше личной нормы сопровождает недосып, стресс, алкоголь, начинающуюся болезнь и накопленную усталость (Buchheit 2014). Показатели восстановления неспецифичны: интерпретация идёт по совокупности — тенденция нескольких дней, субъективное самочувствие, нагрузка и сон. Это не диагностика перетренированности; при устойчивом падении результатов, нарушениях сна и сердцебиении нужен врач.',
     'Resting heart rate a few beats above one\'s own norm accompanies poor sleep, stress, alcohol, oncoming illness and accumulated fatigue (Buchheit 2014). Recovery metrics are non-specific: interpret them together — multi-day trend, subjective feeling, load and sleep. This is not diagnosis of overtraining; with persistent performance decline, sleep problems and palpitations, see a doctor.'],
    ['restingHr', PLEWS], ['recovery_readiness_meaning', 'heart_resting', 'stress_when_help'], ['перетренированность', 'пульс покоя', 'HRV']),
];
