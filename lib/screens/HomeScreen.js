// Вкладка «Сегодня» (стеклянный дизайн): шапка (приветствие, погода, «＋», аватар), выбор дня недели (R1),
// «герой» — светящийся силуэт с тремя подвижными подписями-подсказками (Восстановление / Нагрузка / Сон),
// индекс самочувствия (дуга), цель нагрузки, прогноз энергии, пульс за день, плитки R-R / стресс / HRV / пульс покоя,
// карточка Хирона, компактный возраст тела, цикл и ссылки «Ещё» (итоги недели, достижения, тренировки).
// Выбор прошлого дня пересчитывает perf на конец того дня (нужен dataset), иначе показывает 14-дневные ряды.
// Нет данных — честные прочерки и подсказки, без выдуманных чисел.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { GlassScreen, GlassCard, GlassView, GlassPill, GlassIconButton, GlassTile, AvatarButton, useShell } from '../glassKit';
import { ArcGauge, RangeBar, MiniBars, BigNum } from '../GlassGauges';
import { ChironGlass } from '../ChironGlass';
import { CycleCard } from '../CycleCard';
import { TargetLine } from '../PerfDials';
import { Silhouette } from '../Silhouette';
import { Appear, PressScale, useCountUp, staggerDelay } from '../motion';
import { ColorsContext, useColors } from '../colors';
import { SIZES, ACCENTS, THEMES } from '../theme';
import { tr, RU } from '../i18n';
import { fit } from '../fit';
import { fmt, signed } from '../format';
import { weatherIcon } from '../weather';
import { recapDay } from '../recap';
import { computePerf, recoveryZone, strainLevel } from '../perf/index';
import { num, zoneColor, ZONE_TEXT, reasonText, suggestionText, strainColor, sleepColor } from '../perfView';
import { IconHeart, IconPulse, IconPlus, IconWind } from '../homeIcons';
import { IconActivity } from '../icons';

const WD_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD1_RU = ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'];
const WD1_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? tr('Доброй ночи') : h < 12 ? tr('Доброе утро') : h < 18 ? tr('Добрый день') : tr('Добрый вечер');
}
const keyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parseKey = (k) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); };
const wellWord = (l) => (l === 'excellent' ? tr('Отлично') : l === 'good' ? tr('Хорошо') : l === 'fair' ? tr('Средне') : l === 'low' ? tr('Низко') : tr('Нет данных'));
const stressWord = (l) => (l === 'low' ? tr('низкий') : l === 'medium' ? tr('средний') : l === 'high' ? tr('высокий') : null);

// Упрощённый perf прошлого дня из 14-дневных рядов (когда пересчитать нельзя).
function fallbackDay(perf, key) {
  const at = (arr) => { const x = arr && arr.find((e) => e && e.key === key); return x && num(x.v) != null ? x.v : null; };
  const rec = at(perf && perf.recovery && perf.recovery.series14);
  const st = at(perf && perf.strain && perf.strain.series14);
  const w = at(perf && perf.wellness && perf.wellness.series14);
  const sl = at(perf && perf.sleep && perf.sleep.series14);
  return {
    recovery: rec == null ? null : { pct: rec, zone: recoveryZone(rec), drivers: {} },
    recoveryNull: rec == null ? { reason: 'no_sleep' } : null,
    strain: { day: st, level: strainLevel(st), workouts: [] },
    sleep: sl == null ? null : { performancePct: sl },
    strainTarget: null,
    wellness: w == null ? null : { score: w, deltaWeekPct: null, label: w >= 80 ? 'excellent' : w >= 60 ? 'good' : w >= 40 ? 'fair' : 'low' },
    forecast: null, hrRange: null, rr: null, stressPct: null,
  };
}

// Подпись-подсказка на герое (R1/R2): стеклянная таблетка, нажатие открывает экран показателя.
function Hotspot({ id, label, value, digits = 0, unit, color, onPress, style, testID }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const shown = useCountUp('hot:' + id, num(value));
  return (
    <PressScale onPress={onPress} style={[s.hot, style]} accessibilityRole="button" accessibilityLabel={label + ': ' + (shown == null ? '—' : fmt(shown, digits) + (unit || ''))} testID={testID}>
      <GlassView radius={18} intensity={34} contentStyle={s.hotIn}>
        <View style={s.hotHead}>
          <View style={[s.hotDot, { backgroundColor: color }]} />
          <Text style={s.hotLabel} {...fit(1, 0.6)}>{label}</Text>
        </View>
        <Text style={s.hotVal} {...fit(1, 0.6)}>{shown == null ? '—' : fmt(digits ? shown : Math.round(shown), digits) + (unit || '')}</Text>
      </GlassView>
    </PressScale>
  );
}

