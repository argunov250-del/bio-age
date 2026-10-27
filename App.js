import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StatusBar, Animated, Easing } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from './lib/ErrorScreen';
import { THEMES, TAB_MS } from './lib/theme';
import { ColorsContext } from './lib/colors';
import { tr } from './lib/i18n';
import { loadProfile, saveProfile, loadResult, saveResult } from './lib/storage';
import { sdkStatus, init, grantedTypes, askPermissions, RECORD_TYPES } from './lib/health';
import { loadDataset, summarize, series, ageAt, HISTORY_DAYS, RECENT_DAYS } from './lib/metrics';
import { corrections, pace } from './lib/formula';
import { advice } from './lib/advice';
import { TabBar, FadeIn } from './lib/ui';
import { IconHome, IconActivity, IconProfile } from './lib/icons';
import { LaunchScreen } from './lib/screens/LaunchScreen';
import { SetupScreen } from './lib/screens/SetupScreen';
import { PermissionsScreen } from './lib/screens/PermissionsScreen';
import { NoHealthConnectScreen } from './lib/screens/NoHealthConnectScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { ActivityScreen } from './lib/screens/ActivityScreen';
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
  };
}

const TABS = [
  { key: 'home', title: tr('Главная'), Icon: IconHome, theme: 'steel' },
  { key: 'activity', title: tr('Активность'), Icon: IconActivity, theme: 'forest' },
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
    Promise.all([loadProfile(), loadResult()]).then(([p, r]) => {
      setProfile(p);
      if (r) setResult(r);
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
    if (screen === 'breakdown' || screen === 'debug' || (screen === 'setup' && profile) || (screen === 'permissions' && granted.size)) {
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
    default: {
      const theme = THEMES[TABS[tabIndex].theme];
      return (
        <Animated.View style={{ flex: 1, backgroundColor: tabColor(tabAnim, 'bg') }}>
          <ColorsContext.Provider value={theme}>
            <FadeIn key={tab}>
              {tab === 'activity' ? <ActivityScreen result={result} loading={loading} onRefresh={() => start(profile)} />
                : tab === 'profile' ? <ProfileScreen profile={profile} loading={loading} onOpen={open} onReload={() => start(profile)} />
                  : <HomeScreen result={result} loading={loading} error={error} onOpen={open} onRefresh={() => start(profile)} />}
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
