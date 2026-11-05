// Отладка: что реально читается из Health Connect.
import React, { useState } from 'react';
import { Screen, Card, Section, Note, Button, Row } from '../ui';
import { useColors } from '../colors';
import { tr } from '../i18n';
import { fmt } from '../format';
import { RECORD_TYPES, HISTORY, scanType } from '../health';
import { HISTORY_DAYS } from '../metrics';

const short = (iso) => (iso ? iso.slice(0, 10) : '—');

export function DebugScreen({ granted, sdk, dataset, onBack, onHide }) {
  const c = useColors();
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState('');

  const run = async () => {
    const end = new Date();
    const start = new Date(end.getTime() - HISTORY_DAYS * 86400000);
    const out = {};
    for (const t of RECORD_TYPES) {
      if (!granted.has(t)) continue;
      setBusy(t);
      try { out[t] = await scanType(t, start, end); } catch (e) { out[t] = { error: String((e && e.message) || e) }; }
      setScan({ ...out });
    }
    setBusy('');
  };

  return (
    <Screen title={tr('Отладка')} onBack={onBack}>
      <Section>Health Connect</Section>
      <Card>
        <Row label="SDK" value={sdk} />
        {/* react-native-health-connect 4.1.3 не возвращает это разрешение в списке выданных, поэтому статус неизвестен. */}
        <Row label={tr('История > 30 дней')} value={granted.has(HISTORY) ? tr('есть') : tr('не определяется')} />
        {RECORD_TYPES.map((t) => (
          <Row key={t} label={t} value={granted.has(t) ? tr('доступ есть') : tr('нет доступа')} color={granted.has(t) ? c.good : c.bad} />
        ))}
      </Card>
      {dataset && Object.keys(dataset.errors).length ? (
        <>
        <Section>{tr('Ошибки чтения')}</Section>
        <Card>
          {Object.entries(dataset.errors).map(([t, e]) => <Note key={t} style={{ color: c.bad }}>{t}: {e}</Note>)}
        </Card>
        </>
      ) : null}
      {dataset ? (
        <>
        <Section>{tr('Обработано за 6 месяцев')}</Section>
        <Card>
          <Row label={tr('Дней с шагами')} value={fmt(Object.keys(dataset.steps).length)} />
          <Row label={tr('Ночей со сном')} value={fmt(Object.keys(dataset.sleep).length)} />
          <Row label={tr('Дней с пульсом')} value={fmt(Object.keys(dataset.hr).length)} />
          <Row label={tr('Дней с пульсом покоя')} value={fmt(Object.keys(dataset.rhr).length)} />
          <Row label={tr('Дней с силовыми')} value={fmt(Object.keys(dataset.strength).length)} />
          <Row label={tr('Замеров VO2max')} value={fmt(dataset.vo2.length)} />
          <Row label={tr('Замеров безжировой массы')} value={fmt(dataset.lbm.length)} />
        </Card>
        </>
      ) : null}
      <Button title={busy ? tr('Сканирую: ') + busy : tr('Посчитать сырые записи')} onPress={run} disabled={!!busy} />
      {scan ? RECORD_TYPES.filter((t) => scan[t]).map((t) => {
        const s = scan[t];
        return (
          <React.Fragment key={t}>
          <Section>{t}</Section>
          <Card>
            {s.error ? <Note style={{ color: c.bad }}>{s.error}</Note> : (
              <>
                <Row label={tr('Записей')} value={fmt(s.count)} />
                <Row label={tr('Период')} value={`${short(s.first)} … ${short(s.last)}`} />
                {Object.entries(s.origins).sort((a, b) => b[1] - a[1]).map(([o, n]) => (
                  <Row key={o} label={o} value={fmt(n)} />
                ))}
              </>
            )}
          </Card>
          </React.Fragment>
        );
      }) : null}
      {onHide ? <Button title={tr('Скрыть отладку')} onPress={onHide} /> : null}
    </Screen>
  );
}