function Hero({ view, tier, level, onOpen, empty }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const W = width - SIZES.pad * 2;
  const H = 330;
  const cx = W / 2;
  const rec = view.recovery;
  const zc = zoneColor(c, rec && rec.zone);
  const LW = Math.min(128, Math.round(W * 0.36));
  const sleepV = view.sleep ? num(view.sleep.performancePct) : null;
  const strainV = view.strain ? num(view.strain.day) : null;
  // Точки на фигуре и опорные точки подписей.
  const pts = {
    sleep: { x: cx + H * 0.02, y: H * 0.1, lx: W - LW, ly: H * 0.06 + 30 },
    recovery: { x: cx - H * 0.05, y: H * 0.28, lx: LW, ly: H * 0.3 + 30 },
    strain: { x: cx + H * 0.07, y: H * 0.52, lx: W - LW, ly: H * 0.54 + 30 },
  };
  const dark = THEMES.dark;
  return (
    <View style={{ width: W, height: H }} testID="today-hero">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={zc} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={zc} stopOpacity="0.16" />
            <Stop offset="1" stopColor={zc} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={H * 0.5} r={H * 0.5} fill="url(#heroGlow)" />
        {Object.entries(pts).map(([k, p]) => (
          <React.Fragment key={k}>
            <Line x1={p.lx} y1={p.ly} x2={p.x} y2={p.y} stroke={c.onBg} strokeOpacity={0.55} strokeWidth={1} />
            <Circle cx={p.x} cy={p.y} r={7} fill={zc} fillOpacity={0.3} />
            <Circle cx={p.x} cy={p.y} r={3.2} fill="#F5F7FF" />
          </React.Fragment>
        ))}
      </Svg>
      <View style={[s.fig, { left: (W - H * 0.62) / 2, top: 0 }]} pointerEvents="none">
        <ColorsContext.Provider value={dark}>
          <Silhouette height={H} opacity={empty ? 0.45 : 0.95} tier={tier} level={level} />
        </ColorsContext.Provider>
      </View>
      <Hotspot id="sleep" label={tr('Сон')} value={sleepV} unit=" %" color={sleepColor(c)} onPress={() => onOpen('perf:sleep')} testID="hotspot-sleep"
        style={{ right: 0, top: H * 0.06, width: LW }} />
      <Hotspot id="recovery" label={tr('Восстановление')} value={rec ? rec.pct : null} unit=" %" color={zc} onPress={() => onOpen('perf:recovery')} testID="hotspot-recovery"
        style={{ left: 0, top: H * 0.3, width: LW }} />
      <Hotspot id="strain" label={tr('Нагрузка')} value={strainV} digits={1} color={strainColor(c)} onPress={() => onOpen('perf:strain')} testID="hotspot-strain"
        style={{ right: 0, top: H * 0.54, width: LW }} />
    </View>
  );
}

// День недели: стеклянный кружок; выбранный светится цветом восстановления.
function DayBubble({ d, selected, zone, onPress, today }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const glow = selected ? { shadowColor: ACCENTS.recovery, shadowOpacity: 0.85, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 } : null;
  const name = (RU ? WD_RU : WD_EN)[d.getDay()];
  return (
    <PressScale onPress={onPress} style={s.dayWrap} accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={name + ' ' + d.getDate() + (today ? ', ' + tr('Сегодня') : '')} testID={'day-' + keyOf(d)}>
      <GlassView radius={22} strong={selected} intensity={30} sheen={false} style={glow} contentStyle={s.dayIn}>
        <Text style={[s.dayName, { color: selected ? c.text : c.sub }]} {...fit(1, 0.6)}>{name}</Text>
        <Text style={[s.dayNum, { color: c.text }]} {...fit(1, 0.7)}>{d.getDate()}</Text>
        <View style={[s.dayDot, { backgroundColor: zone ? zoneColor(c, zone) : 'transparent' }]} />
      </GlassView>
    </PressScale>
  );
}

// Появление блока по очереди (каскад).
function Sec({ i, children }) {
  return <Appear delay={staggerDelay(i, 40, 2)}>{children}</Appear>;
}

