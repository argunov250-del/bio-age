import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StatusBar, Animated, Easing, View, AppState } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from './lib/ErrorScreen';
import { THEMES, TAB_MS } from './lib/theme';
import { ColorsContext } from './lib/colors';
import { tr, RU, setLang } from './lib/i18n';
import { loadProfile, saveProfile, loadResult, saveResult, purgeLabs, loadEntries, saveEntries, loadUnlocks, saveUnlocks, addOpen, loadDevMode, saveDevMode } from './lib/storage';
import { planEntries, lastPlanNight } from './lib/sleepPlan';
import { applyManual } from './lib/manual';
import { sdkStatus, init, grantedTypes, askPermissions, askBackground, RECORD_TYPES, EXTRA_TYPES, CYCLE_TYPES } from './lib/health';
import { loadDataset } from './lib/metrics';
import { compute } from './lib/compute';
import { buildDetail } from './lib/details';
import { TabBar, FadeIn } from './lib/ui';
import { ScreenIn } from './lib/motion';
import { IconHome, IconActivity, IconProfile, IconWorkout, IconChiron } from './lib/icons';
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
import { CoachScreen } from './lib/screens/CoachScreen';
import { CycleScreen } from './lib/screens/CycleScreen';
import { AboutDataScreen } from './lib/screens/AboutDataScreen';
import { ImportScreen } from './lib/screens/ImportScreen';
import { AchievementsScreen } from './lib/screens/AchievementsScreen';
import { evaluate, withUnlocks } from './lib/achievements';
import { RecapScreen } from './lib/screens/RecapScreen';
import { weekRecap } from './lib/recap';
import { ambienceAt, DAY } from './lib/ambience';
import { scheduleReminders, askNotifications } from './lib/reminders';
import { checkGoals } from './lib/notify';

// Фоновая задача: defineTask должен выполниться при загрузке бандла (в т.ч. при «безголовом» запуске
// системой), но сбой нативного модуля не должен убить старт приложения — поэтому require в try/catch.
let background = null;
try { background = require('./lib/background'); } catch (e) { background = null; }
const syncGoalsTask = (p) => { try { return background ? background.syncGoalsTask(p) : undefined; } catch (e) { return undefined; } };
import { setHaptics, tap, success } from './lib/haptics';
import { setLite, OLD_ANDROID } from './lib/perf';
import { getWeather } from './lib/weather';
import { setCoachWeather } from './lib/coachBrain';
import { loadImported, saveImported } from './lib/importer';
import { dayKey } from './lib/metrics';
import { recommend } from './lib/recommend';
import { DebugScreen } from './lib/screens/DebugScreen';

