"use no memo";
// Виджеты домашнего экрана (react-native-android-widget). Чистые функции: снимок + тема + размеры -> дерево.
// Без хуков и без состояния: библиотека вызывает функции сама и переводит дерево в нативные View.
// Тема: каждый виджет рисуется дважды (светлая и тёмная палитры), а какую показать — решает сам
// Android по системной теме (библиотека принимает { light, dark }), поэтому JS системную тему не читает.
import React from 'react';
import { FlexWidget, OverlapWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { dayKey } from './snapshot';

export const WIDGET_NAMES = ['BodyAge', 'Readiness', 'Steps', 'DaySummary'];

export const LIGHT = { bg: '#FFFFFF', text: '#111111', muted: '#6B7280', track: '#E7EAEE', accent: '#2BB673', warn: '#E08A1E', border: '#E7EAEE' };
export const DARK = { bg: '#111111', text: '#FFFFFF', muted: '#A1A7AF', track: '#2B2B2B', accent: '#2BB673', warn: '#F0A040', border: '#111111' };

const STR = {
  ru: {
    bodyAge: 'Возраст тела', years: 'лет', same: 'как в паспорте', passport: 'от паспорта', noData: 'Нет данных — открой приложение',
    readiness: 'Готовность', high: 'хорошо', medium: 'средне', low: 'низко', noDataShort: 'Нет данных',
    steps: 'шагов', goalOf: 'из', sleep: 'Сон', stepsLabel: 'Шаги', restHr: 'Пульс покоя', hrv: 'HRV', level: 'Уровень', hUnit: 'ч', bpm: 'уд/мин', ms: 'мс',
  },
  en: {
    bodyAge: 'Body age', years: 'yrs', same: 'same as passport', passport: 'vs passport', noData: 'No data — open the app',
    readiness: 'Readiness', high: 'good', medium: 'medium', low: 'low', noDataShort: 'No data',
    steps: 'steps', goalOf: 'of', sleep: 'Sleep', stepsLabel: 'Steps', restHr: 'Resting HR', hrv: 'HRV', level: 'Level', hUnit: 'h', bpm: 'bpm', ms: 'ms',
  },
};
const T = (lang) => STR[lang === 'en' ? 'en' : 'ru'];

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// Числа форматируем вручную: Intl на Android/Hermes и в тестах даёт разный результат.
export function fmtNum(x, digits, lang) {
  if (!isNum(x)) return '—';
  const neg = x < 0 && Number(Math.abs(x).toFixed(digits)) !== 0;
  const [i, f] = Math.abs(x).toFixed(digits).split('.');
  const group = lang === 'en' ? ',' : ' ';
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return (neg ? '−' : '') + int + (f ? (lang === 'en' ? '.' : ',') + f : '');
}

export function deltaText(delta, lang) {
  const t = T(lang);
  if (!isNum(delta)) return '';
  if (Math.abs(delta) < 0.05) return t.same;
  return (delta > 0 ? '+' : '−') + fmtNum(Math.abs(delta), 1, lang) + ' ' + t.years;
}

export function levelWord(score, lang) {
  const t = T(lang);
  return score >= 70 ? t.high : score >= 40 ? t.medium : t.low;
}

// Дуга-кольцо: серая дорожка и зелёная дуга от 12 часов по часовой стрелке (pct 0..1).
export function ringSvg(pct, size, theme) {
  const p = isNum(pct) ? Math.max(0, Math.min(1, pct)) : 0;
  const a = Math.min(Math.max(p, 0.0005), 0.9995) * 2 * Math.PI;
  const x = (50 + 42 * Math.sin(a)).toFixed(2);
  const y = (50 - 42 * Math.cos(a)).toFixed(2);
  const arc = p > 0 ? `<path d="M50 8 A42 42 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}" fill="none" stroke="${theme.accent}" stroke-width="9" stroke-linecap="round"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="${theme.track}" stroke-width="9"/>${arc}</svg>`;
}

const clamp01 = (x) => (isNum(x) ? Math.max(0, Math.min(1, x)) : 0);
const open = { clickAction: 'OPEN_APP' };

const Brand = ({ theme, style }) => (
  <TextWidget text="EPIMELY" style={{ fontSize: 8, fontWeight: 'bold', letterSpacing: 1.5, color: theme.muted, ...(style || {}) }} />
);

const Card = ({ theme, dims, pad, center, children, label }) => (
  <FlexWidget
    {...open}
    accessibilityLabel={label}
    style={{
      width: 'match_parent', height: 'match_parent', backgroundColor: theme.bg, borderRadius: 22,
      borderWidth: 1, borderColor: theme.border, padding: pad,
      flexDirection: 'column', justifyContent: center ? 'center' : 'flex-start', alignItems: center ? 'center' : 'flex-start',
    }}
  >
    {children}
  </FlexWidget>
);

// «Нет данных — открой приложение».
export function EmptyCard({ theme, lang, dims }) {
  return (
    <Card theme={theme} dims={dims} pad={12} center label={T(lang).noData}>
      <Brand theme={theme} style={{ marginBottom: 6 }} />
      <TextWidget text={T(lang).noData} maxLines={3} style={{ fontSize: 12, color: theme.muted, textAlign: 'center' }} />
    </Card>
  );
}

const size = (dims, wd, hd) => ({
  w: isNum(dims && dims.width) && dims.width > 0 ? dims.width : wd,
  h: isNum(dims && dims.height) && dims.height > 0 ? dims.height : hd,
});

export function BodyAgeWidget({ snap, theme, lang, dims }) {
  const t = T(lang);
  if (!snap || !isNum(snap.bio)) return <EmptyCard theme={theme} lang={lang} dims={dims} />;
  const younger = isNum(snap.delta) && snap.delta < -0.05, older = isNum(snap.delta) && snap.delta > 0.05;
  const d = deltaText(snap.delta, lang);
  return (
    <Card theme={theme} dims={dims} pad={14} label={t.bodyAge + ' ' + fmtNum(snap.bio, 1, lang)}>
      <Brand theme={theme} />
      <TextWidget text={t.bodyAge} style={{ fontSize: 12, color: theme.muted, marginTop: 2 }} />
      <TextWidget text={fmtNum(snap.bio, 1, lang)} allowFontScaling={false} style={{ fontSize: 38, fontWeight: 'bold', color: theme.text }} />
      {d ? <TextWidget text={d} maxLines={1} style={{ fontSize: 13, fontWeight: 'bold', color: younger ? theme.accent : older ? theme.warn : theme.muted }} /> : null}
    </Card>
  );
}

export function ReadinessWidget({ snap, theme, lang, dims }) {
  const t = T(lang);
  if (!snap) return <EmptyCard theme={theme} lang={lang} dims={dims} />;
  const sz = size(dims, 110, 110);
  const has = snap && isNum(snap.readiness);
  const ring = Math.max(44, Math.min(96, Math.min(sz.w, sz.h) - 24 - 40));
  const label = has ? t.readiness + ' · ' + levelWord(snap.readiness, lang) : t.noDataShort;
  const numSize = Math.round(ring * 0.36);
  return (
    <Card theme={theme} dims={dims} pad={12} center label={label + (has ? ' ' + snap.readiness : '')}>
      <OverlapWidget style={{ width: ring, height: ring }}>
        <SvgWidget svg={ringSvg(has ? snap.readiness / 100 : 0, ring, theme)} style={{ width: ring, height: ring }} />
        <TextWidget
          text={has ? String(Math.round(snap.readiness)) : '—'}
          allowFontScaling={false}
          style={{ width: ring, height: ring, marginTop: Math.round((ring - numSize * 1.25) / 2), fontSize: numSize, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}
        />
      </OverlapWidget>
      <TextWidget text={label} maxLines={1} style={{ fontSize: 11, color: theme.muted, marginTop: 6, textAlign: 'center' }} />
      <Brand theme={theme} style={{ marginTop: 3 }} />
    </Card>
  );
}

function Bar({ w, h, pct, theme }) {
  const fill = Math.round(w * clamp01(pct));
  return (
    <FlexWidget style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: theme.track, flexDirection: 'row', overflow: 'hidden' }}>
      {fill > 0 ? <FlexWidget style={{ width: Math.max(h, fill), height: h, borderRadius: h / 2, backgroundColor: theme.accent }} /> : null}
    </FlexWidget>
  );
}

