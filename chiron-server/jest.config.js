module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/chiron-server/jest.setup.js'],
  testMatch: ['<rootDir>/chiron-server/build_dataset.test.js'],
  transform: {
    '\\.js$': ['babel-jest', { babelrc: false, configFile: false, presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
};
