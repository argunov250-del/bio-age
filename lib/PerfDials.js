// Три кольца на главной: Восстановление (цвет по зоне), Нагрузка 0–21 (синее, с отметками целевого диапазона),
// Сон (производительность). Кольцо и число рисуются от нуля одним счётчиком (useCountUp), нажатие открывает экран.
// Оценки независимые, по данным Health Connect; не медицинские показатели.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Card } from './ui';
import { PressScale, useCountUp } from './motion';
import { useColors } from './colors';
import { SIZES } from './theme';
import { tr } from './i18n';
import { fit } from './fit';
import { fmt } from './format';
import { num, clamp01, zoneColor, strainColor, sleepColor, zoneWord, levelWord, sleepWord, suggestionText, reasonText } from './perfView';

const TAU = Math.PI * 2;

const polar = (cx, r, frac) => {
  const a = clamp01(frac) * TAU - Math.PI / 2;
  return [cx + r * Math.cos(a), cx + r * Math.sin(a)];
};
// Дуга целевого диапазона: от доли lo до доли hi окружности.
export function rangeArc(cx, r, lo, hi) {
  const a = clamp01(lo), b = clamp01(hi);
  if (!(b > a)) return null;
  const [x0, y0] = polar(cx, r, a);
  const [x1, y1] = polar(cx, r, b);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// Одно кольцо. value — число или null; max — шкала; digits — знаков после запятой; suffix — «%» или «/21».
export function Dial({ id, label, value, max = 100, digits = 0, suffix = '', color, status, statusColor, target, size = 96, onPress, big }) {
  const c = useColors();
  const v = num(value);
  const shown = useCountUp('perf:' + id, v);
  const sw = Math.max(8, Math.round(size * 0.1));
  const cx = size / 2;
  const r = cx - sw / 2 - 1;
  const circ = TAU * r;
  const k = shown == null ? 0 : clamp01(shown / max);
  const tl = target && num(target.low) != null && num(target.high) != null ? target : null;
  const ri = r - sw * 0.95;
  const arc = tl ? rangeArc(cx, ri, tl.low / max, tl.high / max) : null;
  const col = color || c.accent;
  const txt = shown == null ? '—' : fmt(digits ? shown : Math.round(shown), digits);
  const s = useMemo(() => makeStyles(c), [c]);
  const body = (
    <>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cx} r={r} stroke={c.text} strokeOpacity={0.1} strokeWidth={sw} fill="none" />
          {k > 0.004 ? (
            <Circle cx={cx} cy={cx} r={r} stroke={col} strokeWidth={sw} strokeLinecap="round" fill="none"
              strokeDasharray={`${(k * circ).toFixed(2)} ${circ.toFixed(2)}`} rotation={-90} origin={`${cx}, ${cx}`} />
          ) : null}
          {arc ? <Path d={arc} stroke={col} strokeOpacity={0.55} strokeWidth={Math.max(3, sw * 0.4)} strokeLinecap="round" fill="none" /> : null}
        </Svg>
        <View style={s.center} pointerEvents="none">
          <Text style={[s.num, { color: v == null ? c.sub : c.text, fontSize: size * (big ? 0.3 : 0.27) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {txt}{shown != null && suffix ? <Text style={[s.suffix, { fontSize: size * 0.12 }]}>{suffix}</Text> : null}
          </Text>
        </View>
      </View>
      {label ? <Text style={[s.label, big && s.labelBig]} {...fit(1, 0.7)}>{label}</Text> : null}
      {status ? <Text style={[s.status, { color: statusColor || c.sub }]} {...fit(1, 0.7)}>{status}</Text> : null}
    </>
  );
  const a11y = (label ? label + ': ' : '') + txt + suffix + (status ? ', ' + status : '');
  if (!onPress) return <View style={s.col} accessible accessibilityLabel={a11y}>{body}</View>;
  return <PressScale onPress={onPress} style={s.col} accessibilityLabel={a11y}>{body}</PressScale>;
}

// Подписи и значения трёх колец из perf (или null).
export function dialSpecs(perf, c) {
  const rec = perf && perf.recovery;
  const st = perf && perf.strain;
  const sl = perf && perf.sleep;
  const tgt = perf && perf.strainTarget;
  return {
    recovery: { value: rec ? rec.pct : null, color: zoneColor(c, rec && rec.zone), status: rec ? zoneWord(rec.zone) : tr('Нет данных') },
    strain: { value: st ? num(st.day) : null, color: strainColor(c), status: st && num(st.day) != null ? levelWord(st.level) : tr('Нет данных'), target: tgt && num(tgt.low) != null ? { low: tgt.low, high: tgt.high } : null },
    sleep: { value: sl ? num(sl.performancePct) : null, color: sleepColor(c), status: sleepWord(sl && sl.performancePct) },
  };
}

// Строка цели нагрузки: «Цель нагрузки на сегодня: 10,2–14,1 · осталось 3,4» и короткий совет.
export function TargetLine({ perf }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const t = perf && perf.strainTarget;
  const has = t && num(t.low) != null && num(t.high) != null;
  const head = has
    ? tr('Цель нагрузки на сегодня: ') + fmt(t.low, 1) + '–' + fmt(t.high, 1) + (num(t.remaining) != null ? ' · ' + tr('осталось ') + fmt(t.remaining, 1) : '')
    : tr('Цель нагрузки появится после оценки восстановления');
  const tip = has ? suggestionText(perf) : (perf ? reasonText(perf) : tr('Пока недостаточно данных для оценки.'));
  return (
    <View style={s.target}>
      <Text style={s.targetHead} {...fit(2, 0.8)}>{head}</Text>
      {tip ? <Text style={s.targetTip} {...fit(3, 0.85)}>{tip}</Text> : null}
    </View>
  );
}

export function PerfDials({ perf, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const size = Math.round(Math.max(76, Math.min(116, (width - SIZES.pad * 2 - 28) / 3 - 8)));
  const d = dialSpecs(perf, c);
  const open = (k) => (onOpen ? () => onOpen('perf:' + k) : undefined);
  return (
    <Card style={s.card}>
      <View style={s.row}>
        <Dial id="recovery" label={tr('Восстановление')} value={d.recovery.value} suffix="%" color={d.recovery.color} status={d.recovery.status} statusColor={d.recovery.color} size={size} onPress={open('recovery')} />
        <Dial id="strain" label={tr('Нагрузка')} value={d.strain.value} max={21} digits={1} color={d.strain.color} status={d.strain.status} statusColor={d.strain.color} target={d.strain.target} size={size} onPress={open('strain')} />
        <Dial id="sleep" label={tr('Сон')} value={d.sleep.value} suffix="%" color={d.sleep.color} status={d.sleep.status} statusColor={d.sleep.color} size={size} onPress={open('sleep')} />
      </View>
      <TargetLine perf={perf} />
    </Card>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 10, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  col: { alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  num: { fontWeight: '700' },
  suffix: { color: c.sub, fontWeight: '600' },
  label: { color: c.text, fontSize: SIZES.small, fontWeight: '700', textAlign: 'center', alignSelf: 'stretch' },
  labelBig: { fontSize: SIZES.text },
  status: { fontSize: SIZES.tiny + 1, fontWeight: '600', textAlign: 'center', alignSelf: 'stretch' },
  target: { alignSelf: 'stretch', gap: 3, paddingHorizontal: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line },
  targetHead: { color: c.text, fontSize: SIZES.body, fontWeight: '700' },
  targetTip: { color: c.sub, fontSize: SIZES.small },
});
