import { MAX_BYTES, validInput } from './chat-contract.mjs';
function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('BAD_REQUEST');
  }
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new Error('TOO_LARGE');
  if (!request.body) throw new Error('BAD_REQUEST');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error('TOO_LARGE');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

async function reserveQuota(db, ip, now) {
  const minute = Math.floor(now / 60);
  const day = Math.floor(now / 86400);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${day}:${ip}`));
  const ipHash = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  const rules = [
    [`ip:${minute}:${ipHash}`, 5, (minute + 2) * 60],
    [`global:${minute}`, 10, (minute + 2) * 60],
    [`day:${day}`, 400, (day + 2) * 86400],
  ];
  const statements = rules.map(([bucket, limit, expires]) => db.prepare(
    'INSERT INTO chat_limits(bucket, used, expires_at) VALUES (?, 1, ?) ' +
    'ON CONFLICT(bucket) DO UPDATE SET used = used + 1 WHERE used < ? RETURNING used',
  ).bind(bucket, expires, limit));
  statements.push(db.prepare(
    'DELETE FROM chat_limits WHERE bucket IN (SELECT bucket FROM chat_limits WHERE expires_at < ? LIMIT 30)',
  ).bind(now));
  const results = await db.batch(statements);
  if (results.some(result => !result.success)) throw new Error('QUOTA_STORAGE');
  if (!results[2].results.length) return { code: 'DAILY_LIMIT', seconds: (day + 1) * 86400 - now };
  if (!results[0].results.length || !results[1].results.length) return { code: 'RATE_LIMIT', seconds: 60 };
  return null;
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('AI_TIMEOUT')); return; }
    const stop = () => { clearTimeout(timer); reject(new Error('AI_TIMEOUT')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
    signal.addEventListener('abort', stop, { once: true });
  });
}

async function waitForRender(origin, signal, options = {}) {
  const request = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? pause;
  const started = now();
  const deadline = started + (options.timeoutMs ?? 75000);
  const health = {
    renderHost: new URL(origin).hostname,
    path: '/health',
    attempts: 0,
    elapsedMs: 0,
    httpStatus: null,
    contentType: null,
    reason: 'NOT_ATTEMPTED',
  };
  // Only public routing/status metadata is attached. Never log body, headers or secrets.
  const fail = code => {
    const error = new Error(code);
    error.health = { ...health, elapsedMs: Math.max(0, now() - started) };
    return error;
  };
  while (now() < deadline) {
    if (signal.aborted) throw fail('AI_TIMEOUT');
    const probe = new AbortController();
    const stop = () => probe.abort();
    signal.addEventListener('abort', stop, { once: true });
    // Render cold starts can take >50 s. Keep a probe alive rather than cutting
    // every connection after 10 s; the entire readiness stage is still capped at 75 s.
    const timer = setTimeout(stop, Math.min(options.probeTimeoutMs ?? 60000, Math.max(1, deadline - now())));
    let terminal = false;
    health.attempts++;
    health.httpStatus = null;
    health.contentType = null;
    try {
      const response = await request(origin + '/health', {
        method: 'GET', redirect: 'manual', signal: probe.signal,
        headers: { Accept: 'application/json' },
      });
      health.httpStatus = response.status;
      health.contentType = response.headers.get('content-type')?.split(';')[0]?.slice(0, 80) || null;
      let data = null;
      try { data = await response.json(); }
      catch (error) { if (probe.signal.aborted) throw error; }
      if (response.ok && data?.ready === true) return;
      if (data?.ready === false) {
        health.reason = 'BACKEND_NOT_CONFIGURED';
        terminal = true;
      } else if (response.status >= 400 && response.status < 500 && ![408, 425, 429].includes(response.status)) {
        health.reason = 'HEALTH_HTTP_REJECTED';
        terminal = true;
      } else if (response.status >= 300 && response.status < 400) {
        health.reason = 'HEALTH_REDIRECT';
        terminal = true;
      } else if (response.ok) {
        health.reason = 'HEALTH_RESPONSE_INVALID';
        terminal = true;
      } else {
        health.reason = 'HEALTH_TEMPORARILY_UNAVAILABLE';
      }
    } catch {
      if (signal.aborted) throw fail('AI_TIMEOUT');
      health.reason = probe.signal.aborted ? 'HEALTH_PROBE_TIMEOUT' : 'HEALTH_FETCH_FAILED';
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
    }
    if (terminal) throw fail('AI_UNAVAILABLE');
    const remaining = deadline - now();
    if (remaining > 0) {
      try { await sleep(Math.min(2000, remaining), signal); }
      catch { if (signal.aborted) throw fail('AI_TIMEOUT'); throw fail('AI_UNAVAILABLE'); }
    }
  }
  throw fail('AI_WARMING');
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const secret = env.RELAY_SECRET?.trim() || '';
    let renderOrigin = '';
    try {
      const url = new URL(env.RENDER_URL);
      if (url.protocol === 'https:' && url.hostname.endsWith('.onrender.com') && !url.username && !url.password) renderOrigin = url.origin;
    } catch {}
    const ready = Boolean(renderOrigin && /^[a-f0-9]{64}$/.test(secret) && env.DB);
    if (request.method === 'GET' && (path === '/' || path === '/health')) {
      return json({ service: 'Smart Da Nang Travel AI', build: 'image-chat-1', ready, capabilities: { imageInput: true } }, ready ? 200 : 503);
    }
    if (path !== '/chat') return json({ code: 'NOT_FOUND' }, 404);
    if (request.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'POST' });
    if (!ready) return json({ code: 'NOT_CONFIGURED' }, 503);
    let body;
    try { body = await readBody(request); }
    catch (error) { return json({ code: error.message === 'TOO_LARGE' ? 'TOO_LARGE' : 'BAD_REQUEST' }, error.message === 'TOO_LARGE' ? 413 : 400); }
    if (!validInput(body)) return json({ code: 'BAD_REQUEST' }, 400);
    try {
      const quota = await reserveQuota(env.DB, request.headers.get('CF-Connecting-IP') || 'unknown', Math.floor(Date.now() / 1000));
      if (quota) return json({ code: quota.code }, 429, { 'Retry-After': String(quota.seconds) });
    } catch { return json({ code: 'LIMITER_UNAVAILABLE' }, 503); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 115000);
    try {
      await waitForRender(renderOrigin, controller.signal);
      const response = await fetch(`${renderOrigin}/generate`, {
        method: 'POST', signal: controller.signal, redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        console.error('RENDER_REQUEST_ERROR', { httpStatus: response.status, code: data?.code || 'NO_JSON' });
        const known = ['AI_BUSY', 'AI_TIMEOUT', 'MODEL_UNAVAILABLE', 'NO_ANSWER', 'AI_UNAVAILABLE', 'IMAGE_UNREADABLE'];
        return json({ code: known.includes(data?.code) ? data.code : 'AI_UNAVAILABLE' }, response.status === 429 ? 429 : 502);
      }
      if (typeof data?.reply !== 'string' || !data.reply.trim() || data.reply.length > 2000) return json({ code: 'NO_ANSWER' }, 502);
      return json({ reply: data.reply.trim(), truncated: data.truncated === true });
    } catch (error) {
      const code = controller.signal.aborted ? 'AI_TIMEOUT' : error.message === 'AI_WARMING' ? 'AI_WARMING' : 'AI_UNAVAILABLE';
      if (error.health) console.error('RENDER_HEALTH_ERROR', { code, ...error.health });
      console.error('AI_RELAY_ERROR', { code });
      return json({ code }, 503);
    } finally { clearTimeout(timer); }
  },
};

export { waitForRender };
