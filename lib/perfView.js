// Общие помощники для экранов «Восстановление / Нагрузка / Сон»: цвета, подписи, подсказки без данных.
// Все числа приходят из lib/perf/index (конечные или null); здесь только показ.
import { tr } from './i18n';

export const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
export const clamp01 = (x) => Math.min(1, Math.max(0, num(x) == null ? 0 : x));

export const zoneColor = (c, zone) => (zone === 'green' ? c.good : zone === 'yellow' ? c.warn : zone === 'red' ? c.bad : c.muted);
export const strainColor = (c) => (c.dark ? '#6AA8FF' : '#3B7DEB');
export const sleepColor = (c) => c.sleep;
export const stageColors = (c) => ({ deep: c.dark ? '#5C7FD6' : '#3E5FB4', rem: c.dark ? '#9B8CE0' : '#7C6BD0', light: c.sleep, awake: c.muted });

export const zoneWord = (zone) => (zone === 'green' ? tr('Высокое') : zone === 'yellow' ? tr('Среднее') : zone === 'red' ? tr('Низкое') : tr('Нет данных'));
export const levelWord = (lv) => (lv === 'allout' ? tr('Предельная') : lv === 'high' ? tr('Высокая') : lv === 'moderate' ? tr('Умеренная') : lv === 'light' ? tr('Лёгкая') : tr('Нет данных'));
export const sleepWord = (p) => (num(p) == null ? tr('Нет данных') : p >= 85 ? tr('Отлично') : p >= 70 ? tr('Нормально') : tr('Мало'));

export const REASON = {
  no_sleep: () => tr('Нет сна за последние сутки: надень часы на ночь или запиши сон вручную.'),
  no_signals: () => tr('Нужен ночной пульс или HRV: подключи часы к Health Connect.'),
  baseline_short: () => tr('Нужно ещё несколько ночей для базовой линии (минимум 4 ночи с замерами).'),
};
export const reasonText = (perf) => {
  const r = perf && perf.recoveryNull && perf.recoveryNull.reason;
  return REASON[r] ? REASON[r]() : tr('Пока недостаточно данных для оценки.');
};

export const SUGGEST = {
  no_recovery: () => tr('Оценки восстановления пока нет: ориентируйся на самочувствие.'),
  keep_easy: () => tr('Восстановление низкое: выбери лёгкую активность и ляг пораньше.'),
  moderate_session: () => tr('Подойдёт умеренная тренировка без рекордов.'),
  room_to_push: () => tr('Организм готов: можно нагрузить себя сильнее.'),
  in_range: () => tr('Ты уже в целевой зоне: остаток дня можно провести спокойно.'),
  over_target_recover: () => tr('Нагрузка выше цели: сегодня больше отдыха и сна.'),
};
export const suggestionText = (perf) => {
  const k = perf && perf.strainTarget && perf.strainTarget.suggestion;
  return SUGGEST[k] ? SUGGEST[k]() : '';
};

export const ZONE_TEXT = {
  green: () => tr('Организм восстановлен: ночные показатели лучше или на уровне твоей нормы.'),
  yellow: () => tr('Восстановление среднее: показатели немного отличаются от нормы.'),
  red: () => tr('Восстановление низкое: показатели заметно хуже нормы. Дай телу отдых.'),
};

export const DRIVER_NAME = () => ({
  hrv: 'HRV', rhr: tr('Пульс покоя'), resp: tr('Дыхание'), sleepPerf: tr('Сон'), spo2: 'SpO2', skinTemp: tr('Температура'),
});
export const DRIVER_UNIT = () => ({ hrv: tr('мс'), rhr: tr('уд/мин'), resp: tr('дых/мин'), spo2: '%', skinTemp: '°C' });

// Влияние показателя на восстановление: 'good' | 'bad' | 'neutral' | null (нет базовой линии).
export function driverImpact(id, d) {
  const dev = d && num(d.dev);
  if (dev == null) return null;
  if (id === 'hrv') return dev >= 5 ? 'good' : dev <= -5 ? 'bad' : 'neutral';
  if (id === 'rhr') return dev <= -1 ? 'good' : dev >= 2 ? 'bad' : 'neutral';
  if (id === 'resp') return dev <= -5 ? 'good' : dev >= 8 ? 'bad' : 'neutral';
  if (id === 'spo2') return dev <= -1 ? 'bad' : 'neutral';
  if (id === 'skinTemp') return Math.abs(dev) >= 0.5 ? 'bad' : 'neutral';
  return 'neutral';
}
export const ARROW = (dev) => (num(dev) == null ? '' : dev > 0 ? '↑' : dev < 0 ? '↓' : '→');
export const impactColor = (c, imp) => (imp === 'good' ? c.good : imp === 'bad' ? c.bad : c.sub);

// «ЧЧ:ММ» мин → строка; дробные часы → «7 ч 25 мин» делает hoursMin из time.js.
export const MONITOR_NAME = () => ({ rhr: tr('Пульс покоя'), hrv: 'HRV', resp: tr('Дыхание'), spo2: 'SpO2', temp: tr('Температура') });
export const MONITOR_UNIT = () => ({ rhr: tr('уд/мин'), hrv: tr('мс'), resp: tr('дых/мин'), spo2: '%', temp: '°C' });
export const MONITOR_DIGITS = { rhr: 0, hrv: 0, resp: 1, spo2: 1, temp: 1 };
