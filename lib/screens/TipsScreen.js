// «Совет на сегодня»: главный совет, почему он такой (какие данные к нему привели),
// что можно сделать, ещё несколько советов и как это работает.
import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, T, Disclaimer } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { ago } from '../time';
import { RULE_COUNT } from '../recommend';

function Tip({ tip, main }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Card style={main && { borderColor: c.accent }}>
      <CardHead icon={main ? '✦' : null} title={tip.area} />
      <Text style={[s.title, main && s.mainTitle]}>{tip.title}</Text>
      <Text style={s.h}>{tr('Почему')}</Text>
      {tip.why.map((x, i) => <Text key={i} style={s.li}>• {x}</Text>)}
      <Text style={s.h}>{tr('Что можно сделать')}</Text>
      {tip.actions.map((x, i) => <Text key={i} style={s.li}>• {x}</Text>)}
    </Card>
  );
}

export function TipsScreen({ rec, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Screen title={tr('Совет на сегодня')} onBack={onBack}>
      <Tip tip={rec.main} main />
      {rec.others.length ? (
        <>
          <Text style={s.section}>{tr('Ещё на сегодня')}</Text>
          {rec.others.map((x) => <Tip key={x.id} tip={x} />)}
        </>
      ) : null}
      <Card>
        <CardHead title={tr('Как это работает')} />
        <Text style={s.p}>{tr('Советы подбираются по набору понятных правил: приложение сравнивает твой сон, пульс, HRV, нагрузку и активность с твоей же обычной нормой. Сначала показываются бережные советы, потом — про нагрузку и активность.')}</Text>
        <Text style={s.p}>{tr('Эти советы считаются по правилам прямо на телефоне. Онлайн-советы от Claude включаются в профиле.')}</Text>
        <Text style={s.p}>{tr('Правил: ') + RULE_COUNT + (rec.basedOn ? ' · ' + tr('данные обновлены ') + ago(Date.parse(rec.basedOn)) : '')}</Text>
      </Card>
      <T sub small style={{ textAlign: 'center' }}>{tr('Советы не заменяют консультацию врача и не являются медицинскими рекомендациями.')}</T>
      <Disclaimer />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  title: { color: c.text, fontSize: SIZES.text, lineHeight: 23, fontWeight: '600' },
  mainTitle: { fontSize: SIZES.text + 2, lineHeight: 26 },
  h: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  li: { color: c.text, fontSize: SIZES.small + 1, lineHeight: 21 },
  p: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 21 },
  section: { color: c.text, fontSize: SIZES.title - 2, fontWeight: '700', marginTop: SIZES.gap },
});
