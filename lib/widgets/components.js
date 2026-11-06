"use no memo";
// Виджеты домашнего экрана (react-native-android-widget). Чистые функции: снимок + тема + размеры -> дерево.
// Без хуков и без состояния: библиотека вызывает функции сама и переводит дерево в нативные View.
// Тема: каждый виджет рисуется дважды (светлая и тёмная палитры), а какую показать — решает сам
// Android по системной теме (библиотека принимает { light, dark }), поэтому JS системную тему не читает.
import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { dayKey } from './snapshot';

export const WIDGET_NAMES = ['BodyAge', 'Readiness', 'Steps', 'DaySummary'];

export const LIGHT = { bg: '#FFFFFF', text: '#111111', muted: '#6B7280', track: '#E7EAEE', chip: '#F0F2F4', accent: '#2BB673', warn: '#E08A1E', border: '#E7EAEE' };
export const DARK = { bg: '#111111', text: '#FFFFFF', muted: '#A1A7AF', track: '#2B2B2B', chip: '#232323', accent: '#2BB673', warn: '#F0A040', border: '#111111' };

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


// Ссылки по нажатию (схема задаётся в CI: expo.scheme = 'epimely'); разбор — lib/widgets/links.js.
export const LINKS = { BodyAge: 'epimely://tab/home', Readiness: 'epimely://detail/readiness', Steps: 'epimely://detail/activity', DaySummary: 'epimely://tab/growth' };
const clickFor = (name) => ({ clickAction: 'OPEN_URI', clickActionData: { uri: LINKS[name] || 'epimely://tab/home' } });

