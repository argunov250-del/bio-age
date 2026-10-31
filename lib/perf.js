// Облегчённый режим для слабых и старых телефонов: меньше частиц, без постоянной
// перерисовки живой формы и дрейфа подсветки. Включается сам на Android 10 и старше
// (API ≤ 29) и при системном «Убрать анимацию»; в профиле можно переключить вручную.
import { Platform } from 'react-native';

export const OLD_ANDROID = Platform.OS === 'android' && Platform.Version <= 29;
let lite = OLD_ANDROID;

export const setLite = (v) => { lite = v == null ? OLD_ANDROID : !!v; };
export const isLite = () => lite;
