// Проверка необъявленных переменных и компонентов: Babel их не ловит,
// а приложение из-за них падает при запуске.
const babelParser = require('@babel/eslint-parser');
const react = require('eslint-plugin-react');
const globals = require('globals');

module.exports = [
  {
    files: ['App.js', 'lib/**/*.js'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['@babel/preset-react'] },
        ecmaFeatures: { jsx: true },
      },
      sourceType: 'module',
      globals: { ...globals.es2021, __DEV__: 'readonly', require: 'readonly', console: 'readonly', navigator: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', fetch: 'readonly' },
    },
    plugins: { react },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
];
