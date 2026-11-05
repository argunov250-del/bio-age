// Цвета и размеры — в одном месте.
// Две темы в одном языке: светло-серый фон, белые карточки с мягкой тенью, чёрные «таблетки»
// (светлая) и почти чёрный фон, графитовые карточки с тонкой рамкой, белые таблетки (тёмная).
// Один спокойный акцент — зелёный, только для состояний здоровья и прогресса.
const LIGHT = {
  name: 'light', dark: false,
  bg: '#EEF0F3', card: '#FFFFFF', cardAlt: '#F3F4F6',
  text: '#111111', sub: '#6B7280', muted: '#A0A6B0', line: '#E6E8EC',
  primary: '#111111', onPrimary: '#FFFFFF',
  accent: '#2BB673', onAccent: '#FFFFFF',
  good: '#2BB673', warn: '#E0A030', bad: '#E5484D',
  shadow: { shadowColor: '#1B2430', shadowOpacity: 0.09, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 1 },
  border: 0.5,
  sleep: '#6C8EBF', heart: '#E5484D',
};
const DARK = {
  name: 'dark', dark: true,
  bg: '#0E0F11', card: '#1A1C1F', cardAlt: '#25282C',
  text: '#F4F5F6', sub: '#9AA0A8', muted: '#6B7178', line: '#2B2E33',
  primary: '#FFFFFF', onPrimary: '#111111',
  accent: '#3DD68C', onAccent: '#0E0F11',
  good: '#3DD68C', warn: '#E6B450', bad: '#F0726E',
  shadow: { shadowColor: '#000000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  border: 1,
  sleep: '#7FA7C9', heart: '#F0726E',
};
export const THEME_NAMES = ['light', 'dark'];
const BASE = { light: LIGHT, dark: DARK };

// Старые ключи палитры (raised, edge) оставлены для экранов, которые ещё не переписаны.
export function makeColors(name) {
  const b = BASE[name] || LIGHT;
  return { ...b, raised: b.cardAlt, edge: b.line, ink: b.bg };
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
  bg: '#06141B',
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
    emerald: '#2BB673', mint: '#1E9E62', teal: '#2BB673',
    glass: '#FFFFFF', glassEdge: 'rgba(17,17,17,0.06)', glassTop: 'rgba(17,17,17,0.06)',
    text: '#111111', soft: '#4B5563', sub: '#6B7280', dim: '#A0A6B0', ink: '#FFFFFF',
    track: 'rgba(17,17,17,0.08)', warn: '#E0A030',
  },
  dark: {
    emerald: '#3DD68C', mint: '#8CE9BC', teal: '#2BB5A6',
    glass: '#1A1C1F', glassEdge: 'rgba(255,255,255,0.08)', glassTop: 'rgba(255,255,255,0.08)',
    text: '#F4F5F6', soft: '#C4C8CE', sub: '#9AA0A8', dim: '#6B7178', ink: '#0E0F11',
    track: 'rgba(255,255,255,0.09)', warn: '#E6B450',
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
