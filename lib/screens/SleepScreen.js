// Сон (стеклянный дизайн): шкала с рисками для производительности сна, часы против потребности (база + нагрузка + долг),
// долг, эффективность, регулярность, стадии, «Сегодня лечь в…» для целей 100 / 85 / 70 %, режим сна, 14 ночей и Хирон.
// Работает и вкладкой (tab), и экраном поверх (onBack). Независимая оценка, не медицинский показатель.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassScreen, GlassCard, GlassIconButton } from '../glassKit';
import { TickGauge, BigNum } from '../GlassGauges';
import { ChironGlass } from '../ChironGlass';
import { Appear, staggerDelay } from '../motion';
import { StackBar, DayBars } from '../PerfCharts';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt } from '../format';
import { hoursMin } from '../time';
import { debtAddH } from '../perf/index';
import { num, sleepColor, sleepWord, stageColors, reasonText } from '../perfView';

const hm = (h) => (num(h) == null ? '—' : hoursMin(h));
const pc = (x) => (num(x) == null ? '—' : fmt(x, 0) + '%');

function Line({ label, value, hint, first, bold }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.line, !first && s.lineTop]}>
      <View style={s.main}>
        <Text style={s.name} {...fit(1, 0.7)}>{label}</Text>
        {hint ? <Text style={s.sub} {...fit(2, 0.8)}>{hint}</Text> : null}
      </View>
      <Text style={[s.val, bold && { color: c.accent }]} {...fit(1, 0.6)}>{value}</Text>
    </View>
  );
}

// Каскадное появление карточек.
const Rise = ({ i = 0, children }) => <Appear delay={staggerDelay(i, 40, 2)}>{children}</Appear>;

function Head({ title, right }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.head}>
      <Text style={s.title} {...fit(1, 0.7)}>{title}</Text>
      {right ? <Text style={s.hint} {...fit(1, 0.7)}>{right}</Text> : null}
    </View>
  );
}

