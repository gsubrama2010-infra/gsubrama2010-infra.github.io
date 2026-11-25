// Offline tests: the Anthropic API is mocked, so nothing is billed.
// Run with `npm test` after `npm install`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { cleanMessages, isAllowedOrigin } from '../src/index.js';

const ORIGIN = 'https://gsubrama2010-infra.github.io';
const baseEnv = { ANTHROPIC_API_KEY: 'test-key', ALLOWED_ORIGINS: ORIGIN, MODEL: 'claude-opus-5-5' };

const makeCtx = () => {
  const jobs = [];
  return { waitUntil: (p) => jobs.push(p), settle: () => Promise.all(jobs) };
};

const chat = (body, origin = ORIGIN) => new Request('https://ganesh-chat.example.workers.dev/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const ask = { messages: [{ role: 'user', content: 'What does Ganesh do?' }] };

// --- Mock of the Anthropic Messages API -----------------------------------
const sseEvent = (obj) => `event: ${obj.type}\ndata: ${JSON.stringify(obj)}\n\n`;
const messageEvents = (texts, stopReason = 'end_turn') => [
  { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 12, output_tokens: 1 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  ...texts.map((text) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })),
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 20 } },
  { type: 'message_stop' },
];

function streamOf(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) { chunks.forEach((s) => c.enqueue(enc.encode(s))); c.close(); },
  });
}

function mockApi(respond) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(init.body) });
    return respond(calls.length);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

const sseResponse = (events) => new Response(streamOf(events.map(sseEvent)), {
  status: 200, headers: { 'content-type': 'text/event-stream' },
});
const errorResponse = (status, type) => new Response(JSON.stringify({ type: 'error', error: { type, message: type } }), {
  status, headers: { 'content-type': 'application/json', 'x-should-retry': 'false' },
});

async function readLines(res) {
  const text = await res.text();
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// --- Validation ------------------------------------------------------------
test('cleanMessages keeps valid turns and trims them', () => {
  assert.deepEqual(cleanMessages({ messages: [{ role: 'user', content: '  hi  ' }] }), [{ role: 'user', content: 'hi' }]);
});

test('cleanMessages drops leading assistant turns', () => {
  const out = cleanMessages({ messages: [
    { role: 'assistant', content: 'intro' },
    { role: 'user', content: 'q' },
  ] });
  assert.deepEqual(out, [{ role: 'user', content: 'q' }]);
});

test('cleanMessages rejects bad shapes', () => {
  assert.equal(cleanMessages(null), null);
  assert.equal(cleanMessages({ messages: [] }), null);
  assert.equal(cleanMessages({ messages: [{ role: 'system', content: 'x' }] }), null);
  assert.equal(cleanMessages({ messages: [{ role: 'user', content: 42 }] }), null);
  assert.equal(cleanMessages({ messages: [{ role: 'user', content: '   ' }] }), null);
  assert.equal(cleanMessages({ messages: [{ role: 'user', content: 'x'.repeat(501) }] }), null);
  assert.equal(cleanMessages({ messages: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }] }), null);
});

test('cleanMessages keeps only the last 12 turns', () => {
  const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  const out = cleanMessages({ messages: [...messages, { role: 'user', content: 'last' }] });
  assert.ok(out.length <= 12);
  assert.equal(out[0].role, 'user');
  assert.equal(out.at(-1).content, 'last');
});

test('isAllowedOrigin matches exact origins only', () => {
  assert.equal(isAllowedOrigin(ORIGIN, `${ORIGIN}, http://localhost:8000`), true);
  assert.equal(isAllowedOrigin('http://localhost:8000', `${ORIGIN}, http://localhost:8000`), true);
  assert.equal(isAllowedOrigin('https://evil.example', ORIGIN), false);
  assert.equal(isAllowedOrigin(`${ORIGIN}.evil.example`, ORIGIN), false);
  assert.equal(isAllowedOrigin(null, ORIGIN), false);
});

// --- HTTP behaviour ----------------------------------------------------------
test('preflight succeeds for the site and fails for others', async () => {
  const ok = await worker.fetch(new Request('https://w.example/chat', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), baseEnv, makeCtx());
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const bad = await worker.fetch(new Request('https://w.example/chat', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), baseEnv, makeCtx());
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
});

test('rejects other origins, missing origin, bad bodies and other paths', async () => {
  assert.equal((await worker.fetch(chat(ask, 'https://evil.example'), baseEnv, makeCtx())).status, 403);
  assert.equal((await worker.fetch(chat(ask, null), baseEnv, makeCtx())).status, 403);
  assert.equal((await worker.fetch(chat('{not json'), baseEnv, makeCtx())).status, 400);
  assert.equal((await worker.fetch(chat({ messages: [{ role: 'user', content: 'x'.repeat(600) }] }), baseEnv, makeCtx())).status, 400);
  assert.equal((await worker.fetch(chat('x'.repeat(41000)), baseEnv, makeCtx())).status, 413);
  assert.equal((await worker.fetch(new Request('https://w.example/', { headers: { Origin: ORIGIN } }), baseEnv, makeCtx())).status, 404);
  assert.equal((await worker.fetch(new Request('https://w.example/chat', { headers: { Origin: ORIGIN } }), baseEnv, makeCtx())).status, 405);
});

