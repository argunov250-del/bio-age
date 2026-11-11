// Сборка датасета не входит в npm test.
module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tools/llm/build_lora.test.js'],
  transform: {
    '\\.js$': ['babel-jest', { babelrc: false, configFile: false, presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
};
