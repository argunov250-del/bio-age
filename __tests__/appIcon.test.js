// Смена значка: модуля нет в сборке — без падений; модуль есть — вызовы идут в него.
const load = () => { jest.resetModules(); return require('../lib/appIcon'); };

test('native module missing: unsupported, no throw', async () => {
  jest.doMock('expo-alternate-app-icons', () => { throw new Error('Cannot find module'); }, { virtual: true });
  const A = load();
  expect(A.iconSupported()).toBe(false);
  expect(A.currentIcon()).toBe(null);
  await expect(A.applyIcon('C')).resolves.toBe(false);
});

test('supportsAlternateIcons false: unsupported', () => {
  jest.doMock('expo-alternate-app-icons', () => ({ supportsAlternateIcons: false, setAlternateAppIcon: jest.fn() }), { virtual: true });
  expect(load().iconSupported()).toBe(false);
});

test('B maps to default (null), others by letter; native errors are swallowed', async () => {
  const set = jest.fn(async () => {});
  jest.doMock('expo-alternate-app-icons', () => ({ supportsAlternateIcons: true, setAlternateAppIcon: set, getAppIconName: () => 'D' }), { virtual: true });
  const A = load();
  expect(A.iconSupported()).toBe(true);
  expect(A.currentIcon()).toBe('D');
  await A.applyIcon('B');
  await A.applyIcon('A');
  await A.applyIcon('zzz');
  expect(set.mock.calls.map((x) => x[0])).toEqual([null, 'A', null]);
  set.mockRejectedValueOnce(new Error('boom'));
  await expect(A.applyIcon('C')).resolves.toBe(false);
});

test('normalizeIcon defaults to B', () => {
  jest.doMock('expo-alternate-app-icons', () => { throw new Error('x'); }, { virtual: true });
  const A = load();
  expect(A.normalizeIcon(undefined)).toBe('B');
  expect(A.normalizeIcon('C')).toBe('C');
});
