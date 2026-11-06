// Регистрация задачи виджета. Вызывается из App.js при загрузке бандла (в том числе при безголовом запуске).
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './handler';

export function registerWidgets() {
  registerWidgetTaskHandler(widgetTaskHandler);
}
