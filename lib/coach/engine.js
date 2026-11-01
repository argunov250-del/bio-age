// Движок сценариев: маршрутизация по приоритету (см. PRIORITY в nlu.js) -> выбор варианта (select.js) ->
// сборка (assemble.js) -> проверка. Ничего не знает о сети и не запрашивает погоду: данные приходят в env.
// Возвращает null, если ответ должен дать прежний конвейер (старые builders в coachBrain.js).
import { pickVariant } from './select';
import { assemble, validate, variantApplies } from './assemble';
import { buildVars } from './vars';
import { weatherState, condName } from './weatherCtx';
import { answersPending, TOPIC_NAMES } from './nlu';
import { knownParam } from './memory';
import { SCENARIOS, BY_ID } from './scenarios';

const CONTROL_ID = { short: 'ctl_short', detailed: 'ctl_detailed', nojokes: 'ctl_nojokes', funnier: 'ctl_funnier', simpler: 'ctl_simpler', repeat: 'ctl_repeat', norepeat: 'ctl_norepeat', why: 'ctl_why', other: 'ctl_other', ok: 'ctl_ok', thanks: 'ctl_thanks', no: 'ctl_no', yes: 'ctl_yes' };
const TOPIC_TO_LEGACY = { sleep: 'sleep', train: 'train', steps: 'move', heart: 'heart', stress: 'stress', weight: 'weight', cycle: 'cycle', age: 'age', weather: 'today' };
const RECOMMEND_TOPICS = new Set(['today', 'train', 'sleep', 'move', 'heart', 'age', 'stress', 'weight', 'cycle']);
const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);
const textVar = (name, value) => ({ name, value, kind: 'text', unit: null, period: null, source: null, updatedAt: null, available: typeof value === 'string' && value.length > 0 });

// ───────────────────────── погода ─────────────────────────
// Эффективные условия: слова пользователя > свежие данные > неизвестно (старое/сохранённое НЕ используется как текущее).
function effective(env, W) {
  const uc = env.ctx.weather || {};
  if (uc.cond) return { src: 'user', cond: uc.cond, level: uc.level };
  if (W.status === 'current') return { src: 'cache', cond: W.cond, level: W.level, temp: W.temp };
  return { src: 'none', cond: null, level: null };
}

function weatherRoute(env, W, known) {
  const { nlu, ctx } = env;
  const uc = ctx.weather || {};
  const wx = nlu.wx;
  if (wx.geo && (wx.ask || P_DENY.test(nlu.norm))) return 'wx_geo_denied';
  if (wx.ask && wx.otherPlace && !(W.place && W.place.toLowerCase().replace(/ё/g, 'е').slice(0, 4) === wx.otherPlace.slice(0, 4))) return 'wx_other_place';
  if (wx.missing && (wx.ask || nlu.tokens.length <= 6) && (!uc.cond || uc.cond === 'wind') && !env.legacyIntent) return 'wx_missing_field';
  if (wx.forecast && (wx.ask || env.legacyIntent === 'weather_train') && !uc.cond) return 'wx_forecast';
  if (wx.walk && nlu.activity === 'walk' && (wx.ask || uc.cond)) return 'wx_walk';
  // свежая опасная погода важна и без слов о погоде, если человек собирается заниматься на улице
  const dangerNow = W.status === 'current' && W.level === 'danger' && !env.legacyIntent && (nlu.outdoorAct || known.place === 'outdoor');
  const train = env.legacyIntent === 'weather_train' || env.forceTrainWeather || dangerNow;
  if (train) {
    const e = effective(env, W);
    const place = known.place || (uc.indoor && !uc.outdoor ? 'indoor' : null);
    const indoor = ['home', 'gym', 'indoor'].includes(place);
    const outdoor = place === 'outdoor' || (!place && nlu.outdoorAct);
    if (e.level === 'danger') return indoor ? 'wx_train_danger_indoor' : 'wx_train_danger_outdoor';
    if (e.level === 'inconvenient') return indoor ? 'wx_train_bad_indoor' : outdoor ? 'wx_train_bad_outdoor' : 'wx_train_bad_ask';
    if (e.level === 'good') return 'wx_train_good';
    if (e.src === 'cache') return 'wx_train_ordinary';
    return 'wx_train_unknown';
  }
  if (wx.ask) return W.status === 'current' ? 'wx_now' : 'wx_now_unknown';
  return null;
}
const P_DENY = /не дал|отказ|нет |запрет|выключ|не хочу|denied|declin|refus|no /;

