import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = 'https://smart-danang-chat.ngohongdiem2912.workers.dev';
const health = await fetch(origin + '/health');
const status = await health.json();
assert.equal(health.status, 200, 'Worker health must be ready');
assert.equal(status.build, 'image-chat-1', 'Expected the image-enabled Worker');
assert.equal(status.capabilities?.imageInput, true);

// One synthetic, non-personal image; this makes one real Gemini request.
const bytes = await readFile(new URL('../cloudflare/fixtures/vision-smoke.png', import.meta.url));
const response = await fetch(origin + '/chat', {
  method: 'POST',
  signal: AbortSignal.timeout(130000),
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'vi',
    messages: [{
      role: 'user',
      text: 'Hãy mô tả ngắn gọn hình ảnh đính kèm và màu sắc nhìn thấy.',
      image: { mimeType: 'image/png', data: bytes.toString('base64') },
    }],
  }),
});
const result = await response.json();
assert.equal(response.status, 200, `Image chat failed: ${result.code || 'NO_CODE'}`);
assert.ok(typeof result.reply === 'string' && result.reply.trim().length > 0);
console.log(JSON.stringify({
  liveImageChat: 'passed',
  imageBytes: bytes.length,
  reply: result.reply.slice(0, 500),
}));
