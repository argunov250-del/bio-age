// Эталон группы «решение о тренировке / сопротивление» для движка: ограничение по месту и уточнение с памятью.
// Рекомендации — только из уже существующих текстов приложения (прогулка, растяжка, йога, лёгкое кардио, силовая 4–6 упражнений).
import { V, BV, SC } from './kit';
import { DECISION } from './trainDecision';

export const TRAINING = [
  SC({ group: 'motivation', topic: 'train', id: 'mot_nothing_hard', humor: ['nothing_hard'],
    match: (n) => n.nothingHard && !n.past,
    positives: ['Не хочу сегодня ничего сложного', 'ничего тяжелого сегодня'], negatives: ['хочу сложную тренировку', 'вчера не хотел ничего сложного'],
    variants: [
      BV('mot_nothing_hard_1', { main: ['Сегодня можно сделать день проще.', 'Today we can make the day simpler.'], clarify: ['Ты хочешь упростить тренировку или выбрать что-то из обычной повседневной активности?', 'Do you want to simplify the workout or pick something from everyday activity?'] }, { pending: { key: 'simplify_what' } }),
      BV('mot_nothing_hard_2', { main: ['Понял, без сложного.', 'Understood, nothing hard.'], clarify: ['Что упростить: тренировку или повседневные дела?', 'What should we simplify: the workout or daily activity?'] }, { pending: { key: 'simplify_what' } }),
    ] }),
  SC({ group: 'motivation', topic: 'train', id: 'mot_simplify_workout', match: () => false,
    variants: [
      BV('mot_simplify_workout_1', { main: ['Давай уберём необязательные части и оставим основной блок.', 'Let us drop the optional parts and keep the main block.'], clarify: ['Какая тренировка была запланирована?', 'Which workout was planned?', ['askActivity']] }, { pending: { key: 'activity' } }),
      BV('mot_simplify_workout_2', { main: ['Оставим только основное: разминка и главный блок, остальное по самочувствию.', 'Keep only the essentials: warm-up and the main block, the rest by feel.'], extra: ['Планировалась {knownActivity}, её и сократим.', 'You planned {knownActivity}, so we trim that one.', ['knownActivity']], clarify: ['Что именно было в плане?', 'What exactly was in the plan?', ['askActivity']] }, { pending: { key: 'activity' } }),
    ] }),
  SC({ group: 'motivation', topic: 'train', id: 'mot_simplify_daily', match: () => false,
    variants: [
      V('mot_simplify_daily_1', ['Простой план тоже план: прогулка 15–30 минут в спокойном темпе — полноценный день движения, когда сил на сложное нет.', 'Если по ходу появятся силы, можно добавить, но обязательства нет.'], ['A simple plan is still a plan: a 15–30 minute easy walk is a full day of movement when you lack energy for something harder.', 'If you feel energetic on the way you can add more, but there is no obligation.']),
      V('mot_simplify_daily_2', 'Достаточно прогулки на 15–30 минут в спокойном темпе. Это настоящий день движения, не уступка.', 'A 15–30 minute easy walk is enough. It is a real day of movement, not a concession.'),
    ] }),
  SC({ group: 'training', topic: 'train', id: 'train_alt_place', humor: [],
    match: (n) => !!n.avoid && !n.past && (!!n.place || n.altRequest),
    positives: ['Не хочу бегать, предложи что-то дома', 'без бега, что можно в зале?'], negatives: ['Мне лень идти бегать', 'хочу бегать дома', 'вчера не хотел бегать'],
    variants: [
      BV('train_alt_home', { main: ['Без бега и дома подойдут растяжка или йога на 20–30 минут, либо лёгкая тренировка в темпе, когда можно разговаривать.', 'Without running, at home: stretching or yoga for 20–30 minutes, or an easy workout at talking pace.'] }, { when: (e) => e.place === 'home' }),
      BV('train_alt_gym', { main: ['В зале вместо бега: спокойное кардио 30–45 минут на тренажёре в разговорном темпе или силовая на 4–6 упражнений.', 'At the gym instead of running: easy cardio for 30–45 minutes at talking pace or a strength session of 4–6 moves.'] }, { when: (e) => e.place === 'gym' && e.s.state !== 'tired' }),
      BV('train_alt_outdoor', { main: ['На улице вместо бега: быстрая ходьба или лёгкий велосипед 20–30 минут.', 'Outdoors instead of running: a brisk walk or an easy bike ride for 20–30 minutes.'] }, { when: (e) => e.place === 'outdoor' }),
      BV('train_alt_tired', { main: ['Сегодня восстановление не лучшее, поэтому: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'Recovery is not great today, so: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'] }, { when: (e) => e.s.state === 'tired' && !!e.place }),
      BV('train_alt_ask', { main: ['Бегать не будем.', 'No running then.'], clarify: ['Где удобнее: дома, в зале или на улице?', 'Where is better: at home, at the gym or outdoors?'] }, { pending: { key: 'place' }, when: (e) => !e.place }),
    ] }),

  // группа 3 (расширение): решение о тренировке — см. trainDecision.js
  ...DECISION,
];