// ───────────────────────── маршрутизация ─────────────────────────
function route(env, W, known) {
  const { nlu, mem, ctx } = env;
  if (env.death === 'joke') return { id: 'sens_death_joke' };
  if (env.death === 'cautious') return { id: 'sens_unsure' };
  if (nlu.cont && nlu.pure) return { id: CONTROL_ID[nlu.cont], control: nlu.cont };
  if (mem.pending && !nlu.cont) {
    const a = answersPending(nlu, mem.pending);
    if (a) return { resume: a, pending: mem.pending };
  }
  if (nlu.gibberish) return { id: 'scope_gibberish' };
  if (nlu.userData && (nlu.userData.sleep || nlu.userData.steps)) return { id: 'data_user_stated' };
  if (nlu.capability && !(env.sens && nlu.capability !== 'cap_diagnose')) return { id: nlu.capability };
  if (nlu.dataLimit && !(nlu.dataLimit === 'data_source_unavailable' && env.legacyIntent === 'weather_train')) return { id: nlu.dataLimit };
  const wx = weatherRoute(env, W, known);
  if (wx) return { id: wx, weather: true };
  for (const sc of SCENARIOS) if ((sc.group === 'motivation' || sc.group === 'training') && sc.match && sc.match(nlu, env)) return { id: sc.id };
  if (ctx.sensitive.noJokes && !env.legacyIntent && !env.legacyTopic) return { id: 'ctl_nojokes', control: 'nojokes' };
  if (nlu.multiTopic && (nlu.topics.length >= 3 || !env.legacyIntent)) return { id: 'scope_multi' };
  if (env.legacyIntent) return null;
  if (nlu.unsupported && !nlu.topics.length) return { id: nlu.unsupported === 'joke_order' ? 'scope_joke_order' : 'scope_unsupported' };
  if (env.legacyTopic) return null;
  if (nlu.ambiguous) return { id: 'scope_ambiguous' };
  return { id: 'scope_unknown' };
}

// ───────────────────────── отрисовка сценария ─────────────────────────
function render(sc, env, vars, opts) {
  const o = opts || {};
  const ru = env.ru;
  const wenv = { place: o.place, s: env.s, level: o.level, src: o.src };
  let cands = sc.variants.filter((v) => variantApplies(v, vars, ru) && (!v.when || v.when(wenv)));
  if (!cands.length) return null;
  const tried = [];
  const recent = env.mem.recent;
  for (let guard = 0; guard < cands.length; guard++) {
    const rest = cands.filter((c) => !tried.includes(c.id));
    if (!rest.length) break;
    const v = pickVariant(rest, recent, { exclude: o.exclude, safety: sc.sensitive });
    let sel = null;
    if (sc.humor && !sc.sensitive && v.humorOk !== false && env.pickHumor) sel = env.pickHumor(sc.humor);
    const joke = sel ? { text: sel.text, placement: sel.placement } : null;
    const out = assemble(v, { ru, vars, brevity: env.mem.brevity, joke, wantExplain: o.wantExplain, danger: !!sc.danger });
    if (validate(out.paras, { jokeCount: out.jokeUsed ? 1 : 0 }).ok) return { v, paras: out.paras, sel: out.jokeUsed ? sel : null };
    tried.push(v.id);
  }
  return null;
}

const dampenOf = (c) => (c === 'nojokes' ? true : c === 'funnier' ? false : undefined);

