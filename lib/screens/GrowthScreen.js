// Вкладка «Рост»: фигура из частиц растёт вместе с привычками. Сверху — фигура текущей ступени
// (частицы собираются при открытии), под ней уровень, полоса опыта, описание, кнопка «Растём»
// (панель с источниками опыта за сегодня) и карусель образов: открытые показаны, закрытые
// затемнены, с замком и кольцом, медленно заполняющимся до прогресса ступени.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, PageTitle, Section, Card, Button } from '../ui';
import { NeonBackdrop } from '../glass';
import { Silhouette } from '../Silhouette';
import { IconLock } from '../icons';
import { reduceMotion, Sheet, useCountUp, PressScale, EASE_IOS } from '../motion';
import { success } from '../haptics';
import { SIZES } from '../theme';
import { useColors } from '../colors';
import { tr, RU } from '../i18n';

const AnimCircle = Animated.createAnimatedComponent(Circle);
const clamp01 = (v) => Math.max(0, Math.min(1, +v || 0));
const FIG = 250; // высота большой фигуры
const CARD_W = 168;
const CARD_GAP = 12;
const INTRO_KEY = 'growth.intro.v1';

// Круговое кольцо вокруг замка: медленно заполняется от 0 до progress.
function LockRing({ progress, size = 64 }) {
  const col = useColors();
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
        <Circle cx={c} cy={c} r={r} stroke={col.text} strokeOpacity={0.14} strokeWidth={3} fill="none" />
        <AnimCircle cx={c} cy={c} r={r} stroke={col.accent} strokeWidth={3} fill="none" strokeLinecap="round"
          strokeDasharray={`${len} ${len}`} strokeDashoffset={off} transform={`rotate(-90 ${c} ${c})`} />
      </Svg>
      <IconLock color={col.text} size={22} sw={1.6} />
    </View>
  );
}

function TierCard({ t, current }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Card style={[s.tier, current && s.tierNow]}>
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
    </Card>
  );
}

// Панель «Растём»: опыт за сегодня по источникам.
function TodaySheet({ today, onClose }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const list = (today && today.sources) || [];
  return (
    <Sheet onClose={onClose} style={s.sheet}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{tr('Опыт за сегодня')}</Text>
          <Text style={s.sheetSum}>{(today ? today.xp : 0) + ' / ' + (today ? today.cap : 0)} XP</Text>
          {list.length ? list.map((x) => (
            <View key={x.id} style={s.src}>
              <Text style={[s.mark, x.done && { color: c.accent }]}>{x.done ? '●' : '○'}</Text>
              <Text style={[s.srcLabel, !x.done && { color: c.sub }]} numberOfLines={2}>{x.label}</Text>
              <Text style={[s.srcXp, x.done && { color: c.text }]}>+{x.xp}</Text>
            </View>
          )) : <Text style={s.srcLabel}>{tr('Пока нет данных за сегодня.')}</Text>}
          <Text style={s.sheetNote}>{tr('Опыт в день ограничен, поэтому путь до 100 уровня долгий.')}</Text>
          <Button title={tr('Закрыть')} onPress={onClose} secondary style={{ marginTop: 6 }} />
    </Sheet>
  );
}

// Первое открытие: два шага — «Что это» и «Зачем».
function Intro({ step, onNext, amb }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const first = step === 1;
  const habits = [
    tr('Цель по шагам'), tr('Сон по твоей норме'), tr('Тренировки'), tr('Записи в дневнике'), tr('Серии дней'),
  ];
  return (
    <View style={{ flex: 1 }}>
      <NeonBackdrop amb={amb} />
      <Screen tab>
        <Text style={s.step}>{step + '/2'}</Text>
        <PageTitle>{first ? tr('Что это') : tr('Зачем')}</PageTitle>
        <Card style={s.hero}>
          {first ? (
            <>
              <View style={s.figure}><Silhouette height={FIG} opacity={0.9} tier={0} intro /></View>
              <Text style={s.desc}>
                {tr('Это твоя фигура из частиц. Она растёт вместе с тобой: уровень идёт от 0 до 100, а вместе с ним меняются образы, от едва заметного контура до сияния.')}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.desc}>{tr('Фигуру растят здоровые привычки:')}</Text>
              {habits.map((h) => (
                <View key={h} style={s.src}>
                  <Text style={[s.mark, { color: c.accent }]}>●</Text>
                  <Text style={s.srcLabel}>{h}</Text>
                </View>
              ))}
              <Text style={s.desc}>
                {tr('Опыт в день ограничен, поэтому важна регулярность, а не рывок. Путь к сотому уровню долгий намеренно: это больше года привычек.')}
              </Text>
            </>
          )}
        </Card>
        <Button title={first ? tr('Далее') : tr('Растём')} onPress={onNext} />
      </Screen>
    </View>
  );
}

