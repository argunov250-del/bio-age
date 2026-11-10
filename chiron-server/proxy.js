// Тонкий прокси перед vLLM или llama-server. Ключ из окружения, лимит запросов.
// Тела запросов и ответов не пишутся в журнал: там могут быть вопросы о здоровье.
const http = require('http');
const { URL } = require('url');
const { authorize, RateLimit } = require('./limit');

const KEY = process.env.CHIRON_KEY || '';
const UPSTREAM = (process.env.UPSTREAM || 'http://127.0.0.1:8000').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 8080);
const RPM = Number(process.env.CHIRON_RPM || 30);
const limit = new RateLimit(RPM);

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || 'local';
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const pathOnly = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && pathOnly === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }
  if (req.method !== 'POST' || pathOnly !== '/v1/chat/completions') {
    send(res, 404, { error: 'not_found' });
    return;
  }
  if (!authorize(req.headers.authorization, KEY)) {
    send(res, 401, { error: 'unauthorized' });
    return;
  }
  if (!limit.allow(clientIp(req))) {
    send(res, 429, { error: 'rate_limit' });
    return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    let upstream;
    try {
      const u = new URL(UPSTREAM + '/v1/chat/completions');
      upstream = http.request({
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
      }, (up) => {
        res.writeHead(up.statusCode || 502, { 'Content-Type': up.headers['content-type'] || 'application/json' });
        up.pipe(res);
      });
    } catch (e) {
      send(res, 502, { error: 'upstream' });
      return;
    }
    upstream.on('error', () => { if (!res.headersSent) send(res, 502, { error: 'upstream' }); });
    upstream.end(body);
  });
});

if (require.main === module) {
  if (!KEY) { console.error('CHIRON_KEY is empty, refusing to start'); process.exit(1); }
  server.listen(PORT, () => console.log('chiron proxy ' + PORT));
}

module.exports = { server, authorize, RateLimit };
