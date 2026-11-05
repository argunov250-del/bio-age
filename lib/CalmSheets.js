// Панели «Дыхание 4–6» и «Цифровая пауза» (spec 3.1). Логика времени — lib/timers.js (чистая),
// здесь только отрисовка и таймеры React. Дыхание: круг растёт на вдохе (4 с) и сжимается на выдохе (6 с);
// уход в фон дольше BG_LIMIT_MS отменяет сессию без штрафа. Пауза засчитывается по честному «Получилось».
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, AppState, Easing, StyleSheet } from 'react-native';
import { Sheet, PressScale, reduceMotion } from './motion';
import { Button } from './ui';
import { light, success } from './haptics';
import {
  INHALE_S, EXHALE_S, breathState, breathTotalMs, startSession, onBackground, onForeground, completeBreath,
  pauseState, completePause,
} from './timers';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

export const PAUSE_MIN = 15;          // цифровая пауза в игре (XP от 15 минут)
export const BREATH_CHOICES = [3, 5]; // минут; 5 минут за день дают опыт
const CIRCLE = 190;

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
};

function SheetFrame({ title, onClose, children }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Sheet onClose={onClose} style={s.sheet}>
      <View style={s.grab} />
      <Text style={s.title}>{title}</Text>
      {children}
    </Sheet>
  );
}