// Спарклайн-область за последние дни (как на плитках главного экрана): линия и мягкая заливка.
export function sparkSvg(values, w, h, theme) {
  const v = (Array.isArray(values) ? values : []).filter(isNum);
  if (v.length < 2 || !(w > 0) || !(h > 0)) return '';
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const pad = 3;
  const pts = v.map((y, i) => [(i / (v.length - 1)) * w, hi === lo ? h / 2 : pad + (1 - (y - lo) / span) * (h - 2 * pad)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></linearGradient></defs><path d="${line} L${w} ${h} L0 ${h} Z" fill="url(#g)"/><path d="${line}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const ICONS = {
  body: '<circle cx="12" cy="6" r="3"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  growth: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
};
// Значок в круглой «таблетке», как на главном экране.
export function chipSvg(icon, size, theme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="${theme.chip}"/><g transform="translate(9 9)" fill="none" stroke="${theme.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ''}</g></svg>`;
}

// Оценка ширины текста (dp): нужна, чтобы дать тексту явную ширину; сжатие и «…» делает сам TextView — слова не рвутся.
const est = (text, size, k = 0.58) => Math.ceil(String(text).length * size * k) + 2;
const size = (dims, wd, hd) => ({
  w: isNum(dims && dims.width) && dims.width > 0 ? dims.width : wd,
  h: isNum(dims && dims.height) && dims.height > 0 ? dims.height : hd,
});
// Однострочный текст: помещается целиком (шрифт сжимается), иначе обрезается «…», но не переносится посреди слова.
const Fit = ({ text, w, size: fs, color, bold, align }) => (
  <TextWidget text={String(text)} maxLines={1} truncate="END"
    style={{ width: Math.max(8, Math.floor(w)), fontSize: fs, color, fontWeight: bold ? 'bold' : 'normal', textAlign: align || 'left', adjustsFontSizeToFit: true }} />
);

const Chip = ({ icon, theme, s = 28 }) => <SvgWidget svg={chipSvg(icon, s, theme)} style={{ width: s, height: s }} />;
const Pill = ({ text, theme, color }) => {
  const c = color || theme.accent;
  return (
    <FlexWidget style={{ borderWidth: 1.5, borderColor: c, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 2 }}>
      <Fit text={text} w={est(text, 13, 0.6)} size={13} color={c} />
    </FlexWidget>
  );
};
const pillW = (text) => est(text, 13, 0.6) + 18 + 3;

const Card = ({ theme, pad, center, children, label, link }) => (
  <FlexWidget
    {...link}
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

const Brand = ({ theme, w }) => <Fit text="EPIMELY" w={w || 44} size={8} color={theme.muted} bold align="right" />;

// «Нет данных — открой приложение».
export function EmptyCard({ theme, lang, dims, link }) {
  return (
    <Card theme={theme} pad={12} center label={T(lang).noData} link={link || clickFor('BodyAge')}>
      <TextWidget text="EPIMELY" style={{ fontSize: 8, fontWeight: 'bold', letterSpacing: 1.5, color: theme.muted, marginBottom: 6 }} />
      <TextWidget text={T(lang).noData} maxLines={3} style={{ fontSize: 11, color: theme.muted, textAlign: 'center' }} />
    </Card>
  );
}

// Плитка 2x2: значок и «таблетка» оценки, крупное число с единицей, подпись, спарклайн (если хватает высоты).
function Tile({ name, theme, lang, dims, icon, pill, pillColor, num, unit, label, spark, label2 }) {
  const sz = size(dims, 150, 150);
  const P = 12, W = sz.w - 2 * P;
  const unitW = unit ? est(unit, 12) : 0;
  const numW = Math.min(est(num, 30, 0.62), W - unitW - 4);
  const showBrand = W >= 116;
  const sh = Math.min(64, sz.h - 2 * P - 28 - 4 - 36 - 16 - 4);
  const sp = sh >= 22 ? sparkSvg(spark, W, sh, theme) : '';
  return (
    <Card theme={theme} pad={P} label={label + ' ' + num + (unit ? ' ' + unit : '')} link={clickFor(name)}>
      <FlexWidget style={{ width: W, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip icon={icon} theme={theme} />
        {pill ? <Pill text={pill} theme={theme} color={pillColor} /> : null}
      </FlexWidget>
      <FlexWidget style={{ width: W, flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        <Fit text={num} w={numW} size={30} color={theme.text} bold />
        {unit ? <FlexWidget style={{ marginLeft: 3, marginBottom: 4 }}><Fit text={unit} w={unitW} size={12} color={theme.muted} /></FlexWidget> : null}
      </FlexWidget>
      <FlexWidget style={{ width: W, flexDirection: 'row', alignItems: 'center' }}>
        <Fit text={label} w={showBrand ? W - 48 : W} size={12} color={theme.muted} />
        {showBrand ? <Brand theme={theme} w={44} /> : null}
      </FlexWidget>
      {sp ? <FlexWidget style={{ marginTop: 4 }}><SvgWidget svg={sp} style={{ width: W, height: sh }} /></FlexWidget> : null}
    </Card>
  );
}

export function BodyAgeWidget({ snap, theme, lang, dims }) {
  const t = T(lang);
  if (!snap || !isNum(snap.bio)) return <EmptyCard theme={theme} lang={lang} dims={dims} link={clickFor('BodyAge')} />;
  const older = isNum(snap.delta) && snap.delta > 0.05;
  const pill = isNum(snap.delta) ? (Math.abs(snap.delta) < 0.05 ? '0' : (snap.delta > 0 ? '+' : '−') + fmtNum(Math.abs(snap.delta), 1, lang)) : '';
  return <Tile name="BodyAge" theme={theme} lang={lang} dims={dims} icon="body" pill={pill} pillColor={older ? theme.warn : theme.accent}
    num={fmtNum(snap.bio, 1, lang)} unit={t.years} label={t.bodyAge} spark={snap.spBio} />;
}

export function ReadinessWidget({ snap, theme, lang, dims }) {
  const t = T(lang);
  if (!snap) return <EmptyCard theme={theme} lang={lang} dims={dims} link={clickFor('Readiness')} />;
  const has = isNum(snap.readiness);
  const hist = Object.keys(snap.rdHist || {}).sort().map((k) => snap.rdHist[k]);
  return <Tile name="Readiness" theme={theme} lang={lang} dims={dims} icon="bolt" pill={has ? levelWord(snap.readiness, lang) : ''}
    num={has ? String(Math.round(snap.readiness)) : '—'} unit={has ? '/100' : t.noDataShort} label={t.readiness} spark={hist} />;
}

export function StepsWidget({ snap, theme, lang, dims, today }) {
  const t = T(lang);
  const fresh = snap && isNum(snap.steps) && (!snap.day || snap.day === today);
  if (!fresh) return <EmptyCard theme={theme} lang={lang} dims={dims} link={clickFor('Steps')} />;
  const goal = isNum(snap.stepGoal) && snap.stepGoal > 0 ? snap.stepGoal : 8000;
  const pct = Math.max(0, Math.min(1, snap.steps / goal));
  const pill = Math.round(pct * 100) + '%';
  const sz = size(dims, 250, 70);
  if (sz.h >= 100) {
    // Высокий вид: плитка со спарклайном; цель — в подписи.
    return <Tile name="Steps" theme={theme} lang={lang} dims={dims} icon="pulse" pill={pill} num={fmtNum(snap.steps, 0, lang)} unit={t.steps}
      label={t.goalOf + ' ' + fmtNum(goal, 0, lang)} spark={snap.spSteps} />;
  }
  // Низкий вид 4x1: значок, число и полоса прогресса, «таблетка» справа.
  const P = 10, W = sz.w - 2 * P;
  const pw = pillW(pill);
  const mid = W - 28 - 8 - pw - 8;
  const numText = fmtNum(snap.steps, 0, lang);
  const goalText = t.goalOf + ' ' + fmtNum(goal, 0, lang);
  const gw = Math.min(est(goalText, 11), Math.max(0, mid - est(numText, 20, 0.62) - 8));
  const fill = Math.round(mid * pct);
  return (
    <Card theme={theme} pad={P} center label={t.stepsLabel + ' ' + numText} link={clickFor('Steps')}>
      <FlexWidget style={{ width: W, flexDirection: 'row', alignItems: 'center' }}>
        <Chip icon="pulse" theme={theme} />
        <FlexWidget style={{ width: mid, marginLeft: 8, marginRight: 8, flexDirection: 'column' }}>
          <FlexWidget style={{ width: mid, flexDirection: 'row', alignItems: 'flex-end' }}>
            <Fit text={numText} w={Math.min(est(numText, 20, 0.62), mid)} size={20} color={theme.text} bold />
            {gw > 24 ? <FlexWidget style={{ marginLeft: 6, marginBottom: 2 }}><Fit text={goalText} w={gw} size={11} color={theme.muted} /></FlexWidget> : null}
          </FlexWidget>
          <FlexWidget style={{ width: mid, height: 6, borderRadius: 3, backgroundColor: theme.track, flexDirection: 'row', overflow: 'hidden', marginTop: 3 }}>
            {fill > 0 ? <FlexWidget style={{ width: Math.max(6, fill), height: 6, borderRadius: 3, backgroundColor: theme.accent }} /> : null}
          </FlexWidget>
        </FlexWidget>
        <Pill text={pill} theme={theme} />
      </FlexWidget>
    </Card>
  );
}

function Stat({ w, value, label, theme }) {
  return (
    <FlexWidget style={{ width: w, flexDirection: 'column' }}>
      <Fit text={value} w={w - 4} size={17} color={theme.text} bold />
      <Fit text={label} w={w - 4} size={10} color={theme.muted} />
    </FlexWidget>
  );
}

export function DaySummaryWidget({ snap, theme, lang, dims, today }) {
  const t = T(lang);
  const sz = size(dims, 250, 120);
  const steps = snap && isNum(snap.steps) && (!snap.day || snap.day === today) ? snap.steps : null;
  const any = snap && (isNum(snap.sleepH) || steps != null || isNum(snap.restHr) || isNum(snap.hrv) || isNum(snap.level));
  if (!any) return <EmptyCard theme={theme} lang={lang} dims={dims} link={clickFor('DaySummary')} />;
  const P = 12, W = sz.w - 2 * P;
  const pill = isNum(snap.level) ? (lang === 'en' ? 'Lv ' : 'Ур. ') + snap.level : '';
  const pw = pill ? pillW(pill) : 0;
  const tw = W - 28 - 8 - pw - 8;
  const colW = Math.floor(W / 3);
  const pulse = isNum(snap.restHr) ? { label: t.restHr, value: fmtNum(snap.restHr, 0, lang) }
    : { label: t.hrv, value: isNum(snap.hrv) ? fmtNum(snap.hrv, 0, lang) + ' ' + t.ms : '—' };
  const sh = Math.min(48, sz.h - 2 * P - 28 - 6 - 34 - 4);
  const sp = sh >= 20 ? sparkSvg(snap.spSteps, W, sh, theme) : '';
  return (
    <Card theme={theme} pad={P} label="Epimely" link={clickFor('DaySummary')}>
      <FlexWidget style={{ width: W, flexDirection: 'row', alignItems: 'center' }}>
        <Chip icon="growth" theme={theme} />
        <FlexWidget style={{ width: tw, marginLeft: 8, marginRight: 8, flexDirection: 'column' }}>
          <Fit text={snap.rank || 'Epimely'} w={tw} size={14} color={theme.text} bold />
          <Fit text="EPIMELY" w={tw} size={8} color={theme.muted} bold />
        </FlexWidget>
        {pill ? <Pill text={pill} theme={theme} /> : null}
      </FlexWidget>
      <FlexWidget style={{ width: W, flexDirection: 'row', marginTop: 6 }}>
        <Stat w={colW} theme={theme} label={t.sleep} value={isNum(snap.sleepH) ? fmtNum(snap.sleepH, 1, lang) + ' ' + t.hUnit : '—'} />
        <Stat w={colW} theme={theme} label={t.stepsLabel} value={steps != null ? fmtNum(steps, 0, lang) : '—'} />
        <Stat w={colW} theme={theme} label={pulse.label} value={pulse.value} />
      </FlexWidget>
      {sp ? <FlexWidget style={{ marginTop: 4 }}><SvgWidget svg={sp} style={{ width: W, height: sh }} /></FlexWidget> : null}
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
