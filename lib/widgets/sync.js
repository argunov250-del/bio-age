// Вызывается приложением после расчёта: сохраняет снимок и просит систему перерисовать виджеты.
// Никогда не бросает; библиотека подключается лениво, чтобы сбой нативного модуля не мешал запуску.
import { buildSnapshot, saveSnapshot } from './snapshot';
import { widgetFor, WIDGET_NAMES } from './components';

export async function syncWidgets(input) {
  try {
    const snap = await saveSnapshot(buildSnapshot(input || {}));
    if (!snap) return null;
    let lib = null;
    try { lib = require('react-native-android-widget'); } catch (e) { lib = null; }
    if (lib && typeof lib.requestWidgetUpdate === 'function') {
      for (const name of WIDGET_NAMES) {
        try {
          await lib.requestWidgetUpdate({ widgetName: name, renderWidget: (info) => widgetFor(name, snap, info) });
        } catch (e) { /* остальные виджеты всё равно обновим */ }
      }
    }
    return snap;
  } catch (e) {
    return null;
  }
}
