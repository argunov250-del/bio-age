// Задача виджета: Android запускает её «безголовым» JS при добавлении, обновлении по таймеру и изменении размера.
// Читает снимок из AsyncStorage и рисует; никогда не бросает (иначе виджет остался бы пустым).
import { loadSnapshot } from './snapshot';
import { widgetFor, EmptyCard, LIGHT, DARK } from './components';

export async function widgetTaskHandler(props) {
  try {
    const action = props && props.widgetAction;
    if (!props || typeof props.renderWidget !== 'function' || action === 'WIDGET_DELETED' || action === 'WIDGET_CLICK') return;
    const info = props.widgetInfo || {};
    try {
      const snap = await loadSnapshot();
      props.renderWidget(widgetFor(info.widgetName, snap, info));
    } catch (e) {
      props.renderWidget({ light: EmptyCard({ theme: LIGHT, lang: 'ru', dims: info }), dark: EmptyCard({ theme: DARK, lang: 'ru', dims: info }) });
    }
  } catch (e) { /* виджет остаётся как был */ }
}
