import { readFile } from 'node:fs/promises';

const account = '8c50be055241b4917ae02d17356d81a0';
const worker = 'smart-danang-chat';
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('Missing GitHub repository secret CLOUDFLARE_API_TOKEN.');
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}`;
const headers = { Authorization: `Bearer ${token}` };

async function result(response) {
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    // Keep response bodies and credentials out of CI logs.
    throw new Error(`Cloudflare API failed: HTTP ${response.status}, codes ${(body.errors || []).map(error => error.code).join(',')}`);
  }
  return body.result;
}

const settings = await result(await fetch(base + '/settings', { headers }));
for (const name of ['DB', 'RENDER_URL', 'RELAY_SECRET']) {
  if (!settings.bindings?.some(binding => binding.name === name)) {
    throw new Error(`Existing Worker binding ${name} is missing; deployment stopped.`);
  }
}
const metadata = {
  main_module: 'worker.mjs',
  compatibility_date: settings.compatibility_date || '2026-11-24',
  compatibility_flags: settings.compatibility_flags || [],
  keep_bindings: [...new Set(settings.bindings.map(binding => binding.type))],
  ...(settings.observability ? { observability: settings.observability } : {}),
};
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
for (const module of ['worker.mjs', 'chat-contract.mjs']) {
  form.append(module, new Blob([await readFile(new URL(`../cloudflare/${module}`, import.meta.url))], {
    type: 'application/javascript+module',
  }), module);
}
const deployed = await result(await fetch(base, { method: 'PUT', headers, body: form }));
console.log(JSON.stringify({ worker, deployed: true, version: deployed.deployment_id || deployed.id }));
