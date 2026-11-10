// Модель Qwen3-4B Q5 занимает несколько гигабайт в адресном пространстве процесса.
// largeHeap поднимает потолок Java-кучи, чтобы система реже убивала приложение при загрузке.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application && c.modResults.manifest.application[0];
    if (app && app.$) app.$['android:largeHeap'] = 'true';
    return c;
  });
};
