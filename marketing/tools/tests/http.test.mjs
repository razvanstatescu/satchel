// node --test tools/tests/  (local server only, no network spend)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { request, scrub, HttpError } from '../lib/http.mjs';

function server(handler) {
  return new Promise((res) => { const s = createServer(handler).listen(0, () => res(s)); });
}
const quiet = { log: false, baseDelayMs: 10, maxDelayMs: 50 };

test('retries 429 (Retry-After) and 503, then succeeds', async () => {
  let n = 0;
  const s = await server((req, res) => {
    n++;
    if (n === 1) { res.writeHead(429, { 'retry-after': '0.05', 'content-type': 'application/json' }); return res.end('{"detail":{"status":"too_many_concurrent_requests"}}'); }
    if (n === 2) { res.writeHead(503); return res.end('busy'); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
  });
  const r = await request(`http://127.0.0.1:${s.address().port}/x`, { method: 'POST', json: { a: 1 }, ...quiet });
  assert.deepEqual(r.data, { ok: true });
  assert.equal(r.attempts, 3);
  s.close();
});

test('does not retry insufficient_quota 429 or 400, and scrubs secrets', async () => {
  process.env.OPENAI_API_KEY ??= 'sk-test-abcdefghijklmnop';
  let n = 0;
  const s = await server((req, res) => { n++; res.writeHead(429, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'insufficient_quota', message: `key ${process.env.OPENAI_API_KEY}` } })); });
  await assert.rejects(request(`http://127.0.0.1:${s.address().port}/x`, quiet), (e) => e instanceof HttpError && e.status === 429 && !e.message.includes(process.env.OPENAI_API_KEY));
  assert.equal(n, 1);
  s.close();
  assert.equal(scrub('Bearer abc.def xi-api-key: sk_0123456789abcdef0123'), 'Bearer [REDACTED] xi-api-key: [REDACTED]');
});

test('POST timeout is not retried by default; GET timeout is', async () => {
  let n = 0;
  const s = await server((req, res) => { n++; setTimeout(() => { res.writeHead(200); res.end('late'); }, 300); });
  const url = `http://127.0.0.1:${s.address().port}/x`;
  await assert.rejects(request(url, { method: 'POST', body: 'x', timeoutMs: 50, ...quiet }), (e) => e.timeout === true);
  assert.equal(n, 1);
  n = 0;
  await assert.rejects(request(url, { timeoutMs: 50, retries: 2, ...quiet }));
  assert.equal(n, 3);
  s.closeAllConnections(); s.close();
});
