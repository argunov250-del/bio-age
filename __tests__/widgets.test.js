const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (k in mockStore ? mockStore[k] : null)),
  setItem: jest.fn(async (k, v) => { mockStore[k] = v; }),
}), { virtual: true });
const mockUpdates = [];
jest.mock('react-native-android-widget', () => {
  const mk = (name) => { const f = () => null; f.__name__ = name; return f; };
  return {
    FlexWidget: mk('FlexWidget'), OverlapWidget: mk('OverlapWidget'), TextWidget: mk('TextWidget'), SvgWidget: mk('SvgWidget'),
    registerWidgetTaskHandler: jest.fn(),
    requestWidgetUpdate: jest.fn(async ({ widgetName, renderWidget }) => { mockUpdates.push({ widgetName, out: await renderWidget({ widgetId: 1, width: 150, height: 150 }) }); }),
  };
}, { virtual: true });

import { buildSnapshot, normalizeSnapshot, loadSnapshot, saveSnapshot, SNAPSHOT_KEY, dayKey } from '../lib/widgets/snapshot';
import { widgetFor, WIDGET_NAMES, LIGHT, DARK, fmtNum, deltaText, ringSvg } from '../lib/widgets/components';
import { widgetTaskHandler } from '../lib/widgets/handler';
import { syncWidgets } from '../lib/widgets/sync';
import { registerWidgets } from '../lib/widgets/register';
import cfg from '../plugins/widgetsConfig';

const NOW = new Date(2026, 5, 10, 15, 0, 0).getTime();
const day = dayKey(NOW);
const prevDay = dayKey(NOW - 86400000);
const result = {
  chrono: 35, bio: 34.5,
  series: { steps: [{ key: prevDay, v: 3000 }, { key: day, v: 6420.4 }], sleep: [{ key: prevDay, v: 7.24 }, { key: day, v: 0 }], rhr: [{ key: prevDay, v: 58.2 }, { key: day, v: 0 }] },
  scores: { lastNightKey: prevDay, readiness: { status: 'ok', score: 78.4 }, recovery: { hrvLast: 44.6 } },
};
const growth = { level: 12, rank: { index: 1, name: 'Следопыт' } };
const snapOf = (over) => buildSnapshot({ result, profile: { age: 35 }, growth, lang: 'ru', now: NOW, ...over });

// Разворачиваем функции-компоненты, как это делает библиотека, и собираем все тексты и типы.
function walk(el, out = { texts: [], types: [], svgs: [] }) {
  if (el == null || el === false) return out;
  if (typeof el === 'string' || typeof el === 'number') { out.texts.push(String(el)); return out; }
  let e = el;
  while (typeof e.type === 'function' && !e.type.__name__) e = e.type(e.props);
  out.types.push(e.type.__name__);
  if (e.type.__name__ === 'TextWidget') out.texts.push(e.props.text);
  if (e.type.__name__ === 'SvgWidget') out.svgs.push(e.props.svg);
  [].concat(e.props.children == null ? [] : e.props.children).flat(Infinity).forEach((c) => walk(c, out));
  return out;
}
const root = (el) => { let e = el; while (typeof e.type === 'function' && !e.type.__name__) e = e.type(e.props); return e; };

describe('snapshot', () => {
  test('builds a compact snapshot from a computed result', () => {
    const s = snapOf();
    expect(s).toEqual({
      v: 1, day, bio: 34.5, chrono: 35, delta: -0.5, readiness: 78, steps: 6420, stepGoal: 8000, sleepH: 7.2, restHr: 58, hrv: 45,
      level: 12, rank: 'Следопыт', updatedAt: NOW, lang: 'ru',
    });
    expect(Object.keys(s).length).toBeLessThan(20);
  });
  test('step goal follows age, language is kept, empty input yields nulls', () => {
    expect(buildSnapshot({ result: { ...result, chrono: 65 }, now: NOW }).stepGoal).toBe(7000);
    expect(snapOf({ lang: 'en' }).lang).toBe('en');
    const e = buildSnapshot({ result: null, profile: null, growth: null, now: NOW });
    expect([e.bio, e.delta, e.readiness, e.steps, e.sleepH, e.restHr, e.hrv, e.level, e.rank]).toEqual(Array(9).fill(null));
    expect(buildSnapshot({}).lang).toBe('ru');
  });
  test('steps of another day are not taken as today', () => {
    expect(buildSnapshot({ result: { ...result, series: { steps: [{ key: prevDay, v: 9000 }] } }, now: NOW }).steps).toBeNull();
  });
  test('normalize survives corrupt input', () => {
    for (const bad of [null, undefined, '', '{', '[]', '42', 'null', { bio: 'x' }, 7, [], '{"bio":"1e999","steps":{}}']) {
      expect(() => normalizeSnapshot(bad)).not.toThrow();
    }
    const n = normalizeSnapshot('{"bio":"1e999","steps":{},"lang":"de","stepGoal":-5,"rank":5}');
    expect(n).toMatchObject({ bio: null, steps: null, lang: 'ru', stepGoal: 8000, rank: null });
  });
  test('save and load round trip, corrupt storage gives null', async () => {
    await saveSnapshot(snapOf());
    expect(await loadSnapshot()).toMatchObject({ bio: 34.5, level: 12, lang: 'ru' });
    mockStore[SNAPSHOT_KEY] = '{not json';
    expect(await loadSnapshot()).toBeNull();
  });
});

