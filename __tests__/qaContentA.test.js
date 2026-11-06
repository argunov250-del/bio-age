import sleep from '../lib/coach/qa/sleep';
import activity from '../lib/coach/qa/activity';
import heart from '../lib/coach/qa/heart';
import training from '../lib/coach/qa/training';
import recovery from '../lib/coach/qa/recovery';
import { FACTS } from '../lib/knowledge';

const FILES = { sleep, activity, heart, training, recovery };
const ALL = Object.values(FILES).flat();
const IDS = new Set(ALL.map((q) => q.id));
const AGREED = new Set(['bodyage_what', 'stress_breath', 'app_level']);
const CYR = /[А-Яа-яЁё]/;
const sentences = (s) => s.split(/[.!?…]+(?:\s|$)/).filter((x) => x.trim()).length;

const texts = (q) => [q.q.ru, q.q.en, q.more.ru, q.more.en, ...q.short.flatMap((s) => [s.ru, s.en])];

describe('Q&A content A', () => {
  it('has enough questions per section', () => {
    for (const [name, list] of Object.entries(FILES)) {
      expect(list.length).toBeGreaterThanOrEqual(19);
      expect(list.length).toBeLessThanOrEqual(28);
      const pro = list.filter((q) => q.level === 'pro').length;
      expect(pro / list.length).toBeGreaterThanOrEqual(0.3);
      expect(name).toBeTruthy();
    }
  });

  it('ids are unique and prefixed by section', () => {
    expect(IDS.size).toBe(ALL.length);
    for (const [name, list] of Object.entries(FILES)) {
      for (const q of list) {
        expect(q.section).toBe(name);
        expect(q.id.startsWith(name + '_')).toBe(true);
      }
    }
  });

  it('has required fields with RU and EN', () => {
    for (const q of ALL) {
      expect(['base', 'pro']).toContain(q.level);
      expect(q.q.ru && q.q.en).toBeTruthy();
      expect(CYR.test(q.q.ru)).toBe(true);
      expect(CYR.test(q.q.en)).toBe(false);
      expect(q.short.length).toBeGreaterThanOrEqual(2);
      expect(q.short.length).toBeLessThanOrEqual(4);
      for (const s of q.short) {
        expect(CYR.test(s.ru)).toBe(true);
        expect(CYR.test(s.en)).toBe(false);
        expect(s.en.length).toBeGreaterThan(5);
      }
      expect(q.more.ru.length).toBeGreaterThan(40);
      expect(q.more.en.length).toBeGreaterThan(40);
      expect(CYR.test(q.more.en)).toBe(false);
      expect(Array.isArray(q.tags) && q.tags.length > 0).toBe(true);
      expect(Array.isArray(q.sources)).toBe(true);
    }
  });

  it('follow ids exist (2-4)', () => {
    for (const q of ALL) {
      expect(q.follow.length).toBeGreaterThanOrEqual(2);
      expect(q.follow.length).toBeLessThanOrEqual(4);
      for (const f of q.follow) {
        expect(f).not.toBe(q.id);
        expect(IDS.has(f) || AGREED.has(f)).toBe(true);
      }
    }
  });

  it('has no garbage in texts and short answers are brief', () => {
    for (const q of ALL) {
      for (const t of texts(q)) {
        expect(t).not.toMatch(/undefined|NaN|\[object/);
      }
      for (const s of q.short) {
        expect(sentences(s.ru)).toBeLessThanOrEqual(3);
        expect(sentences(s.en)).toBeLessThanOrEqual(3);
      }
    }
  });

  it('sources valid; pro questions have them', () => {
    for (const q of ALL) {
      if (q.level === 'pro') expect(q.sources.length).toBeGreaterThan(0);
      for (const s of q.sources) {
        if (typeof s === 'string') expect(FACTS[s]).toBeTruthy();
        else {
          expect(typeof s.title).toBe('string');
          expect(s.title.length).toBeGreaterThan(3);
        }
      }
    }
  });
});
