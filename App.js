import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StatusBar, Animated, Easing } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from './lib/ErrorScreen';
import { THEMES, TAB_MS } from './lib/theme';
import { ColorsContext } from './lib/colors';
import { tr } from './lib/i18n';
import { loadProfile, saveProfile, loadResult, saveResult, purgeLabs, loadEntries, saveEntries } from './lib/storage';
import { applyManual } from './lib/manual';
import { sdkStatus, init, grantedTypes, askPermissions, RECORD_TYPES, EXTRA_TYPES } from './lib/health';
import { loadDataset, summarize, series, ageAt, HISTORY_DAYS, RECENT_DAYS } from './lib/metrics';
import { corrections, pace } from './lib/formula';
import { advice } from './lib/advice';
import { computeMetrics } from './lib/windows';
import { computeScores } from './lib/scores';
import { buildDetail } from './lib/details';
import { NAV_TABS } from './lib/layout';
import { TabBar, FadeIn } from './lib/ui';
import { IconHome, IconActivity, IconProfile, IconWorkout } from './lib/icons';
import { LaunchScreen } from './lib/screens/LaunchScreen';
import { SetupScreen } from './lib/screens/SetupScreen';
import { PermissionsScreen } from './lib/screens/PermissionsScreen';
import { NoHealthConnectScreen } from './lib/screens/NoHealthConnectScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { MetricsScreen } from './lib/screens/MetricsScreen';
import { WorkoutsScreen } from './lib/screens/WorkoutsScreen';
import { ProfileScreen } from './lib/screens/ProfileScreen';
import { DetailScreen } from './lib/screens/DetailScreen';
import { TipsScreen } from './lib/screens/TipsScreen';
import { LogScreen } from './lib/screens/LogScreen';
import { recommend } from './lib/recommend';
import { DebugScreen } from './lib/screens/DebugScreen';

function compute(ds, profile) {
  const p = { age: ageAt(profile.birth, ds.now), sex: profile.sex };
  const v180 = summarize(ds, profile, HISTORY_DAYS);
  const v30 = summarize(ds, profile, RECENT_DAYS);
  const corr180 = corrections(v180, p);
  const corr30 = corrections(v30, p);
  // Возраст образа жизни по неделям: каждую неделю — по данным за 30 дней до её конца.
  const trend = [];
  for (let w = 25; w >= 0; w--) {
    const end = new Date(ds.now.getTime() - w * 7 * 86400000);
    const v = summarize(ds, profile, RECENT_DAYS, end);
    if (!Object.values(v).some((x) => x.ok)) continue;
    const age = ageAt(profile.birth, end);
    trend.push({ t: end.getTime(), v: age + corrections(v, { age, sex: profile.sex }).total });
  }
  const metrics = computeMetrics(ds, profile);
  return {
    v180, v30, corr180, corr30, chrono: p.age, bio: p.age + corr180.total, pace: pace(v180, v30, p),
    trend, series: series(ds), advice: advice(v180, corr180, p),
    metrics, scores: computeScores(ds, metrics), computedAt: new Date().toISOString(),
  };
}

// Вкладки. «Профиль» — в той же гамме, что «Обзор».
const TABS = [
  { key: 'home', title: tr('Обзор'), Icon: IconHome, theme: 'steel' },
  { key: 'metrics', title: tr('Метрики'), Icon: IconActivity, theme: 'forest' },
  ...(NAV_TABS === 4 ? [{ key: 'workouts', title: tr('Тренировки'), Icon: IconWorkout, theme: 'teal' }] : []),
  { key: 'profile', title: tr('Профиль'), Icon: IconProfile, theme: 'steel' },
];
const TAB_KEYS = TABS.map((t) => t.key);
const THEME_OF = Object.fromEntries(TABS.map((t) => [t.key, t.theme]));
// Цвет, плавно перетекающий между палитрами вкладок.
const tabColor = (anim, key) => anim.interpolate({ inputRange: TABS.map((_, i) => i), outputRange: TABS.map((t) => THEMES[t.theme][key]) });

