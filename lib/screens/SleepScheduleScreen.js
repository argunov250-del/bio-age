// «Режим сна»: когда ложусь и когда встаю. Время можно взять из своих ночей (автоматически)
// или задать вручную колёсами. От него зависят напоминание об отбое, уведомление о подъёме
// и автозапись сна (lib/sleepPlan.js). Изменения сохраняются сами (через полсекунды покоя).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, Section, Note, SwitchRow, Segmented } from '../ui';
import { SIZES } from '../theme';
import { useColors } from '../colors';
import { tr } from '../i18n';
import { fit } from '../fit';
import { hoursMin } from '../time';
import { TimeWheel } from '../TimeWheel';
import { SleepDial } from '../SleepDial';
import { sleepSchedule, bedReminderAt, minToHHMM } from '../reminders';

const DAY = 1440;
const lenH = (bed, wake) => ((((wake - bed) % DAY) + DAY) % DAY || DAY) / 60;

// Сравнение цели с личной нормой сна (норма — часы или null).
export function normLine(durH, norm) {
  if (!(norm > 0)) return tr('Взрослым обычно нужно 7–9 часов сна.');
  const d = Math.round((durH - norm) * 60);
  if (Math.abs(d) < 15) return tr('Твоя норма — ') + hoursMin(norm) + tr(': цель почти совпадает.');
  return tr('Твоя норма — ') + hoursMin(norm) + ', ' + (d < 0 ? tr('цель короче на ') : tr('цель длиннее на ')) + Math.abs(d) + ' ' + tr('мин');
}

export function SleepScheduleScreen({ profile, dataset, norm, onSave, onSettings, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const p = profile || {};
  const plan = p.sleepPlan || {};
  const init = useMemo(() => sleepSchedule(p, dataset), []);
  const auto = init.auto;
  const [mode, setMode] = useState(init.mode);
  const [bed, setBed] = useState(init.bed);
  const [wake, setWake] = useState(init.wake);
  const [on, setOn] = useState(plan.on != null ? !!plan.on : false);
  const [before, setBefore] = useState(init.remindBefore);
  const [remindWake, setRemindWake] = useState(init.remindWake);

  const isAuto = mode === 'auto';
  const eBed = isAuto ? auto.bed : bed;
  const eWake = isAuto ? auto.wake : wake;
  const durH = lenH(eBed, eWake);

  // Автосохранение: не раньше чем через 500 мс после последней правки и при выходе с экрана.
  const saveRef = useRef(onSave);
  saveRef.current = onSave; // всегда свежий обработчик: профиль мог измениться за время ожидания
  const latest = useRef(null);
  const dirty = useRef(false);
  latest.current = { on, mode, bed: minToHHMM(eBed), wake: minToHHMM(eWake), remindBefore: before, remindWake, since: plan.since && plan.on ? plan.since : Date.now() };
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    dirty.current = true;
    const t = setTimeout(() => { dirty.current = false; saveRef.current(latest.current); }, 500);
    return () => clearTimeout(t);
  }, [on, mode, eBed, eWake, before, remindWake]);
  useEffect(() => () => { if (dirty.current) saveRef.current(latest.current); }, []);

  const setAuto = (v) => {
    if (!v) { setBed(auto.bed); setWake(auto.wake); }
    setMode(v ? 'auto' : 'manual');
  };
  const at = minToHHMM(bedReminderAt({ bed: eBed, remindBefore: before }));

  return (
    <Screen title={tr('Режим сна')} onBack={onBack}>
      <Card>
        <SleepDial bed={eBed} wake={eWake} />
        <Text {...fit(2, 0.7)} style={s.norm}>{normLine(durH, norm)}</Text>
      </Card>

      <Section>{tr('Отбой и подъём')}</Section>
      <Card>
        <SwitchRow label={tr('Автоматически по моим данным')} value={isAuto} onChange={setAuto} />
        {isAuto ? (
          <>
            <View style={s.pair}>
              <View style={s.half}>
                <Text {...fit(1, 0.7)} style={s.cap}>{tr('Отбой')}</Text>
                <Text {...fit(1, 0.6)} style={s.big}>{minToHHMM(auto.bed)}</Text>
              </View>
              <View style={s.half}>
                <Text {...fit(1, 0.7)} style={s.cap}>{tr('Подъём')}</Text>
                <Text {...fit(1, 0.6)} style={s.big}>{minToHHMM(auto.wake)}</Text>
              </View>
            </View>
            <Note>{tr('Считается по твоим последним ночам (без дневного сна). Нет данных — 23:00 и 07:00.')}</Note>
          </>
        ) : (
          <View style={s.pair}>
            <View style={s.half}>
              <Text {...fit(1, 0.7)} style={s.cap}>{tr('Отбой')}</Text>
              <TimeWheel label={tr('Отбой')} value={bed} onChange={setBed} />
            </View>
            <View style={s.half}>
              <Text {...fit(1, 0.7)} style={s.cap}>{tr('Подъём')}</Text>
              <TimeWheel label={tr('Подъём')} value={wake} onChange={setWake} />
            </View>
          </View>
        )}
      </Card>

      <Section>{tr('Напоминания')}</Section>
      <Card>
        <SwitchRow label={tr('Напомнить об отбое')} value={!!p.remindSleep} onChange={(v) => onSettings({ remindSleep: v })} />
        {p.remindSleep ? (
          <>
            <Segmented options={[[15, '15 ' + tr('мин')], [30, '30 ' + tr('мин')], [60, '60 ' + tr('мин')]]} value={before} onChange={setBefore} />
            <Note>{tr('Напомню в ') + at + tr(' — за ') + before + ' ' + tr('мин до отбоя.')}</Note>
          </>
        ) : null}
        <SwitchRow label={tr('«Доброе утро» в час подъёма')} value={remindWake} onChange={setRemindWake} />
        <SwitchRow label={tr('Записывать сон автоматически')} value={on} onChange={setOn} />
        <Note>{tr('Сон записывается сам: с отбоя до подъёма. Откроешь приложение ночью — запись остановится. Данные часов из Health Connect важнее.')}</Note>
      </Card>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  norm: { color: c.sub, fontSize: SIZES.small, textAlign: 'center', marginTop: SIZES.gap },
  pair: { flexDirection: 'row', gap: SIZES.gap, marginTop: SIZES.gap },
  half: { flex: 1, alignItems: 'center' },
  cap: { color: c.sub, fontSize: SIZES.small, fontWeight: '600', marginBottom: 4 },
  big: { color: c.text, fontSize: SIZES.display, fontWeight: '700' },
});
