import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(run) {
  const originalFetch=globalThis.fetch, originalToken=process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN='test-deploy-token';
  try { await run(); } finally {
    globalThis.fetch=originalFetch;
    if(originalToken===undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN=originalToken;
  }
}
test('deployment uploads both modules and preserves existing secrets, D1 and compatibility settings',()=>fixture(async()=>{
 let uploaded=false;
 globalThis.fetch=async(url,init)=>{
  assert.equal(init.headers.Authorization,'Bearer test-deploy-token');
  assert.ok(url.includes('/workers/scripts/smart-danang-chat'));
  if(url.endsWith('/settings'))return Response.json({success:true,result:{compatibility_date:'2026-08-06',compatibility_flags:['nodejs_compat'],observability:{enabled:true},bindings:[{type:'d1',name:'DB'},{type:'plain_text',name:'RENDER_URL'},{type:'secret_text',name:'RELAY_SECRET'}]}});
  uploaded=true;assert.equal(init.method,'PUT');
  const meta=JSON.parse(await init.body.get('metadata').text());
  assert.deepEqual(meta.keep_bindings,['d1','plain_text','secret_text']);assert.equal(meta.compatibility_date,'2026-08-06');assert.deepEqual(meta.compatibility_flags,['nodejs_compat']);assert.equal(meta.observability.enabled,true);
  assert.equal(init.body.get('worker.mjs').type,'application/javascript+module');
  assert.match(await init.body.get('chat-contract.mjs').text(),/export function validImage/);
  return Response.json({success:true,result:{id:'test-worker'}});
 };
 await import('../scripts/deploy-chat-worker.mjs?test=preserve');assert.ok(uploaded);
}));
test('deployment stops before upload if a required existing binding is absent',()=>fixture(async()=>{
 let puts=0;
 globalThis.fetch=async(_url,init)=>{if(init.method==='PUT')puts++;return Response.json({success:true,result:{bindings:[]}});};
 await assert.rejects(import('../scripts/deploy-chat-worker.mjs?test=missing'),/binding DB is missing/);assert.equal(puts,0);
}));
