// Вкладка «Обзор» в стиле «стекло и неон»: в центре стеклянный 3D-индикатор возраста
// образа жизни с изумрудным кольцом и силуэтом из частиц, под ним готовность, карточка
// коуча (офлайн, своя база знаний), у женщин — цикл и стеклянные карточки восстановления, HRV, сна и активности
// с мини-графиками за 14 дней. Каждая карточка открывает подробный экран.
// Данные видны сразу (последний расчёт), пока идёт обновление — мигают.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, T, Blink } from '../ui';
import { Glass, NeonBackdrop } from '../glass';
import { BioGauge } from '../BioGauge';
import { CoachCard } from '../CoachCard';
import { CycleCard } from '../CycleCard';
import { Spark } from '../charts';
import { KineticText, useCountUp } from '../motion';
import { SIZES, NEON, MOTION } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { level } from '../scores';

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
  return lv === 'high' ? NEON.emerald : lv === 'medium' ? c.warn : c.bad;
};

// Маленькое кольцо оценки 0–100 со свечением.
function MiniRing({ score, color, size = 46 }) {
  const r = (size - 8) / 2, len = 2 * Math.PI * r, c = size / 2;
  const arc = { cx: c, cy: c, r, fill: 'none', strokeLinecap: 'round', strokeDasharray: `${(len * (score || 0)) / 100} ${len}`, transform: `rotate(-90 ${c} ${c})` };
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={5} fill="none" />
      {score ? <Circle {...arc} stroke={color} strokeOpacity={0.25} strokeWidth={9} /> : null}
      {score ? <Circle {...arc} stroke={color} strokeWidth={5} /> : null}
    </Svg>
  );
}

// Стеклянная карточка показателя: название, оценка, крупное значение, мини-график или кольцо.
function Tile({ id, index, title, num, digits = 0, unit, score, sub, spark, ring, color, onPress }) {
  const c = useColors();
  const shown = useCountUp('tile:' + id, num, index * MOTION.ringStagger);
  const sc = useCountUp('tileScore:' + id, score, index * MOTION.ringStagger);
  const col = color || NEON.emerald;
  return (
    <Glass onPress={onPress} style={st.tile}>
      <View style={st.tileHead}>
        <Text style={st.tileTitle}>{title}</Text>
        {score != null && !ring ? <Text style={[st.badge, { color: scoreColor(c, score), borderColor: scoreColor(c, score) }]}>{Math.round(sc || 0)}</Text> : null}
      </View>
      {ring ? (
        <View style={st.ringRow}>
          <View style={st.ringBox}>
            <MiniRing score={sc} color={col} />
            <Text style={st.ringNum}>{score != null ? Math.round(sc || 0) : '—'}</Text>
          </View>
          <Text style={[st.tileSub, score != null && { color: col }]}>{sub}</Text>
        </View>
      ) : (
        <>
          <Text style={st.value} numberOfLines={1} adjustsFontSizeToFit>
            {shown != null ? fmt(shown, digits) : '—'}{shown != null && unit ? <Text style={st.unit}> {unit}</Text> : null}
          </Text>
          {spark && spark.filter((x) => x > 0).length > 1 ? <Spark values={spark} color={col} /> : <Text style={st.tileSub}>{sub}</Text>}
        </>
      )}
    </Glass>
  );
}

