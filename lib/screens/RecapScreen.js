// Итоги недели в виде историй: полноэкранные карточки с полосками сверху, листаются
// сами каждые 5 секунд или касанием (справа — вперёд, слева — назад). Последняя —
// сводка, которой можно поделиться картинкой (без имени и личных данных профиля).
import { fit } from '../fit';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useColors } from '../colors';
import { KineticText, useCountUp, reduceMotion } from '../motion';
import { SIZES } from '../theme';
import { tr, RU } from '../i18n';
import { fmt, signed } from '../format';
import { hoursMin } from '../time';

const STORY_MS = 5000;
const dayName = (key) => new Date(key + 'T12:00:00').toLocaleDateString(RU ? 'ru-RU' : 'en-US', { weekday: 'long' });
const change = (now, prev, digits = 0) => {
  if (now == null || !prev) return null;
  const d = ((now - prev) / prev) * 100;
  return (d >= 0 ? '+' : '−') + fmt(Math.abs(d), digits) + '% ' + tr('к прошлой неделе');
};

function Big({ value, digits = 0, unit, id, s }) {
  const v = useCountUp('recap-' + id, value);
  return <Text style={s.big} numberOfLines={1} adjustsFontSizeToFit>{v == null ? '—' : fmt(v, digits)}{unit ? <Text style={s.unit}> {unit}</Text> : null}</Text>;
}

function Story({ icon, title, children, s }) {
  return (
    <View style={s.story}>
      <Text style={s.icon}>{icon}</Text>
      <KineticText style={s.title} by="word" center>{title}</KineticText>
      <View style={s.storyBody}>{children}</View>
    </View>
  );
}

