jest.mock('react-native', () => ({ Linking: {}, Platform: { OS: 'android', Version: 34 } }), { virtual: true });
jest.mock('react-native-health-connect', () => ({}), { virtual: true });
