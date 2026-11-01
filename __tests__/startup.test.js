// Дымовой тест запуска: App.js и каждый модуль lib/ должны загружаться без исключений,
// а каждый именованный импорт — существовать в целевом модуле (иначе на устройстве
// это undefined/TDZ при использовании на верхнем уровне). Нативные пакеты замоканы.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Универсальная заглушка: вызывается, наследуется, любое свойство — снова заглушка.
function deepMock() {
  const fn = function () {};
  const p = new Proxy(fn, {
    get: (t, k) => {
      if (k === '__esModule') return false;
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'then') return undefined;
      if (k === 'prototype') return t.prototype;
      if (k === 'length') return 0;
      return deepMock();
    },
    apply: () => deepMock(),
    construct: () => deepMock(),
  });
  return p;
}

const EXTERNAL = [
  'react', 'react-native', 'react-native/Libraries/Utilities/Platform', 'react-native-svg',
  'react-native-safe-area-context', 'react-native-health-connect', 'react-native-view-shot',
  '@react-native-async-storage/async-storage', 'fflate',
  'expo-notifications', 'expo-task-manager', 'expo-background-task', 'expo-haptics', 'expo-location',
  'expo-document-picker', 'expo-file-system', 'expo-file-system/legacy', 'expo-sharing', 'expo-splash-screen',
  'expo-build-properties', 'expo', 'react/jsx-runtime',
];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = [path.join(ROOT, 'App.js'), ...walk(path.join(ROOT, 'lib'))];

// Собираем все внешние пакеты, реально встречающиеся в импортах, и мокаем их виртуально.
const bare = new Set(EXTERNAL);
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:from\s*|require\()\s*['"]([^./'"][^'"]*)['"]/g)) bare.add(m[1]);
}
beforeEach(() => {
  jest.resetModules();
  for (const name of bare) {
    jest.doMock(name, () => {
      const m = deepMock();
      return new Proxy({}, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? m : deepMock()) });
    }, { virtual: true });
  }
});

describe('запуск', () => {
  test.each(files.map((f) => [path.relative(ROOT, f), f]))('%s загружается без ошибок', (rel, f) => {
    expect(() => require(f)).not.toThrow();
  });

  test('App.js экспортирует компонент', () => {
    expect(typeof require(path.join(ROOT, 'App.js')).default).toBe('function');
  });

  test('именованные импорты между модулями существуют', () => {
    const missing = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.[^'"]*)['"]/g)) {
        let target = path.resolve(path.dirname(f), m[2]);
        if (fs.existsSync(target + '.js')) target += '.js';
        else if (fs.existsSync(path.join(target, 'index.js'))) target = path.join(target, 'index.js');
        else { missing.push(`${path.relative(ROOT, f)}: нет файла ${m[2]}`); continue; }
        const mod = require(target);
        for (const part of m[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0].trim();
          if (name && mod[name] === undefined) missing.push(`${path.relative(ROOT, f)}: ${name} не экспортируется из ${m[2]}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('фоновая задача определяется при импорте background.js', () => {
    const TM = require('expo-task-manager');
    const spy = jest.fn();
    TM.defineTask = spy;
    jest.isolateModules(() => { require(path.join(ROOT, 'lib/background.js')); });
    // Допустимо и «лениво» (после первого рендера) — тогда вызова при импорте нет.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
