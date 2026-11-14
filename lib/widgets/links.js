// Ссылки из виджетов: epimely://tab/<вкладка> и epimely://detail/<метрика> -> ключ для open() в App.js.
// Старые вкладки (home, metrics, coach, growth, profile) остались допустимыми ссылками: App.js открывает их
// как «Сегодня» или экран поверх вкладок. Новые вкладки: today, sleep, strain, trends, journal -> 'tab:<имя>'.
const OLD = ['home', 'metrics', 'coach', 'growth', 'profile'];
const TABS = ['today', 'sleep', 'strain', 'trends', 'journal'];
export function widgetLinkKey(url) {
  try {
    const m = /^epimely:\/\/(tab|detail)\/([a-zA-Z0-9]+)\/?$/.exec(String(url || ''));
    if (!m) return null;
    if (m[1] === 'tab') return TABS.includes(m[2]) ? 'tab:' + m[2] : OLD.includes(m[2]) ? m[2] : null;
    return 'detail:' + m[2];
  } catch (e) {
    return null;
  }
}