export function GrowthScreen({ growth, amb }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [sheet, setSheet] = useState(false);
  const [step, setStep] = useState(0); // 0 — ещё читаем флаг, 1–2 — вводные шаги, -1 — основной экран
  useEffect(() => {
    let live = true;
    (async () => {
      let seen = false;
      try { seen = !!(await AsyncStorage.getItem(INTRO_KEY)); } catch (e) { seen = false; }
      if (live) setStep(seen ? -1 : 1);
    })();
    return () => { live = false; };
  }, []);
  const next = () => {
    if (step === 1) { setStep(2); return; }
    try { Promise.resolve(AsyncStorage.setItem(INTRO_KEY, '1')).catch(() => {}); } catch (e) { /* без сохранения */ }
    setStep(-1);
  };
  const g = growth || null;
  const tierIdx = g && g.tier ? g.tier.index : 0;
  const level = g ? g.level : 0;
  const shownLevel = useCountUp('growth-level', g ? level : null);
  const shownXp = useCountUp('growth-xp', g && !g.maxed ? g.xpInLevel : null);
  const prevLevel = useRef(null);
  useEffect(() => {
    if (!g) return;
    if (prevLevel.current != null && level > prevLevel.current) success(); // новый уровень
    prevLevel.current = level;
  }, [g, level]);
  const progress = g ? clamp01(g.progress) : 0;
  const bar = useRef(new Animated.Value(reduceMotion() ? progress : 0)).current;
  useEffect(() => {
    if (reduceMotion()) { bar.setValue(progress); return undefined; }
    const a = Animated.timing(bar, { toValue: progress, duration: 700, delay: 300, easing: EASE_IOS, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [bar, progress]);
  const tiers = g && Array.isArray(g.tiers) ? g.tiers.map((t, i) => ({ ...t, index: i })) : [];
  const scroller = useRef(null);
  useEffect(() => {
    // Карусель открывается на текущей ступени.
    if (scroller.current && tierIdx > 0 && scroller.current.scrollTo) scroller.current.scrollTo({ x: tierIdx * (CARD_W + CARD_GAP), animated: false });
  }, [tierIdx, tiers.length]);
  if (step === 0) return <View style={{ flex: 1 }}><NeonBackdrop amb={amb} /></View>;
  if (step > 0) return <Intro step={step} onNext={next} amb={amb} />;
  return (
    <View style={{ flex: 1 }}>
      <NeonBackdrop amb={amb} />
      <Screen tab>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}><PageTitle>{RU ? 'Рост' : 'Growth'}</PageTitle></View>
          <PressScale onPress={() => setStep(1)} hitSlop={10} style={s.help}><Text style={s.helpText}>{tr('Что это?')}</Text></PressScale>
        </View>
        <Card style={s.hero}>
          <View style={s.figure}><Silhouette height={FIG} opacity={c.dark ? 0.9 : 0.8} tier={tierIdx} intro /></View>
          <View style={s.lvlRow}>
            <Text style={s.lvl}>{`${Math.round(shownLevel == null ? level : shownLevel)} lvl`}</Text>
            {g && g.tier ? <Text style={s.tierTag}>{g.tier.name}</Text> : null}
          </View>
          <View style={s.track}>
            <Animated.View style={[s.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Text style={s.xp}>
            {!g ? tr('Считаю прогресс…') : g.maxed ? tr('Максимальный уровень') : Math.round(shownXp == null ? g.xpInLevel : shownXp) + ' / ' + (g.xpInLevel + g.xpToNext) + ' XP  ·  ' + tr('до следующего уровня')}
          </Text>
          <View style={s.cta}>
            <Button title={tr('Растём')} onPress={() => setSheet(true)} compact />
          </View>
        </Card>

        <Text style={s.title}>{tr('Расти вместе с телом')}</Text>
        <Text style={s.desc}>
          {tr('Твоя фигура растёт, пока ты держишь здоровые привычки: цель по шагам, сон по твоей норме, тренировки, записи и серии дней. Уровень идёт от 0 до 100, и путь к сотне долгий намеренно. Опыт в день ограничен, поэтому важна регулярность, а не рывок.')}
        </Text>

        {tiers.length ? (
          <>
            <Section>{tr('Образы')}</Section>
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

const makeStyles = (c) => StyleSheet.create({
  step: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  help: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: c.card, borderWidth: c.border, borderColor: c.line, ...c.shadow },
  helpText: { color: c.text, fontSize: SIZES.small, fontWeight: '600' },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  figure: { height: FIG + 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lvl: { color: c.onPrimary, backgroundColor: c.primary, fontSize: SIZES.text, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, overflow: 'hidden' },
  tierTag: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.4 },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: c.cardAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },
  xp: { color: c.sub, fontSize: SIZES.small, textAlign: 'center' },
  cta: { alignSelf: 'stretch', alignItems: 'center', marginTop: 4 },
  title: { color: c.text, fontSize: SIZES.title, fontWeight: '700', marginTop: 4 },
  desc: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 20 },
  carousel: { gap: CARD_GAP, paddingRight: 4, paddingBottom: 14 },
  tier: { width: CARD_W, alignItems: 'center', gap: 4, paddingVertical: 12 },
  tierNow: { borderColor: c.accent, borderWidth: 1.5 },
  tierFig: { height: 124, width: 120, alignItems: 'center', justifyContent: 'center' },
  lockWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  lockDim: { ...StyleSheet.absoluteFillObject, borderRadius: 16, backgroundColor: c.dark ? 'rgba(14,15,17,0.55)' : 'rgba(243,244,246,0.7)' },
  tierName: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  tierLvl: { color: c.sub, fontSize: SIZES.small },
  tierPct: { color: c.text, fontSize: SIZES.tiny + 1, fontWeight: '700' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, gap: 8, borderWidth: c.border, borderColor: c.line },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line, marginBottom: 6 },
  sheetTitle: { color: c.text, fontSize: SIZES.title - 2, fontWeight: '700' },
  sheetSum: { color: c.text, fontSize: SIZES.text, fontWeight: '700', marginBottom: 4 },
  src: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  mark: { color: c.muted, fontSize: SIZES.text, width: 18 },
  srcLabel: { color: c.text, fontSize: SIZES.text, flex: 1 },
  srcXp: { color: c.muted, fontSize: SIZES.text, fontWeight: '700' },
  sheetNote: { color: c.sub, fontSize: SIZES.small, marginTop: 4 },
});
