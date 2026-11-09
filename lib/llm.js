// Временная заглушка + очистка <think>
// Позже сюда подключится реальный вызов модели

export function cleanAnswer(raw) {
  if (!raw) return '';
  const endThink = raw.indexOf('</think>');
  if (endThink !== -1) {
    return raw.slice(endThink + 8).trim();
  }
  const startThink = raw.indexOf('<think>');
  if (startThink !== -1) {
    return raw.slice(0, startThink).trim();
  }
  return raw.trim();
}

// Заглушка. Позже заменишь на реальный вызов llama.rn или другого модуля
export async function askChiron(question, context = '') {
  const system = `Ты Хирон — мудрый наставник. Отвечай только по-русски, коротко и сразу (1–3 предложения). Без списков, без заголовков и без тегов <think>. Говори спокойно и по делу. Ты не ставишь диагнозы.`;

  // Здесь позже будет вызов модели
  // const raw = await llama.completion({ ... });

  // Пока возвращаем тестовый ответ
  const fakeRaw = `<think>Пользователь спрашивает про сон. Нужно ответить коротко.</think>Ложись и вставай в одно время. За час до сна убери экраны.`;
  return cleanAnswer(fakeRaw);
}
