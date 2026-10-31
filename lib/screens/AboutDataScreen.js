// «О данных и источниках»: откуда берутся данные, где считаются, ограничения
// (не медицинское изделие) и кратко — на каких исследованиях основаны расчёты и советы.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, T } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { FACTS } from '../knowledge';
import { SOURCES as CYCLE_SOURCES } from '../cycleText';

// Исследования, на которых основан «Возраст тела» (подробности — в lib/formula.js).
const BODY_AGE = [
  'Yin et al., J Am Heart Assoc, 2017',
  'Windred et al., Sleep, 2024',
  'Paluch et al., Lancet Public Health, 2022',
  'Arem et al., JAMA Intern Med, 2015',
  'Lee et al., Circulation, 2022',
  'Momma et al., Br J Sports Med, 2022',
  'Kodama et al., JAMA, 2009; Mandsager et al., JAMA Netw Open, 2018',
  'Kaminsky et al. (FRIEND), Mayo Clin Proc, 2015',
  'Zhang et al., CMAJ, 2016',
  'Srikanthan & Karlamangla, Am J Med, 2014; Schutz et al., Int J Obes, 2002',
  'Tanaka et al., J Am Coll Cardiol, 2001',
];

const List = ({ items, s }) => items.map((x) => <Text key={x} style={s.li}>• {x}</Text>);

export function AboutDataScreen({ onBack }) {
  const c = useColors();
  const s = makeStyles(c);
  const coach = [...new Set(Object.values(FACTS).map((f) => f.source))];
  return (
    <Screen title={tr('О данных и источниках')} onBack={onBack}>
      <Card>
        <CardHead title={tr('Откуда данные')} />
        <List s={s} items={[
          tr('Health Connect — только чтение, приложение ничего туда не записывает.'),
          tr('Твои ручные записи и данные профиля.'),
          tr('Файлы, которые ты сам импортируешь: экспорт Apple Health, таблица CSV, резервная копия.'),
          tr('Погода (если включена): Open-Meteo по приблизительным координатам или городу.'),
        ]} />
      </Card>
      <Card>
        <CardHead title={tr('Где хранятся и считаются')} />
        <List s={s} items={[
          tr('Всё хранится и считается только на этом телефоне.'),
          tr('Данные о здоровье никуда не отправляются: нет серверов, аккаунтов, аналитики и рекламы. Интернет нужен только погоде, если включить её в профиле: в сервис Open-Meteo уходят приблизительные координаты (~10 км).'),
          tr('Коуч работает без интернета: советы составляются по правилам из открытых рекомендаций и исследований.'),
        ]} />
      </Card>
      <Card>
        <CardHead title={tr('Важно')} />
        <List s={s} items={[
          tr('Приложение не является медицинским устройством и не заменяет консультацию врача.'),
          tr('Все показатели — оценки для информации, а не диагноз и не назначение.'),
          tr('Прогноз цикла — не метод контрацепции.'),
          tr('Точность зависит от полноты данных с устройств и записей.'),
          tr('При плохом самочувствии, боли или тревожных симптомах обратись к врачу.'),
        ]} />
      </Card>
      <Card>
        <CardHead title={tr('Источники')} />
        <Text style={s.h}>{tr('Возраст тела и оценки')}</Text>
        <List s={s} items={BODY_AGE} />
        <Text style={s.h}>{tr('Советы коуча')}</Text>
        <List s={s} items={coach} />
        <Text style={s.h}>{tr('Цикл')}</Text>
        <List s={s} items={CYCLE_SOURCES} />
      </Card>
      <T sub small style={{ textAlign: 'center' }}>{tr('Не медицинский показатель, только для информации.')}</T>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  li: { color: c.text, fontSize: SIZES.small + 1, lineHeight: 20 },
  h: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', marginTop: 4 },
});
