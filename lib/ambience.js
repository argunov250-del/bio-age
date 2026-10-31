// Атмосфера экрана по времени на телефоне и сезону (по календарю, без интернета):
// утро — рассвет (мята и персик), день — изумруд, вечер — закат (янтарь и фиолет),
// ночь — глубокий синий и приглушённый свет. Между периодами — плавный переход в
// течение часа. Сезон: зима — снег, весна — лепестки, лето — светлячки, осень — дождь.
// Северное полушарие (сезоны по месяцам).
import { NEON } from './theme';

const PERIODS = [
  { id: 'night', from: 22, a: '#3F63F0', b: '#7A55F0', op: 0.3, dim: 0.18 },
  { id: 'morning', from: 5, a: '#FFB38A', b: '#5FE0B5', op: 0.32, dim: 0 },
  { id: 'day', from: 11, a: NEON.emerald, b: NEON.teal, op: 0.2, dim: 0 },
  { id: 'evening', from: 17, a: '#FF9F43', b: '#A06BFF', op: 0.3, dim: 0.05 },
];
const ORDER = ['night', 'morning', 'day', 'evening'];
const START = { night: 22, morning: 5, day: 11, evening: 17 };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (x, y, k) => '#' + hex(x).map((v, i) => Math.round(v + (hex(y)[i] - v) * k).toString(16).padStart(2, '0')).join('');

export function periodOf(h) {
  if (h >= 22 || h < 5) return 'night';
  if (h < 11) return 'morning';
  if (h < 17) return 'day';
  return 'evening';
}

export function seasonOf(date) {
  const m = date.getMonth() + 1;
  return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
}

// { period, season, a, b, op, dim } — цвета подсветки и затемнение для текущего момента.
export function ambienceAt(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const id = periodOf(date.getHours());
  const cur = PERIODS.find((p) => p.id === id);
  // Последний час периода плавно перетекает в следующий.
  const end = START[ORDER[(ORDER.indexOf(id) + 1) % 4]];
  const left = (end - h + 24) % 24;
  const next = PERIODS.find((p) => p.id === ORDER[(ORDER.indexOf(id) + 1) % 4]);
  const k = left < 1 ? 1 - left : 0;
  return {
    period: id,
    season: seasonOf(date),
    a: mix(cur.a, next.a, k),
    b: mix(cur.b, next.b, k),
    op: cur.op + (next.op - cur.op) * k,
    dim: cur.dim + (next.dim - cur.dim) * k,
  };
}

// Всегда «день» — для тех, кто выключил оформление по времени.
export const DAY = { period: 'day', season: null, a: NEON.emerald, b: NEON.teal, op: 0.2, dim: 0 };
