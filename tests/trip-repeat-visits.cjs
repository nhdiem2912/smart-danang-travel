const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.resolve('src');
const plain = value => JSON.parse(JSON.stringify(value));

function harness() {
  let now = Date.parse('2026-11-27T00:00:00Z');
  let uid = 'A';
  const memory = new Map();
  const cloud = new Map();
  const modules = new Map();
  const state = new Map();
  const routeTables = [];
  let hooks;
  let cursor;

  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }

  const places = [
    { id: 'a', name: 'Quán A', category: 'an_uong', latitude: 16.1, longitude: 108, coordinates_valid: true, opening_hours_raw: '06:00-23:59', visit_duration_minutes: 30 },
    { id: 'b', name: 'Điểm B', category: 'tham_quan', latitude: 16.2, longitude: 108, coordinates_valid: true, opening_hours_raw: '06:00-23:59', visit_duration_minutes: 30 },
  ];
  const storage = {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => memory.set(key, value),
    removeItem: async key => memory.delete(key),
  };
  const react = {
    useEffect() {},
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useRef: value => ({ current: value }),
    useSyncExternalStore: (_, snapshot) => snapshot(),
    useState(value) {
      const index = cursor++;
      const current = hooks;
      if (!(index in current)) current[index] = typeof value === 'function' ? value() : value;
      return [current[index], next => { current[index] = typeof next === 'function' ? next(current[index]) : next; }];
    },
  };
  const ui = {
    Action: 'Action', Sheet: 'Sheet', Loading: 'Loading',
    useDiscoveryUI: () => ({ C: { isDark: false, input: '#fff', ink: '#123', green: '#087', pale: '#efe' }, s: {} }),
  };
  const routing = {
    validRoutePoint: p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    getRouteTable: async points => {
      routeTables.push(plain(points));
      return { seconds: points.map(() => points.map(() => 0)), meters: points.map(() => points.map(() => 0)) };
    },
    getRouteShape: async () => [],
    estimateRoute: async () => ({ seconds: 0, meters: 0 }),
  };
  const componentMocks = {
    '@/features/discovery/trip-calendar-sheet': { TripCalendarSheet: 'TripCalendarSheet' },
    '@/features/discovery/trip-settings-sheet': { TripSettingsSheet: 'TripSettingsSheet' },
    '@/features/discovery/trip-start-prompt': { requestLegStart: async () => null },
    '@/features/discovery/trip-guidance': 'TripGuidance',
    '@/features/discovery/trip-stop-card': { TripStopCard: 'TripStopCard' },
    '@/features/discovery/selected-places-map': 'SelectedPlacesMap',
    '@/features/discovery/trip-summary-sheet': { TripSummarySheet: 'TripSummarySheet' },
    '@/features/discovery/trip-results-sheet': { TripResultsSheet: 'TripResultsSheet' },
  };

  async function fetch(url, init = {}) {
    const parsed = new URL(url);
    const key = parsed.pathname.split('/documents/')[1];
    if (init.method === 'PATCH') {
      if (parsed.searchParams.get('currentDocument.exists') === 'false' && cloud.has(key)) return new Response('{}', { status: 409 });
      const value = JSON.parse(init.body);
      cloud.set(key, value);
      return Response.json(value);
    }
    return cloud.has(key) ? Response.json(cloud.get(key)) : new Response('{}', { status: 404 });
  }

  function load(file) {
    const full = path.resolve(ROOT, file);
    if (modules.has(full)) return modules.get(full);
    const exports = {};
    modules.set(full, exports);
    function requireModule(id) {
      if (Object.hasOwn(componentMocks, id)) return componentMocks[id];
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return require('react/jsx-runtime');
      if (id === 'react-native') return { View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', Alert: { alert() {} } };
      if (id === 'expo-router') return { router: { navigate() {}, push() {} }, useFocusEffect() {} };
      if (id === '@expo/vector-icons/Ionicons') return 'Icon';
      if (id === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
      if (id === '@maplibre/maplibre-react-native') return { Camera: 'Camera', GeoJSONSource: 'GeoJSONSource', Layer: 'Layer', Map: 'Map', Marker: 'Marker' };
      if (id === '@react-native-async-storage/async-storage') return storage;
      if (id === '@/data/places.local') return { findPlaceById: key => places.find(p => p.id === key), places };
      if (id === '@/data/use-places-catalog') return { usePlacesCatalog: () => ({ places }) };
      if (id === '@/features/account/account-store') return { getAccountToken: async owner => { assert.equal(owner, uid); return 'test-token'; } };
      if (id === './ui' || id === '@/features/discovery/ui') return ui;
      if (id === './trip-routing') return routing;
      if (id === './trip-location') return { getTripLocation: async () => ({ coords: { latitude: 16, longitude: 108, accuracy: 5 }, timestamp: now }) };
      if (id === '@/features/discovery/trip-session') return { cancelLeg: async () => null };
      let target = id.startsWith('@/') ? path.join(ROOT, id.slice(2)) : path.resolve(path.dirname(full), id);
      for (const ext of ['.ts', '.tsx']) if (fs.existsSync(target + ext)) return load(path.relative(ROOT, target + ext));
      throw Error('Unmocked import: ' + id);
    }
    const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, { exports, require: requireModule, Date: Clock, Error, console, setTimeout, clearTimeout, setInterval, clearInterval, URLSearchParams, AbortController, fetch }, { filename: full });
    return exports;
  }

  const model = load('features/discovery/trip-model.ts');
  const account = load('features/discovery/trip-account-store.ts');
  const actions = load('features/discovery/use-trip-draft.ts').tripActions;
  const snapshot = () => account.tripStore.getSnapshot().draft;
  const stop = (id, period, extra = {}) => ({ id, placeId: 'a', dayIndex: 0, period, order: 0, completed: false, note: '', visitMinutes: 30, ...extra });
  const input = (period, extra = {}) => ({ placeId: 'a', dayIndex: 0, period, note: '', visitMinutes: 30, ...extra });
  async function setup(stops = [], extra = {}) {
    await account.activateTripAccount('A');
    const base = model.emptyDraft();
    await account.tripStore.update(() => ({ ...base, tripActive: true, startDate: '2026-11-27', dayCount: 1, ...extra, settings: { ...base.settings, latitude: 16, longitude: 108, startTime: '06:30', endTime: '23:59' }, stops }));
  }
  function render(fn, props = {}, reset = false) {
    if (reset || !state.has(fn)) state.set(fn, []);
    hooks = state.get(fn); cursor = 0;
    return fn(props);
  }
  return { load, model, account, actions, snapshot, stop, input, setup, places, memory, cloud, routeTables, render, setNow: value => { now = Date.parse(value); }, setUid: value => { uid = value; } };
}