test('rate limit returns 429 with Retry-After', async () => {
  const env = { ...baseEnv, CHAT_LIMITER: { limit: async ({ key }) => ({ success: key !== '203.0.113.9' }) } };
  const req = chat(ask);
  req.headers.set('CF-Connecting-IP', '203.0.113.9');
  const res = await worker.fetch(req, env, makeCtx());
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
});

test('missing API key returns 503 without calling the API', async () => {
  const api = mockApi(() => { throw new Error('should not be called'); });
  try {
    const res = await worker.fetch(chat(ask), { ...baseEnv, ANTHROPIC_API_KEY: '' }, makeCtx());
    assert.equal(res.status, 503);
    assert.equal(api.calls.length, 0);
  } finally { api.restore(); }
});

// --- Claude call -------------------------------------------------------------
test('streams the answer as NDJSON and sends the expected request', async () => {
  const api = mockApi(() => sseResponse(messageEvents(['Hello', ' there'])));
  try {
    const ctx = makeCtx();
    const res = await worker.fetch(chat(ask), baseEnv, ctx);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.match(res.headers.get('Content-Type'), /ndjson/);
    const lines = await readLines(res);
    await ctx.settle();
    assert.equal(lines.filter((l) => l.type === 'text').map((l) => l.text).join(''), 'Hello there');
    assert.deepEqual(lines.at(-1), { type: 'done', stop_reason: 'end_turn' });

    assert.equal(api.calls.length, 1);
    const { url, headers, body } = api.calls[0];
    assert.match(url, /\/v1\/messages/);
    assert.equal(body.model, 'claude-opus-5-5');
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, 4096);
    assert.deepEqual(body.output_config, { effort: 'low' });
    assert.equal(body.fallbacks, 'default');
    assert.equal(body.system[0].cache_control.type, 'ephemeral');
    assert.match(body.system[0].text, /Ganesh Subramaniam/);
    assert.deepEqual(body.messages, ask.messages);
    assert.equal(body.temperature, undefined);
    assert.match(headers.get('anthropic-beta') || '', /server-side-fallback-2026-07-01/);
    const auth = `${headers.get('x-api-key') || ''} ${headers.get('authorization') || ''}`;
    assert.match(auth, /test-key/);
  } finally { api.restore(); }
});

test('Haiku requests leave out fallbacks', async () => {
  const api = mockApi(() => sseResponse(messageEvents(['Hi'])));
  try {
    const ctx = makeCtx();
    const res = await worker.fetch(chat(ask), { ...baseEnv, MODEL: 'claude-haiku-5-5' }, ctx);
    await readLines(res);
    await ctx.settle();
    const { headers, body } = api.calls[0];
    assert.equal(body.model, 'claude-haiku-5-5');
    assert.equal(body.fallbacks, undefined);
    assert.doesNotMatch(headers.get('anthropic-beta') || '', /server-side-fallback/);
  } finally { api.restore(); }
});

test('reports a refusal stop reason so the page can replace the text', async () => {
  const api = mockApi(() => sseResponse(messageEvents([], 'refusal')));
  try {
    const ctx = makeCtx();
    const lines = await readLines(await worker.fetch(chat(ask), baseEnv, ctx));
    await ctx.settle();
    assert.deepEqual(lines.at(-1), { type: 'done', stop_reason: 'refusal' });
  } finally { api.restore(); }
});

test('upstream auth and rate-limit errors become 503 JSON', async () => {
  for (const [status, type, code] of [[401, 'authentication_error', 'not_configured'], [429, 'rate_limit_error', 'busy'], [529, 'overloaded_error', 'busy']]) {
    const api = mockApi(() => errorResponse(status, type));
    try {
      const res = await worker.fetch(chat(ask), baseEnv, makeCtx());
      assert.equal(res.status, 503, `${status} -> 503`);
      assert.deepEqual(await res.json(), { error: code });
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    } finally { api.restore(); }
  }
});

test('a mid-stream error ends with an error line', async () => {
  const events = messageEvents(['Partial']).slice(0, 3); // message_start, block_start, one delta
  const api = mockApi(() => new Response(streamOf([
    ...events.map(sseEvent),
    `event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })}\n\n`,
  ]), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  try {
    const ctx = makeCtx();
    const lines = await readLines(await worker.fetch(chat(ask), baseEnv, ctx));
    await ctx.settle();
    assert.deepEqual(lines[0], { type: 'text', text: 'Partial' });
    assert.equal(lines.at(-1).type, 'error');
  } finally { api.restore(); }
});
