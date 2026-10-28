import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StatusBar, Animated, Easing } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from './lib/ErrorScreen';
import { THEMES, TAB_MS } from './lib/theme';
import { ColorsContext } from './lib/colors';
import { tr } from './lib/i18n';
import { loadProfile, saveProfile, loadResult, saveResult, loadLabs, saveLabs } from './lib/storage';
import { sdkStatus, init, grantedTypes, askPermissions, RECORD_TYPES, EXTRA_TYPES } from './lib/health';
import { loadDataset, summarize, series, ageAt, HISTORY_DAYS, RECENT_DAYS } from './lib/metrics';
import { corrections, pace } from './lib/formula';
import { advice } from './lib/advice';
import { computeMetrics } from './lib/windows';
import { NAV_TABS } from './lib/layout';
import { TabBar, FadeIn } from './lib/ui';
import { IconHome, IconActivity, IconProfile, IconLabs } from './lib/icons';
import { LaunchScreen } from './lib/screens/LaunchScreen';
import { SetupScreen } from './lib/screens/SetupScreen';
import { PermissionsScreen } from './lib/screens/PermissionsScreen';
import { NoHealthConnectScreen } from './lib/screens/NoHealthConnectScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { MetricsScreen } from './lib/screens/MetricsScreen';
import { LabsScreen, LabEntryScreen } from './lib/screens/LabsScreen';
import { calcEntry } from './lib/clinical';
import { LifestyleScreen } from './lib/screens/LifestyleScreen';
import { ProfileScreen } from './lib/screens/ProfileScreen';
import { BreakdownScreen } from './lib/screens/BreakdownScreen';
import { DebugScreen } from './lib/screens/DebugScreen';

function compute(ds, profile) {
  const p = { age: ageAt(profile.birth, ds.now), sex: profile.sex };
  const v180 = summarize(ds, profile, HISTORY_DAYS);
  const v30 = summarize(ds, profile, RECENT_DAYS);
  const corr180 = corrections(v180, p);
  const corr30 = corrections(v30, p);
  // Биовозраст по неделям: каждую неделю — по данным за 30 дней до её конца.
  const trend = [];
  for (let w = 25; w >= 0; w--) {
    const end = new Date(ds.now.getTime() - w * 7 * 86400000);
    const v = summarize(ds, profile, RECENT_DAYS, end);
    if (!Object.values(v).some((x) => x.ok)) continue;
    const age = ageAt(profile.birth, end);
    trend.push({ t: end.getTime(), v: age + corrections(v, { age, sex: profile.sex }).total });
  }
  return {
    v180, v30, corr180, corr30, chrono: p.age, bio: p.age + corr180.total, pace: pace(v180, v30, p),
    trend, series: series(ds), advice: advice(v180, corr180, p),
    metrics: computeMetrics(ds, profile), computedAt: new Date().toISOString(),
  };
}

const TABS = [
  { key: 'home', title: tr('Обзор'), Icon: IconHome, theme: 'steel' },
  { key: 'metrics', title: tr('Метрики'), Icon: IconActivity, theme: 'forest' },
  ...(NAV_TABS === 4 ? [{ key: 'labs', title: tr('Анализы'), Icon: IconLabs, theme: 'teal' }] : []),
  { key: 'profile', title: tr('Профиль'), Icon: IconProfile, theme: 'plum' },
];
const TAB_KEYS = TABS.map((t) => t.key);
// Цвет, плавно перетекающий между палитрами вкладок.
const tabColor = (anim, key) => anim.interpolate({ inputRange: TABS.map((_, i) => i), outputRange: TABS.map((t) => THEMES[t.theme][key]) });

