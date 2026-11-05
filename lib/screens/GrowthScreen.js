// Вкладка «Рост»: фигура из частиц растёт вместе с привычками. Сверху — фигура текущей ступени
// (частицы собираются при открытии), под ней «N lvl · ранг», образ, полоса опыта, затем прямо на экране
// «Задания на сегодня» (lib/QuestList.js), карточка «История» (арки Хирона), описание, карусель образов
// (открытые показаны, закрытые затемнены, с замком и кольцом) и сворачиваемый «Журнал».
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, PageTitle, Section, Card, Button } from '../ui';
import { NeonBackdrop } from '../glass';
import { Silhouette } from '../Silhouette';
import { IconLock } from '../icons';
import { QuestList } from '../QuestList';
import { ArcCard } from '../ArcCard';
import { RankUp } from '../RankUp';
import { RANKS } from '../ranks';
import { shortDate } from '../time';
import { reduceMotion, useCountUp, PressScale, EASE_IOS } from '../motion';
import { success } from '../haptics';
import { SIZES } from '../theme';
import { useColors } from '../colors';
import { tr, RU } from '../i18n';

const AnimCircle = Animated.createAnimatedComponent(Circle);
const clamp01 = (v) => Math.max(0, Math.min(1, +v || 0));
const FIG = 250; // высота большой фигуры
const FIG_MINI = 108; // высота мини-фигуры целиком
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
        <Silhouette height={FIG_MINI} opacity={t.unlocked ? 0.85 : 0.22} tier={t.index != null ? t.index : 0} still mini />
        {t.unlocked ? null : (
          <View style={s.lockWrap}>
            <View style={s.lockDim} />
            <LockRing progress={t.progress} size={52} />
          </View>
        )}
      </View>
      {t.unlocked ? <Text style={s.tierName} numberOfLines={1}>{t.name}</Text> : null}
      <Text style={s.tierLvl}>{RU ? 'с ' + t.minLevel + ' уровня' : 'from level ' + t.minLevel}</Text>
      {t.unlocked || !t.progress ? null : <Text style={s.tierPct}>{Math.round(clamp01(t.progress) * 100)}%</Text>}
    </Card>
  );
}

// Строка журнала: достижения, ранги, уровни, арки Хирона (без привязки к заданиям дня).
const JOURNAL_SHORT = 3;
const JOURNAL_MAX = 15;
function journalText(e, titles) {
  const xp = e.xp ? ' · +' + e.xp + ' XP' : '';
  if (e.type === 'levelUp') return tr('Новый уровень') + ': ' + e.level;
  if (e.type === 'rankUp') return tr('Новый ранг') + ': ' + (RANKS[e.rank] ? RANKS[e.rank].name : '');
  if (e.type === 'achievement') return tr('Достижение') + ' «' + (titles[e.id] || '') + '»' + xp;
  if (e.type === 'secret') return tr('Секретное достижение') + ' «' + (titles[e.id] || '') + '»' + xp;
  if (e.type === 'arc') return ((e.text && e.text[RU ? 'ru' : 'en']) || tr('История Хирона')) + xp;
  return '';
}

