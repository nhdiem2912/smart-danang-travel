const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const ROOT=path.resolve('src'),fixture=JSON.parse(fs.readFileSync(path.join(ROOT,'data/places.json'),'utf8'));
function load(file,mocks={},cache=new Map()){
 const full=path.resolve(ROOT,file);if(cache.has(full))return cache.get(full);
 const exports={};cache.set(full,exports);
 const req=id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id==='react/jsx-runtime')return require('react/jsx-runtime');
  let target=id.startsWith('@/')?path.join(ROOT,id.slice(2)):path.resolve(path.dirname(full),id);
  if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));
  for(const suffix of ['.ts','.tsx'])if(fs.existsSync(target+suffix))return load(path.relative(ROOT,target+suffix),mocks,cache);
  throw Error('Unmocked '+id);
 };
 const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:req,Date,Error,setTimeout,clearTimeout,setInterval,clearInterval,console},{filename:full});return exports;
}
function storageHarness(get){
 const memory=new Map(),storage={getItem:get??(async key=>memory.get(key)??null),setItem:async(k,v)=>memory.set(k,v)};
 return {memory,storage,store:load('features/account/account-avatar-store.ts',{'@react-native-async-storage/async-storage':storage})};
}
test('avatar reuses the existing per-account storage key and publishes changes to both consumers',async()=>{
 const h=storageHarness();h.memory.set('@smart-danang-travel/avatar:v1:A','file://old.jpg');await h.store.loadAccountAvatar('A');assert.equal(h.store.avatarSnapshot('A').uri,'file://old.jpg');
 let home,settings;h.store.subscribeAvatar(()=>home=h.store.avatarSnapshot('A').uri);h.store.subscribeAvatar(()=>settings=h.store.avatarSnapshot('A').uri);
 await h.store.saveAccountAvatar('A','file://new.jpg');assert.equal(home,'file://new.jpg');assert.equal(settings,home);
});
test('slow avatar hydration cannot overwrite a newly saved photo',async()=>{
 let release;const h=storageHarness(()=>new Promise(r=>release=r));const waiting=h.store.loadAccountAvatar('A');await h.store.saveAccountAvatar('A','file://new.jpg');release('file://old.jpg');await waiting;assert.equal(h.store.avatarSnapshot('A').uri,'file://new.jpg');
});
test('avatar snapshots remain isolated across account switches and signed-out state',async()=>{
 const h=storageHarness();await h.store.saveAccountAvatar('A','file://A.jpg');assert.equal(h.store.avatarSnapshot('B').uri,null);await h.store.saveAccountAvatar('B','file://B.jpg');assert.equal(h.store.avatarSnapshot('A').uri,'file://A.jpg');assert.equal(h.store.avatarSnapshot(null).uri,null);
});
test('failed avatar persistence does not publish a photo that was never saved',async()=>{
 const h=storageHarness();await h.store.saveAccountAvatar('A','file://old.jpg');h.storage.setItem=async()=>{throw Error('disk full');};await assert.rejects(h.store.saveAccountAvatar('A','file://new.jpg'));assert.equal(h.store.avatarSnapshot('A').uri,'file://old.jpg');
});
test('area filters support multiple areas and old price settings no longer hide records',()=>{
 const f=load('features/discovery/place-filters.ts');const base=fixture.find(p=>!p.legacy_only);
 const rows=[{...base,id:'a',area:'Sơn Trà',rating:4.7},{...base,id:'b',area:'Hải Châu',rating:4.8},{...base,id:'c',area:'An Hải',rating:3.5}];
 const filters={...f.defaultDiscoveryFilters(),areas:['Sơn Trà','Hải Châu'],pricePreset:'under200',maxPriceVnd:0};
 assert.equal(f.applyDiscoveryFilters(rows,filters).length,2);assert.equal(f.discoveryFilterCount(filters),1);
 filters.areas=[];assert.equal(f.applyDiscoveryFilters(rows,filters).length,3);
 filters.radiusKm=3;assert.throws(()=>f.applyDiscoveryFilters(rows,filters),/GPS/);
});
function homeMocks(){
 const navigations=[];
 const react={useEffect(){},useRef:v=>({current:v}),useState:v=>[typeof v==='function'?v():v,()=>{}]};
 const settings={background:'#fff',text:'#111',green:'#087f61',muted:'#718096',card:'#fff',line:'#eee',pale:'#ecfdf5'};
 const mocks={
  'react':react,'expo-router':{router:{navigate:value=>navigations.push(value)}},'react-native':{Alert:{alert(){}},View:'View'},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:24,left:0,right:0})},'react-native-webview':{WebView:'WebView'},
  '@/data/use-places-catalog':{usePlacesCatalog:()=>({places:fixture})},'@/data/places.local':{findPlaceById:id=>fixture.find(p=>p.id===id),places:fixture,normalizeSearch:s=>s},
  '@/features/account/account-store':{useAccount:()=>({user:{uid:'A',name:'Tester',photoURL:null}})},'@/features/account/use-account-avatar':{useHomeAvatar:()=>null},
  '@/features/profile/profile-context':{useTravelerProfile:()=>({profile:{displayName:'Tester'}})},'@/features/settings/settings-colors':{useSettingsColors:()=>settings},'@/features/settings/settings-store':{useAppSettings:()=>({settings:{language:'vi'}})},
  '@/features/discovery/add-stop-sheet':{AddStopSheet:'AddStopSheet'},'@/features/discovery/place-details-sheet':{PlaceDetailsSheet:'PlaceDetailsSheet'},'@/features/discovery/trip-time-policy':{hasActiveTrip:()=>false},'@/features/discovery/use-trip-draft':{useTripDraft:()=>({draft:null})},'@/features/home/event-directions':{default:'EventDirections'},'@/features/home/home-weather':{loadHomeWeather:()=>Promise.resolve(null)},'@/features/home/use-home-weather':{useHomeWeather:()=>({weather:null,weatherError:'',refreshWeather(){}})},
 };
 return {mocks,navigations};
}
test('all banner IDs resolve to their own place even when place names change',()=>{
 const h=homeMocks();const banners=load('features/home/home-banners.ts',h.mocks).HOME_BANNERS;assert.equal(banners.length,3);
 for(const banner of banners)assert.ok(fixture.find(p=>p.id===banner.placeId));assert.equal(banners[0].placeId,'google:ChIJ9R9l5N89QjERbzmmvAxpZB8');
});
test('Home banner bridge navigates to Explore with exact place ID and unique opening token',()=>{
 const h=homeMocks();const screen=load('app/index.tsx',h.mocks).default();const webview=screen.props.children.find(child=>child?.type==='WebView');assert.ok(webview);
 const id='google:ChIJL1GKWJYZQjERLrEGqlK2kwQ';
 webview.props.onMessage({nativeEvent:{data:JSON.stringify({action:'place',value:id})}});
 webview.props.onMessage({nativeEvent:{data:JSON.stringify({action:'place',value:id})}});
 assert.equal(h.navigations.length,2);assert.equal(h.navigations[0].pathname,'/explore');assert.equal(h.navigations[0].params.placeId,id);assert.notEqual(h.navigations[0].params.openToken,h.navigations[1].params.openToken);
});
test('custom tab bar respects tabPress cancellation and navigates using Expo 58 route keys',()=>{
 const events=[],navigated=[];let cancel=false;
 const h=homeMocks();Object.assign(h.mocks,{'@expo/vector-icons/Ionicons':'Icon','@expo/vector-icons/MaterialCommunityIcons':'Robot','react-native':{Pressable:'Pressable',Text:'Text',View:'View',StyleSheet:{hairlineWidth:1,create:s=>s}},'expo-router':{Tabs:Object.assign(()=>null,{Screen:'Screen'})},'@/features/settings/settings-i18n':{translate:(_,key)=>key}});
 const root=load('components/app-tabs-shared.tsx',h.mocks).default();
 const routes=['index','explore','assistant','itinerary','settings'].map(name=>({name,key:name+'-key'}));
 const element=root.props.tabBar({state:{routes,index:0},emitter:{emit:e=>{events.push(e);return{defaultPrevented:cancel};}},navigateToTab:key=>navigated.push(key),insets:{bottom:24}});
 const tree=element.type(element.props),buttons=tree.props.children.props.children;
 buttons[2].props.onPress();assert.equal(navigated[0],'assistant-key');assert.equal(events[0].type,'tabPress');
 cancel=true;buttons[1].props.onPress();assert.equal(navigated.length,1);
 cancel=false;buttons[0].props.onPress();assert.equal(navigated.length,1);
 buttons[4].props.onLongPress();assert.equal(events.at(-1).type,'tabLongPress');
});
