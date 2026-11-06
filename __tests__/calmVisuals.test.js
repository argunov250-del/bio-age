// Визуал дыхания и паузы: обе темы, подпись фазы, reduceMotion, завершение.
let React = require('react');
const path = require('path');
let TR = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
function load(theme, reduce) {
  jest.resetModules();
  React = require('react'); TR = require('react-test-renderer');
  class Value { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } addListener() { return 'id'; } removeListener() {} }
  const anim = () => ({ start() {}, stop() {} });
  const Animated = { Value, View: host('AView'), Text: host('AText'), timing: anim, spring: anim, loop: anim, multiply: (a) => a };
  jest.doMock('react-native', () => ({
    View: host('View'), Text: host('Text'), Animated, Easing: { linear: 0, bezier: () => 0, inOut: () => 0, sin: 0 },
    StyleSheet: { create: (o) => o, absoluteFill: {}, absoluteFillObject: {} },
  }), { virtual: true });
  jest.doMock('../lib/perf', () => ({ isLite: () => false }));
  jest.doMock('react-native-svg', () => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : host(String(k))) }), { virtual: true });
  jest.doMock('../lib/motion', () => ({ reduceMotion: () => reduce }));
  const { THEMES } = require('../lib/theme');
  const { ColorsContext } = require('../lib/colors');
  const V = require(path.resolve(__dirname, '../lib/calmVisuals'));
  const wrap = (el) => React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, el);
  return { V, wrap };
}
const json = (r) => JSON.stringify(r.toJSON());

describe.each([['light', false], ['dark', false], ['light', true], ['dark', true]])('calmVisuals %s reduce=%s', (theme, reduce) => {
  test('дыхание: фазы, завершение', () => {
    const { V, wrap } = load(theme, reduce);
    let r;
    TR.act(() => { r = TR.create(wrap(React.createElement(V.BreathVisual, { mode: 'run', phase: 'inhale', label: 'Вдох', remainingMs: 160000, totalMs: 180000 }))); });
    expect(json(r)).toContain('Вдох');
    expect(json(r)).toContain('2:40');
    TR.act(() => { r.update(wrap(React.createElement(V.BreathVisual, { mode: 'run', phase: 'exhale', label: 'Выдох', remainingMs: 150000, totalMs: 180000 }))); });
    expect(json(r)).toContain('Выдох');
    TR.act(() => { r.update(wrap(React.createElement(V.BreathVisual, { mode: 'done', doneLabel: 'Готово', xpText: '+4 XP' }))); });
    expect(json(r)).toContain('Готово');
    expect(json(r)).toContain('+4 XP');
    TR.act(() => { r.unmount(); });
  });
  test('пауза: цифры и завершение', () => {
    const { V, wrap } = load(theme, reduce);
    let r;
    TR.act(() => { r = TR.create(wrap(React.createElement(V.PauseVisual, { remainingMs: 754000, totalMs: 900000 }))); });
    expect(json(r)).toContain('12:34');
    TR.act(() => { r.update(wrap(React.createElement(V.PauseVisual, { done: true, remainingMs: 0, totalMs: 900000 }))); });
    expect(json(r)).not.toContain('12:34');
    TR.act(() => { r.unmount(); });
  });
});
