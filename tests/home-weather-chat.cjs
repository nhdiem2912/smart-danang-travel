const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const plain = x => JSON.parse(JSON.stringify(x));
const flush = async () => { for (let i=0;i<12;i++) await Promise.resolve(); };
function loader(mocks = {}, globals = {}) {
 const cache = new Map();
 function load(file) {
  const full = path.resolve(file); if(cache.has(full)) return cache.get(full);
  const exports={};cache.set(full,exports);
  const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const req=id=>{
   if(Object.hasOwn(mocks,id)) return mocks[id];
   if(id==='react/jsx-runtime') return require(id);
   const candidate=id.startsWith('@/')?path.resolve('src',id.slice(2)):path.resolve(path.dirname(full),id);
   for(const suffix of ['','.ts','.tsx'])if(fs.existsSync(candidate+suffix)&&fs.statSync(candidate+suffix).isFile())return load(candidate+suffix);
   throw Error('Missing mock '+id);
  };
  vm.runInNewContext(code,{exports,require:req,Date,Error,AbortController,Response,setTimeout,clearTimeout,setInterval,clearInterval,...globals},{filename:full});return exports;
 }
 return load;
}
function weatherFixture(first='2026-11-27') {
 const dates=Array.from({length:7},(_,i)=>new Date(Date.parse(first+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const times=dates.flatMap(date=>Array.from({length:24},(_,h)=>date+'T'+String(h).padStart(2,'0')+':00'));
 return {current:{time:first+'T12:45',temperature_2m:26,relative_humidity_2m:80,weather_code:3,wind_speed_10m:7},daily:{time:dates,temperature_2m_min:dates.map(()=>22),temperature_2m_max:dates.map(()=>28),weather_code:dates.map(()=>3),precipitation_probability_max:dates.map(()=>70)},hourly:{time:times,temperature_2m:times.map(()=>26),weather_code:times.map(()=>3),precipitation_probability:times.map(()=>70),uv_index:times.map(()=>2)}};
}
const parse=loader()('src/features/home/home-weather.ts').parseHomeWeather;
test('hourly forecast contains all 24 hours, including before and after current time',()=>{
 const w=parse(weatherFixture(),Date.parse('2026-11-27T05:53:00Z'));
 assert.equal(w.hours.length,24);assert.equal(w.hours[0].time,'00:00');assert.equal(w.hours.at(-1).time,'23:00');
 assert.equal(w.observedAt,'2026-11-27T12:45+07:00');assert.equal(w.fetchedAt,'2026-11-27T05:53:00.000Z');
});
test('forecast chooses today in Vietnam when UTC is still the previous day',()=>{
 const w=parse(weatherFixture('2026-12-31'),Date.parse('2026-12-31T17:02:00Z'));
 assert.equal(w.date,'2027-01-01');assert.equal(w.hours.length,24);assert.equal(w.days[0].date,'2027-01-01');assert.match(w.hours[0].timestamp,/2027-01-01/);
});
test('old provider observation does not select the wrong day of hourly forecast',()=>{
 const w=parse(weatherFixture('2026-11-26'),Date.parse('2026-11-27T05:53:00Z'));
 assert.equal(w.date,'2026-11-27');assert.ok(w.hours.every(h=>h.timestamp.startsWith(w.date)));
});
test('invalid current weather or missing today fails instead of inventing data',()=>{
 const d=weatherFixture();d.current.temperature_2m=null;assert.throws(()=>parse(d,Date.parse('2026-11-27T00:00Z')));
 assert.throws(()=>parse(weatherFixture(),Date.parse('2027-01-27T00:00Z')));
});
function hookHarness() {
 const state=[];let cursor=0,effect,onState,removed=false,seq=0,fetches=0,pending=false,fail=false;
 const intervals=new Map(),timeouts=new Map(); const value={temperature:25};
 const react={useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],n=>state[i]=typeof n==='function'?n(state[i]):n];},useRef(initial){const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i];}};
 const load=loader({react,'expo-router':{useFocusEffect:fn=>effect=fn},'react-native':{AppState:{currentState:'active',addEventListener(_,fn){onState=fn;return{remove(){removed=true;}};}}},'./home-weather':{loadHomeWeather:async signal=>{fetches++;if(pending)return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort'))));if(fail)throw Error('offline');return value;}}},{setInterval(fn,ms){const id=++seq;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),setTimeout(fn){const id=++seq;timeouts.set(id,fn);return id;},clearTimeout:id=>timeouts.delete(id)});
 const invokeHook=load('src/features/home/use-home-weather.ts').useHomeWeather;
 return{render(){cursor=0;return invokeHook();},focus(){return effect();},background(){onState('background');},resume(){onState('active');},tick(){for(const x of intervals.values())x.fn();},get intervals(){return intervals;},get calls(){return fetches;},get removed(){return removed;},set fail(x){fail=x;},set pending(x){pending=x;},value};
}
test('weather refreshes on focus, every 5 minutes, and immediately on foreground',async()=>{
 const h=hookHarness();h.render();const cleanup=h.focus();await flush();assert.equal(h.calls,1);assert.equal([...h.intervals.values()][0].ms,300000);
 h.tick();await flush();assert.equal(h.calls,2);h.background();assert.equal(h.intervals.size,0);h.resume();await flush();assert.equal(h.calls,3);
 cleanup();assert.equal(h.intervals.size,0);assert.equal(h.removed,true);
});
test('weather keeps last successful data and exposes refresh failure',async()=>{
 const h=hookHarness();h.render();const cleanup=h.focus();await flush();h.fail=true;h.tick();await flush();const snapshot=h.render();assert.equal(snapshot.weather,h.value);assert.match(snapshot.weatherError,/Chưa tải/);cleanup();
});
test('weather suppresses overlapping requests and stops requests after blur',async()=>{
 const h=hookHarness();h.pending=true;let snapshot=h.render();const cleanup=h.focus();h.tick();assert.equal(h.calls,1);h.background();h.resume();assert.equal(h.calls,2);await flush();snapshot=h.render();assert.equal(snapshot.weatherError,'');cleanup();snapshot.refreshWeather();assert.equal(h.calls,2);
});
test('manual weather refresh uses the same active request lifecycle',async()=>{
 const h=hookHarness();h.render();const cleanup=h.focus();await flush();h.render().refreshWeather();await flush();assert.equal(h.calls,2);cleanup();
});
const content=loader()('src/features/assistant/chat-content.ts');
const photo={mimeType:'image/jpeg',data:'/9j/AAAA'};
test('image context preserves pairs and the latest two photos',()=>{
 const prior=[{role:'user',text:'one',image:photo},{role:'assistant',text:'a'},{role:'user',text:'two',image:photo},{role:'assistant',text:'b'}];
 const turns=content.makeChatTurns(prior,'three',photo);assert.deepEqual(plain(turns.map(t=>t.text)),['two','b','three']);assert.equal(turns.filter(t=>t.image).length,2);assert.equal(turns[0].role,'user');
});
test('text-only follow-up retains recent photo without placing it on assistant turns',()=>{
 const turns=content.makeChatTurns([{role:'user',text:'photo',image:photo},{role:'assistant',text:'answer'}],'more');assert.equal(turns[0].image,photo);assert.equal(turns.at(-1).image,undefined);
});
function pickerHarness({cancel=false,oversize=false}={}) {
 const calls=[];const image={uri:'cache:compressed',base64:oversize?'A'.repeat(4*Math.ceil((2*1024*1024+3)/3)):'/9j/AAAA'};
 const rendered={saveAsync:async options=>{calls.push(['save',options]);return image;},release:()=>calls.push(['release-image'])};
 const context={resize:o=>calls.push(['resize',o]),renderAsync:async()=>rendered,release:()=>calls.push(['release-context'])};
 const pick=loader({'expo-image-picker':{launchImageLibraryAsync:async options=>{calls.push(['picker',options]);return cancel?{canceled:true,assets:null}:{canceled:false,assets:[{uri:'photo:original',width:4000,height:3000}]};}},'expo-image-manipulator':{ImageManipulator:{manipulate:uri=>{calls.push(['manipulate',uri]);return context;}},SaveFormat:{JPEG:'jpeg'}}})('src/features/assistant/pick-chat-image.ts').pickChatImage;
 return{pick,calls};
}
test('photo picker resizes whole image to 1600 and sends compressed JPEG bytes',async()=>{
 const h=pickerHarness(),image=await h.pick();assert.equal(image.mimeType,'image/jpeg');assert.equal(image.uri,'cache:compressed');assert.equal(image.data,'/9j/AAAA');assert.deepEqual(plain(h.calls.find(c=>c[0]==='resize')[1]),{width:1600,height:null});assert.equal(h.calls.find(c=>c[0]==='picker')[1].allowsEditing,false);assert.equal(h.calls.filter(c=>c[0].startsWith('release-')).length,2);
});
test('canceling picker does not prepare or upload an image',async()=>{const h=pickerHarness({cancel:true});assert.equal(await h.pick(),null);assert.equal(h.calls.length,1);});
test('oversized image is rejected before a chat request and releases image buffers',async()=>{const h=pickerHarness({oversize:true});await assert.rejects(h.pick(),/2 MB/);assert.equal(h.calls.filter(c=>c[0].startsWith('release-')).length,2);});
function elements(node,predicate){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(n=>elements(n,predicate));if(!node.props)return[];return[...(predicate(node)?[node]:[]),...elements(node.props.children,predicate)];}
function assistantHarness() {
 const state=[],requests=[],alerts=[];let cursor=0,answerStatus=200,picked={...photo,uri:'cache:photo'};
 const react={useEffect(){},useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],n=>state[i]=typeof n==='function'?n(state[i]):n];},useRef(initial){const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i];}};
 const colors={background:'#fff',card:'#fff',text:'#123',green:'#087',muted:'#666',line:'#ddd',pale:'#efe'};
 const mocks={react,'@expo/vector-icons/Ionicons':'Icon','react-native':{ActivityIndicator:'Spinner',FlatList:'FlatList',Image:'Image',KeyboardAvoidingView:'KeyboardAvoidingView',Platform:{OS:'android'},Pressable:'Pressable',StyleSheet:{create:x=>x},Text:'Text',TextInput:'TextInput',View:'View',Alert:{alert:(...args)=>alerts.push(args)}},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,left:0,right:0})},'@/features/settings/settings-colors':{useSettingsColors:()=>colors},'@/features/settings/settings-store':{useAppSettings:()=>({settings:{language:'vi'}})},'@/features/profile/personalization':{personalizedQuestion:text=>text},'@/features/profile/profile-context':{useTravelerProfile:()=>({profile:null})},'@/features/assistant/pick-chat-image':{pickChatImage:async()=>picked}};
 const Screen=loader(mocks,{fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return Response.json(answerStatus===200?{reply:'Tôi thấy hình ảnh',truncated:false}:{code:'AI_UNAVAILABLE'},{status:answerStatus});}})('src/app/assistant.tsx').default;
 return{render(){cursor=0;return Screen();},requests,alerts,set status(s){answerStatus=s;},set picked(x){picked=x;}};
}
const button=(tree,label)=>elements(tree,n=>n.type==='Pressable'&&n.props.accessibilityLabel===label)[0];
const list=tree=>elements(tree,n=>n.type==='FlatList')[0];
test('chat sends selected image without requiring a caption, and shows its preview in conversation',async()=>{
 const h=assistantHarness();button(h.render(),'Chọn ảnh gửi cho AI').props.onPress();await flush();let tree=h.render();assert.equal(button(tree,'Gửi câu hỏi').props.disabled,false);button(tree,'Gửi câu hỏi').props.onPress();await flush();tree=h.render();assert.equal(h.requests.length,1);assert.deepEqual(h.requests[0].messages[0].image,photo);assert.match(h.requests[0].messages[0].text,/phân tích ảnh/);const data=list(tree).props.data;assert.equal(data.at(-2).imageUri,'cache:photo');assert.equal(data.at(-1).status,'done');
});
test('removing an attachment sends only the typed question',async()=>{
 const h=assistantHarness();button(h.render(),'Chọn ảnh gửi cho AI').props.onPress();await flush();button(h.render(),'Gỡ ảnh đính kèm').props.onPress();let tree=h.render();elements(tree,n=>n.type==='TextInput')[0].props.onChangeText('Xin chào');button(h.render(),'Gửi câu hỏi').props.onPress();await flush();assert.equal(h.requests[0].messages[0].image,undefined);
});
test('retry uses original image and question without duplicating user message',async()=>{
 const h=assistantHarness();h.status=503;button(h.render(),'Chọn ảnh gửi cho AI').props.onPress();await flush();button(h.render(),'Gửi câu hỏi').props.onPress();await flush();const tree=h.render(),flat=list(tree),message=flat.props.data.at(-1);assert.equal(message.status,'error');h.status=200;const bubble=flat.props.renderItem({item:message});elements(bubble,n=>n.type==='Pressable')[0].props.onPress();await flush();assert.equal(h.requests.length,2);assert.deepEqual(h.requests[0],h.requests[1]);assert.equal(list(h.render()).props.data.filter(m=>m.role==='user').length,1);
});
