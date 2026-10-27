// Форматирование времени для карточек и графиков.
import { tr, RU } from './i18n';

const pad = (n) => (n < 10 ? '0' : '') + n;

export const clock = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const shortDate = (t) => {
  const d = new Date(typeof t === 'string' ? t + 'T12:00:00' : t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
};

// «7 ч 25 мин»
export const hoursMin = (h) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} ${tr('ч')} ${pad(m % 60)} ${tr('мин')}`;
};

// «5 мин назад», «2 ч назад», «вчера 23:10», «12.10 18:30»
export function ago(t, now = Date.now()) {
  const min = Math.round((now - t) / 60000);
  if (min < 1) return tr('только что');
  if (min < 60) return RU ? `${min} мин назад` : `${min} min ago`;
  if (min < 6 * 60) return RU ? `${Math.round(min / 60)} ч назад` : `${Math.round(min / 60)} h ago`;
  const d = new Date(t), today = new Date(now);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((day(today) - day(d)) / 86400000);
  if (diffDays === 0) return tr('сегодня') + ' ' + clock(t);
  if (diffDays === 1) return tr('вчера') + ' ' + clock(t);
  return shortDate(t) + ' ' + clock(t);
}