function elements(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!node.props) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate), ...elements(node.props.footer, predicate)];
}

test('same place can be added morning and evening with independent visit IDs', async () => {
  const h = harness(); await h.setup();
  await h.actions.add(h.input('morning'));
  await h.actions.add(h.input('evening'));
  assert.equal(h.snapshot().stops.length, 2);
  assert.equal(new Set(h.snapshot().stops.map(s => s.id)).size, 2);
  assert.deepEqual(plain(h.snapshot().stops.map(s => s.period)), ['morning', 'evening']);
});

test('same place/day/period is rejected atomically while another day remains available', async () => {
  const h = harness(); await h.setup([], { dayCount: 2 });
  await h.actions.add(h.input('morning'));
  const before = JSON.stringify(h.snapshot());
  await assert.rejects(h.actions.add(h.input('morning')), /buổi này/);
  assert.equal(JSON.stringify(h.snapshot()), before);
  await h.actions.add(h.input('morning', { dayIndex: 1 }));
  assert.equal(h.snapshot().stops.length, 2);
});

test('draft validation accepts separate periods and independently rejects duplicate slots and visit IDs', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('pm', 'evening')]);
  const validate = h.load('features/discovery/trip-store-core.ts').validateDraft;
  assert.doesNotThrow(() => validate(h.snapshot()));
  assert.throws(() => validate({ ...h.snapshot(), stops: [h.stop('am', 'morning'), h.stop('pm', 'morning')] }), /buổi này/);
  assert.throws(() => validate({ ...h.snapshot(), stops: [h.stop('same', 'morning'), h.stop('same', 'evening')] }), /Mã lượt ghé/);
});