export function StepsWidget({ snap, theme, lang, dims, today }) {
  const t = T(lang);
  const sz = size(dims, 250, 60);
  const fresh = snap && isNum(snap.steps) && (!snap.day || snap.day === today);
  if (!fresh) return <EmptyCard theme={theme} lang={lang} dims={dims} />;
  const goal = isNum(snap.stepGoal) && snap.stepGoal > 0 ? snap.stepGoal : 8000;
  const barW = Math.max(60, sz.w - 28);
  return (
    <Card theme={theme} dims={dims} pad={14} label={t.stepsLabel + ' ' + fmtNum(snap.steps, 0, lang)}>
      <FlexWidget style={{ width: barW, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text={fmtNum(snap.steps, 0, lang)} allowFontScaling={false} style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }} />
          <TextWidget text={' ' + t.goalOf + ' ' + fmtNum(goal, 0, lang) + ' ' + t.steps} style={{ fontSize: 11, color: theme.muted, marginLeft: 4 }} />
        </FlexWidget>
        <Brand theme={theme} />
      </FlexWidget>
      <FlexWidget style={{ marginTop: 6 }}>
        <Bar w={barW} h={8} pct={snap.steps / goal} theme={theme} />
      </FlexWidget>
    </Card>
  );
}

function Row({ w, label, value, theme }) {
  return (
    <FlexWidget style={{ width: w, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <TextWidget text={label} maxLines={1} style={{ fontSize: 11, color: theme.muted }} />
      <TextWidget text={value} maxLines={1} style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }} />
    </FlexWidget>
  );
}

