// Задача виджета: Android запускает её «безголовым» JS при добавлении, обновлении по таймеру и изменении размера.
// Берёт последний снимок, при разрешении фонового доступа подмешивает живые данные Health Connect и рисует.
// Никогда не бросает (иначе виджет остался бы пустым).
import { loadSnapshot, saveSnapshot, applyLive } from './snapshot';
import { readLive } from './live';
import { flagBackgroundAsk } from './permission';
import { widgetFor, EmptyCard, LIGHT, DARK } from './components';

export async function widgetTaskHandler(props) {
  try {
    const action = props && props.widgetAction;
    if (!props || typeof props.renderWidget !== 'function' || action === 'WIDGET_DELETED' || action === 'WIDGET_CLICK') return;
    const info = props.widgetInfo || {};
    try {
      if (action === 'WIDGET_ADDED') await flagBackgroundAsk();
      const now = Date.now();
      let snap = await loadSnapshot();
      const live = await readLive(now);
      if (live) snap = (await saveSnapshot(applyLive(snap, live, now))) || snap;
      props.renderWidget(widgetFor(info.widgetName, snap, info, now));
    } catch (e) {
      props.renderWidget({ light: EmptyCard({ theme: LIGHT, lang: 'ru', dims: info }), dark: EmptyCard({ theme: DARK, lang: 'ru', dims: info }) });
    }
  } catch (e) { /* виджет остаётся как был */ }
}
