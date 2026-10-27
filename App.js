import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './lib/ErrorScreen';
import { SPLASH } from './lib/theme';
import { tr } from './lib/i18n';
import { loadProfile, saveProfile } from './lib/storage';
import { sdkStatus, init, grantedTypes, askPermissions, RECORD_TYPES } from './lib/health';
import { loadDataset, summarize, ageAt, HISTORY_DAYS, RECENT_DAYS } from './lib/metrics';
import { corrections, pace } from './lib/formula';
import { LaunchScreen } from './lib/screens/LaunchScreen';
import { SetupScreen } from './lib/screens/SetupScreen';
import { PermissionsScreen } from './lib/screens/PermissionsScreen';
import { NoHealthConnectScreen } from './lib/screens/NoHealthConnectScreen';
import { HomeScreen } from './lib/screens/HomeScreen';
import { BreakdownScreen } from './lib/screens/BreakdownScreen';
import { DebugScreen } from './lib/screens/DebugScreen';

function compute(ds, profile) {
  const p = { age: ageAt(profile.birth, ds.now), sex: profile.sex };
  const v180 = summarize(ds, profile, HISTORY_DAYS);
  const v30 = summarize(ds, profile, RECENT_DAYS);
  const corr180 = corrections(v180, p);
  const corr30 = corrections(v30, p);
  return { v180, v30, corr180, corr30, chrono: p.age, bio: p.age + corr180.total, pace: pace(v180, v30, p) };
}

function Main() {
  const [screen, setScreen] = useState('boot');
  const [profile, setProfile] = useState(null);
  const [sdk, setSdk] = useState('');
  const [granted, setGranted] = useState(new Set());
  const [dataset, setDataset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (prof, g) => {
    setLoading(true);
    setError('');
    try {
      const ds = await loadDataset(g, prof, setProgress);
      setDataset(ds);
      setResult(compute(ds, prof));
    } catch (e) {
      setError(tr('Ошибка: ') + String((e && e.message) || e));
    }
    setProgress('');
    setLoading(false);
  }, []);

  // Проверка Health Connect и разрешений, затем загрузка.
  const start = useCallback(async (prof) => {
    const st = await sdkStatus();
    setSdk(st);
    if (st !== 'ok') return setScreen('nohc');
    try {
      await init();
      const g = await grantedTypes();
      setGranted(g);
      if (!RECORD_TYPES.some((t) => g.has(t))) return setScreen('permissions');
      setScreen('home');
      load(prof, g);
    } catch (e) {
      setError(tr('Ошибка: ') + String((e && e.message) || e));
      setScreen('home');
    }
  }, [load]);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setLoaded(true);
    });
  }, []);

  // Приветственный экран закончился: дальше профиль или проверка Health Connect.
  const onWelcomeDone = useCallback(() => {
    if (profile) start(profile);
    else setScreen('setup');
  }, [profile, start]);

  const goHome = useCallback(() => {
    if (screen === 'breakdown' || screen === 'debug' || (screen === 'setup' && profile) || (screen === 'permissions' && granted.size)) {
      setScreen('home');
      return true;
    }
    return false;
  }, [screen, profile, granted]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goHome);
    return () => sub.remove();
  }, [goHome]);

  const onSaveProfile = async (p) => {
    await saveProfile(p);
    setProfile(p);
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
    case 'boot':
      return <LaunchScreen firstRun={loaded && !profile} onDone={loaded ? onWelcomeDone : null} />;
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
    default:
      return (
        <HomeScreen
          result={result}
          loading={loading}
          progress={progress}
          error={error}
          onReload={() => start(profile)}
          onOpen={setScreen}
        />
      );
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={SPLASH.bg} />
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