function CountTile({ id, icon, label, value, unit, color, onPress, testID }) {
  const shown = useCountUp('tile:' + id, num(value));
  return <GlassTile icon={icon} label={label} value={shown == null ? null : Math.round(shown)} unit={shown == null ? null : unit} color={color} onPress={onPress} testID={testID} />;
}

function LinkRow({ label, hint, onPress, first, testID }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <PressScale onPress={onPress} style={[s.link, !first && { borderTopWidth: 1, borderTopColor: c.glass.chip }]} accessibilityRole="button" testID={testID}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.linkName} {...fit(1, 0.75)}>{label}</Text>
        {hint ? <Text style={s.linkHint} {...fit(2, 0.8)}>{hint}</Text> : null}
      </View>
      <Text style={s.chev}>›</Text>
    </PressScale>
  );
}

export function HomeScreen({ result, profile, perf, dataset, loading, error, onOpen, onRefresh, achievements, recap, weather, growth }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const shell = useShell();
  const [sel, setSel] = useState(0); // 0 — сегодня, 1…6 — дней назад
  const todayKey = perf && perf.meta && perf.meta.todayKey ? perf.meta.todayKey : keyOf(new Date());
  const base = parseKey(todayKey);
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i); out.push({ i, d, key: keyOf(d) }); }
    return out;
  }, [todayKey]);
  const recSer = perf && perf.recovery && perf.recovery.series14;
  const zoneOfDay = (key) => { const x = recSer && recSer.find((e) => e && e.key === key); return x && num(x.v) != null ? recoveryZone(x.v) : null; };
  const isToday = sel === 0;
  const selKey = days[6 - sel].key;
  const view = useMemo(() => {
    if (isToday) return perf || {};
    if (!perf) return {};
    if (dataset && result) {
      try {
        const d = parseKey(selKey);
        const p = computePerf(dataset, result, profile, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0).getTime());
        if (p) return p;
      } catch (e) { /* ниже — запасной вариант из рядов */ }
    }
    return fallbackDay(perf, selKey);
  }, [isToday, perf, dataset, result, profile, selKey]);

  const rec = view.recovery || null;
  const w = view.wellness || null;
  const fc = isToday ? view.forecast || null : null;
  const hr = isToday ? view.hrRange || null : null;
  const rr = isToday ? view.rr || null : null;
  const sp = isToday ? view.stressPct || null : null;
  const hrvV = rec && rec.drivers && rec.drivers.hrv ? num(rec.drivers.hrv.v) : null;
  const rhrV = rec && rec.drivers && rec.drivers.rhr ? num(rec.drivers.rhr.v) : null;
  const empty = !rec && !(view.strain && num(view.strain.day) != null) && !(view.sleep && num(view.sleep.performancePct) != null);
  const tier = growth && growth.tier && growth.tier.index ? growth.tier.index : 0;
  const level = growth && num(growth.level) != null ? growth.level : undefined;
  const loc = RU ? 'ru-RU' : 'en-US';
  const date = parseKey(selKey).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const tip = rec ? suggestionText(view) || ZONE_TEXT[rec.zone]() : reasonText(view);
  const onProfile = shell.onProfile || (() => onOpen('profile'));
  const initial = (profile && profile.name) || shell.initial || null;

  // Прогноз: столбики — восстановление за 6 прошлых дней и прогноз на завтра.
  const fcBars = useMemo(() => {
    if (!fc || !recSer) return null;
    const past = recSer.slice(-6).map((x) => (num(x.v) != null ? x.v : null));
    const lab = recSer.slice(-6).map((x) => (RU ? WD1_RU : WD1_EN)[parseKey(x.key).getDay()]);
    const tm = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    return { values: [...past, fc.pct], labels: [...lab, (RU ? WD1_RU : WD1_EN)[tm.getDay()]] };
  }, [fc, recSer]);
  const scen = useMemo(() => {
    if (!fc || !fc.scenarios) return [];
    const seen = new Set();
    return fc.scenarios.filter((x) => x && num(x.pct) != null && x.bed && !seen.has(x.bed) && seen.add(x.bed)).slice(0, 3);
  }, [fc]);

  const strainDay = view.strain ? num(view.strain.day) : null;
  const tgt = view.strainTarget && num(view.strainTarget.low) != null && num(view.strainTarget.high) != null ? view.strainTarget : null;

  const weatherPill = weather ? <GlassPill label={weatherIcon(weather) + ' ' + (weather.temp > 0 ? '+' : '') + weather.temp + '°'} testID="weather-pill" /> : null;
  const right = (
    <View style={s.headRight}>
      {weatherPill}
      <GlassIconButton onPress={() => onOpen('log')} accessibilityLabel={tr('Записать')} testID="quick-log" size={40}><IconPlus color={c.text} size={18} sw={1.8} /></GlassIconButton>
      <AvatarButton onPress={onProfile} initial={initial} />
    </View>
  );
  const hasAge = !!result && num(result.bio) != null && num(result.chrono) != null;
  const age = hasAge ? result.bio : null;

  return (
    <GlassScreen tab title={greeting()} right={right} onRefresh={loading ? undefined : onRefresh} contentStyle={s.content} testID="today-screen">
      <Text style={s.date} {...fit(1, 0.7)}>{loading ? tr('Обновляю данные…') : date}</Text>

      <Sec i={1}>
        <View style={s.week} testID="week-selector">
          {days.map((x) => (
            <DayBubble key={x.key} d={x.d} today={x.i === 0} selected={x.i === sel} zone={zoneOfDay(x.key)} onPress={() => setSel(x.i)} />
          ))}
        </View>
      </Sec>
      {!isToday ? (
        <GlassPill label={tr('К сегодняшнему дню')} onPress={() => setSel(0)} style={{ alignSelf: 'center' }} testID="back-today" />
      ) : null}

      <Sec i={2}>
        <Hero view={view} tier={tier} level={level} onOpen={onOpen} empty={empty} />
        <Text style={s.heroText} {...fit(3, 0.8)}>{tip}</Text>
      </Sec>

      {error ? <GlassCard><Text style={{ color: c.bad, fontSize: SIZES.body }}>{error}</Text></GlassCard> : null}

      <Sec i={3}>
        <GlassCard onPress={() => onOpen('tab:trends')} testID="wellness-card" accessibilityLabel={tr('Индекс самочувствия')}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle} {...fit(1, 0.7)}>{tr('Индекс самочувствия')}</Text>
            <Text style={s.chev}>›</Text>
          </View>
          <View style={s.center}>
            <ArcGauge id="wellness" value={w ? w.score : null} size={250} from={ACCENTS.strain} to={ACCENTS.recovery}
              accessibilityLabel={tr('Индекс самочувствия') + ': ' + (w ? w.score : '—')}>
              <BigNum id="wellness" value={w ? w.score : null} size={54} />
              <Text style={s.sub} {...fit(1, 0.7)}>{w ? tr('из 100') : tr('нет данных')}</Text>
              {w ? <Text style={[s.wellWord]} {...fit(1, 0.7)}>{wellWord(w.label)}</Text> : null}
            </ArcGauge>
          </View>
          {w && num(w.deltaWeekPct) != null ? (
            <View style={[s.pill, { backgroundColor: (w.deltaWeekPct >= 0 ? c.good : c.bad) + '2E' }]}>
              <Text style={[s.pillText, { color: w.deltaWeekPct >= 0 ? c.good : c.bad }]} {...fit(1, 0.7)}>{signed(w.deltaWeekPct, 0) + ' % ' + tr('к прошлой неделе')}</Text>
            </View>
          ) : null}
          {!w ? <Text style={s.note} {...fit(3, 0.85)}>{tr('Индекс появится, когда накопятся данные о сне и пульсе.')}</Text> : null}
        </GlassCard>
      </Sec>

      <Sec i={4}>
        <GlassCard onPress={() => onOpen('perf:strain')} testID="target-card" accessibilityLabel={tr('Цель нагрузки')}>
          <TargetLine perf={view} />
          {tgt && strainDay != null ? (
            <View style={s.track}>
              <View style={[s.band, { left: (tgt.low / 21 * 100) + '%', width: ((tgt.high - tgt.low) / 21 * 100) + '%', backgroundColor: ACCENTS.strain + '55' }]} />
              <View style={[s.fill, { width: Math.min(100, strainDay / 21 * 100) + '%', backgroundColor: ACCENTS.strain }]} />
            </View>
          ) : null}
        </GlassCard>
      </Sec>

      {isToday ? (
        <Sec i={5}>
          <GlassCard testID="forecast-card" onPress={() => onOpen('perf:sleep')} accessibilityLabel={tr('Прогноз энергии')}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle} {...fit(1, 0.7)}>{tr('Прогноз энергии')}</Text>
              <Text style={s.hint} {...fit(1, 0.7)}>{tr('на завтра')}</Text>
            </View>
            {fc ? (
              <View>
                <View style={s.fcRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <BigNum id="forecast" value={fc.pct} unit="%" size={46} color={ACCENTS.energy} />
                    <Text style={s.sub} {...fit(2, 0.8)}>{tr('диапазон') + ' ' + fc.range[0] + '–' + fc.range[1] + ' %'}</Text>
                  </View>
                  <View style={{ flex: 1.2 }}>
                    {fcBars ? <MiniBars values={fcBars.values} labels={fcBars.labels} color={ACCENTS.energy} /> : null}
                  </View>
                </View>
                {scen.length ? (
                  <View style={s.scen}>
                    {scen.map((x) => (
                      <View key={x.id} style={s.scenRow}>
                        <Text style={s.scenText} {...fit(1, 0.7)}>{tr('Ляжешь в ') + x.bed + ' →'}</Text>
                        <Text style={[s.scenVal, { color: c.accentText }]} {...fit(1, 0.7)}>{x.pct + ' %'}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={s.note} {...fit(3, 0.85)}>{tr('Прогноз появится после оценки восстановления.')}</Text>
            )}
          </GlassCard>
        </Sec>
      ) : null}

      {isToday ? (
        <Sec i={6}>
          <GlassCard testID="hr-card" onPress={() => onOpen('detail:heartRate')} accessibilityLabel={tr('Пульс за день')}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle} {...fit(1, 0.7)}>{tr('Пульс за день')}</Text>
              {hr && hr.approx ? <Text style={s.hint} {...fit(1, 0.7)}>{tr('приблизительно')}</Text> : null}
            </View>
            {hr ? (
              <View style={{ gap: 10 }}>
                {hr.avg != null
                  ? <BigNum id="hravg" value={hr.avg} unit={tr('уд/мин')} size={44} />
                  : <Text style={s.sub} {...fit(2, 0.8)}>{tr('Поминутного пульса нет: показываю покой и пик тренировок.')}</Text>}
                <RangeBar low={hr.lowest} avg={hr.avg} peak={hr.peak} />
                <View style={s.rangeLab}>
                  <Text style={s.sub} {...fit(1, 0.7)}>{tr('Минимум') + ' ' + (hr.lowest != null ? hr.lowest : '—')}</Text>
                  <Text style={s.sub} {...fit(1, 0.7)}>{tr('Пик') + ' ' + (hr.peak != null ? hr.peak : '—')}</Text>
                </View>
              </View>
            ) : <Text style={s.note} {...fit(3, 0.85)}>{tr('Пока нет данных о пульсе за сегодня.')}</Text>}
          </GlassCard>
        </Sec>
      ) : null}

      <Sec i={7}>
        <View style={s.tiles} testID="tiles">
          <View style={s.tileRow}>
            <CountTile id="rr" icon={IconActivity} label={tr('R-R интервал')} value={rr ? rr.ms : null} unit={tr('мс')} color={ACCENTS.strain} onPress={() => onOpen('detail:heartRate')} testID="tile-rr" />
            <CountTile id="stress" icon={IconWind} label={tr('Стресс')} value={sp ? sp.pct : null} unit="%" color={ACCENTS.energy} onPress={() => onOpen('perf:recovery')} testID="tile-stress" />
          </View>
          <View style={s.tileRow}>
            <CountTile id="hrv" icon={IconPulse} label="HRV" value={hrvV} unit={tr('мс')} color={ACCENTS.sleep} onPress={() => onOpen('detail:hrv')} testID="tile-hrv" />
            <CountTile id="rhr" icon={IconHeart} label={tr('Пульс покоя')} value={rhrV} unit={tr('уд/мин')} color={c.heart} onPress={() => onOpen('detail:heartRate')} testID="tile-rhr" />
          </View>
          {sp && stressWord(sp.level) ? <Text style={s.tileNote} {...fit(1, 0.7)}>{tr('Стресс') + ': ' + stressWord(sp.level)}</Text> : null}
        </View>
      </Sec>

      <Sec i={8}><ChironGlass tip={tip} topic="recovery" onOpen={onOpen} /></Sec>

      <Sec i={9}>
        <GlassCard onPress={hasAge ? () => onOpen('detail:lifestyleAge') : undefined} testID="bodyage-card" accessibilityLabel={tr('Возраст тела')}>
          <View style={s.baRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.cardTitle} {...fit(1, 0.7)}>{tr('Возраст тела')}</Text>
              <Text style={s.sub} {...fit(2, 0.8)}>
                {hasAge ? signed(result.bio - result.chrono, 1) + ' ' + tr('лет') + ' · ' + tr('паспортный') + ' ' + Math.round(result.chrono) : tr('нет данных')}
              </Text>
            </View>
            <BigNum id="bioage" value={age} digits={1} size={40} />
            <Text style={s.chev}>›</Text>
          </View>
        </GlassCard>
      </Sec>

      {profile && profile.sex === 'f' && profile.showCycle && result && result.cycle ? <Sec i={10}><CycleCard base={result.cycle} onPress={() => onOpen('cycle')} /></Sec> : null}

      <Sec i={11}>
        <GlassCard padding={4} testID="more-links">
          <Text style={[s.cardTitle, { padding: 12, paddingBottom: 4 }]} {...fit(1, 0.7)}>{tr('Ещё')}</Text>
          {recap && recapDay() ? <LinkRow first label={tr('Итоги недели')} hint={tr('Шаги, сон, тренировки и возраст тела за 7 дней')} onPress={() => onOpen('recap')} testID="link-recap" /> : null}
          <LinkRow first={!(recap && recapDay())} label={tr('Достижения')} hint={achievements && achievements.length ? String(achievements.length) : null} onPress={() => onOpen('achievements')} testID="link-achievements" />
          <LinkRow label={tr('Тренировки')} hint={tr('Все тренировки')} onPress={() => onOpen('workouts')} testID="link-workouts" />
          <LinkRow label={tr('Добавить тренировку')} onPress={() => onOpen('log:workout')} testID="link-addworkout" />
          <LinkRow label={tr('Режим сна')} onPress={() => onOpen('sleep')} testID="link-sleepplan" />
        </GlassCard>
      </Sec>
    </GlassScreen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: SIZES.pad, gap: SIZES.gap },
  date: { color: c.onBgSub, fontSize: SIZES.small, textTransform: 'capitalize', marginTop: -4 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  week: { flexDirection: 'row', gap: 6 },
  dayWrap: { flex: 1, minWidth: 0 },
  dayIn: { paddingVertical: 8, alignItems: 'center', gap: 2 },
  dayName: { fontSize: SIZES.tiny + 1, fontWeight: '700', alignSelf: 'stretch', textAlign: 'center' },
  dayNum: { fontSize: SIZES.text + 1, fontWeight: '800', alignSelf: 'stretch', textAlign: 'center' },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  fig: { position: 'absolute' },
  hot: { position: 'absolute' },
  hotIn: { paddingVertical: 8, paddingHorizontal: 12, gap: 2 },
  hotHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotDot: { width: 8, height: 8, borderRadius: 4 },
  hotLabel: { flex: 1, color: c.sub, fontSize: SIZES.tiny + 1, fontWeight: '700' },
  hotVal: { color: c.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  heroText: { color: c.onBg, fontSize: SIZES.body, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  chev: { color: c.sub, fontSize: SIZES.title },
  hint: { color: c.sub, fontSize: SIZES.small, fontWeight: '600', maxWidth: '45%' },
  center: { alignItems: 'center' },
  sub: { color: c.sub, fontSize: SIZES.small, textAlign: 'center' },
  wellWord: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  pill: { alignSelf: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4, maxWidth: '100%' },
  pillText: { fontSize: SIZES.small, fontWeight: '700' },
  note: { color: c.sub, fontSize: SIZES.body },
  track: { height: 10, borderRadius: 5, backgroundColor: c.glass.chip, overflow: 'hidden', marginTop: 10 },
  band: { position: 'absolute', top: 0, bottom: 0 },
  fill: { height: 10, borderRadius: 5 },
  fcRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  scen: { marginTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: c.glass.chip, paddingTop: 10 },
  scenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  scenText: { flex: 1, color: c.text, fontSize: SIZES.body, fontWeight: '600' },
  scenVal: { fontSize: SIZES.text, fontWeight: '800' },
  rangeLab: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tiles: { gap: SIZES.gap },
  tileRow: { flexDirection: 'row', gap: SIZES.gap },
  tileNote: { color: c.onBgSub, fontSize: SIZES.tiny + 1, textAlign: 'center' },
  baRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  linkName: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
  linkHint: { color: c.sub, fontSize: SIZES.small },
});
