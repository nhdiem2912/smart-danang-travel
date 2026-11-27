import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { waitForRender } from './worker.mjs';
const secret='a'.repeat(64);
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const original=globalThis.fetch;let calls=0;let lastBody;let httpStatus=200;let payload={reply:'Xin chào',truncated:false};
 globalThis.fetch=async(url,options)=>{if(url==='https://test.onrender.com/health'){assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,undefined);return Response.json({ready:true});}calls++;lastBody=JSON.parse(options.body);assert.equal(url,'https://test.onrender.com/generate');assert.equal(options.headers.Authorization,`Bearer ${secret}`);assert.equal(options.redirect,'manual');return Response.json(payload,{status:httpStatus});};
 const env={RENDER_URL:'https://test.onrender.com',RELAY_SECRET:secret,DB:{prepare(query){return{bind(...args){return{query,args};}}},async batch(statements){sql.exec('BEGIN');try{const r=statements.map(s=>({success:true,results:sql.prepare(s.query).all(...s.args)}));sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
 const request=(body={language:'vi',messages:[{role:'user',text:'hello'}]})=>new Request('https://x/chat',{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'ip1'},body:JSON.stringify(body)});
 return{sql,env,request,get lastBody(){return lastBody;},get calls(){return calls;},set status(s){httpStatus=s;},set body(b){payload=b;},close(){globalThis.fetch=original;sql.close();}};
}
const cases=[
 ['relay succeeds and uses shared secret',async s=>{const r=await worker.fetch(s.request(),s.env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{reply:'Xin chào',truncated:false});}],
 ['misconfigured secret fails before relay',async s=>{s.env.RELAY_SECRET='bad';assert.equal((await worker.fetch(s.request(),s.env)).status,503);assert.equal(s.calls,0);}],
 ['non Render origin rejected',async s=>{s.env.RENDER_URL='https://example.com';assert.equal((await worker.fetch(s.request(),s.env)).status,503);assert.equal(s.calls,0);}],
 ['D1 minute quota still enforced',async s=>{for(let i=0;i<5;i++)assert.equal((await worker.fetch(s.request(),s.env)).status,200);assert.equal((await worker.fetch(s.request(),s.env)).status,429);assert.equal(s.calls,5);}],
 ['D1 daily quota still enforced',async s=>{const day=Math.floor(Date.now()/86400000);s.sql.prepare('INSERT INTO chat_limits VALUES(?,400,?)').run(`day:${day}`,(day+2)*86400);assert.equal((await (await worker.fetch(s.request(),s.env)).json()).code,'DAILY_LIMIT');assert.equal(s.calls,0);}],
 ['relay authentication failure not disclosed to public',async s=>{s.status=401;s.body={code:'UNAUTHORIZED'};const r=await worker.fetch(s.request(),s.env);assert.equal(r.status,502);assert.equal((await r.json()).code,'AI_UNAVAILABLE');}],
 ['provider quota propagated safely',async s=>{s.status=429;s.body={code:'AI_BUSY'};const r=await worker.fetch(s.request(),s.env);assert.equal(r.status,429);assert.equal((await r.json()).code,'AI_BUSY');}],
];
for(const[name,fn]of cases)test(name,async()=>{const s=fixture();try{await fn(s);}finally{s.close();}});

test('readiness retries cold-start HTTP/HTML responses and succeeds before generation', async () => {
  let time = 0, attempts = 0;
  await waitForRender('https://test.onrender.com', new AbortController().signal, {
    timeoutMs: 5000, now: () => time, sleep: async ms => { time += ms; },
    fetch: async (url, init) => { assert.equal(url, 'https://test.onrender.com/health'); assert.equal(init.method, 'GET'); attempts++; return attempts < 3 ? new Response('<html>Starting</html>', {status:503}) : Response.json({ready:true}); },
  });
  assert.equal(attempts, 3);
});
test('readiness stops at its deadline instead of looping forever', async () => {
  let time = 0, attempts = 0;
  await assert.rejects(waitForRender('https://test.onrender.com', new AbortController().signal, {
    timeoutMs: 4000, now: () => time, sleep: async ms => { time += ms; },
    fetch: async () => { attempts++; throw new Error('network'); },
  }), error => error.message === 'AI_WARMING' && error.health.reason === 'HEALTH_FETCH_FAILED' && error.health.httpStatus === null && error.health.elapsedMs === 4000);
  assert.equal(time, 4000); assert.equal(attempts, 2);
});
test('missing backend configuration does not keep waking or generating', async () => {
  let attempts = 0;
  await assert.rejects(waitForRender('https://test.onrender.com', new AbortController().signal, {
    fetch: async () => { attempts++; return Response.json({ready:false}, {status:503}); },
  }), /AI_UNAVAILABLE/);
  assert.equal(attempts, 1);
});
test('cancelled readiness does not send a request', async () => {
  const controller = new AbortController();controller.abort();let attempts = 0;
  await assert.rejects(waitForRender('https://test.onrender.com', controller.signal, { fetch: async () => {attempts++;return Response.json({ready:true});} }), /AI_TIMEOUT/);
  assert.equal(attempts, 0);
});
test('public health describes configuration without waking Render or spending provider quota',async()=>{
  const f=fixture();try{const r=await worker.fetch(new Request('https://x/health'),f.env);const body=await r.json();assert.equal(body.build,'image-chat-1');assert.equal(body.ready,true);assert.equal(f.calls,0);}finally{f.close();}
});

test('HTTP rejection is diagnosed immediately instead of being labelled as cold start', async () => {
  let attempts=0;
  await assert.rejects(waitForRender('https://test.onrender.com',new AbortController().signal,{
    fetch:async()=>{attempts++;return new Response('<html>Denied</html>',{status:403,headers:{'Content-Type':'text/html'}});},
    sleep:async()=>assert.fail('permanent HTTP errors must not sleep'),
  }),error=>error.message==='AI_UNAVAILABLE'&&error.health.httpStatus===403&&error.health.reason==='HEALTH_HTTP_REJECTED'&&error.health.renderHost==='test.onrender.com');
  assert.equal(attempts,1);
});
test('wrong health contract is diagnosed without repeatedly polling a healthy but wrong endpoint',async()=>{
  await assert.rejects(waitForRender('https://test.onrender.com',new AbortController().signal,{
    fetch:async()=>Response.json({ok:true,items:[]}),sleep:async()=>assert.fail('invalid contract is terminal'),
  }),error=>error.message==='AI_UNAVAILABLE'&&error.health.httpStatus===200&&error.health.reason==='HEALTH_RESPONSE_INVALID');
});
test('temporary HTML startup replies retain their last status at the readiness deadline',async()=>{
  let time=0;
  await assert.rejects(waitForRender('https://test.onrender.com',new AbortController().signal,{
    timeoutMs:4000,now:()=>time,sleep:async ms=>{time+=ms;},
    fetch:async()=>new Response('<html>Starting</html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}}),
  }),error=>error.message==='AI_WARMING'&&error.health.httpStatus===503&&error.health.contentType==='text/html'&&error.health.attempts===2&&error.health.reason==='HEALTH_TEMPORARILY_UNAVAILABLE');
});
test('health diagnostics never retain response body or request credentials',async()=>{
  await assert.rejects(waitForRender('https://test.onrender.com',new AbortController().signal,{
    fetch:async()=>Response.json({ready:false,debug:'private-key-in-body',authorization:'Bearer private-secret'},{status:503}),
  }),error=>error.message==='AI_UNAVAILABLE'&&error.health.reason==='BACKEND_NOT_CONFIGURED'&&!JSON.stringify(error.health).includes('private-'));
});
test('a hanging probe is cancelled and the timeout is distinguished from an HTTP failure',async()=>{
  let time=0;
  await assert.rejects(waitForRender('https://test.onrender.com',new AbortController().signal,{
    timeoutMs:100,probeTimeoutMs:5,now:()=>time,sleep:async()=>{time=100;},
    fetch:async(_url,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true})),
  }),error=>error.message==='AI_WARMING'&&error.health.reason==='HEALTH_PROBE_TIMEOUT'&&error.health.httpStatus===null);
});
test('worker logs health failure safely and never sends generation before readiness',async()=>{
  const f=fixture(),originalLog=console.error,logs=[];let generationCalls=0;
  console.error=(...args)=>logs.push(args);
  globalThis.fetch=async url=>{
    if(url.endsWith('/health'))return new Response('private-body',{status:404,headers:{'Content-Type':'text/plain'}});
    generationCalls++;return Response.json({reply:'should not generate'});
  };
  try{
    const response=await worker.fetch(f.request(),f.env);
    assert.equal(response.status,503);assert.equal((await response.json()).code,'AI_UNAVAILABLE');assert.equal(generationCalls,0);
    const healthLog=logs.find(log=>log[0]==='RENDER_HEALTH_ERROR');
    assert.equal(healthLog[1].httpStatus,404);assert.equal(healthLog[1].reason,'HEALTH_HTTP_REJECTED');
    assert.ok(!JSON.stringify(logs).includes(secret));assert.ok(!JSON.stringify(logs).includes('private-body'));
  }finally{console.error=originalLog;f.close();}
});

const png={mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6brsAAAAASUVORK5CYII='};
test('relay forwards inline photo and question without losing bytes',async()=>{
 const s=fixture();try{const body={language:'vi',messages:[{role:'user',text:'Phân tích ảnh',image:png}]};const r=await worker.fetch(s.request(body),s.env);assert.equal(r.status,200);assert.deepEqual(s.lastBody,body);assert.equal(s.calls,1);}finally{s.close();}
});
test('relay accepts photo payload larger than the old 16 KB limit',async()=>{
 const s=fixture();try{const data=Buffer.concat([Buffer.from(png.data,'base64').subarray(0,8),Buffer.alloc(20000)]).toString('base64');const body={language:'vi',messages:[{role:'user',text:'Ảnh',image:{...png,data}}]};assert.equal((await worker.fetch(s.request(body),s.env)).status,200);assert.equal(s.lastBody.messages[0].image.data,data);}finally{s.close();}
});
for(const [name,image]of [['MIME spoof',{...png,mimeType:'image/jpeg'}],['URL',{...png,data:'https://x/img.png'}],['invalid base64',{...png,data:'%%%='}]])test('relay rejects '+name+' before Render',async()=>{const s=fixture();try{const r=await worker.fetch(s.request({language:'vi',messages:[{role:'user',text:'Ảnh',image}]}),s.env);assert.equal(r.status,400);assert.equal(s.calls,0);}finally{s.close();}});
test('relay rejects oversized chunked body without Content-Length',async()=>{
 const s=fixture();try{const request=new Request('https://x/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({extra:'x'.repeat(6*1024*1024+1)})});assert.equal((await worker.fetch(request,s.env)).status,413);assert.equal(s.calls,0);}finally{s.close();}
});
test('relay propagates unreadable image error without leaking server details',async()=>{const s=fixture();try{s.status=400;s.body={code:'IMAGE_UNREADABLE',details:'private'};const r=await worker.fetch(s.request({language:'vi',messages:[{role:'user',text:'Ảnh',image:png}]}),s.env);assert.equal(r.status,502);assert.deepEqual(await r.json(),{code:'IMAGE_UNREADABLE'});}finally{s.close();}});
