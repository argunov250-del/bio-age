// Отдельная конфигурация jest для генератора демо-диалогов (не входит в обычный набор тестов).
// Запуск из корня репозитория: npx jest --config scripts/jest.demo.config.js
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/scripts/demoDialogs.js'],
  transform: {
    '\\.js$': ['babel-jest', { babelrc: false, configFile: false, presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'] }],
  },
};
