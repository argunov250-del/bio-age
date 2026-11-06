// Мини-каталог для тестов движка вопросов (подменяет файлы разделов, чтобы тесты не зависели от текстов контента).
const q = (id, section, level, ru, en, extra) => ({
  id, section, level, q: { ru, en },
  short: [{ ru: 'Короткий ответ. {sleepAvgLine}', en: 'Short answer. {sleepAvgLine}' }, { ru: 'Второй вариант.', en: 'Second variant.' }],
  more: { ru: 'Подробный разбор.\nВторой абзац.', en: 'Detailed breakdown.\nSecond paragraph.' },
  sources: ['sleepNeed', { title: 'WHO: Physical activity guidelines', year: 2020 }],
  follow: [], tags: [], humorOk: true, ...extra,
});
module.exports = {
  sleep: [
    q('sleep_how_much', 'sleep', 'base', 'Сколько мне нужно спать?', 'How much sleep do I need?', { follow: ['sleep_debt', 'sleep_phases'], tags: ['сон', 'недосып'] }),
    q('sleep_debt', 'sleep', 'base', 'Что такое недосып?', 'What is sleep debt?', { follow: ['sleep_how_much'], tags: ['долг'] }),
    q('sleep_phases', 'sleep', 'pro', 'Какие бывают фазы сна?', 'What are the sleep stages?', { follow: ['sleep_debt'], tags: ['фазы', 'REM'] }),
  ],
  activity: [q('activity_steps', 'activity', 'base', 'Сколько шагов в день нужно?', 'How many steps a day?', { follow: ['heart_rhr'], tags: ['шаги'] })],
  heart: [q('heart_rhr', 'heart', 'base', 'Что такое пульс покоя?', 'What is resting heart rate?', { follow: ['heart_hrv'] }), q('heart_hrv', 'heart', 'pro', 'Что такое HRV RMSSD?', 'What is HRV RMSSD?', { follow: ['heart_rhr'], tags: ['вариабельность'] })],
  recovery: [q('recovery_rest', 'recovery', 'base', 'Как восстановиться после нагрузки?', 'How to recover after load?', { follow: [] })],
  training: [],
  bodyage: [q('bodyage_what', 'bodyage', 'base', 'Что такое возраст тела?', 'What is body age?', { follow: [] })],
  nutrition: [], stress: [],
  cycle: [q('cycle_phase', 'cycle', 'base', 'Что с моим циклом?', 'What about my cycle?', { follow: [], when: (env) => !!(env.profile && env.profile.sex === 'f' && env.profile.showCycle) })],
  app: [q('app_score', 'app', 'base', 'Как считается готовность?', 'How is readiness computed?', { follow: [] })],
  chiron: [q('chiron_who', 'chiron', 'base', 'Кто ты, Хирон?', 'Who are you, Chiron?', { follow: [], humorOk: false })],
};
