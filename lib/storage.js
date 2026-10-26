// Профиль хранится только на телефоне.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'profile.v1';

// { birth: 'YYYY-MM-DD', sex: 'm' | 'f', heightCm: number }
export async function loadProfile() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function saveProfile(p) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}
