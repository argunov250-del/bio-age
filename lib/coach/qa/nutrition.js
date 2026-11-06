// Раздел «Питание и вода»: цель по воде (lib/waterGoal.js), витамины без доз, белок и клетчатка по общим рекомендациям.
// Без диет и калорийных предписаний. Контент-файл раздела; реестр — lib/coach/qa/index.js.
const mk = (id, level, q, short, more, sources, follow, tags, humorOk = false) => ({
  id, section: 'nutrition', level,
  q: { ru: q[0], en: q[1] },
  short: short.map((s) => ({ ru: s[0], en: s[1] })),
  more: { ru: more[0], en: more[1] },
  sources, follow, needs: [], humorOk, tags,
});

const WHO_DIET = { title: 'WHO: Healthy diet fact sheet', year: 2020 };
const ACSM = { title: 'ACSM Position Stand: Exercise and Fluid Replacement', year: 2007 };
const ISSN = { title: 'ISSN Position Stand: Protein and Exercise', year: 2017 };
const EFSA = { title: 'EFSA: Dietary Reference Values for nutrients (protein, fibre)', year: 2012 };

export default [
  mk('nutrition_water_goal', 'base',
    ['Откуда цель по воде?', 'Where does my water goal come from?'],
    [
      ['Цель по воде считается от веса: примерно 33 мл на килограмм, округляется до 50 мл. {waterGoal} Это бытовой ориентир, а не медицинская норма.',
       'Your water goal is based on weight: about 33 ml per kilogram, rounded to 50 ml. {waterGoal} It is a household guide, not a medical norm.'],
      ['Вес в профиле умножается на 33 мл, а результат держится в рамках от 1,5 до 3,5 литра. Нет веса — цель 2 литра.',
       'The weight in your profile is multiplied by 33 ml and kept between 1.5 and 3.5 litres. With no weight, the goal is 2 litres.'],
    ],
    ['Формула в приложении (lib/waterGoal.js): вес × 33 мл, округление до 50 мл, границы 1500–3500 мл; при отсутствии правдоподобного веса (30–300 кг) — 2000 мл. Универсальной нормы нет: потребность зависит от жары, нагрузки, питания (часть воды приходит с едой), беременности, лактации и здоровья, особенно почек и сердца. При таких состояниях объём подбирает врач, а цель в приложении — лишь удобная рамка для привычки.',
     'The app formula (lib/waterGoal.js): weight × 33 ml, rounded to 50 ml, limited to 1500–3500 ml; with no plausible weight (30–300 kg), 2000 ml. There is no universal norm: needs depend on heat, activity, diet (part of water comes from food), pregnancy, lactation and health, especially kidneys and heart. With such conditions a doctor sets the amount, and the in-app goal is only a convenient frame for a habit.'],
    [{ title: 'EFSA: Scientific Opinion on Dietary Reference Values for water', year: 2010 }], ['nutrition_water_more', 'nutrition_water_drinks', 'nutrition_water_log'], ['вода', 'цель по воде', 'формула', 'вес']),

  mk('nutrition_water_more', 'base',
    ['Когда воды нужно больше?', 'When do I need more water?'],
    [
      ['В жару, при тренировке и потоотделении, а также при болезни с температурой. Ориентир — жажда и цвет мочи: светло-соломенный обычно означает «достаточно».',
       'In heat, during workouts and sweating, and when ill with a fever. Thirst and urine colour are the guide: pale straw usually means enough.'],
      ['Цель в приложении не меняется от погоды, поэтому в жаркий день её нормально перевыполнить. Но пить через силу тоже не нужно.',
       'The in-app goal does not change with weather, so it is fine to exceed it on a hot day. But do not force yourself either.'],
    ],
    ['Потери воды с потом сильно различаются у людей и условий. Для умеренной нагрузки достаточно пить по жажде, при долгой нагрузке в жару пригодятся короткие запланированные питьевые паузы. Чрезмерное питьё (литры за короткое время) создаёт риск гипонатриемии. При хронических заболеваниях почек, сердца или приёме мочегонных объём воды нужно согласовывать с врачом.',
     'Sweat loss varies widely by person and conditions. For moderate exercise, drinking to thirst is enough; for long efforts in heat, short planned drinking breaks help. Overdrinking (litres in a short time) carries a risk of hyponatremia. With chronic kidney or heart conditions, or diuretics, the amount should be agreed with a doctor.'],
    [ACSM], ['nutrition_water_goal', 'nutrition_hydration_sport', 'nutrition_water_drinks'], ['жара', 'жажда', 'тренировка', 'вода']),

  mk('nutrition_water_drinks', 'base',
    ['Чай и кофе считаются за воду?', 'Do tea and coffee count as water?'],
    [
      ['В целом да: напитки в обычных количествах увлажняют. Но кофе лучше пить до обеда: он сокращает сон.',
       'Largely yes: drinks in normal amounts hydrate. But coffee is best before lunch because it cuts sleep.'],
      ['Кофе и чай — тоже жидкость, но основой всё равно остаётся простая вода. В приложении ты сам решаешь, что записать.',
       'Coffee and tea are fluid too, but plain water should remain the base. In the app you decide what to log.'],
    ],
    ['Обзоры показывают, что умеренное потребление кофеина (несколько чашек в день) не приводит к обезвоживанию у привычных людей. Но кофеин влияет на сон: даже за 6 часов до сна он сокращает сон примерно на час (Drake 2013). Алкоголь как увлажнение не считается. Сладкие напитки добавляют сахар, а не пользу.',
     'Reviews show that moderate caffeine intake (a few cups a day) does not dehydrate habitual drinkers. But caffeine affects sleep: even 6 hours before bed it cuts sleep by about an hour (Drake 2013). Alcohol does not count as hydration. Sweet drinks add sugar, not benefit.'],
    ['caffeine'], ['nutrition_caffeine', 'nutrition_water_goal', 'nutrition_alcohol'], ['кофе', 'чай', 'напитки']),

  mk('nutrition_water_log', 'base',
    ['Как записывать воду в приложении?', 'How do I log water in the app?'],
    [
      ['Вода записывается шагом 250 мл на экране активностей. Цель достигнута — 6 XP, половина цели — 3 XP.',
       'Water is logged in 250 ml steps on the activities screen. Reaching the goal gives 6 XP, half the goal gives 3 XP.'],
      ['Нажимай на добавление стакана, а записанное можно отменить. Точность до миллилитра не нужна: цель — привычка, а не бухгалтерия.',
       'Tap to add a glass, and entries can be undone. Precision to the millilitre is not needed: the goal is a habit, not accounting.'],
    ],
    ['Записи воды хранятся только на телефоне (activities.v1, 60 дней) вместе с целью дня. Цель на день запоминается на момент записи, поэтому смена веса в профиле не искажает прошлые дни. XP за воду входит в дневной потолок 50 XP и начисляется один раз за источник в день.',
     'Water entries are stored only on the phone (activities.v1, 60 days) along with the day goal. The day goal is saved at the time of the entry, so changing your weight in the profile does not distort past days. Water XP counts toward the daily cap of 50 XP and is awarded once per source per day.'],
    [], ['nutrition_water_goal', 'app_level', 'nutrition_vitamins_log'], ['записать воду', 'XP', 'стакан']),

  mk('nutrition_vitamins_log', 'base',
    ['Что за отметка «витамины»?', 'What is the "vitamins" mark?'],
    [
      ['Это просто галочка «принял(а) сегодня», чтобы не забывать. Приложение не знает, что и сколько ты принимаешь, и ничего не советует. Отметка даёт 2 XP.',
       'It is just a "taken today" check so you do not forget. The app does not know what or how much you take and advises nothing. The mark gives 2 XP.'],
      ['Галочка — для твоей привычки, а не для назначения. Что принимать и сколько — вопрос к врачу.',
       'The check is for your habit, not a prescription. What to take and how much is a question for your doctor.'],
    ],
    ['Отметка хранится локально и никак не влияет на расчёт возраста тела. Хирон не называет дозировки и не рекомендует конкретные добавки: потребность зависит от питания, возраста, пола, состояния здоровья и анализов. Добавки не заменяют разнообразное питание.',
     'The mark is stored locally and does not affect body age. Hiron names no doses and recommends no specific supplements: needs depend on diet, age, sex, health and tests. Supplements do not replace a varied diet.'],
    [], ['nutrition_vitamins_need', 'app_level', 'nutrition_water_log'], ['витамины', 'добавки', 'галочка']),

  mk('nutrition_vitamins_need', 'base',
    ['Нужно ли мне принимать витамины?', 'Do I need to take vitamins?'],
    [
      ['Здоровым людям с разнообразным питанием обычно хватает еды. Бывают ситуации (веганство, беременность, дефициты), где нужен совет врача и анализы.',
       'For healthy people with a varied diet, food is usually enough. Some situations (veganism, pregnancy, deficiencies) call for a doctor and tests.'],
      ['Без анализов и причины «просто на всякий случай» не очень убедительно. Хирон доз не называет: обсуди это с врачом или диетологом.',
       'Without tests or a reason, "just in case" is not very convincing. Hiron names no doses: discuss it with a doctor or dietitian.'],
    ],
    ['Подход общих рекомендаций (ВОЗ, национальные службы здравоохранения): сначала разнообразное питание, добавки — по показаниям. Известные группы, которым нужна индивидуальная консультация: веганы и вегетарианцы (витамин B12), беременные и планирующие беременность, пожилые, люди с заболеваниями ЖКТ, при ограниченном солнечном свете (витамин D). Избыток жирорастворимых витаминов и некоторых минералов вреден, поэтому самолечение нежелательно.',
     'The general guidance approach (WHO, national health services): varied diet first, supplements by indication. Groups known to need individual advice: vegans and vegetarians (vitamin B12), pregnant women and those planning pregnancy, older adults, people with digestive conditions, limited sunlight (vitamin D). Excess of fat-soluble vitamins and some minerals is harmful, so self-treatment is undesirable.'],
    [WHO_DIET], ['nutrition_vitamins_log', 'nutrition_protein', 'nutrition_fiber'], ['витамины', 'добавки', 'анализы', 'дефицит']),

  mk('nutrition_protein', 'base',
    ['Сколько белка нужно в день?', 'How much protein do I need a day?'],
    [
      ['Для взрослых общий ориентир — около 0,8 г белка на кг веса в день (рекомендации ВОЗ и EFSA). Если тренируешься активно, потребность выше, но диету подбирать лучше с диетологом.',
       'The general adult guide is about 0.8 g of protein per kg of body weight a day (WHO and EFSA guidance). Active training raises the need, but a diet is best planned with a dietitian.'],
      ['Примерно 0,8 г/кг — минимальная рекомендация для здорового взрослого. Это не цель и не предписание, а нижняя планка.',
       'About 0.8 g/kg is the minimum recommendation for a healthy adult. It is not a target or prescription, but a floor.'],
    ],
    ['Рекомендуемая норма (RDA) для здоровых взрослых около 0,8 г/кг/день; EFSA указывает 0,83 г/кг. Она рассчитана на покрытие потребности почти всех здоровых людей и не учитывает цели тренировок. У пожилых людей часто рекомендуют немного больше. При заболеваниях почек количество белка нужно согласовывать с врачом. Приложение не считает белок и не ставит по нему цели.',
     'The Recommended Dietary Allowance (RDA) for healthy adults is about 0.8 g/kg/day; EFSA gives 0.83 g/kg. It is meant to cover the needs of nearly all healthy people and does not account for training goals. Older adults are often advised a little more. With kidney disease the protein amount should be agreed with a doctor. The app does not count protein or set goals for it.'],
    [EFSA, WHO_DIET], ['nutrition_protein_athletes', 'nutrition_fiber', 'nutrition_weight'], ['белок', 'протеин']),

  mk('nutrition_fiber', 'base',
    ['Сколько клетчатки нужно?', 'How much fibre do I need?'],
    [
      ['Общий ориентир для взрослых — около 25–30 г клетчатки в день (ВОЗ, EFSA). Её дают овощи, фрукты, бобовые и цельные злаки.',
       'The general adult guide is about 25–30 g of fibre a day (WHO, EFSA). Vegetables, fruit, legumes and whole grains provide it.'],
      ['Хватит и простого шага: добавить овощи или бобовые к привычной еде. Резко увеличивать клетчатку не стоит, лучше постепенно и с водой.',
       'A simple step is enough: add vegetables or legumes to usual meals. Do not raise fibre abruptly; do it gradually and with water.'],
    ],
    ['ВОЗ рекомендует не менее 25 г клетчатки в день для взрослых; EFSA — 25 г как достаточное потребление; в других рекомендациях диапазон выше. Клетчатка связана с меньшим риском сердечно-сосудистых заболеваний и диабета 2 типа в когортных исследованиях. Резкий рост потребления может вызывать вздутие. При заболеваниях кишечника питание обсуждают с врачом. Приложение клетчатку не отслеживает.',
     'WHO recommends at least 25 g of fibre a day for adults; EFSA gives 25 g as adequate intake; other guidelines use higher ranges. In cohort studies fibre is linked with lower risk of cardiovascular disease and type 2 diabetes. A sudden increase can cause bloating. With bowel disease, diet is discussed with a doctor. The app does not track fibre.'],
    [WHO_DIET, EFSA], ['nutrition_protein', 'nutrition_walk_meal', 'nutrition_weight'], ['клетчатка', 'овощи', 'питание']),

  mk('nutrition_walk_meal', 'base',
    ['Правда, что прогулка после еды полезна?', 'Is a walk after a meal really useful?'],
    [
      ['Да: даже 2–5 минут ходьбы после еды сглаживают скачок сахара в крови. Короткая прогулка — самый простой вариант.',
       'Yes: even 2–5 minutes of walking after a meal blunt the blood sugar spike. A short stroll is the simplest option.'],
      ['Десять минут после обеда — и шаги пополнятся, и день станет спокойнее. Бегать не нужно.',
       'Ten minutes after lunch, and your steps grow and the day calms down. No need to run.'],
    ],
    ['Метаанализ Buffey 2022 (Sports Medicine) показал, что лёгкая ходьба после еды снижает постпрандиальную глюкозу сильнее, чем стояние или сидение; эффект заметен даже при 2–5 минутах. Для людей с диабетом это не заменяет назначенное лечение: вопросы по сахару — к врачу.',
     'The Buffey 2022 meta-analysis (Sports Medicine) showed that light walking after a meal lowers postprandial glucose more than standing or sitting; the effect is visible even at 2–5 minutes. For people with diabetes it does not replace prescribed treatment: blood sugar questions go to a doctor.'],
    ['walkAfterMeal'], ['activity_steps_goal', 'nutrition_fiber', 'nutrition_water_more'], ['прогулка', 'после еды', 'сахар', 'ходьба'], true),

  mk('nutrition_caffeine', 'base',
    ['Когда лучше пить последний кофе?', 'When should my last coffee be?'],
    [
      ['Лучше до обеда: кофеин даже за 6 часов до сна сокращает сон примерно на час. Если спишь плохо, начни с отодвигания последней чашки.',
       'Preferably before lunch: caffeine even 6 hours before bed cuts sleep by about an hour. If you sleep badly, start by moving the last cup earlier.'],
      ['Чувствительность к кофеину у людей разная. Попробуй неделю без кофе после обеда и сравни сон.',
       'Sensitivity to caffeine varies. Try a week without coffee after lunch and compare your sleep.'],
    ],
    ['Drake 2013 (J Clin Sleep Med): 400 мг кофеина за 0, 3 и 6 часов до сна значимо сокращали сон, причём в последнем случае примерно на час; люди плохо замечали такое влияние сами. Период полувыведения кофеина у взрослых около 5–6 часов, но индивидуально сильно различается. Беременным и людям с аритмией или тревожностью стоит обсудить количество кофеина с врачом.',
     'Drake 2013 (J Clin Sleep Med): 400 mg of caffeine at 0, 3 and 6 hours before bed significantly cut sleep, by about an hour in the last case; people poorly noticed the effect themselves. Caffeine half-life in adults is about 5–6 hours but varies widely by person. Pregnant people and those with arrhythmia or anxiety should discuss the amount with a doctor.'],
    ['caffeine'], ['sleep_how_much', 'nutrition_water_drinks', 'nutrition_alcohol'], ['кофе', 'кофеин', 'сон']),

  mk('nutrition_alcohol', 'base',
    ['Как алкоголь влияет на восстановление?', 'How does alcohol affect recovery?'],
    [
      ['Алкоголь вечером повышает ночной пульс и снижает HRV, даже в небольших дозах. Утром это часто видно в показателях.',
       'Evening alcohol raises night heart rate and lowers HRV, even in small amounts. It often shows in the metrics next morning.'],
      ['Сон после алкоголя хуже, а восстановление медленнее. Хирон не читает мораль, он просто замечает цифры.',
       'Sleep after alcohol is worse and recovery slower. Hiron does not lecture; he just notices the numbers.'],
    ],
    ['Pietilä 2018 (JMIR Mental Health): на данных носимых устройств даже умеренные дозы алкоголя заметно снижали вариабельность сердечного ритма и повышали пульс в первую половину ночи, ухудшая восстановление. Это наблюдения за группой, а не оценка риска для конкретного человека. Безопасного уровня, подтверждённого для всех, нет; при проблемах с контролем употребления нужен специалист.',
     'Pietilä 2018 (JMIR Mental Health): in wearable data even moderate alcohol markedly lowered heart rate variability and raised heart rate in the first half of the night, impairing recovery. These are group observations, not risk estimates for an individual. There is no level proven safe for everyone; if control is a problem, see a specialist.'],
    ['alcohol'], ['recovery_readiness_meaning', 'sleep_how_much', 'nutrition_caffeine'], ['алкоголь', 'HRV', 'восстановление'], true),

  mk('nutrition_weight', 'base',
    ['Помогут ли шаги похудеть?', 'Will steps help me lose weight?'],
    [
      ['Для снижения веса больше всего решает питание, а регулярное движение помогает удержать результат и сохранить мышцы. Диеты и калории Хирон не назначает.',
       'For weight loss, diet does most of the work, and regular activity helps keep the result and preserve muscle. Hiron prescribes no diets or calories.'],
      ['Шаги полезны для здоровья в любом случае, а вот вес — тема с множеством факторов. Если хочешь менять вес, сначала поговори с врачом или диетологом.',
       'Steps are good for health regardless, but weight involves many factors. If you want to change weight, talk to a doctor or dietitian first.'],
    ],
    ['Обзор Swift 2014 (Prog Cardiovasc Dis): упражнения умеренно влияют на снижение веса, но важны для удержания результата, улучшения состава тела и снижения риска. Приложение не рассчитывает калории, не ставит целей по весу и не оценивает питание. При резком изменении веса без причины, при расстройствах пищевого поведения нужен врач.',
     'The Swift 2014 review (Prog Cardiovasc Dis): exercise has a modest effect on weight loss but matters for keeping results, improving body composition and lowering risk. The app does not count calories, set weight goals or assess diet. With unexplained sudden weight change or eating disorders, see a doctor.'],
    ['weightLoss'], ['activity_steps_goal', 'nutrition_protein', 'nutrition_fiber'], ['вес', 'похудение', 'питание']),

  mk('nutrition_hydration_sport', 'pro',
    ['Как пить во время долгой тренировки?', 'How should I drink during a long workout?'],
    [
      ['Пить по жажде и небольшими порциями; при долгой нагрузке в жару пригодятся запланированные паузы. Литры за раз не нужны.',
       'Drink to thirst in small portions; for long effort in heat, planned breaks help. Litres at once are unnecessary.'],
      ['Главная ошибка — пить «на всякий случай» слишком много: это опаснее лёгкого недопития.',
       'The main mistake is drinking too much "just in case": that is riskier than mild underdrinking.'],
    ],
    ['Позиция ACSM (2007) и более поздние рекомендации: цель — не допускать потери массы более ~2% и не набирать вес за счёт воды. Индивидуальная скорость потоотделения измеряется взвешиванием до и после нагрузки. При длительных нагрузках более часа потери натрия могут быть существенными, а избыток чистой воды повышает риск гипонатриемии. Эти ориентиры для здоровых; при заболеваниях и приёме лекарств — к врачу.',
     'The ACSM position (2007) and later guidance: the aim is to avoid losing more than ~2% of body mass and not to gain weight from water. Individual sweat rate can be measured by weighing before and after exercise. In efforts over an hour sodium losses can be substantial, and excess plain water raises hyponatremia risk. These guides are for healthy people; with illness or medication, see a doctor.'],
    [ACSM], ['nutrition_water_more', 'training_zones', 'recovery_readiness_meaning'], ['гидратация', 'натрий', 'тренировка', 'потоотделение']),

  mk('nutrition_protein_athletes', 'pro',
    ['Нужно ли больше белка при тренировках?', 'Do I need more protein when training?'],
    [
      ['Активным людям обычно рекомендуют больше, чем минимум: порядка 1,4–2,0 г/кг по позиции ISSN. Но это уровень для планирования с диетологом, не цель приложения.',
       'Active people are usually advised more than the minimum: around 1.4–2.0 g/kg per the ISSN position. That is a level for planning with a dietitian, not an app goal.'],
      ['При силовых и объёмных нагрузках потребность растёт. Распределение белка по приёмам пищи тоже играет роль.',
       'With strength and high-volume training the need grows. Spreading protein across meals matters too.'],
    ],
    ['Позиция ISSN (Jäger 2017): для тренирующихся 1,4–2,0 г/кг/день достаточно для набора и сохранения мышц, а при дефиците энергии верхняя граница может быть выше. Распределение по 0,25–0,4 г/кг на приём считается разумным. Данные в основном получены у здоровых молодых и средних по возрасту людей; при заболеваниях почек и печени количество белка согласуют с врачом. Приложение белок не считает и ничего не назначает.',
     'ISSN position (Jäger 2017): for trained people 1.4–2.0 g/kg/day is sufficient to build and keep muscle, and with an energy deficit the upper end may be higher. Distribution of about 0.25–0.4 g/kg per meal is considered reasonable. Data mostly come from healthy young and middle-aged people; with kidney or liver disease, the amount is agreed with a doctor. The app does not count protein or prescribe anything.'],
    [ISSN], ['nutrition_protein', 'nutrition_weight', 'recovery_readiness_meaning'], ['белок', 'тренировки', 'мышцы', 'ISSN']),

  mk('nutrition_water_formula_pro', 'pro',
    ['Почему цель по воде не меняется от жары и нагрузки?', 'Why does the water goal not change with heat and activity?'],
    [
      ['Потому что у приложения нет надёжных данных о потере жидкости, а гадать Хирон не любит. Цель — стабильный ориентир, а поправки делаешь ты по жажде и условиям.',
       'Because the app has no reliable data on fluid loss, and Hiron dislikes guessing. The goal is a stable guide, and you adjust by thirst and conditions.'],
      ['Цель простая: вес × 33 мл. Это сознательно грубо.',
       'The goal is simple: weight × 33 ml. That is deliberately crude.'],
    ],
    ['Потеря жидкости зависит от температуры, влажности, одежды, акклиматизации и интенсивности: скорости потоотделения у людей различаются в разы. Часы не измеряют потерю воды, а погода в приложении (данные погодного сервиса) влияет на советы, но не на расчёт цели. Усложнение формулы создало бы иллюзию точности. Поэтому используется бытовой ориентир с ограничениями 1,5–3,5 литра.',
     'Fluid loss depends on temperature, humidity, clothing, acclimatisation and intensity: sweat rates differ several-fold between people. Watches do not measure water loss, and the app weather (from a weather service) influences advice but not the goal calculation. A more complex formula would create an illusion of precision. So a household guide with limits of 1.5–3.5 litres is used.'],
    [ACSM], ['nutrition_water_goal', 'nutrition_hydration_sport', 'nutrition_water_more'], ['вода', 'формула', 'погода']),
];
