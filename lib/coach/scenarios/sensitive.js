// Чувствительные сценарии движка: шуточное «умер после тренировки, ахаха» (не красный флаг) и неясное «умираю»
// (осторожный ответ). Явные красные флаги идут в существующую ветку safety (103/112) в coachBrain.js.
import { V, SC } from './kit';

export const SENSITIVE = [
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