export function HomeScreen({ result, profile, loading, error, onOpen, onRefresh }) {
  const c = useColors();
  const sc = result && result.scores;
  const m = result && result.metrics;
  const se = result && result.series;
  const age = useCountUp('age', result ? result.bio : null);
  const ready = useCountUp('readiness', sc && sc.readiness && sc.readiness.status === 'ok' ? sc.readiness.score : null);

  const ok = (x) => x && x.status === 'ok';
  const word = (x) => (ok(x) ? tr(WORD[level(x.score)]) : x && x.status === 'insufficient' ? tr('мало данных') : tr('нет данных'));
  const last = (arr) => (arr ? arr.slice(-SPARK_DAYS).map((x) => x.v) : null);
  const hrvSpark = se && se.hrv ? se.hrv.filter((x) => x.t >= Date.now() - SPARK_DAYS * DAY).map((x) => x.v) : null;
  const val = (x) => (live(x) ? x.value : null);
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={{ flex: 1 }}>
      <NeonBackdrop />
      <Screen tab onRefresh={loading ? undefined : onRefresh}>
        <View style={st.header}>
          <KineticText style={st.hello}>{greeting()}</KineticText>
          <Text style={st.date}>{date}</Text>
        </View>

        <Pressable onPress={result ? () => onOpen('detail:lifestyleAge') : undefined}>
          <Blink active={loading}>
            <BioGauge
              value={result ? result.bio : null}
              text={age != null ? fmt(age, 1) : '—'}
              chrono={result ? result.chrono : null}
              label={tr('ВОЗРАСТ')}
              sub={result ? signed(result.bio - result.chrono, 1) + ' ' + tr('лет') : null}
              busy={loading}
            />
          </Blink>
          <KineticText style={st.caption} center by="word" delay={200}>{tr('Возраст образа жизни')}</KineticText>
          <Text style={st.hint}>{loading ? tr('Обновляю данные…') : tr('по образу жизни, 6 месяцев') + '  ›'}</Text>
        </Pressable>

        {error ? <T style={{ color: c.bad }}>{error}</T> : null}

        <Glass onPress={() => onOpen('detail:readiness')} style={st.ready}>
          <View style={st.readyRow}>
            <Text style={st.readyTitle}>{tr('Готовность')}</Text>
            <Text style={[st.readyWord, ready != null && { color: scoreColor(c, ready) }]}>{word(sc && sc.readiness)}</Text>
            <Text style={st.readyNum}>{ready != null ? Math.round(ready) : '—'}</Text>
          </View>
          <View style={st.bar}>
            <View style={[st.barFill, { width: `${ready || 0}%`, backgroundColor: ready != null ? scoreColor(c, ready) : 'transparent' }]} />
          </View>
        </Glass>

        {profile && profile.sex === 'f' && result && result.cycle ? <CycleCard base={result.cycle} onPress={() => onOpen('cycle')} /> : null}

        <CoachCard result={result} profile={profile} busy={loading} onAsk={() => onOpen('coach')} onLog={() => onOpen('log')} />

        <Blink active={loading}>
          <View style={st.grid}>
            <Tile id="recovery" index={0} title={tr('Восстановление')} ring score={ok(sc && sc.recovery) ? sc.recovery.score : null}
              sub={word(sc && sc.recovery)} color={ok(sc && sc.recovery) ? scoreColor(c, sc.recovery.score) : null} onPress={() => onOpen('detail:recovery')} />
            <Tile id="hrv" index={1} title="HRV" num={val(m && m.hrv[7])} unit={tr('мс')} spark={hrvSpark} color={NEON.mint}
              sub={tr('нет данных')} onPress={() => onOpen('detail:hrv')} />
            <Tile id="sleep" index={2} title={tr('Сон')} num={val(m && m.sleepDuration[7])} digits={1} unit={tr('ч')} score={ok(sc && sc.sleep) ? sc.sleep.score : null}
              spark={last(se && se.sleep)} color={c.sleep} sub={word(sc && sc.sleep)} onPress={() => onOpen('detail:sleep')} />
            <Tile id="activity" index={3} title={tr('Активность')} num={val(m && m.steps[7])} unit={tr('шаг.')} score={ok(sc && sc.activity) ? sc.activity.score : null}
              spark={last(se && se.steps)} color={NEON.emerald} sub={word(sc && sc.activity)} onPress={() => onOpen('detail:activity')} />
          </View>
        </Blink>
      </Screen>
    </View>
  );
}

const st = StyleSheet.create({
  header: { gap: 2, marginTop: SIZES.gap },
  hello: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  date: { color: '#8FB8A6', fontSize: SIZES.small, textTransform: 'capitalize' },
  caption: { color: '#FFFFFF', textAlign: 'center', fontSize: SIZES.title - 2, fontWeight: '600' },
  hint: { color: '#8FB8A6', textAlign: 'center', fontSize: SIZES.small, marginTop: 2, marginBottom: 4 },
  ready: { paddingVertical: 14, gap: 10 },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readyTitle: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '700', flex: 1 },
  readyWord: { color: '#8FB8A6', fontSize: SIZES.small, fontWeight: '600' },
  readyNum: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.gap },
  tile: { width: '47.5%', flexGrow: 1, minHeight: 132 },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileTitle: { color: '#BFD9CC', fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.3 },
  badge: { fontSize: SIZES.tiny + 1, fontWeight: '700', borderWidth: 1, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  value: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  unit: { color: '#8FB8A6', fontSize: SIZES.small, fontWeight: '600' },
  tileSub: { color: '#8FB8A6', fontSize: SIZES.small },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ringBox: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ringNum: { position: 'absolute', color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
