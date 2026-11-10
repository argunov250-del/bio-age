// Проверка ключа и лимит без хранения текста вопросов.
function authorize(header, key) {
  if (!key) return false;
  if (!header || typeof header !== 'string') return false;
  const m = header.match(/^Bearer\s+(\S+)\s*$/i);
  return !!(m && m[1] === key);
}

class RateLimit {
  constructor(perMinute) {
    this.perMinute = perMinute > 0 ? perMinute : 30;
    this.hits = new Map();
  }
  allow(id) {
    const now = Date.now();
    const windowMs = 60000;
    const prev = this.hits.get(id) || [];
    const fresh = prev.filter((t) => now - t < windowMs);
    if (fresh.length >= this.perMinute) {
      this.hits.set(id, fresh);
      return false;
    }
    fresh.push(now);
    this.hits.set(id, fresh);
    return true;
  }
}

module.exports = { authorize, RateLimit };
