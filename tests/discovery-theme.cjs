const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const ROOT = path.resolve('src');
function harness() {
  let scheme = 'light';
  const palette = {
    light: { background:'#F6F9FC',card:'#FFFFFF',text:'#253347',muted:'#718096',line:'#E1E9F1',input:'#F8FAFC',green:'#087F61',pale:'#ECFDF5',danger:'#B42318',overlay:'#0F172A88' },
    dark: { background:'#0C1421',card:'#172334',text:'#E8EEF7',muted:'#A5B5C8',line:'#2B3D53',input:'#1D2C40',green:'#79E0B7',pale:'#183B31',danger:'#FDA4AF',overlay:'#00000099' },
  };
  const cache = new Map();
  const place = { id:'p1',name:'Test place',category:'tham_quan',rating:4.5,rating_count:10,address:'Da Nang',opening_hours_raw:null,image_url:null,coordinates_valid:true };
  const stop = { id:'s1',placeId:'p1',period:'morning',completed:false,dayIndex:0,order:0 };
  const draft = { id:'trip',stops:[stop],dayCount:1,startDate:'2026-11-24',settings:{defaultVisitMinutes:60} };
  function load(file) {
    const abs=path.resolve(ROOT,file);if(cache.has(abs))return cache.get(abs);
    const exports={};cache.set(abs,exports);
    function req(id) {
      if(id==='react')return {useMemo:f=>f(),useState:v=>[typeof v==='function'?v():v,()=>{}],useRef:v=>({current:v}),useEffect(){},useCallback:f=>f,useDeferredValue:v=>v};
      if(id==='react/jsx-runtime')return require('react/jsx-runtime');
      if(id==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',FlatList:'FlatList',TextInput:'TextInput',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:x=>x,absoluteFill:{}},Platform:{OS:'android'}};
      if(id==='expo-router')return {router:{},useFocusEffect(){},useLocalSearchParams:()=>({})};
      if(id==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
      if(id==='@expo/vector-icons/FontAwesome5')return {__esModule:true,default:'HotelIcon'};
      if(id==='@expo/vector-icons/MaterialCommunityIcons')return {__esModule:true,default:'CategoryIcon'};
      if(id==='@expo/vector-icons/Ionicons')return {__esModule:true,default:'Icon'};
      if(id==='@/features/settings/settings-colors')return {useSettingsColors:()=>palette[scheme]};
      if(id==='@/data/use-places-catalog')return {usePlacesCatalog:()=>({places:[place]})};
      if(id==='@/data/places.local')return {findPlaceById:()=>place,normalizeSearch:s=>s.toLowerCase()};
      if(id==='@/features/profile/profile-context')return {useTravelerProfile:()=>({profile:null})};
      if(id==='@/features/profile/personalization')return {sortForProfile:x=>x};
      if(id.endsWith('/use-trip-draft'))return {useTripDraft:()=>({draft,ready:true,saving:false})};
      const stubs={'add-stop-sheet':'AddStopSheet','advanced-place-filters-sheet':'AdvancedPlaceFiltersSheet','place-details-sheet':'PlaceDetailsSheet','place-thumb':'PlaceThumb','trip-summary-sheet':'TripSummarySheet'};
      for(const [suffix,name] of Object.entries(stubs))if(id.endsWith('/'+suffix))return {[name]:name};
      let next=id.startsWith('@/')?path.resolve(ROOT,id.slice(2)):path.resolve(path.dirname(abs),id);
      for(const ext of ['.ts','.tsx'])if(fs.existsSync(next+ext))return load(path.relative(ROOT,next+ext));
      throw Error('Missing mock '+id);
    }
    const code=ts.transpileModule(fs.readFileSync(abs,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{exports,require:req,Date,Set,Map,Error},{filename:abs});return exports;
  }
  return {load,palette,stop,draft,setTheme:value=>{scheme=value;}};
}
function flatten(style) {return Object.assign({},...([style].flat(Infinity).filter(Boolean)));}
function all(node) {if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(all)];}
test('Explore re-renders background, cards, search and footer with the selected theme',()=>{
 const h=harness(),Screen=h.load('app/explore.tsx').default;
 for(const scheme of ['light','dark','light']){
  h.setTheme(scheme);const tree=Screen(),p=h.palette[scheme];
  assert.equal(flatten(tree.props.style).backgroundColor,p.background);
  const list=all(tree).find(n=>n.type==='FlatList');
  const card=list.props.renderItem({item:{id:'p1',name:'Test place',category:'tham_quan',rating:null,address:'Da Nang'}});
  assert.equal(flatten(card.props.style).backgroundColor,p.card);
  const input=all(list.props.ListHeaderComponent).find(n=>n.type==='TextInput');
  assert.equal(flatten(input.props.style).color,p.text);
  const footer=all(tree).find(n=>n.type==='View'&&flatten(n.props.style).borderTopWidth===1);
  assert.equal(flatten(footer.props.style).backgroundColor,p.card);
 }
 assert.equal(h.draft.stops.length,1);assert.equal(h.stop.completed,false);
});
test('stop cards retain state and readable state surfaces while switching themes',()=>{
 const h=harness(),Card=h.load('features/discovery/trip-stop-card.tsx').TripStopCard;
 const render=stop=>Card({stop,defaultMinutes:60,disabled:false,onStart(){},onEdit(){},onRemove(){},onCheckIn(){},onCancel(){}});
 h.setTheme('light');const light=flatten(render(h.stop).props.style).backgroundColor;
 h.setTheme('dark');const pending=render(h.stop),complete=render({...h.stop,completed:true}),active=render({...h.stop,progress:{startedAt:1}});
 assert.notEqual(flatten(pending.props.style).backgroundColor,light);
 assert.equal(flatten(pending.props.style).backgroundColor,h.palette.dark.input);
 assert.notEqual(flatten(complete.props.style).backgroundColor,flatten(active.props.style).backgroundColor);
 assert.equal(h.stop.completed,false);
});
test('shared sheet and action styles follow theme without changing previous palette objects',()=>{
 const h=harness(),ui=h.load('features/discovery/ui.tsx');
 h.setTheme('light');const light=ui.useDiscoveryUI();
 h.setTheme('dark');const dark=ui.useDiscoveryUI();
 for(const key of ['sheet','card','button','pill'])assert.equal(flatten(dark.s[key]).backgroundColor,h.palette.dark.card);
 assert.equal(flatten(dark.s.title).color,h.palette.dark.text);
 assert.equal(flatten(light.s.card).backgroundColor,h.palette.light.card);
 const button=ui.Action({label:'Test',solid:true,onPress(){}});
 assert.equal(flatten(button.props.style({pressed:false})).backgroundColor,h.palette.dark.green);
 assert.equal(flatten(button.props.children.props.style).color,dark.C.onAccent);
});