describe('formatting', () => {
  test('numbers and delta per language', () => {
    expect(fmtNum(34.5, 1, 'ru')).toBe('34,5');
    expect(fmtNum(6420, 0, 'ru')).toBe('6 420');
    expect(fmtNum(6420, 0, 'en')).toBe('6,420');
    expect(fmtNum(NaN, 0, 'en')).toBe('—');
    expect(deltaText(-0.5, 'ru')).toBe('−0,5 лет');
    expect(deltaText(1.25, 'en')).toBe('+1.3 yrs');
    expect(deltaText(0.01, 'ru')).toBe('как в паспорте');
  });
  test('ring svg is valid for the extremes', () => {
    for (const p of [0, 0.5, 1, 2, -1, NaN]) expect(ringSvg(p, 80, LIGHT)).toMatch(/^<svg[^]*<\/svg>$/);
    expect(ringSvg(0, 80, LIGHT)).not.toContain('<path');
  });
});

describe('widgets render', () => {
  test.each(WIDGET_NAMES)('%s: both themes with data', (name) => {
    const w = widgetFor(name, snapOf(), { width: 150, height: 150 }, NOW);
    for (const k of ['light', 'dark']) {
      const t = walk(w[k]);
      expect(t.types).toContain('TextWidget');
      expect(t.texts.join(' ')).not.toMatch(/undefined|NaN|null/);
      expect(t.texts.join(' ')).toContain('EPIMELY');
    }
    expect(root(w.light).props.style.backgroundColor).toBe(LIGHT.bg);
    expect(root(w.dark).props.style.backgroundColor).toBe(DARK.bg);
    expect(root(w.light).props.clickAction).toBe('OPEN_APP');
  });
  test('texts content (ru and en)', () => {
    const txt = (name, s) => walk(widgetFor(name, s, { width: 150, height: 150 }, NOW).light).texts.join('|');
    expect(txt('BodyAge', snapOf())).toContain('Возраст тела');
    expect(txt('BodyAge', snapOf())).toContain('34,5');
    expect(txt('BodyAge', snapOf())).toContain('−0,5 лет');
    expect(txt('Readiness', snapOf())).toContain('Готовность · хорошо');
    expect(txt('Steps', snapOf())).toContain('из 8 000 шагов');
    const day2 = txt('DaySummary', snapOf());
    for (const s of ['7,2 ч', '6 420', '58 уд/мин', 'Следопыт', '12']) expect(day2).toContain(s);
    expect(txt('BodyAge', snapOf({ lang: 'en' }))).toContain('Body age');
    expect(txt('Readiness', snapOf({ lang: 'en' }))).toContain('Readiness · good');
    expect(txt('DaySummary', snapOf({ lang: 'en' }))).toContain('Resting HR');
  });
  test('hrv is shown when there is no resting hr', () => {
    expect(walk(widgetFor('DaySummary', snapOf({ result: { ...result, series: { ...result.series, rhr: [] } } }), {}, NOW).dark).texts.join('|')).toContain('45');
  });
  test.each(WIDGET_NAMES)('%s: no data and corrupt data give the empty card', (name) => {
    for (const s of [null, normalizeSnapshot(null), normalizeSnapshot('{bad'), snapOf({ result: null, growth: null })]) {
      const w = widgetFor(name, s, undefined, NOW);
      expect(walk(w.light).texts.join('|')).toContain('Нет данных');
      if (!(name === 'Readiness' && s && s.updatedAt)) expect(walk(w.dark).texts.join('|')).toContain('открой приложение');
    }
    expect(walk(widgetFor(name, normalizeSnapshot({ lang: 'en' }), {}, NOW).light).texts.join('|')).toContain(name === 'Readiness' ? 'No data' : 'No data — open the app');
  });
  test('steps and summary ignore yesterday steps', () => {
    const old = snapOf({ now: NOW - 2 * 86400000 });
    expect(walk(widgetFor('Steps', old, {}, NOW).light).texts.join('|')).toContain('Нет данных');
    expect(walk(widgetFor('DaySummary', old, {}, NOW).light).texts.join('|')).not.toContain('6 420');
  });
  test('unknown widget name and exploding builder do not throw', () => {
    expect(() => widgetFor('Nope', snapOf(), {}, NOW)).not.toThrow();
    expect(() => widgetFor('Steps', { get steps() { throw new Error('x'); } }, {}, NOW)).not.toThrow();
  });
  test('progress bar is capped at the full width', () => {
    const t = walk(widgetFor('Steps', snapOf({ result: { ...result, series: { steps: [{ key: day, v: 99999 }] } } }), { width: 300, height: 60 }, NOW).light);
    expect(t.types.filter((x) => x === 'FlexWidget').length).toBeGreaterThan(3);
  });
});

