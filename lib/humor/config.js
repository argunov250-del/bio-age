// Настройки частоты юмора коуча. Это ПРЕДЕЛЫ, а не квоты: шутка появляется только если
// есть подходящая ситуация и не превышены лимиты.
export const MODES = ['off', 'balanced', 'playful'];

export const HUMOR_CONFIG = {
  defaultMode: 'balanced',
  windowSize: 5, // окно из последних ответов коуча
  repeatCooldown: 15, // одна реплика не повторяется в последних N ответах коуча
  positiveBonus: 2, // добавка к приоритету, если пользователь сам шутит («ахах», 😂)
  modes: {
    off: { max: 0, consecutive: false, minPriority: 99 },
    balanced: { max: 2, consecutive: false, minPriority: 5 }, // ≤2 из 5, не два подряд
    playful: { max: 3, consecutive: true, minPriority: 3 }, // ≤3 из 5
  },
};

export const normalizeMode = (m) => (MODES.includes(m) ? m : HUMOR_CONFIG.defaultMode);