export function SleepScreen({ perf, profile, onBack, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sl = perf && perf.sleep;
  const col = sleepColor(c);
  const perfPct = sl ? num(sl.performancePct) : null;
  const need = sl ? num(sl.needH) : null;
  const actual = sl ? num(sl.actualH) : null;
  const base = perf && perf.meta ? num(perf.meta.baseNeedH) : null;
  const debt = sl ? num(sl.debtH) : null;
  const debtAdd = debt != null ? debtAddH(debt) : null;
  const strainAdd = need != null && base != null ? Math.max(0, Math.round((need - base - (debtAdd || 0)) * 100) / 100) : null;
  const st = sl && sl.stages;
  const sc = stageColors(c);
  const tonight = sl && sl.tonight;
  const bed = tonight && tonight.recommendedBed;
  const plan = profile && profile.sleepPlan && profile.sleepPlan.on ? profile.sleepPlan : null;
  const series = sl && Array.isArray(sl.series14) ? sl.series14 : [];
  const hasSeries = series.some((x) => num(x && x.v) != null);
  const STAGES = [['deep', tr('Глубокий')], ['rem', tr('REM')], ['light', tr('Лёгкий')], ['awake', tr('Бодрствование')]];
  const frac = actual != null && need ? Math.min(1, actual / need) : 0;
  const tip = perfPct == null ? reasonText({ recoveryNull: { reason: 'no_sleep' } })
    : debt != null && debt >= 1 && bed && bed[85] ? tr('Долг сна ') + hm(debt) + tr('. Постарайся лечь в ') + bed[85].hhmm + '.'
      : bed && bed[85] ? tr('Со сном всё неплохо. Чтобы так и осталось, ложись около ') + bed[85].hhmm + '.'
        : tr('Со сном всё неплохо: держи привычное время отбоя.');
  let i = 0;

  const header = onBack ? (
    <View style={s.top}>
      <GlassIconButton onPress={onBack} accessibilityLabel={tr('Назад')} testID="sleep-back"><Text style={{ color: c.text, fontSize: 24, marginTop: -2 }}>‹</Text></GlassIconButton>
      <Text style={[s.pageTitle, { color: c.onBg }]} {...fit(1, 0.7)}>{tr('Сон')}</Text>
    </View>
  ) : null;

  return (
    <GlassScreen tab={!onBack} title={tr('Сон')} header={header} contentStyle={s.content} testID="sleep-screen">
      <Rise i={i++}>
        <GlassCard testID="sleep-hero">
          <View style={s.center}>
            <TickGauge id="sleep" value={perfPct} size={220} color={col} accessibilityLabel={tr('Сон') + ': ' + (perfPct == null ? '—' : perfPct + '%')}>
              <BigNum id="sleepperf" value={perfPct} unit="%" size={50} />
              <Text style={[s.status, { color: col }]} {...fit(1, 0.7)}>{sleepWord(perfPct)}</Text>
            </TickGauge>
            {perfPct != null ? (
              <Text style={s.lead} {...fit(2, 0.85)}>{hm(actual) + ' ' + tr('из') + ' ' + hm(need) + ' ' + tr('нужных')}</Text>
            ) : (
              <Text style={s.lead} {...fit(4, 0.85)}>{tr('Нет сна за последние сутки: надень часы на ночь или запиши сон вручную.')}</Text>
            )}
          </View>
        </GlassCard>
      </Rise>

      {sl && need != null ? (
        <Rise i={i++}>
          <GlassCard testID="sleep-need">
            <Head title={tr('Сколько нужно сна')} right={actual != null ? hm(actual) + ' / ' + hm(need) : null} />
            <View style={s.track}><View style={[s.fill, { width: frac * 100 + '%', backgroundColor: col }]} /></View>
            <Line first label={tr('Базовая потребность')} value={hm(base)} />
            <Line label={tr('Добавка за нагрузку')} value={'+ ' + hm(strainAdd)} hint={tr('Чем тяжелее предыдущий день, тем больше нужно сна.')} />
            <Line label={tr('Добавка за долг сна')} value={'+ ' + hm(debtAdd)} />
            <Line label={tr('Итого на ночь')} value={hm(need)} bold />
          </GlassCard>
        </Rise>
      ) : null}

      <Rise i={i++}>
        <GlassCard testID="sleep-quality">
          <Head title={tr('Качество')} />
          <Line first label={tr('Долг сна')} value={hm(debt)} hint={tr('Недосып за 7 ночей, свежие ночи весят больше.')} />
          <Line label={tr('Эффективность')} value={pc(sl && sl.efficiencyPct)} hint={tr('Доля времени сна от времени в постели.')} />
          <Line label={tr('Регулярность')} value={pc(sl && sl.consistencyPct)}
            hint={sl && num(sl.consistencyPct) == null ? tr('Нужно ещё несколько ночей: минимум 3 за последние 4 дня.') : tr('Насколько стабильно время отбоя и подъёма.')} />
          <Line label={tr('Восстанавливающий сон')} value={hm(sl && sl.restorativeH)} hint={tr('Глубокий сон и REM вместе.')} />
        </GlassCard>
      </Rise>

      <Rise i={i++}>
        <GlassCard testID="sleep-stages">
          <Head title={tr('Стадии сна')} />
          {st ? (
            <View style={{ gap: 10 }}>
              <StackBar parts={STAGES.map(([k]) => ({ v: st[k], color: sc[k] }))} />
              {STAGES.map(([k, name]) => (
                <View key={k} style={s.stage}>
                  <View style={[s.dot, { backgroundColor: sc[k] }]} />
                  <Text style={s.name} {...fit(1, 0.7)}>{name}</Text>
                  <Text style={s.val} {...fit(1, 0.6)}>{num(st[k]) != null ? st[k] + ' ' + tr('мин') + ' · ' + (num(st.pct && st.pct[k]) != null ? fmt(st.pct[k], 0) + '%' : '—') : '—'}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Часы не передали стадии сна.')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={i++}>
        <GlassCard testID="sleep-bed">
          <Head title={tr('Сегодня лечь в…')} />
          {bed ? (
            <View style={{ gap: 10 }}>
              <View style={s.beds}>
                {[100, 85, 70].map((t) => (
                  <View key={t} style={[s.bedBox, { backgroundColor: c.glass.chip }]} accessible accessibilityLabel={tr('Цель ') + t + '%: ' + (bed[t] ? bed[t].hhmm : '—')}>
                    <Text style={s.bedPct} {...fit(1, 0.7)}>{t + '%'}</Text>
                    <Text style={s.bedTime} {...fit(1, 0.6)}>{bed[t] ? bed[t].hhmm : '—'}</Text>
                    <Text style={s.bedSub} {...fit(1, 0.6)}>{bed[t] && num(bed[t].asleepH) != null ? hm(bed[t].asleepH) : ''}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.sub} {...fit(3, 0.85)}>{tr('Подъём в ') + tonight.wakeHHMM + (tonight.wakeSource === 'plan' ? tr(' по твоему режиму сна.') : tr(' — как обычно у тебя.'))}</Text>
            </View>
          ) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Задай время подъёма в режиме сна или накопи хотя бы 3 ночи: тогда посчитаю, когда лечь.')}</Text>}
        </GlassCard>
      </Rise>

      {onOpen ? (
        <Rise i={i++}>
          <GlassCard onPress={() => onOpen('sleep')} testID="sleep-schedule" accessibilityLabel={tr('Режим сна')}>
            <View style={s.planRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.title} {...fit(1, 0.7)}>{tr('Режим сна')}</Text>
                <Text style={s.sub} {...fit(2, 0.8)}>{plan ? plan.bed + '–' + plan.wake : tr('Укажи, во сколько ложишься и встаёшь, — сон будет записываться сам.')}</Text>
              </View>
              <Text style={s.chev}>›</Text>
            </View>
          </GlassCard>
        </Rise>
      ) : null}

      <Rise i={i++}>
        <GlassCard testID="sleep-history">
          <Head title={tr('Сон за 14 дней')} right={tr('производительность, %')} />
          {hasSeries ? <DayBars data={series} max={100} colorOf={() => col} height={120} /> : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Пока нет ночей для графика.')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={i++}><ChironGlass tip={tip} topic="sleep" onOpen={onOpen} testID="sleep-chiron" /></Rise>

      <Text style={s.note} {...fit(3, 0.85)}>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Text>
    </GlassScreen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  content: { paddingHorizontal: SIZES.pad, gap: SIZES.gap },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.pad, paddingVertical: 8 },
  pageTitle: { flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  center: { alignItems: 'center', gap: 10 },
  status: { fontSize: SIZES.text, fontWeight: '700' },
  lead: { color: c.sub, fontSize: SIZES.body, textAlign: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  hint: { color: c.sub, fontSize: SIZES.small, fontWeight: '600', maxWidth: '55%' },
  chev: { color: c.sub, fontSize: SIZES.title },
  track: { height: 10, borderRadius: 5, backgroundColor: c.glass.chip, overflow: 'hidden', marginVertical: 8 },
  fill: { height: 10, borderRadius: 5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  lineTop: { borderTopWidth: 1, borderTopColor: c.glass.chip },
  main: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '600', flexShrink: 1 },
  sub: { color: c.sub, fontSize: SIZES.small },
  val: { color: c.text, fontSize: SIZES.text, fontWeight: '700', maxWidth: '50%', textAlign: 'right' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  beds: { flexDirection: 'row', gap: 8 },
  bedBox: { flex: 1, minWidth: 0, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  bedPct: { color: c.sub, fontSize: SIZES.small, fontWeight: '700' },
  bedTime: { color: c.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, alignSelf: 'stretch', textAlign: 'center' },
  bedSub: { color: c.sub, fontSize: SIZES.tiny + 1, alignSelf: 'stretch', textAlign: 'center' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { color: c.onBgSub, fontSize: SIZES.small, textAlign: 'center', paddingHorizontal: 8 },
});
