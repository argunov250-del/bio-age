// Обёртка над Health Connect: доступность, разрешения, постраничное чтение.
import { Linking } from 'react-native';
import {
  getSdkStatus,
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  aggregateGroupByDuration,
  aggregateRecord,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// Основные типы (Lifestyle Age) и дополнительные (метрики за 7/30/90 дней).
export const CORE_TYPES = ['Steps', 'SleepSession', 'HeartRate', 'RestingHeartRate', 'ExerciseSession', 'Vo2Max', 'LeanBodyMass'];
export const EXTRA_TYPES = ['HeartRateVariabilityRmssd', 'BloodPressure', 'OxygenSaturation', 'Weight', 'Height', 'BodyTemperature', 'RespiratoryRate', 'Distance', 'ActiveCaloriesBurned'];
export const RECORD_TYPES = [...CORE_TYPES, ...EXTRA_TYPES];
// Цикл — спрашиваем только у женщин.
export const CYCLE_TYPES = ['MenstruationPeriod', 'MenstruationFlow'];
// Без этого разрешения Health Connect отдаёт только последние 30 дней до первой выдачи доступа.
export const HISTORY = 'ReadHealthDataHistory';

const read = (recordType) => ({ accessType: 'read', recordType });

const HC_PACKAGE = 'com.google.android.apps.healthdata';
export const INSTALL_URL = `https://play.google.com/store/apps/details?id=${HC_PACKAGE}`;

// 'ok' | 'update' | 'missing'
export async function sdkStatus() {
  try {
    const s = await getSdkStatus();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return 'ok';
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update';
    return 'missing';
  } catch (e) {
    return 'missing';
  }
}

let ready = false;
export async function init() {
  if (!ready) ready = await initialize();
  return ready;
}

// Множество типов, на чтение которых есть доступ (включая HISTORY).
export async function grantedTypes() {
  await init();
  const list = await getGrantedPermissions();
  return new Set((list || []).filter((p) => p.accessType === 'read').map((p) => p.recordType));
}

export async function askPermissions(withCycle) {
  await init();
  const base = [...RECORD_TYPES, ...(withCycle ? CYCLE_TYPES : [])].map(read);
  try {
    await requestPermission([...base, read(HISTORY)]);
  } catch (e) {
    // Старые версии Health Connect не знают разрешения на историю.
    await requestPermission(base);
  }
  return grantedTypes();
}

// Фоновое чтение (Health Connect 1.1+): без него фоновая задача не может читать данные.
// Старые версии Health Connect не знают этого разрешения — тогда просто false.
export const BACKGROUND = 'BackgroundAccessPermission';
export async function askBackground() {
  try {
    await init();
    await requestPermission([read(BACKGROUND)]);
    return (await grantedTypes()).has(BACKGROUND);
  } catch (e) {
    return false;
  }
}

export function openInstall() {
  Linking.openURL(`market://details?id=${HC_PACKAGE}`).catch(() => Linking.openURL(INSTALL_URL));
}

export function openSettings() {
  try { openHealthConnectSettings(); } catch (e) {}
}

const range = (start, end) => ({ operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() });

// Читает все записи типа за период, отдавая их порциями в onRecords.
export async function readAll(type, start, end, onRecords) {
  let pageToken;
  let pages = 0;
  do {
    const res = await readRecords(type, { timeRangeFilter: range(start, end), pageSize: 5000, pageToken });
    onRecords((res && res.records) || []);
    pageToken = res && res.pageToken;
    pages += 1;
  } while (pageToken && pages < 2000);
}

// Шаги по суткам: агрегат Health Connect убирает дубли от нескольких приложений.
export async function stepsByDay(start, end) {
  const groups = await aggregateGroupByDuration({
    recordType: 'Steps',
    timeRangeFilter: range(start, end),
    timeRangeSlicer: { duration: 'DAYS', length: 1 },
  });
  return (groups || []).map((g) => ({ start: new Date(g.startTime), steps: (g.result && g.result.COUNT_TOTAL) || 0 }));
}

// Расстояние (м) и активные калории (ккал) по суткам — агрегат без дублей.
const AGG = {
  Distance: (r) => (r && r.DISTANCE ? r.DISTANCE.inMeters : 0),
  ActiveCaloriesBurned: (r) => (r && r.ACTIVE_CALORIES_TOTAL ? r.ACTIVE_CALORIES_TOTAL.inKilocalories : 0),
};

export async function totalByDay(type, start, end) {
  const groups = await aggregateGroupByDuration({
    recordType: type,
    timeRangeFilter: range(start, end),
    timeRangeSlicer: { duration: 'DAYS', length: 1 },
  });
  return (groups || []).map((g) => ({ start: new Date(g.startTime), v: AGG[type](g.result) || 0 }));
}

// Сумма за интервал (например, за тренировку).
export async function totalBetween(type, start, end) {
  const r = await aggregateRecord({ recordType: type, timeRangeFilter: range(start, end) });
  return AGG[type](r) || 0;
}

// Для отладочного экрана: число записей типа, приложения-источники, первая и последняя дата.
export async function scanType(type, start, end) {
  const out = { count: 0, origins: {}, first: null, last: null };
  await readAll(type, start, end, (records) => {
    for (const r of records) {
      out.count += 1;
      const o = (r.metadata && r.metadata.dataOrigin) || '?';
      out.origins[o] = (out.origins[o] || 0) + 1;
      const t = r.time || r.startTime;
      if (t) {
        if (!out.first || t < out.first) out.first = t;
        if (!out.last || t > out.last) out.last = t;
      }
    }
  });
  return out;
}
