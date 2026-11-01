// Погода для оформления и советов. Включается в профиле (по умолчанию выключена).
// Источник — Open-Meteo (бесплатно, без ключа). В сервис уходят только координаты,
// округлённые до 0,1° (~10 км); данные здоровья никуда не отправляются.
// Место: приблизительная геопозиция телефона или город, введённый вручную.
// Ответ кэшируется на 30 минут.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { RU } from './i18n';

const KEY = 'weather.v1';
const TTL = 30 * 60000;
const FETCH_TIMEOUT = 8000; // не ждём погодный сервис дольше 8 секунд
const round = (x) => Math.round(x * 10) / 10;

// Код погоды WMO → вид эффекта и подпись.
export function kindOf(code) {
  if (code == null) return null;
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 2 || code === 3) return 'clouds';
  return 'clear';
}

const LABELS = {
  storm: ['гроза', 'thunderstorm'], snow: ['снег', 'snow'], rain: ['дождь', 'rain'],
  fog: ['туман', 'fog'], clouds: ['облачно', 'cloudy'], clear: ['ясно', 'clear'],
};
const ICONS = { storm: '⛈️', snow: '🌨️', rain: '🌧️', fog: '🌫️', clouds: '☁️', clear: '☀️' };
export const weatherLabel = (w) => (w && LABELS[w.kind] ? LABELS[w.kind][RU ? 0 : 1] : '');
export const weatherIcon = (w) => (w ? (w.kind === 'clear' && !w.day ? '🌙' : ICONS[w.kind] || '') : '');

// Найти город (Open-Meteo Geocoding): { name, lat, lon } или null.
export async function findCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=${RU ? 'ru' : 'en'}&name=${encodeURIComponent(name.trim())}`;
  const res = await fetch(url);
  const j = await res.json();
  const r = j && j.results && j.results[0];
  return r ? { name: r.name, lat: round(r.latitude), lon: round(r.longitude) } : null;
}

// Приблизительная геопозиция (спрашивает разрешение). { lat, lon } или null.
export async function phonePlace() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) return null;
  const pos = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
  return pos ? { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) } : null;
}

// Текущая погода: { kind, temp, day, code, at, place } или null. force — без кэша.
export async function getWeather(settings, force) {
  if (!settings || !settings.on) return null;
  try {
    const cached = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (!force && cached && Date.now() - cached.at < TTL) return cached;
    let place = settings.city ? { lat: settings.city.lat, lon: settings.city.lon, name: settings.city.name } : null;
    if (!place) {
      const ph = await phonePlace();
      if (ph) place = { ...ph, name: '' };
    }
    if (!place) return cached ? { ...cached, stale: true } : null; // сохранённое — не текущее
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const ctl = typeof globalThis.AbortController === 'function' ? new globalThis.AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT) : null;
    let j;
    try {
      const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      j = await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
    const c = j && j.current;
    if (!c) return cached ? { ...cached, stale: true } : null; // ответ без current: кэш с пометкой, а не как свежий
    const w = { kind: kindOf(c.weather_code), code: c.weather_code, temp: Math.round(c.temperature_2m), day: c.is_day === 1, at: Date.now(), place: place.name };
    await AsyncStorage.setItem(KEY, JSON.stringify(w));
    return w;
  } catch (e) {
    // нет сети или таймаут: отдаём сохранённое с пометкой stale (коуч не выдаст его за текущее), иначе оформление по календарю
    try {
      const old = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
      return old ? { ...old, stale: true } : null;
    } catch (e2) { return null; }
  }
}

export async function clearWeather() {
  try { await AsyncStorage.removeItem(KEY); } catch (e) {}
}