function Main() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('intro');
  const [tab, setTab] = useState('home');
  const tabIndex = TAB_KEYS.indexOf(tab);
  const tabAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(tabAnim, { toValue: tabIndex, duration: TAB_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [tabIndex, tabAnim]);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [sdk, setSdk] = useState('');
  const [granted, setGranted] = useState(new Set());
  const [dataset, setDataset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [labs, setLabs] = useState([]);
  const [labEntry, setLabEntry] = useState(null);
  // Пока идёт приветствие, проверки Health Connect уже работают в фоне;
  // куда идти дальше, запоминаем и переходим, когда приветствие закончится.
  const introDone = useRef(false);
  const pendingRoute = useRef('home');
  const go = useCallback((route) => {
    if (introDone.current) setScreen(route);
    else pendingRoute.current = route;
  }, []);

  const load = useCallback(async (prof, g) => {
    setLoading(true);
    setError('');
    try {
      const ds = await loadDataset(g, prof);
      const r = compute(ds, prof);
      setDataset(ds);
      setResult(r);
      saveResult(r);
    } catch (e) {
      setError(tr('Ошибка: ') + String((e && e.message) || e));
    }
    setLoading(false);
  }, []);

  // Проверка Health Connect и разрешений, затем загрузка.
  const start = useCallback(async (prof) => {
    setLoading(true);
    const st = await sdkStatus();
    setSdk(st);
    if (st !== 'ok') {
      setLoading(false);
      return go('nohc');
    }
    try {
      await init();
      const g = await grantedTypes();
      setGranted(g);
      if (!RECORD_TYPES.some((t) => g.has(t))) {
        setLoading(false);
        return go('permissions');
      }
      go('home');
      load(prof, g);
    } catch (e) {
      setError(tr('Ошибка: ') + String((e && e.message) || e));
      setLoading(false);
      go('home');
    }
  }, [go, load]);

  // Профиль и последний расчёт — сразу при запуске, пока крутится экран загрузки.
  useEffect(() => {
    Promise.all([loadProfile(), loadResult(), loadLabs()]).then(([p, r, l]) => {
      setProfile(p);
      if (r) setResult(r);
      setLabs(l);
      setReady(true);
      if (p) start(p);
    });
  }, [start]);

  const onIntroDone = useCallback(() => {
    introDone.current = true;
    setScreen(profile ? pendingRoute.current : 'setup');
  }, [profile]);

  const goHome = useCallback(() => {
    if (screen === 'home' && tab !== 'home') {
      setTab('home');
      return true;
    }
    if (screen === 'labEntry') {
      setScreen(NAV_TABS === 4 ? 'home' : 'labs');
      return true;
    }
    if (['breakdown', 'debug', 'labs', 'lifestyle'].includes(screen) || (screen === 'setup' && profile) || (screen === 'permissions' && granted.size)) {
      setScreen('home');
      return true;
    }
    return false;
  }, [screen, tab, profile, granted]);

  // Вкладки открываются как вкладки, остальное — отдельными экранами поверх.
  const open = useCallback((key) => {
    if (TAB_KEYS.includes(key)) {
      setTab(key);
      setScreen('home');
    } else setScreen(key);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goHome);
    return () => sub.remove();
  }, [goHome]);

  const onSaveProfile = async (p) => {
    await saveProfile(p);
    setProfile(p);
    // Возраст на дату анализов зависит от даты рождения — пересчитываем Clinical BioAge.
    if (labs.length) {
      const next = labs.map((e) => ({ ...e, calc: calcEntry(e, p) }));
      setLabs(next);
      saveLabs(next);
    }
    setScreen('home');
    start(p);
  };

  const onRequest = async () => {
    setLoading(true);
    try {
      const g = await askPermissions();
      setGranted(g);
      setLoading(false);
      if (RECORD_TYPES.some((t) => g.has(t))) {
        setScreen('home');
        load(profile, g);
      }
    } catch (e) {
      setLoading(false);
      setError(tr('Ошибка: ') + String((e && e.message) || e));
    }
  };

  const back = granted.size ? () => setScreen('home') : undefined;

  // Профиль без перезагрузки данных (единицы, образ жизни).
  const saveQuiet = async (p) => {
    await saveProfile(p);
    setProfile(p);
  };
  const labsBack = () => setScreen(NAV_TABS === 4 ? 'home' : 'labs');
  const editLab = (e) => {
    setLabEntry(e);
    setScreen('labEntry');
  };
  const saveLab = async (e) => {
    const next = [...labs.filter((x) => x.id !== e.id), e];
    setLabs(next);
    await saveLabs(next);
    labsBack();
  };
  const deleteLab = async (e) => {
    const next = labs.filter((x) => x.id !== e.id);
    setLabs(next);
    await saveLabs(next);
    labsBack();
  };
  const missingAccess = granted.size > 0 && EXTRA_TYPES.some((t) => !granted.has(t));

  switch (screen) {
    case 'intro':
      return <LaunchScreen ready={ready} firstRun={ready && !profile} onDone={onIntroDone} />;
    case 'setup':
      return <SetupScreen profile={profile} onSave={onSaveProfile} onBack={profile ? () => setScreen('home') : undefined} />;
    case 'nohc':
      return <NoHealthConnectScreen status={sdk} onRetry={() => start(profile)} />;
    case 'permissions':
      return <PermissionsScreen onRequest={onRequest} onBack={back} busy={loading} granted={[...granted].length} />;
    case 'breakdown':
      return <BreakdownScreen result={result} profile={{ age: result.chrono, sex: profile.sex }} onBack={() => setScreen('home')} />;
    case 'debug':
      return <DebugScreen granted={granted} sdk={sdk} dataset={dataset} onBack={() => setScreen('home')} />;
    case 'labs':
      return (
        <ColorsContext.Provider value={THEMES.teal}>
          <LabsScreen labs={labs} onAdd={editLab} onEdit={editLab} onBack={() => setScreen('home')} />
        </ColorsContext.Provider>
      );
    case 'labEntry':
      return (
        <ColorsContext.Provider value={THEMES.teal}>
          <LabEntryScreen entry={labEntry} profile={profile} onSave={saveLab} onDelete={deleteLab} onBack={labsBack} />
        </ColorsContext.Provider>
      );
    case 'lifestyle':
      return (
        <ColorsContext.Provider value={THEMES.plum}>
          <LifestyleScreen profile={profile} onBack={() => setScreen('home')} onSave={async (p) => { await saveQuiet(p); setScreen('home'); }} />
        </ColorsContext.Provider>
      );
    default: {
      const theme = THEMES[TABS[tabIndex].theme];
      return (
        <Animated.View style={{ flex: 1, backgroundColor: tabColor(tabAnim, 'bg') }}>
          <ColorsContext.Provider value={theme}>
            <FadeIn key={tab}>
              {tab === 'metrics' ? (
                <MetricsScreen result={result} profile={profile} loading={loading} onRefresh={() => start(profile)}
                  missingAccess={missingAccess} onAskAccess={onRequest} />
              ) : tab === 'labs' ? (
                <LabsScreen tab labs={labs} onAdd={editLab} onEdit={editLab} />
              ) : tab === 'profile' ? (
                <ProfileScreen profile={profile} loading={loading} onOpen={open} onReload={() => start(profile)}
                  onSaveProfile={saveQuiet} labsInside={NAV_TABS !== 4} />
              ) : (
                <HomeScreen result={result} loading={loading} error={error} onOpen={open} onRefresh={() => start(profile)} labs={labs} />
              )}
            </FadeIn>
          </ColorsContext.Provider>
          <TabBar
            tabs={TABS}
            active={tab}
            onChange={setTab}
            bottom={insets.bottom + 8}
            bg={tabColor(tabAnim, 'card')}
            pill={tabColor(tabAnim, 'accent')}
            iconOn={theme.onAccent}
            iconOff={theme.sub}
            textOn={theme.text}
            textOff={theme.sub}
          />
        </Animated.View>
      );
    }
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
