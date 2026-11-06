// Реестр вопросов Хирона: схема — scratchpad/qa-schema.md. Файлы разделов подключаются статически.
// env для when(env) и фильтров: { profile, result, s (analyze), ru, extra }.
import { RU } from '../../i18n';
import { SECTIONS, SECTION_IDS } from './sections';
import sleep from './sleep';
import activity from './activity';
import heart from './heart';
import training from './training';
import recovery from './recovery';
import bodyage from './bodyage';
import nutrition from './nutrition';
import stress from './stress';
import cycle from './cycle';
import app from './app';
import chiron from './chiron';

export { SECTIONS };
export const QA = [].concat(sleep, activity, heart, training, recovery, bodyage, nutrition, stress, cycle, app, chiron).filter(Boolean);
export const ALL = QA; // плоский список всех вопросов
export const QA_BY_ID = QA.reduce((m, q) => { m[q.id] = q; return m; }, {});

const isStr = (x) => typeof x === 'string' && x.length > 0;
const bi = (x) => !!x && isStr(x.ru) && isStr(x.en);

// Проверка целостности каталога: возвращает список ошибок (пустой — всё в порядке).
export function checkQA(list = QA) {
  const errs = [];
  const ids = new Set();
  list.forEach((q) => { if (q && isStr(q.id)) ids.add(q.id); });
  const seen = new Set();
  list.forEach((q, i) => {
    const w = (q && q.id) || '#' + i;
    if (!q || !isStr(q.id)) { errs.push('нет id: #' + i); return; }
    if (seen.has(q.id)) errs.push('дубль id: ' + q.id);
    seen.add(q.id);
    if (!SECTION_IDS.includes(q.section)) errs.push(w + ': неизвестный раздел ' + q.section);
    else if (q.id.indexOf(q.section + '_') !== 0) errs.push(w + ': префикс id не совпадает с разделом');
    if (q.level !== 'base' && q.level !== 'pro') errs.push(w + ': level');
    if (!bi(q.q)) errs.push(w + ': q ru/en');
    if (!Array.isArray(q.short) || !q.short.length || !q.short.every(bi)) errs.push(w + ': short');
    if (!bi(q.more)) errs.push(w + ': more');
    (q.follow || []).forEach((f) => { if (!ids.has(f)) errs.push(w + ': follow -> нет ' + f); if (f === q.id) errs.push(w + ': follow на себя'); });
    if (q.sources !== undefined && !Array.isArray(q.sources)) errs.push(w + ': sources');
    if (q.when !== undefined && typeof q.when !== 'function') errs.push(w + ': when');
  });
  return errs;
}

// Вопросы, доступные этому человеку (when(env); ошибка в when — скрыть).
export function visible(env, list = QA) {
  return list.filter((q) => { if (typeof q.when !== 'function') return true; try { return !!q.when(env || {}); } catch (e) { return false; } });
}
export const questionsOf = (section, env) => visible(env).filter((q) => q.section === section);
export const sectionsFor = (env) => { const v = visible(env); return SECTIONS.filter((x) => v.some((q) => q.section === x.id)); };

export const normSearch = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
export const qText = (q, ru = RU) => (ru ? q.q.ru : q.q.en);
export const sectionTitle = (sec, ru = RU) => (ru ? sec.title.ru : sec.title.en);

// Поиск ТОЛЬКО по списку вопросов: все слова запроса должны встретиться в тексте вопроса или тегах (по началу слова).
// Пустой запрос -> все доступные вопросы.
export function search(query, env, ru = RU) {
  const list = visible(env);
  const words = normSearch(query).split(' ').filter(Boolean);
  if (!words.length) return list;
  return list.filter((q) => {
    const hay = normSearch(qText(q, ru) + ' ' + q.q.ru + ' ' + q.q.en + ' ' + (q.tags || []).join(' ')).split(' ');
    return words.every((w) => hay.some((h) => h.indexOf(w) === 0 || (w.length >= 4 && h.indexOf(w) >= 0)));
  });
}
