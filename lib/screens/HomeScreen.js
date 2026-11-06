// Вкладка «Обзор» в светлом минималистичном стиле: шапка с таблеткой готовности, «герой»-карточка
// с индикатором возраста тела и чёрной кнопкой «Подробнее», строка показателей, раздел «Хирон»
// (офлайн-наставник), плитки 2×2 (одна — чёрная, самая важная сегодня), динамика, цикл и сон,
// достижения и тренировки. Каждая карточка открывает подробный экран.
// Данные видны сразу (последний расчёт), пока идёт обновление — мигают.
import { fit } from '../fit';
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Screen, T, Blink, Card, Section, HeroCard, StatRow, IconChip } from '../ui';
import { NeonBackdrop } from '../glass';
import { BioGauge } from '../BioGauge';
import { CoachCard } from '../CoachCard';
import { CycleCard } from '../CycleCard';
import { TrendCard } from '../TrendCard';
import { AppHeader } from '../AppHeader';
import { AchievementsCard } from '../AchievementsCard';
import { ArcCard } from '../ArcCard';
import { SeasonLayer } from '../SeasonLayer';
import { SleepPlanCard } from '../SleepPlanCard';
import { WeatherFall, Landing, SurfaceProvider, useSurfaces } from '../WeatherFall';
import { weatherIcon } from '../weather';
import { recapDay } from '../recap';
import { Spark } from '../charts';
import { KineticText, Tilt, useCountUp, reduceMotion, ease } from '../motion';
import { SIZES, MOTION } from '../theme';
import { tr, RU } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { level } from '../scores';
import { IconMoon, IconSteps, IconHeart, IconPulse, IconBolt, IconCalendar } from '../homeIcons';
import { IconActivity } from '../icons';
import { RecentWorkouts } from './WorkoutsScreen';

const WORD = { high: 'хорошо', medium: 'средне', low: 'низко' };
const SPARK_DAYS = 14;
const DAY = 86400000;

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? tr('Доброй ночи') : h < 12 ? tr('Доброе утро') : h < 18 ? tr('Добрый день') : tr('Добрый вечер');
}

const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;
const scoreColor = (c, sc) => {
  const lv = level(sc);
  return lv === 'high' ? c.good : lv === 'medium' ? c.warn : c.bad;
};

// Плитка показателя 2×2: иконка, название, оценка, крупное значение, мини-график или слово.
// highlight — чёрная плитка (самое важное сегодня).
function MetricTile({ id, index, title, icon: Ic, num, digits = 0, unit, score, sub, spark, highlight, onPress }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const shown = useCountUp('tile:' + id, num, index * MOTION.ringStagger);
  const sc = useCountUp('tileScore:' + id, score, index * MOTION.ringStagger);
  const fg = highlight ? c.onPrimary : c.text;
  const sb = highlight ? c.muted : c.sub;
  const col = score != null ? scoreColor(c, score) : c.accent;
  const hasSpark = spark && spark.filter((x) => x > 0).length > 1;
  const big = shown != null ? fmt(shown, digits) : (num == null && score != null ? fmt(sc) : '—');
  return (
    <Tilt onPress={onPress} style={[s.tile, { backgroundColor: highlight ? c.primary : c.card, borderWidth: c.border, borderColor: c.line }, c.shadow]}>
      <View style={s.tileTop}>
        <IconChip icon={<Ic color={fg} size={18} sw={1.6} />} size={40} style={highlight ? { backgroundColor: 'rgba(255,255,255,0.14)' } : undefined} />
        <Text style={[s.tileTitle, { color: fg }]} {...fit(2, 0.6)}>{title}</Text>
        {score != null && num != null && id !== 'recovery' ? <Text style={[s.badge, { color: col, borderColor: col }]}>{Math.round(sc || 0)}</Text> : null}
      </View>
      <View>
        <Text style={[s.value, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
          {big}{shown != null && unit ? <Text style={[s.unit, { color: sb }]}> {unit}</Text> : null}
        </Text>
        {hasSpark ? <Spark values={spark} color={highlight ? c.accent : col} height={28} /> : <Text style={[s.tileSub, { color: score != null ? col : sb }]} {...fit(1, 0.7)}>{sub}</Text>}
      </View>
    </Tilt>
  );
}

// Полоска готовности: заполняется с нуля при появлении и плавно едет к новому значению (EASE_IOS).
function ReadyBar({ score, color, style, fillStyle }) {
  const k = score == null ? 0 : Math.max(0, Math.min(1, score / 100));
  const w = useRef(new Animated.Value(reduceMotion() ? k : 0)).current;
  const first = useRef(true);
  useEffect(() => {
    const was = first.current;
    first.current = false;
    if (reduceMotion()) { w.setValue(k); return undefined; }
    const a = ease(w, k, was ? 800 : 500, { useNativeDriver: false, delay: was ? 160 : 0 });
    a.start();
    return () => a.stop();
  }, [k, w]);
  return (
    <View style={style}>
      <Animated.View style={[fillStyle, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }), backgroundColor: color }]} />
    </View>
  );
}