export function DaySummaryWidget({ snap, theme, lang, dims, today }) {
  const t = T(lang);
  const sz = size(dims, 250, 110);
  const steps = snap && isNum(snap.steps) && (!snap.day || snap.day === today) ? snap.steps : null;
  const any = snap && (isNum(snap.sleepH) || steps != null || isNum(snap.restHr) || isNum(snap.hrv) || isNum(snap.level));
  if (!any) return <EmptyCard theme={theme} lang={lang} dims={dims} />;
  const leftW = Math.round((sz.w - 28) * 0.34);
  const rightW = sz.w - 28 - leftW - 12;
  const pulse = isNum(snap.restHr) ? { label: t.restHr, value: fmtNum(snap.restHr, 0, lang) + ' ' + t.bpm }
    : { label: t.hrv, value: isNum(snap.hrv) ? fmtNum(snap.hrv, 0, lang) + ' ' + t.ms : '—' };
  return (
    <Card theme={theme} dims={dims} pad={14} label="Epimely">
      <FlexWidget style={{ width: sz.w - 28, flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ width: leftW, flexDirection: 'column', alignItems: 'flex-start', marginRight: 12 }}>
          <Brand theme={theme} />
          <TextWidget text={t.level} style={{ fontSize: 11, color: theme.muted, marginTop: 4 }} />
          <TextWidget text={isNum(snap.level) ? String(snap.level) : '—'} allowFontScaling={false} style={{ fontSize: 30, fontWeight: 'bold', color: theme.accent }} />
          {snap.rank ? <TextWidget text={snap.rank} maxLines={2} style={{ fontSize: 11, color: theme.text, width: leftW }} /> : null}
        </FlexWidget>
        <FlexWidget style={{ width: rightW, flexDirection: 'column' }}>
          <Row w={rightW} theme={theme} label={t.sleep} value={isNum(snap.sleepH) ? fmtNum(snap.sleepH, 1, lang) + ' ' + t.hUnit : '—'} />
          <Row w={rightW} theme={theme} label={t.stepsLabel} value={steps != null ? fmtNum(steps, 0, lang) : '—'} />
          <Row w={rightW} theme={theme} label={pulse.label} value={pulse.value} />
        </FlexWidget>
      </FlexWidget>
    </Card>
  );
}

const BUILDERS = { BodyAge: BodyAgeWidget, Readiness: ReadinessWidget, Steps: StepsWidget, DaySummary: DaySummaryWidget };

// Дерево виджета в обеих темах. Никогда не бросает: при любой ошибке — карточка «нет данных».
export function widgetFor(name, snap, dims, now) {
  const lang = snap && snap.lang === 'en' ? 'en' : 'ru';
  const today = dayKey(isNum(now) ? now : Date.now());
  const make = (theme) => {
    try {
      const B = BUILDERS[name];
      return B ? B({ snap, theme, lang, dims, today }) : EmptyCard({ theme, lang, dims });
    } catch (e) {
      return EmptyCard({ theme, lang, dims });
    }
  };
  return { light: make(LIGHT), dark: make(DARK) };
}
