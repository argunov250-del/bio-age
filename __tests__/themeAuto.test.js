import { resolveTheme } from '../lib/theme';

test('auto follows system, explicit wins', () => {
  expect(resolveTheme(undefined, 'dark')).toBe('dark');
  expect(resolveTheme('auto', 'light')).toBe('light');
  expect(resolveTheme('auto', null)).toBe('light');
  expect(resolveTheme('light', 'dark')).toBe('light');
  expect(resolveTheme('dark', 'light')).toBe('dark');
});

test('App switches live on mocked Appearance changes', async () => {
  jest.resetModules();
  let listener = null;
  const remove = jest.fn();
  const React = require('react');
  const host = (n) => (p) => React.createElement(n, p, p.children);
  jest.doMock('react-native', () => ({
    Appearance: { getColorScheme: () => 'light', addChangeListener: (fn) => { listener = fn; return { remove }; } },
  }), { virtual: true });
  const { Appearance } = require('react-native');
  const { resolveTheme: rt, applyTheme } = require('../lib/theme');
  let sys = Appearance.getColorScheme();
  const sub = Appearance.addChangeListener(({ colorScheme }) => { sys = colorScheme; });
  expect(applyTheme(rt('auto', sys)).dark).toBeFalsy();
  listener({ colorScheme: 'dark' });
  expect(applyTheme(rt('auto', sys)).dark).toBe(true);
  sub.remove();
  expect(remove).toHaveBeenCalled();
  void host;
});

test('greeting has date only, no weather text', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/screens/HomeScreen.js'), 'utf8');
  expect(src).toMatch(/<Text style=\{s\.date\}>\{date\}<\/Text>/);
  expect(src).not.toMatch(/weatherLabel/);
});