function Main() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState('intro');
  const [tab, setTab] = useState('home');
  // Подробный экран: { key, arg, from } — палитра берётся от вкладки, с которой открыли.
  const [detail, setDetail] = useState(null);
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
  const [entries, setEntries] = useState([]);
  const entriesRef = useRef([]);
  const [logType, setLogType] = useState(null);
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
      const ds = applyManual(await loadDataset(g, prof), entriesRef.current);
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
    // Без Health Connect приложение работает на ручных записях.
    const manualOnly = () => {
      setGranted(new Set());
      go('home');
      load(prof, new Set());
    };
    if (st !== 'ok') {
      if (prof.skipHC) return manualOnly();
      setLoading(false);
      return go('nohc');
    }
    try {
      await init();
      const g = await grantedTypes();
      setGranted(g);
      if (!RECORD_TYPES.some((t) => g.has(t))) {
        if (prof.skipHC) return manualOnly();
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
  // Старые результаты анализов (раздел удалён) стираем с телефона.
  useEffect(() => {
    purgeLabs();
    Promise.all([loadProfile(), loadResult(), loadEntries()]).then(([p, r, e]) => {
      setProfile(p);
      if (r) setResult(r);
      entriesRef.current = e;
      setEntries(e);
      setReady(true);
      if (p) start(p);
    });
  }, [start]);

  const onIntroDone = useCallback(() => {
    introDone.current = true;
    setScreen(profile ? pendingRoute.current : 'setup');
  }, [profile]);

  // Открыть вкладку, подробный экран («detail:sleep», «workout:3») или отдельный экран.
  const open = useCallback((key) => {
    if (TAB_KEYS.includes(key)) {
      setTab(key);
      setScreen('home');
    } else if (key.startsWith('log')) {
      setLogType(key.split(':')[1] || null);
      setScreen('log');
    } else if (key.startsWith('detail:') || key.startsWith('workout:')) {
      const [kind, arg] = key.split(':');
      setDetail({ key: kind === 'workout' ? 'workout' : arg, arg: kind === 'workout' ? +arg : null, from: screen === 'workouts' ? 'workouts' : tab });
      setScreen('detail');
    } else setScreen(key);
  }, [tab, screen]);

  const goBack = useCallback(() => {
    if (screen === 'detail') {
      setScreen(detail && detail.from === 'workouts' && NAV_TABS !== 4 ? 'workouts' : 'home');
      return true;
    }
    if (screen === 'home' && tab !== 'home') {
      setTab('home');
      return true;
    }
    if (['debug', 'workouts', 'tips', 'log'].includes(screen) || (screen === 'setup' && profile) || (screen === 'permissions' && granted.size)) {
      setScreen('home');
      return true;
    }
    return false;
  }, [screen, tab, detail, profile, granted]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  const onSaveProfile = async (p) => {
    await saveProfile(p);
    setProfile(p);
    setScreen('home');
    start(p);
  };

  // Профиль без перезагрузки данных (единицы измерения).
  const saveQuiet = async (p) => {
    await saveProfile(p);
    setProfile(p);
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

  // Ручные записи: сохранить и пересчитать.
  const setAllEntries = (next) => {
    entriesRef.current = next;
    setEntries(next);
    saveEntries(next);
    start(profile);
  };
  const addEntry = (e) => setAllEntries([...entriesRef.current, e]);
  const deleteEntry = (e) => setAllEntries(entriesRef.current.filter((x) => x.id !== e.id));
  // Продолжить без Health Connect — только ручные записи.
  const skipHC = async () => {
    const p = { ...profile, skipHC: true };
    await saveProfile(p);
    setProfile(p);
    setScreen('home');
    start(p);
  };
  const missingAccess = granted.size > 0 && EXTRA_TYPES.some((t) => !granted.has(t));
  const refresh = () => start(profile);

  switch (screen) {
    case 'intro':
      return <LaunchScreen ready={ready} firstRun={ready && !profile} onDone={onIntroDone} />;
    case 'setup':
      return <SetupScreen profile={profile} onSave={onSaveProfile} onBack={profile ? () => setScreen('home') : undefined} />;
    case 'nohc':
      return <NoHealthConnectScreen status={sdk} onRetry={refresh} onSkip={skipHC} />;
    case 'permissions':
      return <PermissionsScreen onRequest={onRequest} onBack={back} busy={loading} granted={[...granted].length} onSkip={granted.size ? undefined : skipHC} />;
    case 'debug':
      return <DebugScreen granted={granted} sdk={sdk} dataset={dataset} onBack={() => setScreen('home')} />;
    case 'log':
      return (
        <ColorsContext.Provider value={THEMES.steel}>
          <LogScreen entries={entries} profile={profile} initialType={logType} onSave={addEntry} onDelete={deleteEntry} onBack={goBack} />
        </ColorsContext.Provider>
      );
    case 'tips':
      return (
        <ColorsContext.Provider value={THEMES.steel}>
          <TipsScreen rec={recommend(result, profile)} onBack={goBack} />
        </ColorsContext.Provider>
      );
    case 'workouts':
      return (
        <ColorsContext.Provider value={THEMES.teal}>
          <WorkoutsScreen result={result} loading={loading} onOpen={open} onBack={() => setScreen('home')} />
        </ColorsContext.Provider>
      );
    case 'detail': {
      const w = detail.key === 'workout' && result && result.series ? result.series.workouts[detail.arg] : null;
      return (
        <ColorsContext.Provider value={THEMES[THEME_OF[detail.from] || 'teal']}>
          <DetailScreen detail={buildDetail(detail.key, result, profile, w)} onBack={goBack} />
        </ColorsContext.Provider>
      );
    }
    default: {
      const theme = THEMES[TABS[tabIndex].theme];
      return (
        <Animated.View style={{ flex: 1, backgroundColor: tabColor(tabAnim, 'bg') }}>
          <ColorsContext.Provider value={theme}>
            <FadeIn key={tab}>
              {tab === 'metrics' ? (
                <MetricsScreen result={result} profile={profile} loading={loading} onRefresh={refresh}
                  missingAccess={missingAccess} onAskAccess={onRequest} onOpen={open} />
              ) : tab === 'workouts' ? (
                <WorkoutsScreen result={result} loading={loading} onRefresh={refresh} onOpen={open} />
              ) : tab === 'profile' ? (
                <ProfileScreen profile={profile} loading={loading} onOpen={open} onReload={refresh}
                  onSaveProfile={saveQuiet} workoutsInside={NAV_TABS !== 4} />
              ) : (
                <HomeScreen result={result} profile={profile} loading={loading} error={error} onOpen={open} onRefresh={refresh} />
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
