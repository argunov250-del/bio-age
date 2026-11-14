const mem = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => { if (mem.__fail) throw new Error('x'); return k in mem ? mem[k] : null; }),
    setItem: jest.fn(async (k, v) => { mem[k] = v; }),
  },
}), { virtual: true });
import { loadJournal, saveJournalDay, toggleBehavior, addJournalNote, subscribe, journalImpact, insightText, needMoreText, normDay } from '../lib/journal';

const pad = (n) => (n < 10 ? '0' : '') + n;
const key = (i) => { const d = new Date(2026, 0, 1 + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; });

describe('store', () => {
  test('toggle, save, notes, subscribe', async () => {
    const now = new Date(2026, 5, 1, 12).getTime();
    const seen = []; const un = subscribe((m) => seen.push(m));
    expect((await toggleBehavior('lateMeal', now)).lateMeal).toBe(true);
    expect((await toggleBehavior('lateMeal', now)).lateMeal).toBe(false);
    expect((await toggleBehavior('alcohol', now)).alcohol).toBe(1);
    await saveJournalDay({ meditation: 15, sauna: true }, now);
    await addJournalNote('  хороший день ', now);
    const m = await loadJournal();
    expect(Object.values(m)[0]).toMatchObject({ meditation: 15, sauna: true, notes: ['хороший день'] });
    expect(seen.length).toBe(5); un();
  });
  test('prunes after 120 days and survives errors', async () => {
    const old = new Date(2026, 0, 1).getTime();
    await toggleBehavior('sauna', old);
    await toggleBehavior('sauna', old + 130 * 86400000);
    expect(Object.keys(await loadJournal()).length).toBe(1);
    mem.__fail = true;
    expect(await loadJournal()).toEqual({});
    expect((await toggleBehavior('sauna')).notes).toEqual([]);
    mem.__fail = false; mem['journal.v1'] = '{bad';
    expect(await loadJournal()).toEqual({});
    expect(normDay({ alcohol: -3, notes: [1, 'a'] })).toMatchObject({ alcohol: 0, notes: ['a'] });
  });
});

describe('journalImpact', () => {
  const mk = (n, effect, noise, seed) => {
    const r = rng(seed), J = {}, R = {};
    for (let i = 0; i < n; i++) {
      const al = r() < 0.4;
      J[key(i)] = { alcohol: al ? 2 : 0, sauna: r() < 0.5 };
      R[key(i + 1)] = 70 + (al ? effect : 0) + (r() - 0.5) * noise;
    }
    return { J, R };
  };
  test('alcohol lowers recovery with high confidence', () => {
    const { J, R } = mk(60, -18, 10, 1);
    const out = journalImpact(J, R);
    const a = out.insights.find((i) => i.id === 'alcohol');
    expect(a.deltaPct).toBeLessThan(-12); expect(a.sign).toBe('neg'); expect(a.confidence).toBe('high');
    expect(out.insights[0].id).toBe('alcohol');
    expect(insightText(a)).toMatch(/не причина/);
  });
  test('random data is not high confidence', () => {
    const { J, R } = mk(60, 0, 20, 7);
    journalImpact(J, R).insights.forEach((i) => { expect(i.confidence).not.toBe('high'); expect(Number.isFinite(i.effect)).toBe(true); });
  });
  test('needs enough days, accepts series array', () => {
    const J = {}; const R = [];
    for (let i = 0; i < 8; i++) { J[key(i)] = { alcohol: i < 3 ? 1 : 0 }; R.push({ key: key(i + 1), v: 60 }); }
    const out = journalImpact(J, R);
    expect(out.insights.find((i) => i.id === 'alcohol')).toBeUndefined();
    const n = out.needMore.find((x) => x.id === 'alcohol');
    expect(n).toMatchObject({ nYes: 3, nNo: 5, needYes: 2, needNo: 0 });
    expect(needMoreText(n)).toMatch(/2/);
  });
  test('water from activities, empty inputs', () => {
    const J = {}, R = {}, A = {};
    for (let i = 0; i < 20; i++) { J[key(i)] = {}; A[key(i)] = { waterMl: i % 2 ? 2000 : 500, waterGoalMl: 2000 }; R[key(i + 1)] = i % 2 ? 80 : 60; }
    const w = journalImpact(J, R, { activities: A }).insights.find((i) => i.id === 'water');
    expect(w.deltaPct).toBe(20);
    expect(journalImpact(null, null)).toEqual({ insights: [], needMore: expect.any(Array) });
  });
});

describe('serialized writes', () => {
  test('parallel mutations do not lose updates', async () => {
    const now = new Date(2026, 5, 1, 12).getTime();
    await Promise.all([
      toggleBehavior('sauna', now), toggleBehavior('coldShower', now), addJournalNote('a', now), addJournalNote('b', now),
      saveJournalDay({ meditation: 10 }, now), toggleBehavior('alcohol', now),
    ]);
    const d = Object.values(await loadJournal())[0];
    expect(d).toMatchObject({ sauna: true, coldShower: true, meditation: 10, alcohol: 1 });
    expect(d.notes).toEqual(['a', 'b']);
  });
});
