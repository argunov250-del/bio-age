// Расшифровка: по каждой метрике значение, цель, поправка в годах и сколько дней данных.
import React from 'react';
import { Screen, Card, T, Row, Disclaimer } from '../ui';
import { COLORS } from '../theme';
import { tr } from '../i18n';
import { fmt, signed, valueText, targetText, METRIC_INFO, NOTE_TEXT } from '../format';
import { METRICS, metricTarget } from '../formula';

function value(key, v) {
  if (!v || v.value == null) return NOTE_TEXT[v ? v.note : 'noData']();
  let s = valueText(key, v.value);
  if (key === 'leanMass' && v.kg) s += ` (${fmt(v.kg, 1)} ${tr('кг')})`;
  if (v.estimated) s += ' ' + tr('(оценка по пульсу)');
  if (v.last) s += ' ' + tr('(последний замер)');
  if (!v.ok) s += ' — ' + NOTE_TEXT[v.note]();
  return s;
}

const yearsText = (it) => (it ? signed(it.years) + ' ' + tr('лет') : '—');
const yearsColor = (it) => (!it ? null : it.years > 0.05 ? COLORS.bad : it.years < -0.05 ? COLORS.good : null);

export function BreakdownScreen({ result, profile, onBack }) {
  return (
    <Screen title={tr('Расшифровка')} onBack={onBack}>
      <T sub small>{tr('Поправки — с учётом перекрытия похожих метрик. В скобках — без него.')}</T>
      {METRICS.map(({ key }) => {
        const v = result.v180[key];
        const it = result.corr180.items[key];
        const r = result.v30[key];
        const r30 = result.corr30.items[key];
        const days = key === 'vo2max' || key === 'leanMass' ? tr('замеров') : tr('дней');
        return (
          <Card key={key}>
            <T style={{ fontWeight: '600' }}>{METRIC_INFO[key].name()}</T>
            <Row label={tr('Моё значение')} value={value(key, v)} />
            <Row label={tr('Цель')} value={targetText(key, metricTarget(key, profile))} />
            <Row
              label={tr('Поправка')}
              value={it ? `${yearsText(it)} (${signed(it.raw)})` : '—'}
              color={yearsColor(it)}
            />
            <Row label={tr('Данных')} value={`${v.days || 0} ${days}`} />
            <Row label={tr('За 30 дней')} value={`${value(key, r)} · ${yearsText(r30)}`} />
          </Card>
        );
      })}
      <Card>
        <Row label={tr('Сумма поправок')} value={signed(result.corr180.total) + ' ' + tr('лет')} />
        <T sub small>{tr('Итог ограничен диапазоном от −10 до +15 лет.')}</T>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
