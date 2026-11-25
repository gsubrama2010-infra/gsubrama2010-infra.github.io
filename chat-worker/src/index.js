// Cloudflare Worker behind the "Ask about Ganesh" chat on ai.html.
// It keeps the Anthropic API key secret, accepts requests only from the
// website, rate-limits each visitor and streams Claude's answer back as
// newline-delimited JSON: {"type":"text","text":...} chunks, then
// {"type":"done","stop_reason":...} or {"type":"error","error":...}.
// Nothing a visitor sends is stored or logged.

import Anthropic from '@anthropic-ai/sdk';
import { PROFILE } from './profile.js';

const MAX_MESSAGES = 12; // most recent turns sent to the model
const MAX_USER_CHARS = 500;
const MAX_ASSISTANT_CHARS = 3000;
const MAX_BODY_CHARS = 40000;
// Models that accept server-side refusal fallbacks (Haiku does not).
const FALLBACK_MODELS = /^claude-(opus|sonnet|fable)-/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = isAllowedOrigin(origin, env.ALLOWED_ORIGINS);
    const cors = allowed ? corsHeaders(origin) : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }
    if (url.pathname !== '/chat') return json({ error: 'not_found' }, 404, cors);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { ...cors, Allow: 'POST, OPTIONS' });
    if (!allowed) return json({ error: 'forbidden_origin' }, 403);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await withinLimit(env.CHAT_LIMITER, ip))) {
      return json({ error: 'rate_limited' }, 429, { ...cors, 'Retry-After': '60' });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return json({ error: 'too_large' }, 413, cors);
    let messages = null;
    try { messages = cleanMessages(JSON.parse(raw)); } catch { /* invalid JSON */ }
    if (!messages) return json({ error: 'bad_request' }, 400, cors);

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503, cors);

    const model = env.MODEL || 'claude-opus-5-5';
    const params = {
      model,
      max_tokens: 4096, // cost cap per answer; the prompt asks for ~120 words
      system: [{ type: 'text', text: PROFILE, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low' },
      messages,
    };
    if (FALLBACK_MODELS.test(model)) {
      // If Claude's safety classifiers decline, retry on Anthropic's recommended model.
      params.betas = ['server-side-fallback-2026-07-01'];
      params.fallbacks = 'default';
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const stream = client.beta.messages.stream(params);
    const events = stream[Symbol.asyncIterator]();

    // Wait for the first event so auth, rate-limit and overload errors
    // become a proper HTTP status instead of a broken 200 stream.
    let first;
    try {
      first = await events.next();
    } catch (err) {
      const { status, code } = describeError(err);
      console.error('chat: request failed', status, code);
      return json({ error: code }, status, cors);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();
    const send = (obj) => writer.write(enc.encode(JSON.stringify(obj) + '\n'));

    const pump = async () => {
      try {
        for (let r = first; !r.done; r = await events.next()) {
          const ev = r.value;
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            await send({ type: 'text', text: ev.delta.text });
          }
        }
        const final = await stream.finalMessage();
        await send({ type: 'done', stop_reason: final.stop_reason });
      } catch (err) {
        stream.abort();
        const { code } = describeError(err);
        console.error('chat: stream failed', code);
        await send({ type: 'error', error: code }).catch(() => {});
      } finally {
        await writer.close().catch(() => {});
      }
    };
    ctx.waitUntil(pump());

    return new Response(readable, {
      headers: {
        ...cors,
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};

// Validate the visitor's conversation: plain-text user/assistant turns,
// length-limited, starting and ending with the visitor.
export function cleanMessages(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) return null;
  const out = [];
  for (const m of body.messages.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const text = m.content.trim();
    const max = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (!text || text.length > max) return null;
    out.push({ role: m.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

export function isAllowedOrigin(origin, list) {
  if (!origin || !list) return false;
  return list.split(',').map((s) => s.trim()).filter(Boolean).includes(origin);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '7200',
    Vary: 'Origin',
  };
}

async function withinLimit(limiter, key) {
  if (!limiter) return true; // binding not configured (local tests)
  const { success } = await limiter.limit({ key });
  return success;
}

function describeError(err) {
  if (err instanceof Anthropic.RateLimitError) return { status: 503, code: 'busy' };
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { status: 503, code: 'not_configured' };
  }
  if (err instanceof Anthropic.APIError && err.status === 529) return { status: 503, code: 'busy' };
  return { status: 502, code: 'upstream' };
}

function json(obj, status, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
