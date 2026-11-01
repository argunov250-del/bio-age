// Тесты только для разработки: Babel подключён здесь, а не через babel.config.js,
// чтобы конфиг не влиял на сборку приложения (CI копирует лишь App.js, lib и assets).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  transform: {
    '\\.js$': ['babel-jest', { babelrc: false, configFile: false, presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'] }],
  },
};
