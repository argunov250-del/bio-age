// Вкладка «Рост»: фигура из частиц растёт вместе с привычками. Сверху — фигура текущей ступени
// (частицы собираются при открытии), под ней уровень, полоса опыта, описание, кнопка «Растём»
// (панель с источниками опыта за сегодня) и карусель образов: открытые показаны, закрытые
// затемнены, с замком и кольцом, медленно заполняющимся до прогресса ступени.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, PageTitle } from '../ui';
import { Glass, NeonBackdrop } from '../glass';
import { Silhouette } from '../Silhouette';
import { IconLock } from '../icons';
import { reduceMotion } from '../motion';
import { NEON, SIZES } from '../theme';
import { tr, RU } from '../i18n';

const AnimCircle = Animated.createAnimatedComponent(Circle);
const clamp01 = (v) => Math.max(0, Math.min(1, +v || 0));
const FIG = 250; // высота большой фигуры
const CARD_W = 168;
const CARD_GAP = 12;

// Круговое кольцо вокруг замка: медленно заполняется от 0 до progress.
function LockRing({ progress, size = 64 }) {
  const p = clamp01(progress);
  const r = (size - 6) / 2, c = size / 2, len = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(reduceMotion() ? p : 0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const a = Animated.timing(v, { toValue: p, duration: 1800, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [v, p]);
  const off = v.interpolate({ inputRange: [0, 1], outputRange: [len, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={3} fill="none" />
        <AnimCircle cx={c} cy={c} r={r} stroke={NEON.emerald} strokeWidth={3} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`} />
      </Svg>
      <IconLock color={NEON.mint} size={24} />
    </View>
  );
}

function TierCard({ t, current }) {
  return (
    <Glass style={[s.tier, current && s.tierNow]}>
      <View style={s.tierFig}>
        <Silhouette height={120} opacity={t.unlocked ? 0.85 : 0.22} tier={t.index != null ? t.index : 0} still mini />
        {t.unlocked ? null : (
          <View style={s.lockWrap}>
            <View style={s.lockDim} />
            <LockRing progress={t.progress} />
          </View>
        )}
      </View>
      <Text style={s.tierName} numberOfLines={1}>{t.name}</Text>
      <Text style={s.tierLvl}>{RU ? 'с ' + t.minLevel + ' уровня' : 'from level ' + t.minLevel}</Text>
      {t.unlocked || !t.progress ? null : <Text style={s.tierPct}>{Math.round(clamp01(t.progress) * 100)}%</Text>}
    </Glass>
  );
}

// Панель «Растём»: опыт за сегодня по источникам.
function TodaySheet({ today, onClose }) {
  const list = (today && today.sources) || [];
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={s.sheetWrap} pointerEvents="box-none">
        <View style={s.sheet}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{tr('Опыт за сегодня')}</Text>
          <Text style={s.sheetSum}>{(today ? today.xp : 0) + ' / ' + (today ? today.cap : 0)} XP</Text>
          {list.length ? list.map((x) => (
            <View key={x.id} style={s.src}>
              <Text style={[s.mark, x.done && { color: NEON.emerald }]}>{x.done ? '●' : '○'}</Text>
              <Text style={[s.srcLabel, !x.done && { color: NEON.sub }]} numberOfLines={2}>{x.label}</Text>
              <Text style={[s.srcXp, x.done && { color: NEON.mint }]}>+{x.xp}</Text>
            </View>
          )) : <Text style={s.srcLabel}>{tr('Пока нет данных за сегодня.')}</Text>}
          <Text style={s.sheetNote}>{tr('Опыт в день ограничен, поэтому путь до 100 уровня долгий.')}</Text>
          <Pressable onPress={onClose} style={s.close}><Text style={s.closeText}>{tr('Закрыть')}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function GrowthScreen({ growth, amb }) {
  const [sheet, setSheet] = useState(false);
  const g = growth || null;
  const tierIdx = g && g.tier ? g.tier.index : 0;
  const level = g ? g.level : 0;
  const progress = g ? clamp01(g.progress) : 0;
  const bar = useRef(new Animated.Value(reduceMotion() ? progress : 0)).current;
  useEffect(() => {
    if (reduceMotion()) { bar.setValue(progress); return undefined; }
    const a = Animated.timing(bar, { toValue: progress, duration: 900, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [bar, progress]);
  const tiers = g && Array.isArray(g.tiers) ? g.tiers.map((t, i) => ({ ...t, index: i })) : [];
  const scroller = useRef(null);
  useEffect(() => {
    // Карусель открывается на текущей ступени.
    if (scroller.current && tierIdx > 0 && scroller.current.scrollTo) scroller.current.scrollTo({ x: tierIdx * (CARD_W + CARD_GAP), animated: false });
  }, [tierIdx, tiers.length]);
  return (
    <View style={{ flex: 1 }}>
      <NeonBackdrop amb={amb} />
      <Screen tab>
        <PageTitle>{RU ? 'Рост' : 'Growth'}</PageTitle>
        <Glass style={s.hero}>
          <View style={s.figure}><Silhouette height={FIG} opacity={0.9} tier={tierIdx} intro /></View>
          <View style={s.lvlRow}>
            <Text style={s.lvl}>{`${level} lvl`}</Text>
            {g && g.tier ? <Text style={s.tierTag}>{g.tier.name}</Text> : null}
          </View>
          <View style={s.track}>
            <Animated.View style={[s.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Text style={s.xp}>
            {!g ? tr('Считаю прогресс…') : g.maxed ? tr('Максимальный уровень') : g.xpInLevel + ' / ' + (g.xpInLevel + g.xpToNext) + ' XP  ·  ' + tr('до следующего уровня')}
          </Text>
        </Glass>

        <Text style={s.title}>{tr('Расти вместе с телом')}</Text>
        <Text style={s.desc}>
          {tr('Твоя фигура растёт, пока ты держишь здоровые привычки: цель по шагам, сон по твоей норме, тренировки, записи и серии дней. Уровень идёт от 0 до 100, и путь к сотне долгий намеренно. Опыт в день ограничен, поэтому важна регулярность, а не рывок.')}
        </Text>
        <Pressable onPress={() => setSheet(true)} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Text style={s.btnText}>{tr('Растём')}</Text>
        </Pressable>

        {tiers.length ? (
          <>
            <Text style={s.section}>{tr('Образы')}</Text>
            <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
              snapToInterval={CARD_W + CARD_GAP} contentContainerStyle={s.carousel}>
              {tiers.map((t) => <TierCard key={t.id || t.index} t={t} current={t.index === tierIdx} />)}
            </ScrollView>
          </>
        ) : null}
      </Screen>
      {sheet ? <TodaySheet today={g && g.today} onClose={() => setSheet(false)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  figure: { height: FIG + 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lvl: { color: NEON.ink, backgroundColor: NEON.emerald, fontSize: SIZES.text, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, overflow: 'hidden' },
  tierTag: { color: NEON.mint, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.4 },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: NEON.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: NEON.emerald },
  xp: { color: NEON.sub, fontSize: SIZES.small, textAlign: 'center' },
  title: { color: '#FFFFFF', fontSize: SIZES.title, fontWeight: '700', marginTop: 4 },
  desc: { color: NEON.soft, fontSize: SIZES.small + 1, lineHeight: 20 },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, backgroundColor: NEON.emerald, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: NEON.ink, fontSize: SIZES.text, fontWeight: '700' },
  section: { color: '#FFFFFF', fontSize: SIZES.title - 2, fontWeight: '700', marginTop: 6 },
  carousel: { gap: CARD_GAP, paddingRight: 4 },
  tier: { width: CARD_W, alignItems: 'center', gap: 4, paddingVertical: 12 },
  tierNow: { borderColor: NEON.emerald, borderWidth: 1 },
  tierFig: { height: 124, width: 120, alignItems: 'center', justifyContent: 'center' },
  lockWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  lockDim: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: 'rgba(6,20,27,0.45)' },
  tierName: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '700' },
  tierLvl: { color: NEON.sub, fontSize: SIZES.small },
  tierPct: { color: NEON.mint, fontSize: SIZES.tiny + 1, fontWeight: '700' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0D1E26', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, gap: 8, borderWidth: 1, borderColor: NEON.glassEdge },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 6 },
  sheetTitle: { color: '#FFFFFF', fontSize: SIZES.title - 2, fontWeight: '700' },
  sheetSum: { color: NEON.mint, fontSize: SIZES.text, fontWeight: '700', marginBottom: 4 },
  src: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  mark: { color: NEON.dim, fontSize: SIZES.text, width: 18 },
  srcLabel: { color: '#FFFFFF', fontSize: SIZES.text, flex: 1 },
  srcXp: { color: NEON.dim, fontSize: SIZES.text, fontWeight: '700' },
  sheetNote: { color: NEON.dim, fontSize: SIZES.small, marginTop: 4 },
  close: { height: SIZES.button, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: NEON.glassEdge, marginTop: 6 },
  closeText: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '600' },
});
