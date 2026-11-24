const MAX_BYTES = 16000;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

async function readBody(request) {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    throw new Error('BAD_REQUEST');
  }

  if (
    Number(request.headers.get('content-length')) >
    MAX_BYTES
  ) {
    throw new Error('TOO_LARGE');
  }

  if (!request.body) {
    throw new Error('BAD_REQUEST');
  }

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

      text += decoder.decode(value, {
        stream: true,
      });
    }

    text += decoder.decode();

    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

function validInput(value) {
  return (
    value &&
    ['vi', 'en', 'ko', 'ja', 'zh'].includes(
      value.language,
    ) &&
    Array.isArray(value.messages) &&
    value.messages.length >= 1 &&
    value.messages.length <= 7 &&
    value.messages.every(
      (message, index) =>
        message &&
        message.role ===
          (index % 2 === 0 ? 'user' : 'assistant') &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.length <= 2000,
    ) &&
    value.messages[value.messages.length - 1]
      .role === 'user' &&
    value.messages[value.messages.length - 1]
      .text.length <= 1000
  );
}

async function reserveQuota(db, ip, now) {
  const minute = Math.floor(now / 60);
  const day = Math.floor(now / 86400);

  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${day}:${ip}`),
  );

  const ipHash = [...new Uint8Array(hash)]
    .map(byte =>
      byte.toString(16).padStart(2, '0'),
    )
    .join('');

  const rules = [
    [
      `ip:${minute}:${ipHash}`,
      5,
      (minute + 2) * 60,
    ],
    [
      `global:${minute}`,
      10,
      (minute + 2) * 60,
    ],
    [
      `day:${day}`,
      400,
      (day + 2) * 86400,
    ],
  ];

  const statements = rules.map(
    ([bucket, limit, expires]) =>
      db.prepare(
        'INSERT INTO chat_limits(bucket, used, expires_at) ' +
        'VALUES (?, 1, ?) ' +
        'ON CONFLICT(bucket) DO UPDATE ' +
        'SET used = used + 1 WHERE used < ? ' +
        'RETURNING used',
      ).bind(bucket, expires, limit),
  );

  statements.push(
    db.prepare(
      'DELETE FROM chat_limits WHERE bucket IN ' +
      '(SELECT bucket FROM chat_limits ' +
      'WHERE expires_at < ? LIMIT 30)',
    ).bind(now),
  );

  const results = await db.batch(statements);

  if (results.some(result => !result.success)) {
    throw new Error('QUOTA_STORAGE');
  }

  if (!results[2].results.length) {
    return {
      code: 'DAILY_LIMIT',
      seconds: (day + 1) * 86400 - now,
    };
  }

  if (
    !results[0].results.length ||
    !results[1].results.length
  ) {
    return {
      code: 'RATE_LIMIT',
      seconds: 60,
    };
  }

  return null;
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('AI_TIMEOUT'));
      return;
    }

    const stop = () => {
      clearTimeout(timer);
      reject(new Error('AI_TIMEOUT'));
    };

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, ms);

    signal.addEventListener('abort', stop, {
      once: true,
    });
  });
}

async function waitForRender(
  origin,
  signal,
  options = {},
) {
  const request = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? pause;

  const deadline =
    now() + (options.timeoutMs ?? 75000);

  while (now() < deadline) {
    if (signal.aborted) {
      throw new Error('AI_TIMEOUT');
    }

    const probe = new AbortController();
    const stop = () => probe.abort();

    signal.addEventListener('abort', stop, {
      once: true,
    });

    const timer = setTimeout(
      stop,
      Math.min(
        10000,
        Math.max(1, deadline - now()),
      ),
    );

    let configured = true;

    try {
      const response = await request(
        origin + '/health',
        {
          method: 'GET',
          redirect: 'error',
          signal: probe.signal,
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (
        response.ok &&
        data?.ready === true
      ) {
        return;
      }

      if (data?.ready === false) {
        configured = false;
      }
    } catch {
      if (signal.aborted) {
        throw new Error('AI_TIMEOUT');
      }
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
    }

    if (!configured) {
      throw new Error('AI_UNAVAILABLE');
    }

    const remaining = deadline - now();

    if (remaining > 0) {
      await sleep(
        Math.min(2000, remaining),
        signal,
      );
    }
  }

  throw new Error('AI_WARMING');
}

export default {
  async fetch(request, env) {
    const path =
      new URL(request.url).pathname;

    const secret =
      env.RELAY_SECRET?.trim() || '';

    let renderOrigin = '';

    try {
      const url = new URL(env.RENDER_URL);

      if (
        url.protocol === 'https:' &&
        url.hostname.endsWith('.onrender.com') &&
        !url.username &&
        !url.password
      ) {
        renderOrigin = url.origin;
      }
    } catch {
      // Configuration is checked below.
    }

    const ready = Boolean(
      renderOrigin &&
      /^[a-f0-9]{64}$/.test(secret) &&
      env.DB,
    );

    if (
      request.method === 'GET' &&
      (path === '/' || path === '/health')
    ) {
      return json(
        {
          service: 'Smart Da Nang Travel AI',
          build: 'render-warmup-1',
          ready,
        },
        ready ? 200 : 503,
      );
    }

    if (path !== '/chat') {
      return json({ code: 'NOT_FOUND' }, 404);
    }

    if (request.method !== 'POST') {
      return json(
        { code: 'METHOD_NOT_ALLOWED' },
        405,
        { Allow: 'POST' },
      );
    }

    if (!ready) {
      return json(
        { code: 'NOT_CONFIGURED' },
        503,
      );
    }

    let body;

    try {
      body = await readBody(request);
    } catch (error) {
      const tooLarge =
        error.message === 'TOO_LARGE';

      return json(
        {
          code:
            tooLarge
              ? 'TOO_LARGE'
              : 'BAD_REQUEST',
        },
        tooLarge ? 413 : 400,
      );
    }

    if (!validInput(body)) {
      return json(
        { code: 'BAD_REQUEST' },
        400,
      );
    }

    try {
      const quota = await reserveQuota(
        env.DB,
        request.headers.get(
          'CF-Connecting-IP',
        ) || 'unknown',
        Math.floor(Date.now() / 1000),
      );

      if (quota) {
        return json(
          { code: quota.code },
          429,
          {
            'Retry-After':
              String(quota.seconds),
          },
        );
      }
    } catch {
      return json(
        { code: 'LIMITER_UNAVAILABLE' },
        503,
      );
    }

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      115000,
    );

    try {
      await waitForRender(
        renderOrigin,
        controller.signal,
      );

      // Send the generation request only once.
      const response = await fetch(
        `${renderOrigin}/generate`,
        {
          method: 'POST',
          signal: controller.signal,
          redirect: 'error',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${secret}`,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        console.error(
          'RENDER_REQUEST_ERROR',
          {
            httpStatus: response.status,
            code: data?.code || 'NO_JSON',
          },
        );

        const known = [
          'AI_BUSY',
          'AI_TIMEOUT',
          'MODEL_UNAVAILABLE',
          'NO_ANSWER',
          'AI_UNAVAILABLE',
        ];

        return json(
          {
            code: known.includes(data?.code)
              ? data.code
              : 'AI_UNAVAILABLE',
          },
          response.status === 429
            ? 429
            : 502,
        );
      }

      if (
        typeof data?.reply !== 'string' ||
        !data.reply.trim() ||
        data.reply.length > 2000
      ) {
        return json(
          { code: 'NO_ANSWER' },
          502,
        );
      }

      return json({
        reply: data.reply.trim(),
        truncated:
          data.truncated === true,
      });
    } catch (error) {
      const code =
        controller.signal.aborted
          ? 'AI_TIMEOUT'
          : error.message === 'AI_WARMING'
            ? 'AI_WARMING'
            : 'AI_UNAVAILABLE';

      console.error(
        'AI_RELAY_ERROR',
        { code },
      );

      return json({ code }, 503);
    } finally {
      clearTimeout(timer);
    }
  },
};