test('editing the same visit works but moving it into another occupied period is rejected', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('pm', 'evening')]);
  await h.actions.add(h.input('morning', { id: 'am', note: 'Ăn sáng' }));
  assert.equal(h.snapshot().stops[0].note, 'Ăn sáng');
  await assert.rejects(h.actions.add(h.input('evening', { id: 'am' })), /buổi này/);
  await h.actions.add(h.input('noon', { id: 'am' }));
  assert.equal(h.snapshot().stops.length, 2);
  assert.equal(h.snapshot().stops[1].period, 'evening');
});

test('completing morning keeps evening pending and deleting a visit affects only that visit', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('pm', 'evening')]);
  await h.actions.checkIn('am');
  const view = h.load('features/discovery/trip-summary-view.ts').pendingDayView(h.snapshot(), 0, '2026-11-27');
  assert.deepEqual(plain(view.stops.map(s => s.id)), ['pm']);
  assert.equal(h.snapshot().stops[0].completed, true);
  assert.equal(h.snapshot().stops[1].completed, false);
  await h.actions.remove('pm');
  assert.deepEqual(plain(h.snapshot().stops.map(s => s.id)), ['am']);
});

test('another period can be added after the first visit is completed', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning', { completed: true })]);
  await h.actions.add(h.input('evening'));
  assert.equal(h.snapshot().stops[0].completed, true);
  assert.equal(h.snapshot().stops[1].completed, false);
  await assert.rejects(h.actions.add(h.input('morning')), /buổi này/);
});

test('repeated visits survive local reload and account switching', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('pm', 'evening')]);
  await h.account.activateTripAccount('B');
  assert.equal(h.snapshot().stops.length, 0);
  await h.account.activateTripAccount('A');
  assert.deepEqual(plain(h.snapshot().stops.map(s => s.id)), ['am', 'pm']);
});

test('existing single-visit drafts still load without a migration', async () => {
  const h = harness(); await h.setup([h.stop('old', 'morning')]);
  const { createTripStore } = h.load('features/discovery/trip-store-core.ts');
  const stored = JSON.stringify(h.snapshot());
  const store = createTripStore({ getItem: async () => stored, setItem: async () => {} });
  await store.load();
  assert.equal(store.getSnapshot().error, null);
  assert.equal(store.getSnapshot().draft.stops[0].id, 'old');
});

test('optimizer schedules both visits separately using a matrix that includes both occurrences', async () => {
  const h = harness(); await h.setup([h.stop('pm', 'evening'), h.stop('am', 'morning')]);
  const result = await h.load('features/discovery/trip-optimizer.ts').optimizeTrip(h.snapshot());
  h.load('features/discovery/trip-store-core.ts').validateDraft(result);
  assert.equal(Object.keys(result.plan.entries).length, 2);
  assert.ok(result.plan.entries.am.endMinute < result.plan.entries.pm.departureMinute);
  assert.equal(h.routeTables[0].length, 3);
  assert.deepEqual(h.routeTables[0][1], h.routeTables[0][2]);
});

test('finish waits for both visits and archive keeps both stop IDs with shared place metadata', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('pm', 'evening')]);
  const lifecycle = h.load('features/discovery/trip-lifecycle.ts');
  await h.actions.checkIn('am');
  await assert.rejects(lifecycle.finishTrip(5, 'Hai lượt ghé'), /hoàn tất/);
  assert.equal(h.cloud.size, 0);
  h.setNow('2026-11-27T12:00:00Z');
  await h.actions.checkIn('pm');
  await lifecycle.finishTrip(5, 'Hai lượt ghé');
  assert.equal(h.snapshot().stops.length, 0);
  const archive = h.load('features/discovery/trip-history-api.ts').decodeArchive([...h.cloud.values()][0]);
  assert.deepEqual(plain(archive.trip.stops.map(s => s.id)), ['am', 'pm']);
  assert.equal(archive.places.length, 1);
});

