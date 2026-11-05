// «Совет на сегодня»: главный совет, почему он такой (какие данные к нему привели),
// что можно сделать, ещё несколько советов и как это работает.
import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, Section, Body, Bullet, Subhead, Note } from '../ui';
import { ChironTip } from '../ChironTip';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { ago } from '../time';
import { RULE_COUNT } from '../recommend';

function Tip({ tip, main }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <ChironTip main={main} title={tip.area}>
      <Text style={[s.title, main && s.mainTitle]}>{tip.title}</Text>
      <Subhead>{tr('Почему я так советую')}</Subhead>
      {tip.why.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
      <Subhead>{tr('Что я предлагаю сделать')}</Subhead>
      {tip.actions.map((x, i) => <Bullet key={i}>{x}</Bullet>)}
    </ChironTip>
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
      <Section>{tr('Как это работает')}</Section>
      <Card>
        <Body sub>{tr('Советы подбираются по правилам: сон, пульс, HRV, нагрузка и активность сравниваются с твоей обычной нормой. Сначала бережные советы, потом про нагрузку.')}</Body>
        <Body sub>{tr('Всё считается на телефоне, данные никуда не отправляются.')}</Body>
        <Note>{tr('Правил: ') + RULE_COUNT + (rec.basedOn ? ' · ' + tr('данные обновлены ') + ago(Date.parse(rec.basedOn)) : '')}</Note>
      </Card>
      <Note center>{tr('Советы не заменяют консультацию врача и не являются медицинскими рекомендациями.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  title: { color: c.text, fontSize: SIZES.text, lineHeight: 23, fontWeight: '600' },
  mainTitle: { fontSize: SIZES.text + 2, lineHeight: 26 },
});
