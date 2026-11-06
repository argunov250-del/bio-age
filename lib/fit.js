// Слова не рвутся посреди: подпись ограничена по строкам и ужимается (adjustsFontSizeToFit);
// на Android перенос «simple» без переноса слогов.
export const fit = (lines = 1, min = 0.7) => ({
  numberOfLines: lines,
  adjustsFontSizeToFit: true,
  minimumFontScale: min,
  textBreakStrategy: 'simple',
  android_hyphenationFrequency: 'none',
});
