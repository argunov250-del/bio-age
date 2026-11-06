// Фоновое чтение Health Connect нужно запросить из Activity, а виджет работает без неё. Поэтому при добавлении виджета
// ставим флаг, а приложение при следующем открытии один раз показывает системный запрос. Никогда не бросает.
import AsyncStorage from '@react-native-async-storage/async-storage';

const FLAG = 'widget.askBg.v1';

export async function flagBackgroundAsk() {
  try { await AsyncStorage.setItem(FLAG, '1'); } catch (e) {}
}

export async function askBackgroundIfFlagged() {
  try {
    if ((await AsyncStorage.getItem(FLAG)) !== '1') return false;
    await AsyncStorage.removeItem(FLAG); // спрашиваем один раз
    const H = require('../health');
    if ((await H.sdkStatus()) !== 'ok') return false;
    await H.init();
    if ((await H.grantedTypes()).has(H.BACKGROUND)) return true;
    return await H.askBackground();
  } catch (e) {
    return false;
  }
}