function Journal({ journal, achievements, s }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const titles = useMemo(() => {
    const m = {};
    (achievements || []).forEach((a) => { m[a.id] = a.title; });
    return m;
  }, [achievements]);
  const list = useMemo(() => (journal || []).map((e, i) => ({ e, i })).filter(({ e }) => journalText(e, titles))
    .sort((x, y) => ((y.e.at || 0) - (x.e.at || 0)) || (y.i - x.i)).slice(0, JOURNAL_MAX).map((x) => x.e), [journal, titles]);
  const shown = open ? list : list.slice(0, JOURNAL_SHORT);
  return (
    <>
      <Section right={list.length > JOURNAL_SHORT ? (open ? tr('Свернуть') : tr('Показать все')) : undefined} onRight={() => setOpen(!open)}>{tr('Журнал')}</Section>
      <Card style={s.journal}>
        {shown.length ? shown.map((e, i) => (
          <View key={(e.type || '') + (e.id || e.level || e.rank || '') + ':' + (e.at || i)} style={[s.jRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
            <Text style={s.jText}>{journalText(e, titles)}</Text>
            <Text style={s.jDate}>{e.at ? shortDate(e.at) : ''}</Text>
          </View>
        )) : <Text style={s.jEmpty}>{tr('Пока пусто. Здесь появятся уровни, ранги и достижения.')}</Text>}
      </Card>
    </>
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
        <Button title={first ? tr('Далее') : tr('Начать')} onPress={onNext} />
      </Screen>
    </View>
  );
}

const SHOWN_RANK = { index: -1 }; // ранг, для которого вставка уже показана в этой сессии

export function GrowthScreen({ growth, amb, plan, activities, water, noData, arc, onArcAct, achievements }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
  // Новый ранг: вставка один раз на ранг (события приходят из расчёта роста).
  const [rankShow, setRankShow] = useState(null);
  const rankEv = g && Array.isArray(g.events) ? g.events.find((e) => e && e.type === 'rankUp' && e.rank) : null;
  const rankIdx = rankEv ? rankEv.rank.index : -1;
  useEffect(() => {
    if (step !== -1 || !rankEv || SHOWN_RANK.index >= rankIdx) return;
    SHOWN_RANK.index = rankIdx;
    success();
    setRankShow(rankEv.rank);
  }, [step, rankIdx]);
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
          <View style={s.figure}><Silhouette height={FIG} opacity={c.dark ? 0.9 : 0.8} tier={tierIdx} level={g ? level : undefined} intro /></View>
          <View style={s.lvlRow}>
            <Text style={s.lvl}>{`${Math.round(shownLevel == null ? level : shownLevel)} lvl`}</Text>
            {g && g.rank ? <Text style={s.rankTag} numberOfLines={1}>{'· ' + g.rank.name}</Text> : null}
          </View>
          {g && g.tier ? <Text style={s.tierTag}>{tr('Образ') + ': ' + g.tier.name}</Text> : null}
          <View style={s.track}>
            <Animated.View style={[s.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Text style={s.xp}>
            {!g ? tr('Считаю прогресс…') : g.maxed ? tr('Максимальный уровень') : Math.round(shownXp == null ? g.xpInLevel : shownXp) + ' / ' + (g.xpInLevel + g.xpToNext) + ' XP  ·  ' + tr('до следующего уровня')}
          </Text>
        </Card>

        <QuestList growth={g} plan={plan} activities={activities} water={water} noData={!!noData} />

        <ArcCard arc={arc} onAct={onArcAct} />

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

        <Journal journal={g && g.journal} achievements={achievements} s={s} />
      </Screen>
      {rankShow ? <RankUp rank={rankShow} tier={tierIdx} level={level} onClose={() => setRankShow(null)} /> : null}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  step: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  help: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: c.card, borderWidth: c.border, borderColor: c.line, ...c.shadow },
  helpText: { color: c.text, fontSize: SIZES.small, fontWeight: '600' },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  figure: { height: FIG + 36, paddingTop: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lvl: { color: c.onPrimary, backgroundColor: c.primary, fontSize: SIZES.text, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, overflow: 'hidden' },
  rankTag: { color: c.text, fontSize: SIZES.text, fontWeight: '700', flexShrink: 1 },
  tierTag: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.4 },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: c.cardAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },
  xp: { color: c.sub, fontSize: SIZES.small, textAlign: 'center' },
  title: { color: c.text, fontSize: SIZES.title, fontWeight: '700', marginTop: 4 },
  desc: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 20 },
  carousel: { gap: CARD_GAP, paddingRight: 4, paddingBottom: 14 },
  tier: { width: CARD_W, alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 14 },
  tierNow: { borderColor: c.accent, borderWidth: 1.5 },
  tierFig: { height: FIG_MINI + 36, width: 132, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, marginBottom: 8 },
  lockWrap: { position: 'absolute', left: 0, right: 0, top: 50, height: 60, alignItems: 'center', justifyContent: 'center' },
  lockDim: { position: 'absolute', left: 8, right: 8, top: -50, bottom: -34, borderRadius: 16, backgroundColor: c.dark ? 'rgba(14,15,17,0.55)' : 'rgba(243,244,246,0.7)' },
  tierName: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  tierLvl: { color: c.sub, fontSize: SIZES.small },
  tierPct: { color: c.text, fontSize: SIZES.tiny + 1, fontWeight: '700' },
  journal: { paddingVertical: 2, paddingHorizontal: 14 },
  jRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  jText: { flex: 1, color: c.text, fontSize: SIZES.small + 1 },
  jDate: { color: c.muted, fontSize: SIZES.tiny + 1 },
  jEmpty: { color: c.sub, fontSize: SIZES.small + 1, paddingVertical: 12 },
});