export function BreathSheet({ onClose, defaultMinutes = BREATH_CHOICES[0] }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [mode, setMode] = useState('ready'); // ready | run | done | cancelled
  const [view, setView] = useState(() => breathState(0, defaultMinutes));
  const [result, setResult] = useState(null);
  const sess = useRef(null);
  const timer = useRef(null);
  const live = useRef(true);
  const scale = useRef(new Animated.Value(0)).current;
  const phase = view.phase;

  const stopTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  useEffect(() => () => { live.current = false; stopTimer(); }, []);

  // Фон: запоминаем уход и возвращение; слишком долгий уход отменяет сессию.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (!sess.current || mode !== 'run') return;
      const now = Date.now();
      sess.current = st === 'active' ? onForeground(sess.current, now) : onBackground(sess.current, now);
      if (sess.current.cancelled && live.current) { stopTimer(); setMode('cancelled'); }
    });
    return () => { if (sub && sub.remove) sub.remove(); };
  }, [mode]);

  // Анимация круга по фазам: вдох 4 с — растёт, выдох 6 с — сжимается.
  useEffect(() => {
    if (mode !== 'run' || reduceMotion()) return undefined;
    if (phase !== 'inhale' && phase !== 'exhale') return undefined;
    const a = Animated.timing(scale, {
      toValue: phase === 'inhale' ? 1 : 0, duration: (phase === 'inhale' ? INHALE_S : EXHALE_S) * 1000,
      easing: Easing.inOut(Easing.sin), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [mode, phase, scale]);
  useEffect(() => { if (mode === 'run' && (phase === 'inhale' || phase === 'exhale')) light(); }, [mode, phase]);

  const finish = async () => {
    stopTimer();
    const r = await completeBreath(sess.current, Date.now(), minutes).catch(() => ({ counted: false, minutes: 0 }));
    if (!live.current) return;
    if (r.counted) success();
    setResult(r);
    setMode(r.counted ? 'done' : 'cancelled');
  };
  const start = () => {
    sess.current = startSession(Date.now());
    scale.setValue(0);
    setView(breathState(0, minutes));
    setMode('run');
    stopTimer();
    timer.current = setInterval(() => {
      const e = Date.now() - sess.current.startedAt;
      const st = breathState(e, minutes);
      setView(st);
      if (st.done) finish();
    }, 250);
  };
  const stop = () => { stopTimer(); sess.current = null; setMode('ready'); setView(breathState(0, minutes)); };

  const label = mode !== 'run' ? '' : phase === 'inhale' ? tr('Вдох') : phase === 'exhale' ? tr('Выдох') : '';
  const total = Math.round(breathTotalMs(minutes) / 1000 / (INHALE_S + EXHALE_S));
  const sc = reduceMotion()
    ? (phase === 'inhale' ? 1 : 0.55)
    : scale.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return (
    <SheetFrame title={tr('Дыхание 4–6')} onClose={onClose}>
      <View style={s.stage}>
        <Animated.View style={[s.circle, { transform: [{ scale: sc }] }]} />
        <View style={s.stageText} pointerEvents="none">
          <Text style={s.phase}>{mode === 'run' ? label : mode === 'done' ? tr('Готово') : '4 · 6'}</Text>
          {mode === 'run' ? <Text style={s.sub}>{mmss(view.remainingMs)}  ·  {Math.min(total, Math.floor(view.cycle) + 1) + ' / ' + total}</Text> : null}
        </View>
      </View>
      {mode === 'ready' ? (
        <>
          <Text style={s.text}>{tr('Вдох на 4, выдох на 6. Просто следуй за кругом. Экран держи открытым.')}</Text>
          <View style={s.choices}>
            {BREATH_CHOICES.map((m) => (
              <PressScale key={m} onPress={() => setMinutes(m)} style={[s.choice, minutes === m && s.choiceOn]}>
                <Text style={[s.choiceText, minutes === m && s.choiceTextOn]}>{m + ' ' + tr('мин')}</Text>
              </PressScale>
            ))}
          </View>
          <Button title={tr('Начать')} onPress={start} />
        </>
      ) : null}
      {mode === 'run' ? <Button title={tr('Остановить')} onPress={stop} secondary /> : null}
      {mode === 'done' ? (
        <>
          <Text style={s.text}>{tr('Записано: ') + (result ? result.minutes : 0) + ' ' + tr('мин') + '. ' + tr('Опыт за дыхание идёт от 5 минут за день, сеансы складываются.')}</Text>
          <Button title={tr('Закрыть')} onPress={onClose} />
        </>
      ) : null}
      {mode === 'cancelled' ? (
        <>
          <Text style={s.text}>{tr('Сеанс прервался, это нормально: ничего не потеряно. Можно начать заново, когда будет время.')}</Text>
          <Button title={tr('Начать заново')} onPress={start} />
        </>
      ) : null}
      <Text style={s.note}>{tr('Если закружилась голова, дыши как обычно и остановись.')}</Text>
    </SheetFrame>
  );
}

// Незавершённая пауза переживает закрытие панели (в памяти, пока приложение живо).
const PAUSE = { startedAt: null };
export const _resetPause = () => { PAUSE.startedAt = null; };

export function PauseSheet({ onClose, onChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [started, setStarted] = useState(PAUSE.startedAt);
  const [now, setNow] = useState(() => Date.now());
  const [stage, setStage] = useState('idle'); // idle | run | early | result
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    if (!started) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [started]);
  const st = started ? pauseState(started, now, PAUSE_MIN) : null;
  const begin = () => { PAUSE.startedAt = Date.now(); setStarted(PAUSE.startedAt); setNow(PAUSE.startedAt); setStage('run'); light(); };
  const clear = () => { PAUSE.startedAt = null; setStarted(null); setStage('idle'); if (onChange) onChange(); };
  const confirm = async () => {
    const r = await completePause(started, Date.now(), true, PAUSE_MIN).catch(() => ({ counted: false }));
    PAUSE.startedAt = null; setStarted(null);
    if (r.counted) success();
    setCounted(!!r.counted); setStage('result');
    if (onChange) onChange();
  };
  const running = !!started && stage !== 'result';
  return (
    <SheetFrame title={tr('Цифровая пауза')} onClose={onClose}>
      {stage === 'result' ? (
        <>
          <Text style={s.text}>{counted ? tr('Записано: 15 мин без телефона. Спасибо, что выделил(а) это время.') : tr('Ничего страшного. В другой раз получится.')}</Text>
          <Button title={tr('Закрыть')} onPress={onClose} />
        </>
      ) : !running ? (
        <>
          <Text style={s.big}>{PAUSE_MIN + ' ' + tr('мин')}</Text>
          <Text style={s.text}>{tr('Пятнадцать минут без телефона. Поставь таймер и отложи экран. По окончании честно отметь, получилось ли.')}</Text>
          <Button title={tr('Начать')} onPress={begin} />
        </>
      ) : st && st.done ? (
        <>
          <Text style={s.big}>{tr('Время вышло')}</Text>
          <Text style={s.text}>{tr('Получилось не пользоваться телефоном?')}</Text>
          <Button title={tr('Получилось')} onPress={confirm} />
          <Button title={tr('Не получилось')} onPress={clear} secondary />
        </>
      ) : stage === 'early' ? (
        <>
          <Text style={s.text}>{tr('Закончить раньше? Без штрафа, просто пауза не засчитается.')}</Text>
          <Button title={tr('Закончить')} onPress={clear} />
          <Button title={tr('Продолжить')} onPress={() => setStage('run')} secondary />
        </>
      ) : (
        <>
          <Text style={s.big}>{mmss(st ? st.remainingMs : 0)}</Text>
          <Text style={s.text}>{tr('Отложи телефон. Таймер идёт, вернись, когда время выйдет.')}</Text>
          <Button title={tr('Закончить раньше')} onPress={() => setStage('early')} secondary />
        </>
      )}
    </SheetFrame>
  );
}

const makeStyles = (c) => StyleSheet.create({
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, gap: 12, borderWidth: c.border, borderColor: c.line },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line, marginBottom: 2 },
  title: { color: c.text, fontSize: SIZES.title - 2, fontWeight: '700' },
  stage: { height: CIRCLE + 10, alignItems: 'center', justifyContent: 'center' },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: c.accent, opacity: 0.35, position: 'absolute' },
  stageText: { alignItems: 'center' },
  phase: { color: c.text, fontSize: SIZES.title, fontWeight: '800' },
  sub: { color: c.sub, fontSize: SIZES.small, marginTop: 2 },
  big: { color: c.text, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  text: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 20, textAlign: 'center' },
  note: { color: c.muted, fontSize: SIZES.tiny + 1, textAlign: 'center' },
  choices: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  choice: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: c.cardAlt, borderWidth: c.border, borderColor: c.line },
  choiceOn: { backgroundColor: c.primary },
  choiceText: { color: c.text, fontSize: SIZES.small, fontWeight: '700' },
  choiceTextOn: { color: c.onPrimary },
});
