// Экран запуска: значок по центру, название внизу — как системный экран запуска.
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPLASH } from '../theme';

const MARK = require('../../assets/bio-mark.png');

export function LaunchScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.wrap}>
      <Image source={MARK} style={s.mark} resizeMode="contain" />
      <Text style={[s.title, { bottom: insets.bottom + SPLASH.bottom }]}>bio</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SPLASH.bg, alignItems: 'center', justifyContent: 'center' },
  mark: { width: SPLASH.mark, height: SPLASH.mark },
  title: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: SPLASH.text, fontSize: SPLASH.title, fontWeight: '500', letterSpacing: 2 },
});