test('add form defaults to a free period on the same day before choosing another day', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning'), h.stop('noon', 'noon'), h.stop('afternoon', 'afternoon')], { dayCount: 2 });
  const form = h.load('features/discovery/add-stop-sheet.tsx').AddStopSheet;
  let onSaved;
  const saved = new Promise(resolve => { onSaved = resolve; });
  const tree = h.render(form, { place: h.places[0], close() {}, onSaved });
  const selected = elements(tree, e => e.type === 'Pressable' && e.props.accessibilityState?.selected);
  assert.equal(selected[0].props.accessibilityLabel, 'Buổi tối');
  assert.ok(elements(tree, e => e.type === 'Text').some(e => e.props.children?.includes?.('Ngày ')));
  const save = elements(tree, e => e.type === 'Action' && e.props.label === '✓ Thêm vào lộ trình')[0];
  assert.equal(save.props.disabled, false);
  save.props.onPress();
  await saved;
  assert.equal(h.snapshot().stops[3].dayIndex, 0);
  assert.equal(h.snapshot().stops[3].period, 'evening');
});

test('repeat button works for a one-day trip and disables only when every valid period is occupied', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning')]);
  const form = h.load('features/discovery/add-stop-sheet.tsx').AddStopSheet;
  const props = { place: h.places[0], editing: h.snapshot().stops[0], close() {}, onSaved() {}, onDuplicate() {} };
  const button = tree => elements(tree, e => e.type === 'Action' && e.props.label?.includes('Thêm lượt ghé'))[0];
  assert.equal(button(h.render(form, props)).props.disabled, false);
  await h.account.tripStore.update(d => ({ ...d, stops: ['morning', 'noon', 'afternoon', 'evening'].map((period, i) => h.stop('visit-' + i, period)) }));
  assert.equal(button(h.render(form, { ...props, editing: h.snapshot().stops[0] }, true)).props.disabled, true);
});

test('occupied period reports a duplicate and cannot replace the current selection in the form', async () => {
  const h = harness(); await h.setup([h.stop('am', 'morning')]);
  const form = h.load('features/discovery/add-stop-sheet.tsx').AddStopSheet;
  const props = { place: h.places[0], close() {}, onSaved() {} };
  const tree = h.render(form, props);
  const morning = elements(tree, e => e.type === 'Pressable' && e.props.accessibilityLabel === 'Buổi sáng')[0];
  morning.props.onPress();
  const next = h.render(form, props);
  const selected = elements(next, e => e.type === 'Pressable' && e.props.accessibilityState?.selected)[0];
  assert.equal(selected.props.accessibilityLabel, 'Buổi trưa');
  assert.ok(elements(next, e => e.type === 'Text' && typeof e.props.children === 'string').some(e => e.props.children.includes('buổi này')));
});

test('native map groups repeat marker numbers while preserving the complete route sequence', () => {
  const h = harness();
  const map = h.load('features/discovery/selected-places-map.native.tsx').default;
  const tree = h.render(map, { places: [h.places[0], h.places[1], h.places[0]], numbers: [1, 2, 3], origin: { latitude: 16, longitude: 108 }, onError() {} });
  const markers = elements(tree, e => e.type === 'Marker' && e.props.id !== 'trip-origin');
  assert.equal(markers.length, 2);
  assert.equal(new Set(markers.map(e => e.props.id)).size, 2);
  assert.ok(elements(tree, e => e.type === 'Text' && e.props.children === '1, 3').length);
  const line = elements(tree, e => e.type === 'GeoJSONSource')[0].props.data.geometry.coordinates;
  assert.equal(line.length, 4);
  assert.deepEqual(plain(line[1]), plain(line[3]));
});

test('itinerary passes each visit number to the map even when some places have no coordinates', async () => {
  const h = harness();
  h.places.push({ ...h.places[0], id: 'bad', coordinates_valid: false });
  await h.setup([h.stop('bad', 'morning', { placeId: 'bad' }), h.stop('am', 'morning', { order: 1 }), h.stop('other', 'noon', { placeId: 'b' }), h.stop('pm', 'evening')]);
  const screen = h.load('app/itinerary.tsx').default;
  const tree = h.render(screen);
  const map = elements(tree, e => e.type === 'SelectedPlacesMap')[0];
  assert.deepEqual(plain(map.props.numbers), [2, 3, 4]);
  assert.deepEqual(plain(map.props.places.map(p => p.id)), ['a', 'b', 'a']);
});
