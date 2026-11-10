// Раздел «Хирон офлайн» в профиле: статус, скачивание, подтверждение вне Wi‑Fi, отмена.
const React = require('react');
const path = require('path');
global.IS_REACT_ACT_ENVIRONMENT = true;

async function mount(netType) {
  jest.resetModules();
  const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
  const gp = require('./growthUiHarness');
  const alerts = [];
  const rn = gp.makeRN('ru', host);
  rn.Alert = { alert: (...args) => { alerts.push(args); } };
  jest.doMock('react-native', () => rn, { virtual: true });
  jest.doMock('react-native-svg', () => gp.hostProxy(host), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('expo-notifications', () => ({ __esModule: true, setNotificationHandler() {}, getPermissionsAsync: async () => ({ granted: false }), AndroidImportance: {} }), { virtual: true });
  jest.doMock('expo-location', () => ({ __esModule: true, requestForegroundPermissionsAsync: async () => ({ granted: false }), getCurrentPositionAsync: async () => ({}), Accuracy: {} }), { virtual: true });
  const Network = require('expo-network');
  Network.getNetworkStateAsync.mockResolvedValue({ type: netType, isConnected: true, isInternetReachable: true });
  const FS = require('expo-file-system/legacy');
  FS.documentDirectory = 'file:///mock-docs/';
  FS.getInfoAsync.mockReset();
  FS.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, size: 0 });
  let progress = null;
  FS.createDownloadResumable.mockReset();
  FS.createDownloadResumable.mockImplementation((url, dest, _o, onProgress) => {
    progress = onProgress;
    return {
      downloadAsync: () => new Promise(() => {}),
      pauseAsync: async () => ({ url, resumeData: 'part' }),
      savable: () => ({ url, resumeData: 'part' }),
    };
  });
  const errors = [];
  jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
  const TR = require('react-test-renderer');
  const i18n = require(path.join(__dirname, '..', 'lib/i18n'));
  i18n.setLang('ru');
  const { THEMES } = require(path.join(__dirname, '..', 'lib/theme'));
  const { ColorsContext } = require(path.join(__dirname, '..', 'lib/colors'));
  const { ChironOfflineCard } = require(path.join(__dirname, '..', 'lib/screens/ProfileScreen'));
  const el = React.createElement(ColorsContext.Provider, { value: THEMES.light }, React.createElement(ChironOfflineCard));
  let r;
  await TR.act(async () => { r = TR.create(el); });
  await TR.act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
  const text = () => JSON.stringify(r.toJSON());
  const press = async (label) => {
    const node = r.root.findAll((n) => n.type === 'Text' && [].concat(n.props.children).join('').indexOf(label) !== -1)[0];
    expect(node).toBeTruthy();
    let b = node;
    while (b && !b.props.onPress) b = b.parent;
    await TR.act(async () => { b.props.onPress(); });
    await TR.act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
  };
  return { TR, text, press, alerts, errors, FS, progress: () => progress };
}

test('профиль: модель не скачана, по Wi‑Fi качается с процентом и отменяется', async () => {
  const t = await mount('WIFI');
  expect(t.text()).toContain('ХИРОН ОФЛАЙН');
  expect(t.text()).toContain('не скачана');
  expect(t.text()).toContain('~400 МБ');
  expect(t.text()).toContain('Скачать модель Хирона (~400 МБ)');
  await t.press('Скачать модель Хирона');
  expect(t.alerts).toHaveLength(0);
  expect(t.FS.createDownloadResumable).toHaveBeenCalled();
  await t.TR.act(async () => { t.progress()({ totalBytesWritten: 100, totalBytesExpectedToWrite: 400 }); });
  expect(t.text()).toContain('скачивается 25%');
  await t.press('Отменить скачивание');
  expect(t.text()).toContain('не скачана');
  expect(t.errors).toEqual([]);
});

test('без Wi‑Fi скачивание ждёт подтверждения', async () => {
  const t = await mount('CELLULAR');
  await t.press('Скачать модель Хирона');
  expect(t.FS.createDownloadResumable).not.toHaveBeenCalled();
  expect(t.alerts).toHaveLength(1);
  expect(t.alerts[0][0]).toBe('Не Wi‑Fi');
  const buttons = t.alerts[0][2];
  await t.TR.act(async () => { buttons[1].onPress(); });
  await t.TR.act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
  expect(t.FS.createDownloadResumable).toHaveBeenCalled();
  expect(t.FS.createDownloadResumable.mock.calls[0][0]).toContain('huggingface.co');
});
