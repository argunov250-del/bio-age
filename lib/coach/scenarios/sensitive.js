// Чувствительные сценарии движка: шуточное «умер после тренировки, ахаха» (не красный флаг) и неясное «умираю»
// (осторожный ответ). Явные красные флаги идут в существующую ветку safety (103/112) в coachBrain.js.
import { V, SC } from './kit';

export const SENSITIVE = [
  // Кризис: самоповреждение, суицидальные мысли, «наглотался таблеток». Тепло, без юмора, без диагноза; 112/103 и проверенный детский телефон доверия.
  SC({ group: 'sensitive', topic: 'sensitive', id: 'sens_crisis', sensitive: true, danger: true, match: () => false,
    positives: ['не хочу жить'], negatives: ['умер после тренировки, ахаха'],
    variants: [
      V('sens_crisis_1', ['Спасибо, что сказал мне об этом. Это важно, и справляться с этим в одиночку не нужно.',
        'Если ты уже навредил себе (например, принял много таблеток или поранился) или есть риск, что это случится сейчас, звони прямо сейчас 112 (единый номер экстренных служб) или 103 (скорая) и не оставайся один.',
        'Убери подальше то, чем можно навредить, и позови человека рядом или позвони близкому: другу, родным, соседу. Можно сказать прямо: «Мне очень плохо, мне нужна помощь». Ещё помогут врач или психолог: в такие моменты обращаться за помощью правильно.',
        'Детям, подросткам и их родителям: общероссийский детский телефон доверия 8-800-2000-122 (бесплатно, анонимно).',
        'Я не врач и ничего не определяю, но я рядом. Что сейчас происходит?'],
      ['Thank you for telling me. It matters, and you do not have to carry this alone.',
        'If you have already hurt yourself (for example taken a lot of pills or cut yourself) or might do it right now, call 112 or your local emergency number right now and do not stay alone.',
        'Move away anything you could hurt yourself with, and reach out to someone near you or call someone close: a friend, family, a neighbour. You can say it plainly: "I feel really bad, I need help." A doctor or a counsellor can help too: reaching out at such a moment is the right thing to do.',
        'I am not a doctor and I am not diagnosing anything, but I am here. What is going on right now?'], { humorOk: false }),
      V('sens_crisis_2', ['Мне важно, что ты это написал. Ты не один, и этим можно поделиться.',
        'Если есть риск, что ты навредишь себе прямо сейчас, или уже что-то случилось (таблетки, порезы), звони 112 или 103 сейчас и не оставайся один.',
        'Напиши или позвони человеку, которому доверяешь, прямо сейчас, и обратись к врачу или психологу: поддержка специалиста существует именно для таких моментов.',
        'Для детей, подростков и их родителей работает детский телефон доверия 8-800-2000-122 (бесплатно, анонимно).',
        'Я не ставлю диагнозы, но готов выслушать. Расскажи, как ты сейчас?'],
      ['I am glad you wrote this. You are not alone, and this can be shared.',
        'If you might harm yourself right now, or something has already happened (pills, cuts), call 112 or your local emergency number now and do not stay alone.',
        'Write to or call someone you trust right now, and reach out to a doctor or counsellor: professional support exists for exactly such moments.',
        'I do not diagnose, but I am ready to listen. How are you right now?'], { humorOk: false }),
    ] }),
  SC({ group: 'sensitive', topic: 'sensitive', id: 'sens_eating', sensitive: true, danger: true, match: () => false,
    positives: ['не ем несколько дней'], negatives: ['умер после тренировки, ахаха'],
    variants: [
      V('sens_eating_1', ['Спасибо, что поделился. Не есть днями или вызывать рвоту — серьёзная нагрузка на тело, и с этим не стоит оставаться одному.',
        'Я не ставлю диагнозы, но стоит поговорить с врачом или психологом и с близким человеком. Пока без тренировок: телу нужны еда и покой.',
        'Если появились слабость до потемнения в глазах, обморок, боль в груди или сильное сердцебиение, звони 103 или 112.',
        'Если хочешь, расскажи, что происходит.'],
      ['Thank you for sharing. Not eating for days or making yourself vomit is a serious strain on the body, and you should not be alone with it.',
        'I do not diagnose, but it is worth talking to a doctor or a psychologist and to someone close. No training for now: your body needs food and rest.',
        'If you feel weakness with darkening vision, fainting, chest pain or a strong heartbeat, call 112 or your local emergency number.',
        'If you like, tell me what is going on.'], { humorOk: false }),
    ] }),
  SC({ group: 'hold', topic: 'sensitive', id: 'sens_crisis_release', sensitive: true, match: () => false,
    variants: [V('sens_crisis_release_1', 'Рад, что стало легче. Я рядом. Если тяжёлые мысли вернутся, не оставайся с ними один: поговори с близким человеком или обратись к врачу или психологу, а в опасный момент звони 112 или 103.',
      'Glad it feels lighter. I am here. If the heavy thoughts come back, do not stay alone with them: talk to someone close or reach out to a doctor or counsellor, and in a dangerous moment call 112 or your local emergency number.', { humorOk: false })] }),
  SC({ group: 'sensitive', topic: 'sensitive', id: 'sens_death_joke', sensitive: true, match: () => false,
    positives: ['умер после тренировки, ахаха'], negatives: ['боюсь, что умираю, мне трудно дышать'],
    variants: [
      V('sens_death_joke_1', 'Похоже, тренировка была тяжёлой. Дай телу восстановиться: вода, еда и спокойный вечер. Если захочешь, подберу восстановление на завтра.', 'Sounds like a hard workout. Let your body recover: water, food and a calm evening. If you like, I will plan recovery for tomorrow.', { humorOk: false }),
      V('sens_death_joke_2', 'Тяжёлая тренировка бывает такой. Отдохни, а завтра выберем нагрузку полегче.', 'A hard workout can do that. Rest, and tomorrow we will pick a lighter load.', { humorOk: false }),
    ] }),
  SC({ group: 'sensitive', topic: 'sensitive', id: 'sens_unsure', sensitive: true, match: () => false,
    positives: ['я умираю'], negatives: ['умер после тренировки, ахаха'],
    variants: [
      V('sens_unsure_1', ['Если тебе сейчас правда плохо — трудно дышать, боль или давление в груди, слабость, потеря сознания — звони 103 или 112 и не оставайся один.', 'Если это про сильную усталость после нагрузки, скажи, и подберу восстановление.'], ['If you really feel bad right now — trouble breathing, chest pain or pressure, weakness, fainting — call 103 or 112 and do not stay alone.', 'If it is about heavy tiredness after exercise, tell me and I will plan recovery.'], { humorOk: false }),
      V('sens_unsure_2', ['Не хочу гадать, шутка это или нет. При тревожных симптомах (одышка, боль в груди, головокружение) вызови скорую: 103 или 112.', 'Если это просто усталость, напиши об этом, и перейдём к восстановлению.'], ['I do not want to guess whether this is a joke. With worrying symptoms (breathlessness, chest pain, dizziness) call emergency services: 103 or 112.', 'If it is just tiredness, say so and we will move on to recovery.'], { humorOk: false }),
    ] }),
];