// Вкладки. «Профиль» — в той же гамме, что «Обзор».
const TABS = [
  { key: 'home', get title() { return tr('Обзор'); }, Icon: IconHome, theme: 'steel' },
  { key: 'metrics', get title() { return tr('Метрики'); }, Icon: IconActivity, theme: 'forest' },
  { key: 'coach', get title() { return tr('Хирон'); }, Icon: IconChiron, theme: 'steel' },
  { key: 'workouts', get title() { return tr('Тренировки'); }, Icon: IconWorkout, theme: 'teal' },
  { key: 'profile', get title() { return tr('Профиль'); }, Icon: IconProfile, theme: 'steel' },
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
  const [splash, setSplash] = useState(true);
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

  // Импорт из Apple Health (файл в памяти приложения): дополняет Health Connect.
  const importedRef = useRef(null);
  const [importInfo, setImportInfo] = useState(null);
  // Достижения: считаются из расчёта, открытые запоминаются с датой.
  const [unlocks, setUnlocks] = useState(null); // null — ещё не прочитаны

  // Открытия приложения — для сна по расписанию (открыл ночью = проснулся).
  const opensRef = useRef([]);

  // Отладка скрыта, пока не включён режим разработчика (7 нажатий на версию в профиле) или это dev-сборка.
  const isDevBuild = typeof __DEV__ !== 'undefined' && !!__DEV__;
  const [devSaved, setDevSaved] = useState(false);
  const devMode = isDevBuild || devSaved;
  useEffect(() => { loadDevMode().then(setDevSaved); }, []);
  const setDevMode = useCallback((on) => { setDevSaved(on); saveDevMode(on); }, []);
  const profileRef = useRef(null);

  const load = useCallback(async (prof, g) => {
    setLoading(true);
    setError('');
    try {
      // Ручные записи важнее ночей по расписанию; Health Connect важнее и тех, и других.
      const plan = planEntries(prof && prof.sleepPlan, opensRef.current);
      const ds = applyManual(await loadDataset(g, prof, undefined, importedRef.current), [...entriesRef.current, ...plan]);
      const r = compute(ds, prof);
      setDataset(ds);
      scheduleReminders(prof, ds);
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
    const imp = loadImported();
    importedRef.current = imp;
    if (imp) setImportInfo({ at: imp.at, summary: imp.summary });
    loadUnlocks().then((u) => setUnlocks(u || {}));
    Promise.all([loadProfile(), loadResult(), loadEntries(), addOpen()]).then(([p, r, e, opens]) => {
      opensRef.current = opens;
      profileRef.current = p;
      if (p) setLang(p.lang); // язык — до первой отрисовки данных профиля
      setProfile(p);
      if (r) setResult(r);
      entriesRef.current = e;
      setEntries(e);
      setReady(true);
      if (p) { start(p); syncGoalsTask(p); }
    });
  }, [start]);

  const achievements = useMemo(
    () => withUnlocks(evaluate(result, profile, entries, { imported: !!importInfo }), unlocks || {}),
    [result, profile, entries, importInfo, unlocks],
  );
  // Атмосфера по времени суток и сезону: пересчитывается раз в 5 минут.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5 * 60000);
    return () => clearInterval(id);
  }, []);
  // Погода (если включена в профиле): раз в 30 минут, с кэшем; без сети — календарь.
  const [weather, setWeather] = useState(null);
  const weatherOn = !!(profile && profile.weather && profile.weather.on);
  useEffect(() => {
    if (!weatherOn) { setWeather(null); return; }
    let alive = true;
    getWeather(profile.weather).then((w) => { if (alive) setWeather(w); });
    return () => { alive = false; };
  }, [weatherOn, profile, now]);
  useEffect(() => { setCoachWeather(weather); }, [weather]);
  const amb = useMemo(() => {
    const p = profile || {};
    const a = p.ambience === 'day' ? DAY : ambienceAt(now);
    const season = a.season || ambienceAt(now).season;
    // Эффект: по погоде за окном, а без неё — по сезону.
    let fx = season;
    if (weather) {
      fx = { rain: 'rain', storm: 'storm', snow: 'snow', fog: 'fog', clouds: 'clouds' }[weather.kind]
        || (!weather.day ? 'stars' : season === 'autumn' ? 'leaves' : season === 'spring' ? 'spring' : null);
    }
    const gloomy = weather && ['rain', 'storm', 'fog', 'clouds'].includes(weather.kind);
    return { ...a, dim: a.dim + (gloomy ? 0.08 : 0), season: p.seasonFx === false ? null : fx };
  }, [profile, now, weather]);
  const recap = useMemo(() => weekRecap(result, achievements.list), [result, achievements]);
  setLite(profile && profile.lite); // облегчённый режим читается при отрисовке
  useEffect(() => { setHaptics(profile && profile.haptics); }, [profile]);

  useEffect(() => {
    if (!unlocks || !achievements.fresh.length) return; // не перезаписываем даты, пока не прочитаны
    if (Object.keys(unlocks).length) success(); // вибрация на новое достижение (не при первом запуске)
    setUnlocks(achievements.unlocked);
    saveUnlocks(achievements.unlocked);
  }, [achievements, unlocks]);

  // Уведомления о целях: после каждого расчёта (при первом запуске только запоминаем состояние).
  useEffect(() => {
    if (!unlocks || !result) return;
    const fresh = achievements.list.filter((x) => achievements.fresh.includes(x.id)).map((x) => ({ id: x.id, title: x.title }));
    checkGoals(profile, result, fresh);
  }, [result, achievements, unlocks]);

  const onIntroDone = useCallback(() => {
    introDone.current = true;
    setScreen(profile ? pendingRoute.current : 'setup');
  }, [profile]);

  // Открыть вкладку, подробный экран («detail:sleep», «workout:3») или отдельный экран.
  const open = useCallback((key) => {
    if (key === 'debug' && !devMode) return;
    if (TAB_KEYS.includes(key)) {
      setTab(key);
      setScreen('home');
    } else if (key.startsWith('log')) {
      setLogType(key.split(':')[1] || null);
      setScreen('log');
    } else if (key.startsWith('detail:') || key.startsWith('workout:')) {
      const [kind, arg] = key.split(':');
      setDetail({ key: kind === 'workout' ? 'workout' : arg, arg: kind === 'workout' ? +arg : null, from: tab });
      setScreen('detail');
    } else setScreen(key);
  }, [tab, screen, devMode]);

  const goBack = useCallback(() => {
    if (screen === 'detail') {
      setScreen('home');
      return true;
    }
    if (screen === 'home' && tab !== 'home') {
      setTab('home');
      return true;
    }
    if (['debug', 'tips', 'log', 'cycle', 'about', 'import', 'achievements', 'recap'].includes(screen) || (screen === 'setup' && profile) || (screen === 'permissions' && granted.size)) {
      setScreen('home');
      return true;
    }
    return false;
  }, [screen, tab, detail, profile, granted]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    profileRef.current = profile;
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
      const g = await askPermissions(!!(profile && profile.sex === 'f' && profile.showCycle));
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
  const addEntry = (e) => { success(); setAllEntries([...entriesRef.current, e]); };
  // Оформление, вибрация, напоминания — сохраняются сразу, с побочными действиями.
  // Возврат в приложение: запомнить открытие; если сон по расписанию — пересчитать ночь.
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && prev !== 'active') {
        addOpen().then((list) => {
          opensRef.current = list;
          const p = profileRef.current;
          if (p && p.sleepPlan && p.sleepPlan.on && introDone.current) start(p);
        });
      }
      prev = st;
    });
    return () => sub.remove();
  }, [start]);
  // Сон по расписанию: сохранить и пересчитать.
  const onSavePlan = async (plan) => {
    const p = { ...profile, sleepPlan: plan };
    await saveProfile(p);
    setProfile(p);
    success();
    start(p);
  };
  const planLast = profile && profile.sleepPlan && profile.sleepPlan.on ? lastPlanNight(profile.sleepPlan, opensRef.current) : null;
  // Взят ли сон этой ночи из Health Connect (часы), а не по расписанию.
  const planFromHC = !!(planLast && dataset && dataset.sleep[planLast.date] && !(dataset.manualKeys && dataset.manualKeys.sleep.has(planLast.date)));
  const onSettings = async (patch) => {
    const p = { ...profile, ...patch };
    await saveProfile(p);
    // Язык: переключаем до setProfile, чтобы перерисовка уже шла на новом языке;
    // тексты расчёта (советы, подписи) пересчитываем, напоминания переставляем.
    if ('lang' in patch) {
      setLang(p.lang);
      if (dataset) { const r = compute(dataset, p); setResult(r); saveResult(r); }
    }
    setProfile(p);
    setHaptics(p.haptics);
    if ('remindSleep' in patch || 'remindMorning' in patch || 'lang' in patch) scheduleReminders(p, dataset);
    if (patch.notifyGoals) askNotifications().then(askBackground); // фон: уведомления, затем фоновое чтение Health Connect
    if ('notifyGoals' in patch) syncGoalsTask(p);
  };
  // Погода: включить/выключить, город или геопозиция — и сразу обновить.
  const onWeather = async (w) => {
    const p = { ...profile, weather: w };
    await saveProfile(p);
    setProfile(p);
    setWeather(w.on ? await getWeather(w, true) : null);
  };
  const switchTab = (k) => { if (k !== tab) tap(); setTab(k); };
  const deleteEntry = (e) => setAllEntries(entriesRef.current.filter((x) => x.id !== e.id));
  // Импорт: Apple Health, CSV (записи с теми же id заменяются), резервная копия.
  const setImported = (store) => {
    saveImported(store);
    importedRef.current = store;
    setImportInfo(store ? { at: store.at, summary: store.summary } : null);
    start(profile);
  };
  const addCSV = (list) => {
    const ids = new Set(list.map((x) => x.id));
    setAllEntries([...entriesRef.current.filter((x) => !ids.has(x.id)), ...list]);
  };
  const backupData = () => ({ profile, entries: entriesRef.current, imported: importedRef.current });
  const restoreBackup = async (data) => {
    const p = data.profile || profile;
    if (data.profile) { await saveProfile(p); setProfile(p); }
    if (data.imported !== undefined) {
      saveImported(data.imported);
      importedRef.current = data.imported;
      setImportInfo(data.imported ? { at: data.imported.at, summary: data.imported.summary } : null);
    }
    const list = Array.isArray(data.entries) ? data.entries : entriesRef.current;
    entriesRef.current = list;
    setEntries(list);
    saveEntries(list);
    start(p);
  };
  // Продолжить без Health Connect — только ручные записи.
  const skipHC = async () => {
    const p = { ...profile, skipHC: true };
    await saveProfile(p);
    setProfile(p);
    setScreen('home');
    start(p);
  };
  const wanted = profile && profile.sex === 'f' && profile.showCycle ? [...EXTRA_TYPES, ...CYCLE_TYPES] : EXTRA_TYPES;
  const missingAccess = granted.size > 0 && wanted.some((t) => !granted.has(t));
  const refresh = () => start(profile);
  // Цикл в профиле: показывать ли на главном и режим — с пересчётом.
  const onCycleChange = async (patch) => {
    const p = { ...profile, ...patch };
    await saveProfile(p);
    setProfile(p);
    start(p);
  };

  // Направление перехода: вглубь (подробный экран) — справа, назад к вкладкам — слева;
  // вкладки — со стороны новой вкладки. Считается в момент смены экрана/вкладки.
  const nav = useRef({ screen, tab: tabIndex, dir: 0, tabDir: 0 }).current;
  if (screen !== nav.screen) {
    nav.dir = nav.screen === 'intro' ? 0 : screen === 'home' ? -1 : 1;
    nav.screen = screen;
  }
  if (tabIndex !== nav.tab) {
    nav.tabDir = tabIndex > nav.tab ? 1 : -1;
    nav.tab = tabIndex;
  }
  const screenKey = screen === 'detail' && detail ? `detail:${detail.key}:${detail.arg}` : screen;
  // Экран запуска лежит поверх: когда логотип долетел до шапки, под ним уже
  // открывается главный экран, а запуск растворяется — без чёрной паузы.
  return (
    <View style={{ flex: 1, backgroundColor: '#06141B' }}>
      {screen === 'intro' ? null : <ScreenIn key={screenKey + ':' + (RU ? 'ru' : 'en')} dir={nav.dir}>{renderScreen()}</ScreenIn>}
      {splash ? <LaunchScreen ready={ready} firstRun={ready && !profile} amb={amb} onReveal={onIntroDone} onDone={() => setSplash(false)} /> : null}
    </View>
  );

  function renderScreen() {
    switch (screen) {
      case 'setup':
        return <SetupScreen profile={profile} onSave={onSaveProfile} onBack={profile ? () => setScreen('home') : undefined} />;
      case 'nohc':
        return <NoHealthConnectScreen status={sdk} onRetry={refresh} onSkip={skipHC} />;
      case 'permissions':
        return <PermissionsScreen onRequest={onRequest} onBack={back} busy={loading} granted={[...granted].length} onSkip={granted.size ? undefined : skipHC} />;
      case 'debug':
        if (!devMode) return null;
        return <DebugScreen granted={granted} sdk={sdk} dataset={dataset} onBack={() => setScreen('home')} onHide={isDevBuild ? undefined : () => { setDevMode(false); setScreen('home'); }} />;
      case 'log':
        return (
          <ColorsContext.Provider value={THEMES.steel}>
            <LogScreen entries={entries} profile={profile} initialType={logType} onSave={addEntry} onDelete={deleteEntry} onBack={goBack}
            plan={profile && profile.sleepPlan} onSavePlan={onSavePlan} />
          </ColorsContext.Provider>
        );
      case 'recap':
        return recap ? <RecapScreen recap={recap} onBack={goBack} /> : null;
      case 'achievements':
        return <ColorsContext.Provider value={THEMES.steel}><AchievementsScreen list={achievements.list} onBack={goBack} /></ColorsContext.Provider>;
      case 'import':
        return (
          <ColorsContext.Provider value={THEMES.steel}>
            <ImportScreen importInfo={importInfo} entriesCount={entries.length} onApple={setImported} onDeleteApple={() => setImported(null)}
              onCSV={addCSV} backupData={backupData} onRestore={restoreBackup} onBack={goBack} />
          </ColorsContext.Provider>
        );
      case 'about':
        return <ColorsContext.Provider value={THEMES.steel}><AboutDataScreen onBack={goBack} /></ColorsContext.Provider>;
      case 'cycle':
        return (
          <ColorsContext.Provider value={THEMES.steel}>
            <CycleScreen base={result && result.cycle} onBack={goBack} onLogOther={() => open('log:period')}
              onStartToday={() => addEntry({ id: String(Date.now()), type: 'period', date: dayKey(new Date()), days: (result && result.cycle && result.cycle.periodLen) || 5, t: Date.now() })} />
          </ColorsContext.Provider>
        );
      case 'tips':
        return (
          <ColorsContext.Provider value={THEMES.steel}>
            <TipsScreen rec={recommend(result, profile)} onBack={goBack} />
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
              <FadeIn key={tab} dir={nav.tabDir}>
                {tab === 'coach' ? (
                  <CoachScreen result={result} profile={profile} tabbed bottom={insets.bottom} onBack={goBack} onTips={() => setScreen('tips')} />
                ) : tab === 'metrics' ? (
                  <MetricsScreen result={result} profile={profile} loading={loading} onRefresh={refresh}
                    missingAccess={missingAccess} onAskAccess={onRequest} onOpen={open} />
                ) : tab === 'workouts' ? (
                  <WorkoutsScreen result={result} loading={loading} onRefresh={refresh} onOpen={open} />
                ) : tab === 'profile' ? (
                  <ProfileScreen profile={profile} loading={loading} onOpen={open} onReload={refresh}
                    onSaveProfile={saveQuiet} onCycleChange={onCycleChange} onSettings={onSettings} dataset={dataset} oldAndroid={OLD_ANDROID}
                    weather={weather} onWeather={onWeather}
                    devMode={devMode} onDevUnlock={() => setDevMode(true)} />
                ) : (
                  <HomeScreen result={result} profile={profile} loading={loading} error={error} onOpen={open} onRefresh={refresh}
                    achievements={achievements.list} amb={amb} recap={recap} planLast={planLast} planFromHC={planFromHC} weather={weather} />
                )}
              </FadeIn>
            </ColorsContext.Provider>
            <TabBar tabs={TABS} active={tab} onChange={switchTab} bottom={insets.bottom} />
          </Animated.View>
        );
      }
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
