// Фирменная палитра: токены тем равны значениям из палитры, текст читается (>= 4.5:1).
const T = require('../lib/theme');

const lum = (h) => {
  const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

describe('brand palette', () => {
  test('PALETTE', () => {
    expect(T.PALETTE).toEqual({ night: '#0B0F1A', deepIndigo: '#1E1B4B', indigo: '#5046E5', violet: '#8B7CF6', lavender: '#C7C1FF', ghost: '#F5F7FF' });
  });
  test('dark theme tokens', () => {
    const d = T.THEMES.dark;
    expect(d.bg).toBe('#0B0F1A'); expect(d.card).toBe('#1E1B4B');
    expect(d.primary).toBe('#5046E5'); expect(d.accent).toBe('#5046E5'); expect(d.accent2).toBe('#8B7CF6');
    expect(d.highlight).toBe('#C7C1FF'); expect(d.text).toBe('#F5F7FF'); expect(d.onPrimary).toBe('#F5F7FF');
    expect(d.glass.fill).toMatch(/^rgba\(30,27,75,/); expect(d.glass.active).toBe('rgba(80,70,229,0.35)');
    expect([d.good, d.warn, d.bad]).toEqual(['#34D399', '#FBBF24', '#F87171']);
  });
  test('light theme tokens', () => {
    const l = T.THEMES.light;
    expect(l.bg).toBe('#F5F7FF'); expect(l.text).toBe('#0B0F1A');
    expect(l.primary).toBe('#5046E5'); expect(l.accent).toBe('#5046E5'); expect(l.accent2).toBe('#8B7CF6');
    expect(l.onPrimary).toBe('#F5F7FF'); expect(l.glass.stroke).toMatch(/^rgba\(199,193,255,/);
  });
  test('accents и экран запуска', () => {
    expect(T.ACCENTS).toEqual({ strain: '#5046E5', strainTo: '#8B7CF6', sleep: '#8B7CF6', energy: '#8B7CF6', recovery: '#C7C1FF' });
    expect(T.SPLASH.bg).toBe('#0B0F1A');
  });
  test.each(['light', 'dark'])('контраст текста %s >= 4.5', (n) => {
    const c = T.THEMES[n];
    for (const k of ['text', 'sub', 'accentText', 'good', 'warn', 'bad']) expect(ratio(c[k], c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(c.sub, c.card)).toBeGreaterThanOrEqual(4.5);
  });
});