export function HomeScreen({ result, profile, loading, error, onOpen, onRefresh, achievements, amb, recap, planLast, planFromHC, weather, growth, arc, onArcAct }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sc = result && result.scores;
  const m = result && result.metrics;
  const se = result && result.series;
  const age = useCountUp('age', result ? result.bio : null);
  const [registry, register] = useSurfaces();
  const ready = useCountUp('readiness', sc && sc.readiness && sc.readiness.status === 'ok' ? sc.readiness.score : null);

  const ok = (x) => x && x.status === 'ok';
  const word = (x) => (ok(x) ? tr(WORD[level(x.score)]) : x && x.status === 'insufficient' ? tr('мало данных') : tr('нет данных'));
  const last = (arr) => (arr ? arr.slice(-SPARK_DAYS).map((x) => x.v) : null);
  const hrvSpark = se && se.hrv ? se.hrv.filter((x) => x.t >= Date.now() - SPARK_DAYS * DAY).map((x) => x.v) : null;
  const val = (x) => (live(x) ? x.value : null);
  const date = new Date().toLocaleDateString(RU ? 'ru-RU' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const sleepV = val(m && m.sleepDuration[7]), stepsV = val(m && m.steps[7]), hrvV = val(m && m.hrv[7]);
  const chip = ready != null ? { icon: IconBolt, text: Math.round(ready) + '%', onPress: () => onOpen('detail:readiness') }
    : weather ? { text: weatherIcon(weather) + ' ' + (weather.temp > 0 ? '+' : '') + weather.temp + '°' } : null;
  // Самое важное сегодня: показатель с наименьшей оценкой (если оценок нет — восстановление).
  const cands = ['recovery', 'sleep', 'activity'].filter((k) => ok(sc && sc[k]));
  const focus = cands.length ? cands.reduce((a, b) => (sc[b].score < sc[a].score ? b : a)) : 'recovery';
  const openDetail = result ? () => onOpen('detail:lifestyleAge') : undefined;

  return (
    <SurfaceProvider register={register}>
    <View style={{ flex: 1 }}>
      <NeonBackdrop amb={amb} />
      {amb && amb.season ? <SeasonLayer season={amb.season} /> : null}
      <Screen tab onRefresh={loading ? undefined : onRefresh}>
        {/* Первым ребёнком: рисуется под карточками (порядок + zIndex 0 без elevation) */}
        {amb && amb.season ? <WeatherFall fx={amb.season} registry={registry} /> : null}
        <AppHeader onLog={() => onOpen('log')} chip={chip}
          subtitle={growth && growth.rank ? growth.rank.name + ' · ' + growth.level + ' ' + tr('ур.') : null} onSubtitle={() => onOpen('growth')} />
        <View style={s.header}>
          <KineticText style={s.hello}>{greeting()}</KineticText>
          <Text style={s.date}>{date}</Text>
        </View>

        <HeroCard
          title={tr('Возраст тела')}
          subtitle={loading ? tr('Обновляю данные…') : result ? signed(result.bio - result.chrono, 1) + ' ' + tr('лет') + '  ·  ' + tr('паспортный') + ' ' + Math.round(result.chrono) : tr('нет данных')}
          cta={tr('Подробнее')}
          onPress={openDetail}
          visual={(
            <Pressable onPress={openDetail}>
              <Blink active={loading}>
                <BioGauge
                  value={result ? result.bio : null}
                  text={age != null ? fmt(age, 1) : '—'}
                  chrono={result ? result.chrono : null}
                  sub={result ? signed(result.bio - result.chrono, 1) + ' ' + tr('лет') : null}
                  busy={loading}
                  tier={growth && growth.tier ? growth.tier.index : 0}
                />
              </Blink>
            </Pressable>
          )}
        />
        <StatRow items={[
          { icon: IconMoon, label: tr('Сон'), value: sleepV != null ? fmt(sleepV, 1) + ' ' + tr('ч') : '—' },
          { icon: IconSteps, label: tr('Шаги'), value: stepsV != null ? fmt(stepsV) : '—' },
          { icon: IconPulse, label: 'HRV', value: hrvV != null ? fmt(hrvV) + ' ' + tr('мс') : '—' },
        ]} />

        {error ? <T style={{ color: c.bad }}>{error}</T> : null}

        {result ? <Landing id="trend"><TrendCard trend={result.trend} chrono={result.chrono} onPress={() => onOpen('detail:lifestyleAge')} /></Landing> : null}

        <Landing id="ready">
        <Card onPress={() => onOpen('detail:readiness')} style={s.ready}>
          <View style={s.readyRow}>
            <Text {...fit(1, 0.7)} style={s.readyTitle}>{tr('Готовность')}</Text>
            <Text {...fit(1, 0.6)} style={[s.readyWord, ready != null && { color: scoreColor(c, ready) }]}>{word(sc && sc.readiness)}</Text>
            <Text style={s.readyNum}>{fmt(ready)}</Text>
          </View>
          <ReadyBar score={sc && sc.readiness && sc.readiness.status === 'ok' ? sc.readiness.score : null} color={ready != null ? scoreColor(c, ready) : 'transparent'} style={s.bar} fillStyle={s.barFill} />
        </Card>
        </Landing>

        {profile && profile.sex === 'f' && profile.showCycle && result && result.cycle ? <CycleCard base={result.cycle} onPress={() => onOpen('cycle')} /> : null}

        <SleepPlanCard plan={profile && profile.sleepPlan} last={planLast} fromHC={planFromHC} onPress={() => onOpen('sleep')}
          noSleepData={!(m && m.sleepDuration && m.sleepDuration[30] && m.sleepDuration[30].status !== 'no_data')} />

        <Section right={tr('Подробнее')} onRight={() => onOpen('coach')}>{tr('Хирон')}</Section>
        <Landing id="coach"><CoachCard result={result} profile={profile} busy={loading} onAsk={() => onOpen('coach')} onLog={() => onOpen('log')} /></Landing>

        <ArcCard arc={arc} onAct={onArcAct} onOpen={() => onOpen('growth')} compact />

        <Section>{tr('Показатели')}</Section>
        <Landing id="grid"><Blink active={loading}>
          <View style={s.grid}>
            <MetricTile id="recovery" index={0} title={tr('Восстановление')} icon={IconHeart} num={ok(sc && sc.recovery) ? sc.recovery.score : null} score={ok(sc && sc.recovery) ? sc.recovery.score : null}
              sub={word(sc && sc.recovery)} highlight={focus === 'recovery'} onPress={() => onOpen('detail:recovery')} />
            <MetricTile id="hrv" index={1} title="HRV" icon={IconPulse} num={hrvV} unit={tr('мс')} spark={hrvSpark}
              sub={tr('нет данных')} onPress={() => onOpen('detail:hrv')} />
            <MetricTile id="sleep" index={2} title={tr('Сон')} icon={IconMoon} num={sleepV} digits={1} unit={tr('ч')} score={ok(sc && sc.sleep) ? sc.sleep.score : null}
              spark={last(se && se.sleep)} sub={word(sc && sc.sleep)} highlight={focus === 'sleep'} onPress={() => onOpen('detail:sleep')} />
            <MetricTile id="activity" index={3} title={tr('Активность')} icon={IconActivity} num={stepsV} unit={tr('шаг.')} score={ok(sc && sc.activity) ? sc.activity.score : null}
              spark={last(se && se.steps)} sub={word(sc && sc.activity)} highlight={focus === 'activity'} onPress={() => onOpen('detail:activity')} />
          </View>
        </Blink></Landing>

        {recap && recapDay() ? (
          <Card onPress={() => onOpen('recap')} style={s.recap}>
            <IconChip icon={<IconCalendar color={c.text} size={20} />} size={44} />
            <View style={{ flex: 1 }}>
              <Text {...fit(2, 0.7)} style={s.recapTitle}>{tr('Итоги недели готовы')}</Text>
              <Text {...fit(2, 0.8)} style={s.recapSub}>{tr('Шаги, сон, тренировки и возраст тела за 7 дней')}  ›</Text>
            </View>
          </Card>
        ) : null}

        {achievements && achievements.length ? <Landing id="ach"><AchievementsCard list={achievements} onPress={() => onOpen('achievements')} /></Landing> : null}

        <Section right={tr('Все тренировки')} onRight={() => onOpen('workouts')}>{tr('Тренировки')}</Section>
        <RecentWorkouts result={result} onOpen={onOpen} limit={5} />

        {/* Дождь, снег, листья падают на верхние края карточек (поверх, без касаний). */}
      </Screen>
    </View>
    </SurfaceProvider>
  );
}

const makeStyles = (c) => StyleSheet.create({
  header: { gap: 2, marginTop: SIZES.gap / 2 },
  hello: { color: c.text, fontSize: 24, fontWeight: '700' },
  date: { color: c.sub, fontSize: SIZES.small, textTransform: 'capitalize' },
  recap: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
  recapTitle: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  recapSub: { color: c.sub, fontSize: SIZES.small },
  ready: { paddingVertical: 14, gap: 10 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyTitle: { color: c.text, fontSize: SIZES.text, fontWeight: '700', flex: 1 },
  readyWord: { color: c.sub, fontSize: SIZES.small, fontWeight: '600' },
  readyNum: { color: c.text, fontSize: 24, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  bar: { height: 6, borderRadius: 3, backgroundColor: c.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.gap },
  tile: { width: '47.5%', flexGrow: 1, minHeight: 144, borderRadius: SIZES.radius, padding: 14, justifyContent: 'space-between', gap: 10 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileTitle: { flex: 1, fontSize: SIZES.body, fontWeight: '700' },
  badge: { fontSize: SIZES.tiny + 1, fontWeight: '700', borderWidth: 1, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  value: { fontSize: 28, fontWeight: '700' },
  unit: { fontSize: SIZES.small, fontWeight: '600' },
  tileSub: { fontSize: SIZES.small },
});
