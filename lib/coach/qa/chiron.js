// Раздел «Хирон»: кто он, мифология, как работает (локальные правила и готовые ответы, не языковая модель, не врач).
// Основано на lib/coach/README.md, lib/coach/scenarios/capabilities.js, lib/ranks.js. Контент-файл раздела.
const mk = (id, level, q, short, more, sources, follow, tags, humorOk = false) => ({
  id, section: 'chiron', level,
  q: { ru: q[0], en: q[1] },
  short: short.map((s) => ({ ru: s[0], en: s[1] })),
  more: { ru: more[0], en: more[1] },
  sources, follow, needs: [], humorOk, tags,
});

const APOLLODORUS = { title: 'Apollodorus, Bibliotheca (ок. I–II вв. н. э.)', year: 100 };
const OVID = { title: 'Ovid, Fasti, Book V', year: 8 };
const PINDAR = { title: 'Pindar, Pythian Ode 3', year: -474 };

export default [
  mk('chiron_who', 'base',
    ['Кто такой Хирон?', 'Who is Hiron?'],
    [
      ['Я Хирон, твой наставник по здоровью: смотрю на сон, шаги, пульс и нагрузку и подсказываю, что делать сегодня. Я кентавр по замыслу и программа с правилами по сути.',
       'I am Hiron, your health mentor: I look at sleep, steps, heart rate and load and suggest what to do today. A centaur by concept and a rule-based program in substance.'],
      ['Спокойный напарник в приложении. Замечаю закономерности, говорю прямо, иногда шучу. Врача не заменяю.',
       'A calm companion in the app. I notice patterns, speak plainly and joke now and then. I do not replace a doctor.'],
    ],
    ['Хирон — встроенный в приложение «Epimely» коуч. Он читает посчитанные приложением показатели (сон, шаги, пульс, HRV, оценки, профиль), выбирает подходящий сценарий и собирает ответ из заготовленных вариантов. Характер: спокойный, наблюдательный, немного ироничный; без нотаций. Он не ставит диагнозов и не назначает лечение.',
     'Hiron is the coach built into the app "Epimely". He reads the metrics the app has calculated (sleep, steps, heart rate, HRV, scores, profile), picks a suitable scenario and assembles an answer from prepared variants. Character: calm, observant, slightly ironic; no lecturing. He does not diagnose or prescribe treatment.'],
    [], ['chiron_myth', 'chiron_how', 'chiron_not_doctor', 'chiron_can'], ['хирон', 'кто ты', 'коуч']),

  mk('chiron_myth', 'base',
    ['Почему именно Хирон и кентавр?', 'Why Chiron, and why a centaur?'],
    [
      ['В греческих мифах кентавр Хирон был мудрым учителем: он жил на горе Пелион и учил героев и врачевателей. Отсюда и мой образ наставника.',
       'In Greek myth the centaur Chiron was a wise teacher: he lived on Mount Pelion and taught heroes and healers. Hence my mentor image.'],
      ['Хирон воспитал Асклепия, бога врачевания, и многих героев. Мне до него далеко, но роль «спокойный наставник» мне нравится.',
       'Chiron raised Asclepius, the god of healing, and many heroes. I am no match for him, but I like the role of a calm mentor.'],
    ],
    ['По преданию, Хирон отличался от других кентавров мудростью и добротой. Он обучал Асклепия врачеванию (Пиндар, Пифийская ода 3), а также Ясона, Ахилла и других героев (Аполлодор). Ранги в приложении отсылают к этому: «Гость пещеры», «Ученик Пелиона», «Травник», «Лучник», «Аргонавт», «Наследник Асклепия» и в финале «Созвездие Кентавра». Мифология здесь образ, а не медицинский источник.',
     'Tradition holds that Chiron differed from other centaurs in wisdom and kindness. He taught Asclepius medicine (Pindar, Pythian 3), as well as Jason, Achilles and other heroes (Apollodorus). The ranks in the app allude to it: Cave Guest, Pelion Pupil, Herbalist, Archer, Argonaut, Heir of Asclepius and finally Constellation of the Centaur. Mythology here is imagery, not a medical source.'],
    [APOLLODORUS, PINDAR], ['chiron_stars', 'chiron_who', 'app_ranks'], ['миф', 'кентавр', 'Пелион', 'Асклепий']),

  mk('chiron_stars', 'base',
    ['Что за созвездие Кентавра?', 'What is the Constellation of the Centaur?'],
    [
      ['По мифу, раненый и измученный Хирон отказался от бессмертия, и боги поместили его среди звёзд. Поэтому высший ранг в приложении называется «Созвездие Кентавра».',
       'In the myth, wounded and in pain, Chiron gave up his immortality and the gods placed him among the stars. That is why the top rank is called Constellation of the Centaur.'],
      ['Конец у мифа грустный, но красивый: учитель стал ориентиром на небе. Хочется верить, что путь к максимуму — ориентир и для тебя.',
       'The ending of the myth is sad but beautiful: a teacher became a guide in the sky. I like to think the road to the top is a guide for you too.'],
    ],
    ['По одной из версий, Геракл случайно ранил Хирона отравленной стрелой; бессмертный кентавр не мог умереть и страдал, поэтому уступил своё бессмертие Прометею и был помещён среди звёзд (Аполлодор; Овидий, «Фасты» V). Традиция связывает его с созвездиями Кентавра или Стрельца. Для приложения это лишь символ: нет ни медицинской, ни астрономической функции.',
     'In one version Heracles accidentally wounded Chiron with a poisoned arrow; the immortal centaur could not die and suffered, so he gave up his immortality to Prometheus and was placed among the stars (Apollodorus; Ovid, Fasti V). Tradition links him with the constellations Centaurus or Sagittarius. For the app it is only a symbol: there is no medical or astronomical function.'],
    [APOLLODORUS, OVID], ['chiron_myth', 'app_ranks', 'chiron_who'], ['созвездие', 'звёзды', 'ранг', 'Геракл'], true),

  mk('chiron_how', 'base',
    ['Как ты работаешь?', 'How do you work?'],
    [
      ['Я работаю на локальных правилах и готовых ответах: распознаю тему, смотрю на твои данные и собираю ответ. Языковой модели нет, всё происходит на твоём телефоне.',
       'I run on local rules and prepared answers: I recognise the topic, look at your data and assemble a reply. There is no language model; everything happens on your phone.'],
      ['Внутри у меня набор сценариев. Каждый знает свои фразы и данные, а варианты ответа чередуются, чтобы не повторяться.',
       'Inside me is a set of scenarios. Each knows its own phrases and data, and answer variants rotate so I do not repeat myself.'],
    ],
    ['Конвейер (lib/coach): нормализация текста (регистр, опечатки, разговорные формы) → проверка чувствительного (боль, симптомы, тяжёлое состояние) → распознавание намерения и признаков (отрицание, время, вид занятия) → контекст (аналитика приложения, переменные, погода) → сценарий и вариант → сборка и проверка ответа (нет пустых значений, нечисел, лишних шуток) → юмор и память. Выбор варианта детерминирован: тот, что дольше не использовался. Рекомендации берутся только из логики приложения, поэтому при тех же данных совет тот же.',
     'The pipeline (lib/coach): text normalisation (case, typos, colloquial forms) → sensitive check (pain, symptoms, serious conditions) → intent and feature recognition (negation, time, activity type) → context (app analytics, variables, weather) → scenario and variant → assembling and validating the reply (no empty values, non-numbers, extra jokes) → humor and memory. Variant choice is deterministic: the one unused for longest. Recommendations come only from the app logic, so with the same data the advice is the same.'],
    [], ['chiron_ai', 'chiron_safety', 'chiron_offline', 'chiron_prepared'], ['как работаешь', 'правила', 'сценарии']),

  mk('chiron_ai', 'base',
    ['Ты искусственный интеллект?', 'Are you an AI?'],
    [
      ['Не нейросеть и не языковая модель: у меня сценарии и правила, которые работают на телефоне. Поэтому я хорош в знакомых темах и теряюсь в незнакомых.',
       'Not a neural network and not a language model: I have scenarios and rules running on the phone. So I am good at familiar topics and lost in unfamiliar ones.'],
      ['Честно: я программа с правилами. Если не понял, лучше уточню, чем выдумаю.',
       'To be honest: I am a rule-based program. If I do not get it, I will ask rather than invent.'],
    ],
    ['Приложение содержит локальный движок намерений с правилами и заготовленными вариантами ответов; генеративной языковой модели нет. Небольшая модель распознавания намерений может использоваться для опечаток, но она не выпускается в приложение без переобучения, и ответы всё равно берутся из каталога сценариев. Поэтому Хирон не «рассуждает» в свободной форме и может не понять нестандартную фразу.',
     'The app contains a local intent engine with rules and prepared answer variants; there is no generative language model. A small intent-recognition model may be used for typos, but it is not shipped without retraining, and answers still come from the scenario catalog. So Hiron does not "reason" in free form and may fail to understand an unusual phrase.'],
    [], ['chiron_not_doctor', 'chiron_no_understand', 'chiron_offline'], ['нейросеть', 'ИИ', 'бот', 'языковая модель']),

  mk('chiron_not_doctor', 'base',
    ['Ты врач? Можешь поставить диагноз?', 'Are you a doctor? Can you diagnose?'],
    [
      ['Нет. Я не ставлю диагнозы и не назначаю лечение: могу объяснить показатели и предложить режим. При тревожных симптомах нужен врач.',
       'No. I do not diagnose or prescribe treatment: I can explain metrics and suggest a routine. With worrying symptoms, see a doctor.'],
      ['Диагностика не моя область. Я работаю с общими советами по сну, нагрузке и привычкам. Всё, что тревожит, лучше показать врачу.',
       'Diagnosis is not my area. I give general advice on sleep, load and habits. Anything that worries you is best shown to a doctor.'],
    ],
    ['Хирон — информационный помощник: его советы общие, основаны на публичных рекомендациях (ВОЗ, AASM и др.) и логике приложения, а не на обследовании. Оценки и «возраст тела» не являются медицинскими показателями. При боли в груди, обмороке, одышке, сильной слабости и других тревожных симптомах — к врачу или в скорую (103/112). Лекарства, дозы и лечение Хирон не обсуждает.',
     'Hiron is an informational helper: his advice is general, based on public guidance (WHO, AASM and others) and the app logic, not on an examination. Scores and "body age" are not medical indicators. With chest pain, fainting, shortness of breath, severe weakness or other alarming symptoms, see a doctor or call emergency services (103/112). Hiron does not discuss medications, doses or treatment.'],
    [{ title: 'WHO Guidelines on Physical Activity and Sedentary Behaviour', year: 2020 }], ['chiron_safety', 'bodyage_medical', 'chiron_can'], ['врач', 'диагноз', 'лечение', 'симптомы']),

  mk('chiron_offline', 'base',
    ['Ты работаешь без интернета?', 'Do you work offline?'],
    [
      ['Да: ответы формируются на телефоне. Интернет нужен только погоде, если ты её включил: приложение обращается к погодному сервису.',
       'Yes: answers are produced on the phone. The internet is needed only for weather, if you enabled it: the app contacts a weather service.'],
      ['Сами ответы собираются без сети. Данные здоровья никуда не уходят.',
       'The answers themselves are put together without a network. Health data go nowhere.'],
    ],
    ['Каталог сценариев, база знаний (FACTS) и формулы вшиты в приложение, поэтому коучу сеть не нужна. Единственный внешний запрос — к погодному сервису (координаты, округлённые до 0,1°, или название города); он выключен по умолчанию и кэшируется на 30 минут, а при сбое используется последний сохранённый ответ.',
     'The scenario catalog, knowledge base (FACTS) and formulas are bundled in the app, so the coach needs no network. The only external request is to a weather service for weather (coordinates rounded to 0.1° or a city name); it is off by default and cached for 30 minutes, with the last saved response used on failure.'],
    [], ['app_privacy', 'app_weather', 'chiron_how'], ['офлайн', 'интернет', 'сеть']),

  mk('chiron_can', 'base',
    ['Что ты умеешь?', 'What can you do?'],
    [
      ['Помогаю с планом на день, сном, тренировками, шагами, пульсом и HRV, стрессом и привычками, по данным приложения. Могу объяснить, почему так, и упростить план.',
       'I help with the day plan, sleep, workouts, steps, heart rate and HRV, stress and habits, based on app data. I can explain why and simplify the plan.'],
      ['Смотрю на твои показатели и подсказываю, что сделать сегодня. Диагнозов не ставлю.',
       'I look at your metrics and suggest what to do today. I do not diagnose.'],
    ],
    ['Темы коуча: приветствие и план дня, сон, шаги, восстановление и нагрузка, привычки, результаты и мотивация, погода, возможности и ограничения данных, справка по приложению. Раздел вопросов с кнопками покрывает те же темы. Если данных нет, Хирон так и скажет, а не придумает цифры.',
     'Coach topics: greeting and day plan, sleep, steps, recovery and load, habits, results and motivation, weather, capabilities and data limits, app help. The question section with buttons covers the same topics. If data is missing, Hiron says so instead of inventing numbers.'],
    [], ['chiron_no_understand', 'chiron_not_doctor', 'chiron_data'], ['умеешь', 'возможности', 'помощь']),

  mk('chiron_data', 'base',
    ['Что ты обо мне знаешь?', 'What do you know about me?'],
    [
      ['Я вижу то, что посчитало приложение: сон, шаги, пульс, HRV, оценки и профиль. Из разговора помню только тему и пару настроек, без текстов сообщений.',
       'I see what the app has calculated: sleep, steps, heart rate, HRV, scores and profile. From the chat I remember only the topic and a few settings, not message texts.'],
      ['Если чего-то нет, так и скажу, а не придумаю. Остальное мне неизвестно, пока ты сам не расскажешь.',
       'If something is missing I say so rather than invent. The rest is unknown to me until you tell me.'],
    ],
    ['Состояние коуча (coachState.v1) хранит только тему, сценарий, вариант, последнюю рекомендацию, предпочтения краткости и юмора и список недавних вариантов. Текстов сообщений нет, переписка при новом запуске не восстанавливается. Очистить можно в профиле: «Очистить память Хирона».',
     'The coach state (coachState.v1) holds only the topic, scenario, variant, last recommendation, brevity and humor preferences and a list of recent variants. There are no message texts, and the chat is not restored at a new launch. You can clear it in the profile: Clear Hiron\'s memory.'],
    [], ['app_memory_clear', 'app_privacy', 'chiron_how'], ['память', 'что знаешь', 'данные']),

  mk('chiron_no_understand', 'base',
    ['Почему ты меня не понял?', 'Why did you not understand me?'],
    [
      ['Я не понимаю свободную речь, как человек: у меня сценарии и правила. Помогает короткая формулировка с одной темой или кнопка с вопросом.',
       'I do not understand free speech like a person: I have scenarios and rules. A short phrasing with one topic or a question button helps.'],
      ['Прости, что не попал. Скажи проще или одним словом, и попробуем снова.',
       'Sorry I missed. Say it simpler or in one word and we will try again.'],
    ],
    ['Распознавание опирается на нормализацию, лексику тем и признаки (отрицание, время, место, вид занятия). Нестандартные формулировки, длинные сложные фразы и несколько тем сразу могут не распознаться. Вопросы-кнопки обходят эту проблему: в них формулировка уже известна. Опасные формулировки (боль, симптомы) обрабатываются в первую очередь и осторожно.',
     'Recognition relies on normalisation, topic vocabulary and features (negation, time, place, activity type). Unusual phrasings, long complex sentences and several topics at once may fail. Question buttons avoid this: the wording is already known. Dangerous wording (pain, symptoms) is handled first and carefully.'],
    [], ['chiron_ai', 'chiron_can', 'chiron_prepared'], ['не понял', 'ошибка', 'уточнить'], true),

  mk('chiron_prepared', 'base',
    ['Почему ответы на кнопки заготовленные?', 'Why are the button answers prepared?'],
    [
      ['Потому что так надёжнее: каждый ответ написан и проверен заранее, без выдумок. Я подставляю в него твои данные, если они есть.',
       'Because it is more reliable: each answer is written and checked in advance, with no invention. I insert your data if available.'],
      ['Это короткий ответ, а профессиональный разбор открывается кнопкой «Подробнее» вместе с источниками.',
       'It is a short answer, and the professional breakdown opens with the More button along with sources.'],
    ],
    ['Каталог вопросов составлен вручную: у каждого вопроса есть 2–4 коротких варианта, подробный разбор, список источников (из базы знаний или известных руководств) и следующие вопросы. Варианты чередуются. Формулировки проверяются тестами: нет пустых значений и нечисел, ответы короткие, у профессиональных разделов есть источники. Выдуманных ссылок нет.',
     'The question catalog is written by hand: each question has 2–4 short variants, a detailed breakdown, a list of sources (from the knowledge base or well-known guidelines) and follow-up questions. Variants rotate. Wording is checked by tests: no empty values or non-numbers, answers are short, and professional items carry sources. There are no invented references.'],
    [], ['chiron_how', 'chiron_ai', 'chiron_sources'], ['заготовленные', 'источники', 'кнопки']),

  mk('chiron_sources', 'base',
    ['На что опираются твои советы?', 'What do your tips rely on?'],
    [
      ['На публичные рекомендации и крупные исследования: ВОЗ по активности, AASM по сну, мета-анализы по шагам и форме. У каждого факта есть источник.',
       'On public guidance and large studies: WHO on activity, AASM on sleep, meta-analyses on steps and fitness. Each fact has a source.'],
      ['Новых медицинских порогов я не придумываю: использую общепринятые и логику самого приложения.',
       'I do not invent new medical thresholds: I use common ones and the app\'s own logic.'],
    ],
    ['Встроенная база знаний — это набор коротких выводов с указанием источника: AASM и Sleep Research Society 2015 (сон), Windred 2024 (регулярность сна), Paluch 2022 (шаги), руководства ВОЗ 2020 (физическая активность), Momma 2022 (силовые), Gabbett 2016 (нагрузка), FIGO 2018 и Bull 2019 (цикл) и другие. Это общие сведения, а не персональные назначения. Исследования могут не отражать твой случай.',
     'The built-in knowledge base is a set of short conclusions with a source: AASM and Sleep Research Society 2015 (sleep), Windred 2024 (sleep regularity), Paluch 2022 (steps), WHO 2020 guidelines (physical activity), Momma 2022 (strength), Gabbett 2016 (load), FIGO 2018 and Bull 2019 (cycle) and others. They are general information, not personal prescriptions. Studies may not reflect your case.'],
    ['sleepNeed', 'steps', 'whoActivity', 'loadSpike'], ['bodyage_what', 'chiron_prepared', 'chiron_not_doctor'], ['источники', 'исследования', 'ВОЗ']),

  mk('chiron_safety', 'base',
    ['Что ты делаешь, если мне плохо?', 'What do you do if I feel unwell?'],
    [
      ['Если ты пишешь о боли, тревожных симптомах или тяжёлом состоянии, я не шучу и не даю тренировочных советов. Прошу обратиться к врачу, а при опасности звонить 103/112.',
       'If you write about pain, alarming symptoms or a serious state, I do not joke or give training advice. I ask you to see a doctor, and in danger to call 103/112.'],
      ['Я включаю «защитную паузу»: осторожные ответы без шуток, пока ты сам не скажешь, что стало лучше.',
       'I switch on a "protective pause": careful answers without jokes until you say you feel better.'],
    ],
    ['Чувствительные темы (боль, симптомы, лекарства, тяжёлое состояние, мысли о вреде себе) обрабатываются до распознавания других тем и от модели намерений не зависят. После тревожного симптома в сессии включается защитная пауза: тренировочные рекомендации и юмор блокируются; она снимается только словами человека («прошло», «мне лучше»). Шуточное «умер после тренировки» отличается от настоящей тревоги по контексту, а при сомнении ответ осторожный. Хирон не заменяет скорую помощь.',
     'Sensitive topics (pain, symptoms, medications, serious conditions, thoughts of self-harm) are handled before other topics are recognised and do not depend on the intent model. After an alarming symptom a protective pause is switched on in the session: training advice and humor are blocked; it is lifted only by the person\'s own words ("it passed", "I feel better"). A joking "died after the workout" is told from real alarm by context, and when in doubt the answer is cautious. Hiron does not replace emergency care.'],
    [], ['chiron_not_doctor', 'stress_when_help', 'chiron_how'], ['безопасность', 'симптомы', 'боль', 'скорая']),

  mk('chiron_humor', 'base',
    ['Почему ты иногда шутишь?', 'Why do you joke sometimes?'],
    [
      ['Лёгкая ирония помогает не воспринимать цифры слишком серьёзно. Шучу редко и никогда, если речь о боли или самочувствии.',
       'A bit of irony helps not to take numbers too seriously. I joke rarely and never when it is about pain or how you feel.'],
      ['Если надоело, отключить просто: Профиль → «Юмор Хирона» → «Без шуток».',
       'If you are tired of it, turning it off is easy: Profile → Hiron\'s humor → No jokes.'],
    ],
    ['Юмор подмешивается из отдельного каталога по ситуациям, не более одной шутки в ответе, с историей использованных id, чтобы не повторяться. В чувствительных и опасных ситуациях, при защитной паузе и когда человек расстроен, юмор блокируется. Режим «Без шуток» отключает его полностью.',
     'Humor is mixed in from a separate catalog by situation, no more than one joke per reply, with a history of used ids so they do not repeat. In sensitive and dangerous situations, during the protective pause and when a person is upset, humor is blocked. The "No jokes" mode disables it completely.'],
    [], ['app_humor', 'chiron_safety', 'chiron_who'], ['юмор', 'шутки', 'ирония'], true),

  mk('chiron_myth_pro', 'pro',
    ['Что мифы говорят о Хироне подробнее?', 'What do the myths say about Chiron in more detail?'],
    [
      ['Хирон — сын Крона и Филиры, бессмертный и мудрый кентавр. Он учил Асклепия, Ясона, Ахилла и других, жил на Пелионе.',
       'Chiron is the son of Cronus and Philyra, an immortal and wise centaur. He taught Asclepius, Jason, Achilles and others, and lived on Pelion.'],
      ['Его судьба — «раненый целитель»: тот, кто лечит других, но не может вылечить себя. Это красивый образ, но не руководство.',
       'His fate is that of the "wounded healer": one who heals others but cannot heal himself. A beautiful image, but not a guide.'],
    ],
    ['Источники различаются в деталях. По Аполлодору (Bibliotheca) Хирон был сыном Крона и океаниды Филиры, обучал Ясона, Ахилла, Асклепия и других; был случайно ранен стрелой Геракла, отказался от бессмертия в пользу Прометея и был вознесён на небо. У Пиндара (Пифийская ода 3) Хирон обучает Асклепия врачеванию. Овидий в «Фастах» связывает его с созвездием. Образ «раненого целителя» в психологии — позднейшая интерпретация, а не античная формулировка. В приложении мифология — только оформление, без медицинской функции.',
     'Sources differ in detail. In Apollodorus (Bibliotheca) Chiron was the son of Cronus and the Oceanid Philyra and taught Jason, Achilles, Asclepius and others; he was accidentally wounded by Heracles\' arrow, gave up immortality in favour of Prometheus and was raised to the sky. In Pindar (Pythian 3) Chiron teaches Asclepius the healing art. Ovid in the Fasti links him with a constellation. The "wounded healer" image in psychology is a later interpretation, not an ancient formulation. In the app mythology is decoration only, with no medical function.'],
    [APOLLODORUS, PINDAR, OVID], ['chiron_stars', 'chiron_myth', 'app_ranks'], ['миф', 'Аполлодор', 'Пиндар', 'раненый целитель']),

  mk('chiron_limits_pro', 'pro',
    ['Насколько можно доверять цифрам, на которых ты строишь советы?', 'How far can I trust the numbers your advice is built on?'],
    [
      ['Цифры часов — оценки с погрешностью, и я смотрю на тенденцию относительно твоей нормы, а не на одно значение. Один плохой день ничего не значит.',
       'Watch numbers are estimates with error, and I look at the trend against your own baseline, not a single value. One bad day means nothing.'],
      ['Если данных мало или они расходятся, честно скажу «не уверен» и не буду изображать точность.',
       'If data are scarce or inconsistent, I will honestly say "not sure" and will not fake precision.'],
    ],
    ['Пульс покоя на несколько ударов выше личной нормы сопровождает недосып, стресс, алкоголь, начинающуюся болезнь (Buchheit 2014). HRV информативен как тенденция относительно собственной базы, а не как абсолютное число (Plews 2013); запястные оптические датчики дают оценку со значимой погрешностью, особенно при движении. Фазы сна по часам — алгоритмические оценки, а не полисомнография. VO2max на часах — расчёт, не лабораторный тест. Поэтому Хирон использует личные базы, окна в несколько дней и осторожные формулировки.',
     'Resting heart rate a few beats above one\'s own norm accompanies poor sleep, stress, alcohol and oncoming illness (Buchheit 2014). HRV is informative as a trend against one\'s own baseline, not as an absolute number (Plews 2013); wrist optical sensors give an estimate with significant error, especially in motion. Sleep phases from a watch are algorithmic estimates, not polysomnography. Watch VO2max is a calculation, not a lab test. So Hiron uses personal baselines, multi-day windows and careful wording.'],
    ['restingHr', 'hrvBaseline', { title: 'Buchheit, Front Physiol: Monitoring training status with HR measures', year: 2014 }], ['bodyage_accuracy', 'heart_resting', 'recovery_readiness_meaning'], ['точность', 'погрешность', 'HRV', 'часы']),
];
