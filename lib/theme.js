// Цвета и размеры — в одном месте.
// Три палитры (шкала от тёмного к светлому) — у каждой вкладки своя; при переключении
// вкладок фон и панель плавно перетекают из одной в другую.
export const PALETTES = {
  // Главная — стальная синяя
  steel: ['#06141B', '#11212D', '#253745', '#4A5C6A', '#9BA8AB', '#CCD0CF'],
  // Активность — лесная зелёная
  forest: ['#051F20', '#0B2B26', '#163832', '#235347', '#8EB69B', '#DAF1DE'],
  // Профиль — сливово-сиреневая
  plum: ['#17151C', '#292531', '#45404F', '#716879', '#AAA2B3', '#E2DDE7'],
  // Анализы — бирюзовая (#031716 … #274D60); светлый текст — оттенок той же гаммы
  teal: ['#031716', '#032F30', '#274D60', '#0A7075', '#6BA3BE', '#DCEFF0'],
};

const ACCENTS = { steel: '#4CC38A', forest: '#8EB69B', plum: '#C3B4DC', teal: '#0C969C' };

export function makeColors(name) {
  const [ink, deep, raised, line, sub, text] = PALETTES[name];
  return {
    name,
    bg: ink,
    card: deep,
    raised,
    line,
    text,
    sub,
    accent: ACCENTS[name],
    onAccent: ink,
    good: '#4CC38A',
    bad: '#E08A7E',
    warn: '#D9B26A',
    edge: 'rgba(255,255,255,0.06)', // тонкая светлая кромка карточек
    sleep: '#7FA7C9', // сон на графиках
    heart: '#E08A7E', // пульс на графиках
  };
}

export const THEMES = { steel: makeColors('steel'), forest: makeColors('forest'), plum: makeColors('plum'), teal: makeColors('teal') };
// Палитра по умолчанию (главная и отдельные экраны).
export const COLORS = THEMES.steel;
export const TAB_MS = 450; // плавная смена палитры при переключении вкладок

export const SIZES = {
  pad: 16,
  gap: 12,
  radius: 20,
  radiusSmall: 12,
  button: 50,
  hero: 56,
  title: 22,
  text: 16,
  small: 13,
  tiny: 11,
  tabBar: 64,
  chart: 140,
};

// Экран загрузки и приветствие.
export const SPLASH = {
  bg: '#11212D',
  text: '#CCD0CF',
  accent: '#4CC38A', // зелёный из логотипа, им же окрашена шапка приветствия
  markWidth: 0.42, // ширина логотипа от ширины экрана (кольцо ≈ четверть экрана, как в шаблоне Figma)
  nameSize: 30,
  nameBottom: 48,
  spinMs: 1400, // оборот зелёной дуги при загрузке
  minLoadMs: 1300, // экран загрузки держится не меньше
  growMs: 700, // логотип с зелёным свечением увеличивается и тает
  growScale: 2.6,
  overlapMs: 250, // приветствие начинает въезжать чуть раньше, чем логотип исчезнет
  enterMs: 700, // шапка сверху, текст слева, кнопка снизу
  holdMs: 1800, // сколько приветствие держится при обычном запуске
};

// Главный экран: анимация вокруг возраста.
export const ORBIT = {
  size: 260, // область анимации
  radius: 120, // откуда стартуют кружочки
  count: 36,
  periodMs: 6000, // общий цикл; каждый кружочек делает 1–3 оборота за цикл, поэтому шва нет
  dotMin: 4,
  dotMax: 12,
  colors: ['#4CC38A', '#7BD8AC', '#3D9E70', '#CCD0CF'],
  ageSize: 64,
  blinkMs: 700, // мигание значений, пока данные обновляются
};
