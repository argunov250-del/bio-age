// Цвета и размеры — в одном месте.
// Фирменная палитра: night #0B0F1A, deep indigo #1E1B4B, indigo #5046E5, violet #8B7CF6,
// lavender #C7C1FF, ghost white #F5F7FF. Семантика здоровья (good/warn/bad) остаётся зелёной/жёлтой/красной.
// accentText — акцент для ТЕКСТА (контраст >= 4.5:1 на фоне темы); accent — для заливок и линий.
// onBg / onBgSub — цвет текста прямо на фото-фоне (оно тёмное в обеих темах).
export const PALETTE = { night: '#0B0F1A', deepIndigo: '#1E1B4B', indigo: '#5046E5', violet: '#8B7CF6', lavender: '#C7C1FF', ghost: '#F5F7FF' };
const P = PALETTE;
const LIGHT = {
  name: 'light', dark: false,
  bg: P.ghost, card: '#FFFFFF', cardAlt: '#ECEEFF',
  text: P.night, sub: '#5A597D', muted: '#6E6C99', line: '#DCD9FF',
  primary: P.indigo, onPrimary: P.ghost,
  accent: P.indigo, accent2: P.violet, highlight: P.lavender, accentText: P.indigo, onAccent: P.ghost,
  good: '#047857', warn: '#B45309', bad: '#DC2626',
  shadow: { shadowColor: P.deepIndigo, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 1 },
  border: 0.5,
  sleep: P.violet, heart: '#DC2626',
  onBg: P.ghost, onBgSub: P.lavender,
  // Стекло (lib/glassKit.js): светлая тема — белое матовое стекло с лавандовой обводкой, тёмный текст.
  glass: {
    tint: 'light', fill: 'rgba(255,255,255,0.66)', fillFallback: 'rgba(255,255,255,0.82)',
    stroke: 'rgba(199,193,255,0.9)', highlight: 'rgba(255,255,255,0.95)', sheen: 'rgba(199,193,255,0.35)',
    shadow: { shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
    active: 'rgba(80,70,229,0.35)', chip: 'rgba(80,70,229,0.08)', sheet: 'rgba(245,247,255,0.94)',
    intensity: 45,
  },
};
const DARK = {
  name: 'dark', dark: true,
  bg: P.night, card: P.deepIndigo, cardAlt: '#262262',
  text: P.ghost, sub: '#9895C6', muted: '#8582B5', line: '#33307A',
  primary: P.indigo, onPrimary: P.ghost,
  accent: P.indigo, accent2: P.violet, highlight: P.lavender, accentText: P.lavender, onAccent: P.ghost,
  good: '#34D399', warn: '#FBBF24', bad: '#F87171',
  shadow: { shadowColor: '#000000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  border: 1,
  sleep: P.violet, heart: '#F87171',
  onBg: P.ghost, onBgSub: P.lavender,
  glass: {
    tint: 'dark', fill: 'rgba(30,27,75,0.45)', fillFallback: 'rgba(30,27,75,0.78)',
    stroke: 'rgba(199,193,255,0.18)', highlight: 'rgba(199,193,255,0.32)', sheen: 'rgba(199,193,255,0.10)',
    shadow: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
    active: 'rgba(80,70,229,0.35)', chip: 'rgba(199,193,255,0.12)', sheet: 'rgba(30,27,75,0.92)',
    intensity: 40,
  },
};
// Акценты экранов (все из палитры): нагрузка #5046E5 → #8B7CF6, сон/энергия — фиолетовый, восстановление — лавандовый.
export const ACCENTS = { strain: P.indigo, strainTo: P.violet, sleep: P.violet, energy: P.violet, recovery: P.lavender };
export const THEME_NAMES = ['light', 'dark'];
const BASE = { light: LIGHT, dark: DARK };

// Старые ключи палитры (raised, edge) оставлены для экранов, которые ещё не переписаны.
export function makeColors(name) {
  const b = BASE[name] || LIGHT;
  return { ...b, raised: b.cardAlt, edge: b.line, ink: b.bg, accents: ACCENTS };
}

const LIVE = {}; // старые имена тем (steel/forest/plum/teal) — теперь всегда текущая тема
export const THEMES = { light: makeColors('light'), dark: makeColors('dark') };
for (const k of ['steel', 'forest', 'plum', 'teal']) Object.defineProperty(THEMES, k, { enumerable: true, get: () => THEMES[LIVE.name || 'light'] });
// Текущая палитра (изменяется при смене темы: applyTheme).
export const COLORS = { ...THEMES.light };
export const TAB_MS = 450; // плавная смена палитры при переключении вкладок

export const SIZES = {
  pad: 16,
  gap: 12,
  radius: 24,
  radiusSmall: 14,
  button: 50,
  hero: 56,
  title: 22,
  text: 16,
  small: 13,
  body: 14, // абзацы, списки, подписи полей
  tiny: 11,
  stat: 26, // число в карточке
  display: 32, // крупное число
  pageTitle: 30, // заголовок экрана
  lineHeight: 21, // межстрочный интервал абзацев
  field: 46, // высота поля ввода
  chip: 36, // высота чипа и переключателя
  tabBar: 72,
  chart: 140,
};

// Экран запуска.
export const SPLASH = {
  bg: PALETTE.night,
  minLoadMs: 1700, // экран запуска держится не меньше (успевает «нарисоваться»)
};

// Мигание значений, пока данные обновляются.
export const ORBIT = {
  blinkMs: 700,
};

// Моушен-графика: кинетическая типографика, морфинг формы, 3D-кольца, переходы.
export const MOTION = {
  charStagger: 26, // задержка между буквами заголовка
  wordStagger: 70, // между словами длинного текста
  riseMs: 520, // одна буква/слово поднимается и разворачивается
  riseTilt: 80, // буква «встаёт» из наклона (градусы, rotateX)
  countMs: 600, // счётчик чисел (возраст, оценки)
  ringStagger: 110, // кольца оценок заполняются по очереди
  fadeMs: 240, // перекрёстное проявление вкладок
  screenMs: 340, // переход между экранами
  screenTilt: 7, // поворот экрана в глубину при переходе (градусы, rotateY)
  pressTilt: 7, // карточка наклоняется к пальцу
  pressScale: 0.97,
  blobPeriodMs: 14000, // полный цикл морфинга формы за возрастом (шва нет)
  blobFps: 30,
  blobAmp: 0.07, // насколько «дышит» форма
  blobAmpBusy: 0.15, // сильнее, пока данные обновляются
  gyroMs: [18000, 24000], // обороты 3D-колец
  pillMs: [260, 460], // передний и задний край капли в нижней панели
};

// Прежние «неоновые» цвета главного экрана: имена те же, значения — из текущей темы
// (см. applyTheme). Новым экранам лучше брать useColors().
const NEON_BY = {
  light: {
    emerald: P.indigo, mint: P.violet, teal: P.violet,
    glass: '#FFFFFF', glassEdge: 'rgba(80,70,229,0.12)', glassTop: 'rgba(80,70,229,0.12)',
    text: P.night, soft: P.deepIndigo, sub: '#5A597D', dim: '#6E6C99', ink: P.ghost,
    track: 'rgba(80,70,229,0.12)', warn: '#B45309',
  },
  dark: {
    emerald: P.violet, mint: P.lavender, teal: P.indigo,
    glass: P.deepIndigo, glassEdge: 'rgba(199,193,255,0.14)', glassTop: 'rgba(199,193,255,0.14)',
    text: P.ghost, soft: P.lavender, sub: '#9895C6', dim: '#8582B5', ink: P.night,
    track: 'rgba(199,193,255,0.12)', warn: '#FBBF24',
  },
};
export const NEON = { ...NEON_BY.light };
export const NEON_DARK = NEON_BY.dark; // фиксированная тёмная гамма для экранов на тёмной заставке

// Стеклянный индикатор возраста: кольцо прогресса, силуэт из частиц, 3D-покачивание.
export const GAUGE = {
  size: 290, // вся область с 3D-кольцами
  disc: 210, // стеклянный диск
  ring: 8, // толщина кольца прогресса
  ticks: 60, // риски шкалы
  swayMs: 9000, // цикл мягкого 3D-покачивания диска (шва нет)
  swayDeg: 7,
  dots: 320, // частиц в силуэте
  floatMs: 6000, // цикл парения частиц
  // Шкала кольца: от «на 15 лет старше» (пусто) до «на 10 лет моложе» (полное) — границы формулы.
  older: 15,
  younger: 10,
  ageSize: 60,
  typingMs: 900, // коуч «печатает»
};

// Стеклянная панель вкладок (R4): плавающая капсула. inset — сколько снизу занимает вместе с отступами.
export const GLASS_TAB = { height: 64, margin: 14, gap: 10, radius: 32, pad: 5 };
export const tabInset = (bottom) => GLASS_TAB.height + GLASS_TAB.gap + Math.max(bottom || 0, 8) + SIZES.pad;
// Верхний/нижний край: высота зоны размытия.
export const EDGE = { top: 90, bottom: 120 };

// Нижняя панель: белая изогнутая «док-панель» с поднятой круглой центральной кнопкой.
export const DOCK = {
  height: 72, // сама панель (без отступа под жест-навигацию)
  lift: 0,
  side: 0,
  radius: 30,
  center: 60, // чёрный круг
  ring: 76, // внешнее кольцо вокруг круга
  raise: 30, // насколько центральная кнопка выступает над панелью
  enterMs: 700, // появление панели при запуске
  iconStagger: 70,
};

// Выбор темы: 'auto' (по умолчанию) следует за системной, иначе 'light' / 'dark'.
export function resolveTheme(pref, system) {
  if (pref === 'dark' || pref === 'light') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

// Сменить тему: обновляет живые объекты COLORS и NEON (их читают экраны без useColors).
export function applyTheme(name) {
  const n = BASE[name] ? name : 'light';
  LIVE.name = n;
  Object.assign(COLORS, THEMES[n]);
  Object.assign(NEON, NEON_BY[n]);
  return THEMES[n];
}

// Менструальный цикл: цвета фаз на кольце и в календаре.
export const CYCLE_COLORS = {
  menstrual: '#F2667A', // месячные
  follicular: '#34E89E', // фолликулярная
  fertile: '#4FD1C5', // фертильное окно
  ovulation: '#7FF0E4', // день овуляции (оценка)
  luteal: '#B794F4', // лютеиновая
  hormonal: '#8FB8A6',
  late: '#D9B26A', // задержка
};
