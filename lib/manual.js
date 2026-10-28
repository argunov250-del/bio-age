// Ручные записи: сон, шаги, вес, давление, пульс покоя, тренировки, месячные. Хранятся только
// на телефоне и подмешиваются в те же данные, что и Health Connect, — поэтому все
// метрики, оценки и советы считаются одинаково. Если за тот же день/ночь есть данные
// из Health Connect, они важнее; ручная запись заполняет пробелы.
import { dayKey } from './metrics';

const MIN = 60000;
const EPOCH = 5 * MIN;

export const ENTRY_TYPES = ['sleep', 'steps', 'weight', 'bp', 'rhr', 'workout', 'period'];

// Типы Health Connect, которые ручная запись «закрывает» (чтобы не было «нет доступа»).
const COVERS = {
  sleep: ['SleepSession'],
  steps: ['Steps'],
  weight: ['Weight'],
  bp: ['BloodPressure'],
  rhr: ['RestingHeartRate'],
  workout: ['ExerciseSession', 'HeartRate'],
};

// Тип тренировки → код Health Connect (для названия и иконки) и силовая ли она.
export const WORKOUT_TYPES = [
  [79, 'Ходьба'], [56, 'Бег'], [8, 'Велосипед'], [70, 'Силовая'], [74, 'Плавание'],
  [83, 'Йога'], [36, 'Интервальная (HIIT)'], [71, 'Растяжка'], [0, 'Другое'],
];
const STRENGTH = new Set([13, 70, 81]);
// Интенсивность → пульсовая зона для оценки нагрузки и активных минут.
export const INTENSITY = [['light', 'Лёгкая', 1], ['medium', 'Средняя', 3], ['high', 'Высокая', 4]];

export function applyManual(ds, entries) {
  const avail = new Set(ds.granted);
  ds.manualKeys = { steps: new Set(), rhr: new Set(), sleep: new Set() };
  if (!entries || !entries.length) return ds;
  const from = ds.start.getTime();

  const now = ds.now.getTime();
  for (const src of entries) {
    if (!src || src.t < from) continue;
    // Запись не может быть «из будущего» (например, вес за сегодня с временем 12:00).
    const e = src.t > now ? { ...src, t: now } : src;
    for (const type of COVERS[e.type] || []) avail.add(type);
    const key = e.date;
    if (e.type === 'steps' && !ds.steps[key]) {
      ds.steps[key] = e.steps;
      ds.manualKeys.steps.add(key);
    } else if (e.type === 'rhr' && !ds.rhr[key]) {
      ds.rhr[key] = e.bpm;
      ds.manualKeys.rhr.add(key);
    } else if (e.type === 'weight') {
      (ds.extra.Weight || (ds.extra.Weight = [])).push({ t: e.t, v: e.kg, origin: 'manual' });
    } else if (e.type === 'bp') {
      (ds.extra.BloodPressure || (ds.extra.BloodPressure = [])).push({ t: e.t, v: e.sys, dia: e.dia, origin: 'manual' });
    } else if (e.type === 'sleep' && !ds.sleep[key]) {
      // Ночь привязана к дню пробуждения, как и данные Health Connect.
      const arr = (ds.sleep[key] = new Uint8Array(288));
      for (let m = Math.ceil(e.start / EPOCH) * EPOCH; m < e.end; m += EPOCH) {
        const shifted = new Date(m + 12 * 3600000);
        if (dayKey(shifted) === key) arr[Math.floor((shifted.getHours() * 60 + shifted.getMinutes()) / 5)] = 1;
      }
      ds.nights[key] = { start: e.start, end: e.end, stages: null, stageCount: 0 };
      ds.manualKeys.sleep.add(key);
    } else if (e.type === 'period') {
      // Месячные: дни подряд от даты начала (lib/cycle.js собирает из них циклы).
      const raw = ds.cycleRaw || (ds.cycleRaw = { periods: [], flow: [] });
      const d0 = new Date(e.date + 'T12:00:00');
      for (let i = 0; i < (e.days || 5); i++) raw.flow.push(dayKey(new Date(d0.getTime() + i * 86400000)));
    } else if (e.type === 'workout') {
      const dur = (e.end - e.start) / MIN;
      ds.workouts.push({ type: e.workout, start: e.start, end: e.end, title: '', hrSum: 0, hrN: 0, hrMax: 0, load: 0, activeMin: 0, manual: true, intensity: e.intensity });
      if (STRENGTH.has(e.workout)) ds.strength[key] = (ds.strength[key] || 0) + dur;
      // Нагрузка и активные минуты по интенсивности — только если за день нет пульса.
      const zone = (INTENSITY.find((x) => x[0] === e.intensity) || INTENSITY[1])[2];
      const h = ds.hr[key];
      if (!h || h.manual) {
        const d = ds.hr[key] || (ds.hr[key] = { z13: 0, z45: 0, cover: 0, load: 0, manual: true });
        if (zone >= 4) d.z45 += dur; else d.z13 += dur;
        d.load += zone * dur;
        const w = ds.workouts[ds.workouts.length - 1];
        w.load = zone * dur;
        w.activeMin = dur;
      }
    }
  }
  if (ds.extra.Weight) ds.extra.Weight.sort((a, b) => a.t - b.t);
  if (ds.extra.BloodPressure) ds.extra.BloodPressure.sort((a, b) => a.t - b.t);
  ds.workouts.sort((a, b) => b.start - a.start);
  ds.granted = avail;
  return ds;
}
