// Ссылки из виджетов: epimely://tab/<вкладка> и epimely://detail/<метрика> -> ключ для open() в App.js.
const TABS = ['home', 'metrics', 'coach', 'growth', 'profile'];
export function widgetLinkKey(url) {
  try {
    const m = /^epimely:\/\/(tab|detail)\/([a-zA-Z0-9]+)\/?$/.exec(String(url || ''));
    if (!m) return null;
    if (m[1] === 'tab') return TABS.includes(m[2]) ? m[2] : null;
    return 'detail:' + m[2];
  } catch (e) {
    return null;
  }
}
