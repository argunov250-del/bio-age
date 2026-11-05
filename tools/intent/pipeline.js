// Обёртка над настоящим конвейером coachBrain.reply для оценки: «куда правила маршрутизируют реплику».
// Метка маршрута приводится к пространству меток модели (canon).
const env = require('./node_env');
const { setLang } = env.require('lib/i18n');
setLang('ru');
const { reply, matchTopic } = env.require('lib/coachBrain');
const { COACH_CONFIG } = env.require('lib/coach/config');
const { normalize } = env.require('lib/coach/normalize');
const { SCENARIOS } = env.require('lib/coach/scenarios');

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { status: 'ok', score: 50 } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 } },
};

const LEGACY_LABELED = new Set(['today', 'train', 'sleep', 'heart', 'move', 'age', 'stress', 'weight', 'cycle', 'about', 'why_metric', 'round_chase', 'plan_review', 'simplify', 'plan_change', 'procrastination', 'single_trend', 'achievement', 'return_habit']);
const SENS_LEGACY = { safety: 'sens_safety', treatment: 'sens_treatment', support: 'sens_support' };

// id сценария движка -> метка модели
const canonScenario = (id) => {
  if (/^wx_train/.test(id)) return 'wx_train';
  if (id === 'wx_now_unknown') return 'wx_now';
  if (id === 'train_unknown') return 'train_today';
  if (id === 'scope_unknown' || id === 'scope_gibberish') return 'other';
  if (id === 'sens_death_joke' || id === 'sens_unsure') return 'sens_safety';
  if (id === 'ctl_funnier_blocked') return 'ctl_funnier';
  if (id === 'ctl_yes_lost') return 'ctl_yes';
  if (id === 'ctl_no_lost') return 'ctl_no';
  if (/^ctl_no_other/.test(id)) return 'ctl_other';
  if (id === 'ctl_context_lost' || id === 'ctl_why_unknown') return 'other';
  if (id === 'ctl_simpler_ask') return 'ctl_simpler';
  if (/^sens_(soft|hold)/.test(id)) return 'sens_support';
  if (/^greet_(arc|rank|break|same)/.test(id)) return 'greet_open';
  if (id === 'mot_simplify_workout' || id === 'mot_simplify_daily') return 'legacy_simplify';
  if (id === 'data_user_stated') return 'data_user_stated';
  return id;
};
const canonLegacy = (id) => (id == null ? 'other' : SENS_LEGACY[id] || (LEGACY_LABELED.has(id) ? 'legacy_' + id : id === 'weather_train' ? 'wx_train' : 'legacy_' + id));

function routeLabel(text, opts) {
  const o = opts || {};
  const r = reply(text, RESULT, {}, { history: [], session: {}, tone: 'balanced', now: 1 });
  const rt = r.route || {};
  const label = rt.kind === 'engine' ? (rt.control ? 'ctl_' + rt.control : canonScenario(rt.id)) : canonLegacy(rt.id);
  return o.full ? { label, route: rt, text: r.text } : label;
}
module.exports = { routeLabel, canonScenario, COACH_CONFIG, normalize, SCENARIOS, matchTopic, RESULT };
