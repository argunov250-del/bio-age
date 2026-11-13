// Сон: производительность, часы против потребности (база + нагрузка + долг), долг, эффективность, регулярность,
// стадии, восстанавливающий сон и «во сколько лечь» для целей 100 / 85 / 70 %. Независимая оценка, не медицинский показатель.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Note, Button } from '../ui';
import { Dial } from '../PerfDials';
import { StackBar } from '../PerfCharts';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt } from '../format';
import { hoursMin } from '../time';
import { debtAddH } from '../perf/index';
import { num, sleepColor, sleepWord, stageColors } from '../perfView';

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
      <Text style={[s.val, bold && s.valBold]} {...fit(1, 0.6)}>{value}</Text>
    </View>
  );
}

export function SleepScreen({ perf, onBack, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sl = perf && perf.sleep;
  const col = sleepColor(c);
  const perfPct = sl ? num(sl.performancePct) : null;
  const need = sl ? num(sl.needH) : null;
  const base = perf && perf.meta ? num(perf.meta.baseNeedH) : null;
  const debt = sl ? num(sl.debtH) : null;
  const debtAdd = debt != null ? debtAddH(debt) : null;
  const strainAdd = need != null && base != null ? Math.max(0, Math.round((need - base - (debtAdd || 0)) * 100) / 100) : null;
  const st = sl && sl.stages;
  const sc = stageColors(c);
  const bed = sl && sl.tonight && sl.tonight.recommendedBed;
  const STAGES = [['deep', tr('Глубокий')], ['rem', tr('REM')], ['light', tr('Лёгкий')], ['awake', tr('Бодрствование')]];
  return (
    <Screen title={tr('Сон')} onBack={onBack}>
      <Card style={s.hero}>
        <Dial id="sleep-big" label="" value={perfPct} suffix="%" color={col} size={190} big status={sleepWord(perfPct)} statusColor={col} />
        {perfPct != null ? (
          <Text style={s.lead} {...fit(2, 0.85)}>{hm(sl.actualH) + ' ' + tr('из') + ' ' + hm(need) + ' ' + tr('нужных')}</Text>
        ) : (
          <Text style={s.lead} {...fit(4, 0.85)}>{tr('Нет сна за последние сутки: надень часы на ночь или запиши сон вручную.')}</Text>
        )}
      </Card>

      {sl && need != null ? (
        <Card>
          <CardHead title={tr('Сколько нужно сна')} />
          <Line first label={tr('Базовая потребность')} value={hm(base)} />
          <Line label={tr('Добавка за нагрузку')} value={'+ ' + hm(strainAdd)} hint={tr('Чем тяжелее предыдущий день, тем больше нужно сна.')} />
          <Line label={tr('Добавка за долг сна')} value={'+ ' + hm(debtAdd)} />
          <Line label={tr('Итого на ночь')} value={hm(need)} bold />
        </Card>
      ) : null}

      <Card>
        <CardHead title={tr('Качество')} />
        <Line first label={tr('Долг сна')} value={hm(debt)} hint={tr('Недосып за 7 ночей, свежие ночи весят больше.')} />
        <Line label={tr('Эффективность')} value={pc(sl && sl.efficiencyPct)} hint={tr('Доля времени сна от времени в постели.')} />
        <Line label={tr('Регулярность')} value={pc(sl && sl.consistencyPct)}
          hint={sl && num(sl.consistencyPct) == null ? tr('Нужно ещё несколько ночей: минимум 3 за последние 4 дня.') : tr('Насколько стабильно время отбоя и подъёма.')} />
        <Line label={tr('Восстанавливающий сон')} value={hm(sl && sl.restorativeH)} hint={tr('Глубокий сон и REM вместе.')} />
      </Card>

      <Card>
        <CardHead title={tr('Стадии сна')} />
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
      </Card>

      <Card>
        <CardHead title={tr('Сегодня лечь в…')} />
        {bed ? (
          <View>
            {[100, 85, 70].map((t, i) => (
              <Line key={t} first={i === 0} label={tr('Цель ') + t + '%'} value={bed[t] ? bed[t].hhmm : '—'}
                hint={bed[t] && num(bed[t].asleepH) != null ? tr('сна: ') + hm(bed[t].asleepH) : null} />
            ))}
            <Text style={s.sub} {...fit(3, 0.85)}>{tr('Подъём в ') + sl.tonight.wakeHHMM + (sl.tonight.wakeSource === 'plan' ? tr(' по твоему режиму сна.') : tr(' — как обычно у тебя.'))}</Text>
          </View>
        ) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Задай время подъёма в режиме сна или накопи хотя бы 3 ночи: тогда посчитаю, когда лечь.')}</Text>}
        {onOpen ? <Button title={tr('Режим сна')} onPress={() => onOpen('sleep')} variant="secondary" /> : null}
      </Card>
      <Note center>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  lead: { color: c.sub, fontSize: SIZES.body, textAlign: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  lineTop: { borderTopWidth: 1, borderTopColor: c.line },
  main: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '600', flexShrink: 1 },
  sub: { color: c.sub, fontSize: SIZES.small },
  val: { color: c.text, fontSize: SIZES.text, fontWeight: '700', maxWidth: '50%', textAlign: 'right' },
  valBold: { color: c.accent },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
