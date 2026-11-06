// Параметры плагина react-native-android-widget: 4 виджета домашнего экрана.
// Подключается в CI: ['react-native-android-widget', require('./plugins/widgetsConfig.js')].
// Размеры: ячейка ≈ 70 dp (2 ячейки >= 110 dp, 4 ячейки >= 250 dp). Обновление по таймеру — раз в 30 минут (минимум Android);
// Android не позволяет реже/чаще через updatePeriodMillis (меньше 30 минут игнорируется). Основные обновления — от приложения
// после каждого расчёта; при смене суток виджет сам не показывает вчерашние шаги, а новые данные подтянутся на ближайшем тике.
module.exports = {
  widgets: [
    {
      name: 'BodyAge',
      label: 'Epimely · Возраст тела',
      description: 'Возраст тела и разница с паспортным возрастом',
      minWidth: '110dp', minHeight: '110dp', targetCellWidth: 2, targetCellHeight: 2,
      resizeMode: 'none', updatePeriodMillis: 1800000, previewImage: './assets/widgets/bodyage.png',
    },
    {
      name: 'Readiness',
      label: 'Epimely · Готовность',
      description: 'Готовность к нагрузке сегодня',
      minWidth: '110dp', minHeight: '110dp', targetCellWidth: 2, targetCellHeight: 2,
      resizeMode: 'none', updatePeriodMillis: 1800000, previewImage: './assets/widgets/readiness.png',
    },
    {
      name: 'Steps',
      label: 'Epimely · Шаги',
      description: 'Шаги за сегодня и прогресс к цели',
      minWidth: '250dp', minHeight: '40dp', targetCellWidth: 4, targetCellHeight: 1,
      resizeMode: 'horizontal|vertical', updatePeriodMillis: 1800000, previewImage: './assets/widgets/steps.png',
    },
    {
      name: 'DaySummary',
      label: 'Epimely · Сводка дня',
      description: 'Сон, шаги, пульс и уровень роста',
      minWidth: '250dp', minHeight: '110dp', targetCellWidth: 4, targetCellHeight: 2,
      resizeMode: 'horizontal|vertical', updatePeriodMillis: 1800000, previewImage: './assets/widgets/daysummary.png',
    },
  ],
};