function control(c, env, vars, known) {
  const { mem, legacy } = env;
  const rec = mem.lastRecommendation;
  const base = (id, opts) => render(BY_ID[id], env, vars, opts);
  const result = (r, paras, extra) => ({ scenario: r.v ? scenarioOf(r.v.id) : null, variant: r.v.id, paras, ...(extra || {}) });
  const ack = base(CONTROL_ID[c]);
  if (!ack) return null;
  const withAck = (extraParas, extra) => result(ack, [ack.paras[0], ...extraParas].filter(Boolean), extra);
  const ctxLost = () => { const r = base('ctl_context_lost'); return result(r, r.paras); };
  const reAsk = (id) => { const r = base(id); return result(r, r.paras, { pending: r.v.pending ? { key: r.v.pending.key, topic: id } : null }); };
  const why = () => (rec && legacy.why ? legacy.why(rec.topic) : null);
  const alt = () => {
    const sc = BY_ID[mem.lastScenario];
    if (sc && sc.group !== 'control' && !String(sc.id).startsWith('wx_') && sc.variants.length > 1) {
      const r = render(sc, env, vars, { exclude: [mem.lastVariant], place: known.place, src: 'none' });
      if (r && r.v.id !== mem.lastVariant) return r.paras;
    }
    return rec && legacy.alt ? legacy.alt(rec.topic, known.place) : null;
  };
  switch (c) {
    case 'short': return withAck([], { brevity: 'short' });
    case 'detailed': { const w = why(); return withAck(w || [], { brevity: 'detailed' }); }
    case 'nojokes': return withAck([], { humorMode: 'off', dampen: true });
    case 'funnier':
      if (env.tone === 'off') { const r = base('ctl_funnier_blocked'); return result(r, r.paras); }
      return withAck([], { humorMode: 'playful', dampen: false });
    case 'simpler': {
      const sp = mem.lastTopic && legacy.simpler ? legacy.simpler(mem.lastTopic) : null;
      return sp ? withAck(sp) : reAsk('ctl_simpler_ask');
    }
    case 'repeat': {
      const last = [...(env.history || [])].reverse().find((h) => h && h.from === 'coach');
      const txt = last && Array.isArray(last.text) ? last.text.filter((x) => typeof x === 'string' && x.trim()) : null;
      return txt && txt.length ? withAck(txt) : ctxLost();
    }
    case 'norepeat': { const a = alt(); return a ? withAck(a) : ctxLost(); }
    case 'why': {
      const w = why();
      if (w) return withAck(w);
      const sc = BY_ID[mem.lastScenario];
      if (sc && sc.group !== 'control') {
        const r = render(sc, env, vars, { wantExplain: true });
        if (r && r.paras.length) return result(ack, [ack.paras[0], ...r.paras]);
      }
      const r = base('ctl_why_unknown');
      return result(r, r.paras);
    }
    case 'other': { const a = alt(); return a ? withAck(a) : ctxLost(); }
    case 'no': {
      if (mem.pending || rec) return withAck([], { resolved: true });
      const r = base('ctl_no_lost');
      return result(r, r.paras, { resolved: true });
    }
    case 'yes': {
      if (mem.pending) return ctxLost();
      const st = rec && legacy.step ? legacy.step(rec.topic) : null;
      if (st) return withAck(st);
      const r = base('ctl_yes_lost');
      return result(r, r.paras);
    }
    default: return withAck([]);
  }
}
const scenarioOf = (variantId) => (SCENARIOS.find((s) => s.variants.some((v) => v.id === variantId)) || {}).id || null;

