// Решение «шутить ли» и выбор шутки. Детерминированно, без Math.random; любая ошибка → null.
import { HUMOR_CONFIG, normalizeMode } from './config';
import { CATALOG } from './catalog';

// Простой стабильный хеш строки (djb2).
export function hash(str) {
  let h = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const isStrArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'string');
export function validCatalog(c) {
  return Array.isArray(c) && c.every((m) => m && typeof m.id === 'string' && m.id && isStrArr(m.variants) && m.variants.length > 0
    && typeof m.priority === 'number' && isStrArr(m.matchingIntents) && isStrArr(m.contextualTriggers) && isStrArr(m.blockedContexts));
}

// Интенты, при которых юмор запрещён всегда.
export const NO_HUMOR_INTENTS = ['safety', 'treatment', 'support'];

// Ответы коуча из истории (новые в конце).
const coachReplies = (history) => (Array.isArray(history) ? history.filter((h) => h && h.from === 'coach') : []);

// Лимиты частоты: можно ли сейчас вообще шутить в этом режиме.
export function frequencyAllows(history, mode) {
  const cfg = HUMOR_CONFIG.modes[mode];
  if (!cfg || cfg.max <= 0) return false;
  const last = coachReplies(history).slice(-(HUMOR_CONFIG.windowSize - 1)); // + новый ответ = окно из 5
  if (last.filter((h) => h.humorId).length + 1 > cfg.max) return false;
  if (!cfg.consecutive && last.length && last[last.length - 1].humorId) return false;
  return true;
}

// -> { item, text, placement } | null
export function selectHumor({ input, ctx, intent, mode, history, session, catalog = CATALOG, ru = true }) {
  try {
    const m = normalizeMode(mode);
    if (m === 'off' || (session && session.dampened)) return null;
    if (!ctx || ctx.blocked || NO_HUMOR_INTENTS.includes(intent)) return null;
    if (!validCatalog(catalog)) return null;
    if (!frequencyAllows(history, m)) return null;
    const cfg = HUMOR_CONFIG.modes[m];
    const recent = coachReplies(history);
    const sit = new Set(ctx.situations || []);
    const flags = new Set(ctx.flags || []);
    const bonus = ctx.humorPositive ? HUMOR_CONFIG.positiveBonus : 0;
    const cands = [];
    catalog.forEach((item, idx) => {
      if (item.enabled === false) return;
      if (!ru && !(Array.isArray(item.variantsEn) && item.variantsEn.length)) return; // в английском — только то, что есть по-английски
      const hit = [...item.matchingIntents, ...item.contextualTriggers].filter((x) => sit.has(x)).length;
      if (!hit) return;
      if (item.blockedContexts.some((b) => flags.has(b))) return;
      const cd = Math.max(item.cooldownAssistantMessages || 0, HUMOR_CONFIG.repeatCooldown);
      if (recent.slice(-cd).some((h) => h.humorId === item.id)) return;
      const pr = item.priority + bonus;
      if (pr < cfg.minPriority) return;
      cands.push({ item, idx, pr, hit });
    });
    if (!cands.length) return null;
    cands.sort((a, b) => b.pr - a.pr || b.hit - a.hit || a.idx - b.idx);
    const item = cands[0].item;
    const h = hash(String(input) + '|' + recent.length);
    const pool = ru ? item.variants : item.variantsEn;
    const text = pool[h % pool.length];
    const pls = Array.isArray(item.placements) && item.placements.length ? item.placements : ['lead'];
    return { item, text, placement: pls[Math.floor(h / 7) % pls.length] };
  } catch (e) {
    return null;
  }
}
