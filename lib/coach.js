// ИИ-коуч. Когда в профиле включены онлайн-советы, есть ключ и интернет, совет на
// сегодня пишет Claude по короткой сводке (оценки и средние — без имени, дат, записей
// по часам и отдельных тренировок). Без интернета коуч показывает последний ответ
// Claude, пока он свежий, а если его нет — совет по правилам (lib/recommend.js).
import Anthropic from '@anthropic-ai/sdk';
import { RU } from './i18n';
import { recommend } from './recommend';

const MODEL = 'claude-opus-5-5';
const TIMEOUT_MS = 45000;
export const COACH_FRESH_MS = 36 * 3600000; // ответ без интернета показывается до полутора суток

const round = (x, d = 0) => (x == null || isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const win = (m, key, w, d = 0) => (m && m[key] && m[key][w] && m[key][w].value != null ? round(m[key][w].value, d) : null);
const score = (s) => (s && s.status === 'ok' ? s.score : null);

// Сводка, которая уходит Claude. Ничего, по чему можно узнать человека.
export function coachSummary(result, profile) {
  const m = result.metrics || {};
  const sc = result.scores || {};
  const rec = recommend(result, profile);
  return {
    age: round(result.chrono),
    sex: profile && profile.sex === 'f' ? 'female' : 'male',
    goal: (profile && profile.goal) || null,
    trainingExperience: (profile && profile.experience) || null,
    lifestyleAge: round(result.bio, 1),
    agingPace30d: round(result.pace, 2),
    scores0to100: { readiness: score(sc.readiness), sleep: score(sc.sleep), recovery: score(sc.recovery), activity: score(sc.activity) },
    avg7d: {
      steps: win(m, 'steps', 7), sleepHours: win(m, 'sleepDuration', 7, 1), restingHr: win(m, 'restingHr', 7),
      nightHr: win(m, 'nightHr', 7), hrvMs: win(m, 'hrv', 7), activeMinutesPerDay: win(m, 'activeMinutes', 7), workouts: win(m, 'exercise', 7),
    },
    avg30d: {
      steps: win(m, 'steps', 30), sleepHours: win(m, 'sleepDuration', 30, 1), restingHr: win(m, 'restingHr', 30),
      hrvMs: win(m, 'hrv', 30), workouts: win(m, 'exercise', 30),
    },
    hrvBaselineMs: m.hrvBaseline && m.hrvBaseline.value != null ? round(m.hrvBaseline.value) : null,
    trainingLoad: sc.load && sc.load.level ? sc.load.level : null,
    ruleBasedTip: rec.main.id || null,
  };
}

const SYSTEM_RU = `Ты — коуч в приложении Epimely о здоровом образе жизни. Тебе дают сводку показателей пользователя (null — данных нет).
Напиши один совет на сегодня: 2–3 коротких предложения, обращайся на «ты», по-русски, тепло и по делу.
Опирайся на самые заметные цифры; если данных мало — предложи, что записать или измерить.
Нельзя: диагнозы, лекарства, добавки, запугивание, обещания омоложения. Это не медицинская консультация.
Ответ — только текст совета, без списков, заголовков и markdown.`;

const SYSTEM_EN = `You are the coach in Epimely, a healthy-lifestyle app. You get a summary of the user's metrics (null means no data).
Write one tip for today: 2–3 short sentences, in English, warm and practical, addressing the user as "you".
Lean on the most notable numbers; if data is thin, suggest what to log or measure.
Never: diagnoses, medications, supplements, scare tactics, promises of rejuvenation. This is not medical advice.
Reply with the tip text only, no lists, headings or markdown.`;

// Совет от Claude. Бросает ошибку, если нет сети, ключ неверный или ответ пустой.
export async function askCoach(apiKey, summary) {
  // dangerouslyAllowBrowser: ключ вводит сам владелец телефона и хранит у себя.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: TIMEOUT_MS });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: RU ? SYSTEM_RU : SYSTEM_EN,
    messages: [{ role: 'user', content: JSON.stringify(summary) }],
  });
  if (response.stop_reason === 'refusal') throw new Error('refusal');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('empty');
  return { text, model: response.model };
}

// Понятная причина ошибки для профиля.
export function coachError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'key';
  if (e instanceof Anthropic.RateLimitError) return 'limit';
  if (e instanceof Anthropic.APIConnectionError) return 'offline';
  if (e instanceof Anthropic.APIError) return 'api';
  return 'other';
}