export function RecapScreen({ recap, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const r = recap;
  const [i, setI] = useState(0);
  const bar = useRef(new Animated.Value(0)).current;
  const shot = useRef(null);
  const stories = [
    <Story s={s} key="steps" icon="👟" title={tr('Шаги за неделю')}>
      <Big s={s} id="steps" value={r.steps.total} />
      {change(r.steps.total, r.steps.prev) ? <Text style={s.sub}>{change(r.steps.total, r.steps.prev)}</Text> : null}
      {r.steps.best ? <Text style={s.sub}>{tr('Лучший день — ') + dayName(r.steps.best.key) + ': ' + fmt(r.steps.best.v)}</Text> : null}
    </Story>,
    <Story s={s} key="sleep" icon="🌙" title={tr('Сон в среднем')}>
      <Text style={s.big} numberOfLines={1} adjustsFontSizeToFit>{r.sleep.avg ? hoursMin(r.sleep.avg) : '—'}</Text>
      {change(r.sleep.avg, r.sleep.prev) ? <Text style={s.sub}>{change(r.sleep.avg, r.sleep.prev)}</Text> : null}
      {r.sleep.best ? <Text style={s.sub}>{tr('Лучшая ночь — ') + dayName(r.sleep.best.key) + ': ' + hoursMin(r.sleep.best.v)}</Text> : null}
    </Story>,
    <Story s={s} key="train" icon="💪" title={tr('Тренировки')}>
      <Big s={s} id="wk" value={r.workouts.count} />
      <Text style={s.sub}>{fmt(r.workouts.minutes) + ' ' + tr('мин за неделю') + (r.workouts.prev ? ' · ' + tr('было ') + r.workouts.prev : '')}</Text>
    </Story>,
    <Story s={s} key="age" icon="🧬" title={tr('Возраст тела')}>
      <Big s={s} id="age" value={r.age.now} digits={1} />
      {r.age.delta != null ? <Text style={s.sub}>{Math.abs(r.age.delta) < 0.05 ? tr('Без изменений за неделю') : signed(r.age.delta, 1) + ' ' + tr('за неделю')}</Text> : null}
      <Text style={s.sub}>{tr('Паспортный — ') + fmt(r.age.chrono, 1)}</Text>
    </Story>,
    <Story s={s} key="ach" icon="🏆" title={tr('Новые достижения')}>
      {r.fresh.length ? r.fresh.slice(0, 4).map((a) => <Text key={a.id} style={s.ach}>{a.icon}  {a.title}</Text>)
        : <Text style={s.sub}>{tr('На этой неделе новых нет — следующая твоя!')}</Text>}
    </Story>,
  ];
  const n = stories.length + 1; // + сводка

  useEffect(() => {
    if (i >= n - 1 || reduceMotion()) return undefined;
    bar.setValue(0);
    const a = Animated.timing(bar, { toValue: 1, duration: STORY_MS, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) setI((x) => Math.min(n - 1, x + 1)); });
    return () => a.stop();
  }, [i, n, bar]);

  const share = async () => {
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 0.95, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Epimely' });
    } catch (e) {}
  };

  const summary = (
    <View key="sum" style={s.story}>
      <View ref={shot} collapsable={false} style={s.card}>
        <Text {...fit(1, 0.7)} style={s.brand}>Epimely · {tr('Итоги недели')}</Text>
        {[
          ['👟', tr('Шаги'), fmt(r.steps.total)],
          ['🌙', tr('Сон в среднем'), r.sleep.avg ? hoursMin(r.sleep.avg) : '—'],
          ['💪', tr('Тренировки'), String(r.workouts.count)],
          ['🧬', tr('Возраст тела'), fmt(r.age.now, 1) + (r.age.delta != null && Math.abs(r.age.delta) >= 0.05 ? '  (' + signed(r.age.delta, 1) + ')' : '')],
          ['🏆', tr('Новые достижения'), String(r.fresh.length)],
        ].map(([ic, l, v]) => (
          <View key={l} style={s.sumRow}><Text {...fit(2, 0.8)} style={s.sumL}>{ic}  {l}</Text><Text style={s.sumV}>{v}</Text></View>
        ))}
      </View>
      <Pressable onPress={share} style={({ pressed }) => [s.share, pressed && s.pressed]}>
        <Text {...fit(1, 0.7)} style={s.shareText}>{tr('Поделиться картинкой')}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={s.wrap}>
      <SafeAreaView style={s.flex} edges={['top', 'bottom']}>
        <View style={s.bars}>
          {Array.from({ length: n }, (_, k) => (
            <View key={k} style={s.track}>
              {k < i ? <View style={[s.fill, { width: '100%' }]} /> : k === i ? <Animated.View style={[s.fill, { width: i === n - 1 ? '100%' : bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /> : null}
            </View>
          ))}
        </View>
        <Pressable onPress={onBack} hitSlop={12} style={s.close}><Text style={s.closeText}>✕</Text></Pressable>
        <View style={s.flex}>
          <View key={i} style={s.flex}>{i < n - 1 ? stories[i] : summary}</View>
          {i < n - 1 ? (
            <View style={s.taps}>
              <Pressable style={s.tapBack} onPress={() => setI(Math.max(0, i - 1))} />
              <Pressable style={s.tapNext} onPress={() => setI(Math.min(n - 1, i + 1))} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, backgroundColor: c.bg },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: SIZES.pad, paddingTop: 10 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: c.text },
  close: { alignSelf: 'flex-end', padding: SIZES.pad },
  closeText: { color: c.text, fontSize: SIZES.title },
  taps: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapBack: { flex: 1 },
  tapNext: { flex: 2 },
  story: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: SIZES.pad * 1.5 },
  storyBody: { alignItems: 'center', gap: 10 },
  icon: { fontSize: 64 },
  title: { color: c.sub, fontSize: SIZES.title, fontWeight: '700', textAlign: 'center' },
  big: { alignSelf: 'stretch', textAlign: 'center', color: c.text, fontSize: 64, fontWeight: '800', letterSpacing: -1 },
  unit: { color: c.sub, fontSize: SIZES.title },
  sub: { color: c.sub, fontSize: SIZES.text, textAlign: 'center' },
  ach: { color: c.text, fontSize: SIZES.title - 2, fontWeight: '600' },
  card: { alignSelf: 'stretch', backgroundColor: c.card, borderRadius: SIZES.radius, borderWidth: 1, borderColor: c.line, padding: 22, gap: 14 },
  brand: { color: c.accent, fontSize: SIZES.text, fontWeight: '800', marginBottom: 4 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumL: { color: c.sub, fontSize: SIZES.text },
  sumV: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  share: { height: SIZES.button, borderRadius: SIZES.button / 2, paddingHorizontal: 28, justifyContent: 'center', backgroundColor: c.primary },
  pressed: { opacity: 0.8 },
  shareText: { color: c.onPrimary, fontSize: SIZES.text, fontWeight: '800' },
});
