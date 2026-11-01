// «Совет на сегодня»: главный совет, почему он такой (какие данные к нему привели),
// что можно сделать, ещё несколько советов и как это работает.
import React from 'react';
import { Text } from 'react-native';
import { StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Section, Body, Bullet, Subhead, Note } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { ago } from '../time';
import { RULE_COUNT } from '../recommend';

function Tip({ tip, main }) {
  const c = useColors();
  return (
    <Card style={main && { borderColor: c.accent, borderTopColor: c.accent }}>
      <CardHead icon={main ? '✦' : null} title={tip.area} />
      <Text style={[s.title, { color: c.text }, main && s.mainTitle]}>{tip.title}</Text>
      <Subhead>{tr('Почему')}</Subhead>
      {tip.why.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
      <Subhead>{tr('Что можно сделать')}</Subhead>
      {tip.actions.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
    </Card>
  );
}

export function TipsScreen({ rec, onBack }) {
  return (
    <Screen title={tr('Совет на сегодня')} onBack={onBack}>
      <Tip tip={rec.main} main />
      {rec.others.length ? (
        <>
          <Section>{tr('Ещё на сегодня')}</Section>
          {rec.others.map((x) => <Tip key={x.id} tip={x} />)}
        </>
      ) : null}
      <Card>
        <CardHead title={tr('Как это работает')} />
        <Body sub>{tr('Советы подбираются по правилам: сон, пульс, HRV, нагрузка и активность сравниваются с твоей обычной нормой. Сначала бережные советы, потом про нагрузку.')}</Body>
        <Body sub>{tr('Всё считается на телефоне, данные никуда не отправляются.')}</Body>
        <Note>{tr('Правил: ') + RULE_COUNT + (rec.basedOn ? ' · ' + tr('данные обновлены ') + ago(Date.parse(rec.basedOn)) : '')}</Note>
      </Card>
      <Note center>{tr('Советы не заменяют консультацию врача и не являются медицинскими рекомендациями.')}</Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: SIZES.text, lineHeight: 23, fontWeight: '600' },
  mainTitle: { fontSize: SIZES.text + 2, lineHeight: 26 },
});
