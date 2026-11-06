// Запуск кода приложения (ESM + Babel) в чистом node: без jest и без native-модулей.
// require('./node_env') подключает хук Babel для lib/ и заглушки для health/appleHealth.
const Module = require('module');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const babel = require(path.join(root, 'node_modules/@babel/core'));
const orig = Module._extensions['.js'];
Module._extensions['.js'] = function (m, f) {
  if (f.includes('/node_modules/') || !f.startsWith(root) || f.startsWith(path.join(root, 'tools'))) return orig(m, f);
  const out = babel.transformSync(fs.readFileSync(f, 'utf8'), { filename: f, babelrc: false, configFile: false, presets: [['@babel/preset-env', { targets: { node: 'current' } }]] });
  return m._compile(out.code, f);
};
const load = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  if (/(^|\/)lib\/health$|\/health$|appleHealth$/.test(req) && parent && parent.filename && parent.filename.startsWith(root)) {
    if (/appleHealth$/.test(req)) return { importedRecords: () => [], importedTypes: () => [] };
    return {};
  }
  return load.call(this, req, parent, isMain);
};
module.exports = { root, require: (p) => require(path.join(root, p)) };
