// Контент Q&A, часть B: bodyage, nutrition, stress, cycle, app, chiron. Проверки целостности и тона.
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }), { virtual: true });

import bodyage from '../lib/coach/qa/bodyage';
import nutrition from '../lib/coach/qa/nutrition';
import stress from '../lib/coach/qa/stress';
import cycle from '../lib/coach/qa/cycle';
import app from '../lib/coach/qa/app';
import chiron from '../lib/coach/qa/chiron';
import { FACTS } from '../lib/knowledge';

const FILES = { bodyage, nutrition, stress, cycle, app, chiron };
const ALL = Object.values(FILES).flat();
const IDS = new Set(ALL.map((q) => q.id));
// Идентификаторы, согласованные с автором других разделов (sleep, activity, heart, training, recovery).
const AGREED = ['sleep_how_much', 'activity_steps_goal', 'heart_resting', 'training_zones', 'recovery_readiness_meaning'];
const KNOWN_VARS = ['sleepAvgLine', 'stepsAvgLine', 'restHrLine', 'hrvLine', 'vo2Line', 'bioAgeLine', 'readinessLine', 'stepGoal', 'sleepNorm', 'waterGoal', 'curLevel', 'curRank'];

const texts = (q) => [q.q, ...q.short, q.more].flatMap((o) => [o.ru, o.en]);
const sentences = (s) => s.replace(/\{[a-zA-Z]+\}/g, '').split(/[.!?…]+(?:\s|$)/).map((x) => x.trim()).filter(Boolean);