// ───────────────────────── точка входа ─────────────────────────
export function respond(env) {
  const { nlu, mem } = env;
  const W = weatherState(env.weather, env.now);
  const known = { place: nlu.place || knownParam(mem, 'place'), activity: nlu.activity || knownParam(mem, 'activity') };
  let r = route(env, W, known);
  if (!r) return null;
  const newKnown = {};
  if (nlu.place) newKnown.place = nlu.place;
  if (nlu.activity) newKnown.activity = nlu.activity;
  let resolved = false;
  if (r.resume) {
    // ответ на уточнение: параметр запоминаем и продолжаем сценарий, который спрашивал
    const key = r.pending.key;
    resolved = true;
    if (key === 'which_topic') {
      const t = r.resume === 'first' ? ((r.pending.data && r.pending.data.topics) || [])[0] : r.resume;
      const lt = TOPIC_TO_LEGACY[t];
      return lt ? { kind: 'legacyTopic', topic: lt, resolved: true } : null;
    }
    if (key === 'place') { newKnown.place = r.resume; known.place = r.resume; }
    if (key === 'activity') { newKnown.activity = r.resume; known.activity = r.resume; }
    const asked = r.pending.topic;
    if (key === 'simplify_what') r = { id: r.resume === 'workout' ? 'mot_simplify_workout' : 'mot_simplify_daily' };
    else if (asked && String(asked).startsWith('wx_train')) {
      env.forceTrainWeather = true;
      const d = r.pending.data;
      if (d && d.src === 'user' && d.cond) env.ctx.weather = { ...env.ctx.weather, cond: d.cond, level: d.level };
      r = { id: weatherRoute(env, W, known), weather: true }; }
    else r = { id: asked || 'scope_unknown' };
    if (!r.id) return null;
  }
  const sc = BY_ID[r.id];
  if (!sc) return null;
  const e = effective(env, W);
  const place = known.place || null;
  const outdoor = place === 'outdoor' || (!place && nlu.outdoorAct);
  const vars = buildVars(env.s, W, known, { sleep: nlu.userData && nlu.userData.sleep, steps: nlu.userData && nlu.userData.steps }, env.ru);
  const x = (name, value) => { vars[name] = textVar(name, value); };
  const legacy = env.legacy || {};
  x('baseTrain', legacy.trainLine ? legacy.trainLine() : '');
  x('dangerWhy', legacy.dangerWhy ? legacy.dangerWhy(e.cond) || '' : '');
  x('wxCond', e.src === 'cache' ? condName(e.cond, env.ru) || condName(W.kind, env.ru) : '');
  const cc = e.cond ? condName(e.cond, env.ru) : '';
  x('curCond', cc);
  x('curCondCap', cap(cc));
  x('askPlace', !place && !outdoor && !['wx_train_danger_outdoor'].includes(sc.id) ? 'yes' : '');
  x('askActivity', !known.activity ? 'yes' : '');
  x('topicList', nlu.topics.map((t) => (TOPIC_NAMES[t] ? TOPIC_NAMES[t][env.ru ? 0 : 1] : null)).filter(Boolean).slice(0, 4).join(', '));
  const dangerous = e.level === 'danger' && !!sc.danger;

  let out;
  if (r.control) out = control(r.control, env, vars, known);
  else {
    const rr = render(sc, env, vars, { place: place || (nlu.outdoorAct ? 'outdoor' : null), level: e.level, src: e.src });
    out = rr ? { scenario: sc.id, variant: rr.v.id, paras: rr.paras, humor: rr.sel, pending: rr.v.pending ? { key: rr.v.pending.key, topic: sc.id, data: rr.v.pending.key === 'which_topic' ? { topics: nlu.topics.slice(0, 4) } : rr.v.pending.key === 'place' && e.src === 'user' ? { src: 'user', cond: e.cond, level: e.level } : null } : null } : null;
  }
  if (!out) return null;
  const isControl = !!r.control;
  const final = {
    kind: 'engine', scenario: out.scenario || sc.id, variant: out.variant, paras: out.paras, humor: out.humor || null,
    pending: out.pending || null, resolved: resolved || !!out.resolved, known: newKnown,
    brevity: out.brevity, humorMode: out.humorMode, dampen: out.dampen !== undefined ? out.dampen : dampenOf(r.control),
    topic: isControl ? null : sc.topic, sensitive: !!sc.sensitive, danger: dangerous || !!sc.danger,
    recommends: !isControl && ['train', 'weather'].includes(sc.topic) && /^(wx_train|train_alt|mot_)/.test(sc.id) ? { topic: 'train', kind: sc.id } : undefined,
    next: sc.topic === 'weather' || sc.topic === 'train' ? ['train', 'today', 'move'] : undefined,
  };
  return final;
}

export { RECOMMEND_TOPICS };
