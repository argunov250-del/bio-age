// Цвета и размеры — в одном месте, чтобы потом сделать дизайн.
export const COLORS = {
  bg: '#0E1116',
  card: '#181D25',
  line: '#2A313C',
  text: '#E6E8EB',
  sub: '#9AA3AE',
  accent: '#3D7EFF',
  onAccent: '#FFFFFF',
  good: '#4CC38A',
  bad: '#F06A6A',
  warn: '#E8B04B',
};

export const SIZES = {
  pad: 16,
  gap: 12,
  radius: 12,
  button: 48,
  hero: 56,
  title: 22,
  text: 16,
  small: 13,
};

// Экран запуска. Размер значка = 288dp, как у системного экрана запуска Android 12+,
// чтобы при переходе от системного экрана к экрану приложения ничего не прыгало.
export const SPLASH = {
  bg: '#11212D',
  text: '#CCD0CF',
  mark: 288,
  title: 30,
  bottom: 48,
  accent: '#4CC38A',
  markPad: 33, // прозрачные поля картинки значка ниже кольца, минус отступ до текста
  shift: 60, // насколько значок поднимается при обычном запуске
  shiftFirst: 150, // и при первом запуске, где больше текста
  delayMs: 250,
  animMs: 700,
  holdMs: 2600, // сколько держится экран при обычном запуске
};