describe('Q&A content B', () => {
  test('counts per section are in range', () => {
    for (const [name, list] of Object.entries(FILES)) {
      expect(list.length).toBeGreaterThanOrEqual(12);
      expect(list.length).toBeLessThanOrEqual(22);
      list.forEach((q) => expect(q.section).toBe(name));
    }
  });

  test('ids unique and prefixed by section', () => {
    expect(IDS.size).toBe(ALL.length);
    for (const [name, list] of Object.entries(FILES)) list.forEach((q) => expect(q.id.startsWith(name + '_')).toBe(true));
  });

  test('required ids exist', () => {
    ['bodyage_what', 'stress_breath', 'app_level'].forEach((id) => expect(IDS.has(id)).toBe(true));
  });

  test('fields and RU + EN', () => {
    for (const q of ALL) {
      expect(['base', 'pro']).toContain(q.level);
      expect(q.q.ru && q.q.en).toBeTruthy();
      expect(q.short.length).toBeGreaterThanOrEqual(2);
      expect(q.short.length).toBeLessThanOrEqual(4);
      q.short.forEach((s) => { expect(s.ru.length).toBeGreaterThan(10); expect(s.en.length).toBeGreaterThan(10); });
      expect(q.more.ru.length).toBeGreaterThan(40);
      expect(q.more.en.length).toBeGreaterThan(40);
      expect(Array.isArray(q.tags) && q.tags.length > 0).toBe(true);
      expect(Array.isArray(q.sources)).toBe(true);
      expect(Array.isArray(q.follow)).toBe(true);
      expect(q.follow.length).toBeGreaterThanOrEqual(2);
      expect(q.follow.length).toBeLessThanOrEqual(4);
    }
  });

  test('RU is Cyrillic and EN has no Cyrillic', () => {
    for (const q of ALL) {
      for (const o of [q.q, ...q.short, q.more]) {
        expect(/[а-яё]/i.test(o.ru)).toBe(true);
        expect(/[а-яё]/i.test(o.en)).toBe(false);
      }
    }
  });

  test('follow ids exist or are agreed; no self-follow', () => {
    const used = new Set();
    for (const q of ALL) {
      for (const f of q.follow) {
        expect(f).not.toBe(q.id);
        const ok = IDS.has(f) || AGREED.includes(f);
        if (!ok) throw new Error(`${q.id} -> unknown follow ${f}`);
        if (AGREED.includes(f)) used.add(f);
      }
    }
    // Список используемых «чужих» id — для отчёта.
    expect([...used].every((x) => AGREED.includes(x))).toBe(true);
  });

  test('no undefined / NaN / null / unknown placeholders', () => {
    for (const q of ALL) {
      for (const s of texts(q)) {
        expect(/undefined|NaN|\bnull\b|\[object/.test(s)).toBe(false);
        for (const m of s.match(/\{[^}]*\}/g) || []) expect(KNOWN_VARS).toContain(m.slice(1, -1));
      }
    }
  });

  test('short answers are at most 3 sentences', () => {
    for (const q of ALL) for (const s of q.short) {
      expect(sentences(s.ru).length).toBeLessThanOrEqual(3);
      expect(sentences(s.en).length).toBeLessThanOrEqual(3);
    }
  });

  test('short answers read without the variable', () => {
    for (const q of ALL) for (const s of q.short) {
      for (const v of ['ru', 'en']) {
        const cleaned = s[v].replace(/\{[a-zA-Z]+\}/g, '').replace(/\s+/g, ' ').trim();
        expect(cleaned.length).toBeGreaterThan(20);
      }
    }
  });

  test('pro questions have real sources; sources are FACTS ids or {title, year}', () => {
    for (const q of ALL) {
      for (const s of q.sources) {
        if (typeof s === 'string') expect(FACTS[s]).toBeTruthy();
        else { expect(typeof s.title).toBe('string'); expect(s.title.length).toBeGreaterThan(5); expect(Number.isFinite(s.year)).toBe(true); }
      }
      if (q.level === 'pro') expect(q.sources.length).toBeGreaterThan(0);
    }
  });

  test('pro share is reasonable overall', () => {
    const pro = ALL.filter((q) => q.level === 'pro').length;
    expect(pro).toBeGreaterThanOrEqual(8);
    expect(pro / ALL.length).toBeLessThanOrEqual(0.35);
  });

  test('no medication doses, diets or calorie prescriptions', () => {
    for (const q of ALL) for (const s of texts(q)) {
      expect(/\d\s*(мг|mg|мкг|mcg|IU|МЕ)\b/.test(s) && !/кофеин|caffeine/i.test(s)).toBe(false);
      expect(/ккал|kcal|calorie target|calorie deficit of/i.test(s)).toBe(false);
    }
  });

  test('cycle questions only when showCycle', () => {
    for (const q of cycle) {
      expect(typeof q.when).toBe('function');
      expect(q.when({ profile: { showCycle: true } })).toBe(true);
      expect(q.when({ profile: { showCycle: false } })).toBe(false);
      expect(q.when({ profile: {} })).toBe(false);
      expect(q.when(undefined)).toBe(false);
    }
    [...bodyage, ...nutrition, ...stress, ...app, ...chiron].forEach((q) => expect(q.when).toBeUndefined());
  });

  test('stress: non-clinical, points to a specialist when hard for long', () => {
    const b = stress.find((q) => q.id === 'stress_breath');
    expect(b.short.some((s) => /4–6/.test(s.ru))).toBe(true);
    expect(stress.some((q) => q.more.ru.includes('специалист') || q.short.some((s) => s.ru.includes('Если тяжело долго')))).toBe(true);
    expect(stress.some((q) => /цифров/i.test(q.q.ru))).toBe(true);
  });

  test('bodyage: states it is not medical, mentions inputs and limits', () => {
    const w = bodyage.find((q) => q.id === 'bodyage_what');
    expect(/не медицинск/i.test(w.short[0].ru)).toBe(true);
    expect(/not a medical/i.test(w.short[0].en)).toBe(true);
    expect(/Гомпертц/.test(w.more.ru)).toBe(true);
  });

  test('app: honest data & privacy', () => {
    const p = app.find((q) => q.id === 'app_privacy');
    expect(/погод/i.test(p.short[0].ru)).toBe(true);
    expect(/weather/i.test(p.short[0].en)).toBe(true);
    expect(app.some((q) => q.humorOk === true)).toBe(true);
  });
});