describe('handler and sync', () => {
  beforeEach(() => { mockUpdates.length = 0; });
  test('renders from storage and never throws on corrupt snapshot', async () => {
    await saveSnapshot(snapOf());
    const calls = [];
    await widgetTaskHandler({ widgetAction: 'WIDGET_UPDATE', widgetInfo: { widgetName: 'BodyAge', width: 150, height: 150 }, renderWidget: (w) => calls.push(w) });
    expect(calls).toHaveLength(1);
    expect(walk(calls[0].dark).texts.join('|')).toContain('34,5');
    mockStore[SNAPSHOT_KEY] = '{{{';
    await expect(widgetTaskHandler({ widgetAction: 'WIDGET_ADDED', widgetInfo: { widgetName: 'Steps' }, renderWidget: (w) => calls.push(w) })).resolves.toBeUndefined();
    expect(calls).toHaveLength(2);
    expect(walk(calls[1].light).texts.join('|')).toContain('Нет данных');
  });
  test('handler tolerates garbage and throwing renderWidget', async () => {
    for (const p of [undefined, null, {}, { widgetAction: 'WIDGET_UPDATE' }, { widgetAction: 'WIDGET_DELETED', renderWidget: () => { throw new Error('x'); } }]) {
      await expect(widgetTaskHandler(p)).resolves.toBeUndefined();
    }
    await expect(widgetTaskHandler({ widgetAction: 'WIDGET_UPDATE', widgetInfo: {}, renderWidget: () => { throw new Error('x'); } })).resolves.toBeUndefined();
  });
  test('sync saves the snapshot and updates all four widgets', async () => {
    const s = await syncWidgets({ result, profile: { age: 35 }, growth, lang: 'en', now: NOW });
    expect(s.lang).toBe('en');
    expect(JSON.parse(mockStore[SNAPSHOT_KEY]).bio).toBe(34.5);
    expect(mockUpdates.map((u) => u.widgetName)).toEqual(WIDGET_NAMES);
    expect(mockUpdates[0].out).toHaveProperty('dark');
  });
  test('sync never throws', async () => {
    await expect(syncWidgets(undefined)).resolves.toBeDefined();
    await expect(syncWidgets({ result: { series: 5, scores: 'x' } })).resolves.toBeDefined();
  });
  test('register hands the handler to the library', () => {
    registerWidgets();
    expect(require('react-native-android-widget').registerWidgetTaskHandler).toHaveBeenCalledWith(widgetTaskHandler);
  });
});

describe('plugin config', () => {
  test('four widgets with valid declarations', () => {
    expect(cfg.widgets.map((w) => w.name)).toEqual(WIDGET_NAMES);
    for (const w of cfg.widgets) {
      expect(w.updatePeriodMillis).toBeGreaterThanOrEqual(30 * 60 * 1000);
      expect(w.previewImage).toMatch(/^\.\/assets\/widgets\/\w+\.png$/);
      expect(require('fs').existsSync(require('path').join(__dirname, '..', w.previewImage))).toBe(true);
      expect(w.minWidth).toMatch(/^\d+dp$/);
      expect(w.label && w.description).toBeTruthy();
    }
  });
});
