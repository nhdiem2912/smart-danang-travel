const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const ROOT = path.resolve('src');

function harness() {
  const now = Date.parse('2026-11-27T01:05:00Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const cache = new Map();
  const states = new Map();
  const resets = [];
  const scripts = [];
  const notice = { id: 'notice', title: 'Test', body: 'Body', createdAt: '2026-11-27T01:05:00Z', readAt: null };
  const draft = { version: 1, id: 'trip', startDate: '2026-11-27', dayCount: 3, tripActive: false, stops: [], settings: {} };
  const settings = { theme: 'light', language: 'en', remindersEnabled: false, inbox: [notice], profile: { name: 'Test', avatar: null } };
  let hooks, cursor;
  const react = {
    useEffect() {},
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useRef: value => ({ current: value }),
    useSyncExternalStore: (_, get) => get(),
    useState(initial) {
      const index = cursor++;
      const current = hooks;
      if (!(index in current)) current[index] = typeof initial === 'function' ? initial() : initial;
      return [current[index], value => { current[index] = typeof value === 'function' ? value(current[index]) : value; }];
    },
  };
  const account = { user: { uid: 'A', name: 'Tester', email: 'test@example.invalid', photoURL: null }, busy: false };
  const colors = { background: '#fff', card: '#fff', text: '#123', ink: '#123', green: '#087', pale: '#efe', line: '#ddd', muted: '#666', deep: '#075' };
  const ui = { Action: 'Action', Sheet: 'Sheet', useDiscoveryUI: () => ({ C: colors, s: {} }) };
  const native = { ready: true, granted: true, scheduled: false, error: null };
  const mocks = {
    react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', FlatList: 'FlatList', Modal: 'Modal', ActivityIndicator: 'ActivityIndicator', Switch: 'Switch', Platform: { OS: 'android' }, Alert: { alert() {} }, Linking: { openURL() {} }, StyleSheet: { create: s => s, hairlineWidth: 1 } },
    'expo-router': { router: { navigate() {} } },
    'expo-constants': { expoConfig: { version: '1.0.0' } },
    '@expo/vector-icons/Ionicons': 'Icon',
    'react-native-webview': { WebView: 'WebView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    './ui': ui,
    '@/features/discovery/ui': ui,
    './use-trip-draft': { useTripDraft: () => ({ draft, saving: false }), tripActions: { resetDates: async (...args) => { resets.push(args); } } },
    '@/features/discovery/use-trip-draft': { useTripDraft: () => ({ draft, saving: false }) },
    '@/features/settings/settings-colors': { useSettingsColors: () => colors },
    '@/features/settings/settings-i18n': { translate: (_, key) => key },
    '@/features/settings/settings-store': { useAppSettings: () => ({ ready: true, settings, saving: false }), settingsStore: { update() {} }, LANGUAGES: ['vi', 'en'], LANGUAGE_LABELS: { vi: 'Tiếng Việt', en: 'English' }, SettingsError: class SettingsError extends Error {} },
    '@/features/settings/settings-notifications': { notificationStatus: { subscribe() {}, getSnapshot: () => native, getServerSnapshot: () => native }, sendTestNotification() {}, setDailyReminder() {} },
    '@/features/account/account-profile-card': { AccountProfileCard: 'AccountProfileCard' },
    '@/features/account/account-store': { useAccount: () => account, accountActions: { signOut() {} } },
    '@/features/account/use-account-avatar': { useHomeAvatar: () => null },
    '@/features/profile/profile-context': { useTravelerProfile: () => ({ profile: { displayName: 'Tester' } }) },
    '@/features/discovery/trip-history-card': { TripHistoryCard: 'TripHistoryCard' },
    '@/features/discovery/add-stop-sheet': { AddStopSheet: 'AddStopSheet' },
    '@/features/discovery/place-details-sheet': { PlaceDetailsSheet: 'PlaceDetailsSheet' },
    '@/data/use-places-catalog': { usePlacesCatalog: () => ({ places: [] }) },
    '@/data/places.local': { findPlaceById: () => null },
    '@/features/home/event-directions': 'EventDirections',
    '@/features/home/home-events': { getEventPlace: () => null },
    '@/features/home/home-weather': { loadHomeWeather: async () => null },
    '@/features/home/home-html': { HOME_HTML: '<html></html>' },
    '../../data/sdt-html': '',
  };
  function load(file) {
    const full = path.resolve(ROOT, file);
    if (cache.has(full)) return cache.get(full);
    const exports = {}; cache.set(full, exports);
    const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    function requireModule(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      const target = id.startsWith('@/') ? path.join(ROOT, id.slice(2)) : path.resolve(path.dirname(full), id);
      if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
      for (const suffix of ['.ts', '.tsx']) if (fs.existsSync(target + suffix)) return load(path.relative(ROOT, target + suffix));
      throw Error('Missing mock ' + id);
    }
    vm.runInNewContext(source, { exports, require: requireModule, Date: Clock, Error, setTimeout, clearTimeout, setInterval, clearInterval }, { filename: full });
    return exports;
  }
  function render(fn, props = {}) {
    if (!states.has(fn)) states.set(fn, []);
    hooks = states.get(fn); cursor = 0;
    return fn(props);
  }
  return { load, render, draft, settings, notice, resets, scripts };
}

function elements(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(n => elements(n, predicate));
  if (!node.props) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate), ...elements(node.props.footer, predicate)];
}
function content(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (Array.isArray(node)) return node.map(content).join('');
  return content(node.props?.children);
}
const action = (tree, label) => elements(tree, n => n.type === 'Action' && n.props.label === label)[0];
const day = (tree, label) => elements(tree, n => n.type === 'Pressable' && n.props.accessibilityLabel === label)[0];

test('calendar dates consistently display DD/MM/YYYY with leading zeroes', () => {
  const f = harness().load('utils/date-format.ts').formatVietnameseDate;
  assert.equal(f('2026-11-27'), '27/11/2026');
  assert.equal(f('2026-01-05'), '05/01/2026');
  assert.equal(f('2027-01-01'), '01/01/2027');
});

test('date formatter preserves leap days and refuses invalid calendar dates', () => {
  const f = harness().load('utils/date-format.ts').formatVietnameseDate;
  assert.equal(f('2028-02-29'), '29/02/2028');
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '', 'not-a-date']) assert.equal(f(value), '—');
});

test('notification timestamps use Vietnamese date order and UTC+7 across midnight and New Year', () => {
  const f = harness().load('utils/date-format.ts').formatVietnameseDateTime;
  assert.equal(f('2026-11-27T01:05:00Z'), '27/11/2026 08:05');
  assert.equal(f('2026-11-27T18:30:00Z'), '28/11/2026 01:30');
  assert.equal(f('2026-12-31T17:00:00Z'), '01/01/2027 00:00');
  assert.equal(f('2026-11-27T00:15:00+07:00'), '27/11/2026 00:15');
  assert.equal(f('invalid'), '—');
});

test('shared trip display formats dates while date arithmetic keeps ISO values', () => {
  const model = harness().load('features/discovery/trip-model.ts');
  const next = model.dateForDay('2026-12-31', 1);
  assert.equal(next, '2027-01-01');
  assert.equal(model.displayDate(next), '01/01/2027');
  assert.equal(model.isValidDate(next), true);
});

test('calendar shows Vietnamese start/end labels but submits ISO dates to the trip store', async () => {
  const h = harness();
  const Sheet = h.load('features/discovery/trip-calendar-sheet.tsx').TripCalendarSheet;
  let onSaved; const saved = new Promise(resolve => { onSaved = resolve; });
  const props = { close() {}, onSaved };
  day(h.render(Sheet, props), '27/11/2026').props.onPress();
  day(h.render(Sheet, props), '29/11/2026').props.onPress();
  const tree = h.render(Sheet, props);
  assert.ok(content(tree).includes('27/11/2026 → 29/11/2026'));
  action(tree, 'Xác nhận ngày đi').props.onPress();
  await saved;
  assert.deepEqual(h.resets[0], ['2026-11-27', 3]);
});

test('calendar selection across December and January preserves year and inclusive duration', async () => {
  const h = harness();
  const Sheet = h.load('features/discovery/trip-calendar-sheet.tsx').TripCalendarSheet;
  let onSaved; const saved = new Promise(resolve => { onSaved = resolve; });
  const props = { close() {}, onSaved };
  action(h.render(Sheet, props), '›').props.onPress();
  day(h.render(Sheet, props), '31/12/2026').props.onPress();
  action(h.render(Sheet, props), '›').props.onPress();
  day(h.render(Sheet, props), '02/01/2027').props.onPress();
  const tree = h.render(Sheet, props);
  assert.ok(content(tree).includes('31/12/2026 → 02/01/2027'));
  action(tree, 'Xác nhận ngày đi').props.onPress(); await saved;
  assert.deepEqual(h.resets[0], ['2026-12-31', 3]);
});

test('selecting the same date twice still produces a one-day trip', async () => {
  const h = harness();
  const Sheet = h.load('features/discovery/trip-calendar-sheet.tsx').TripCalendarSheet;
  let onSaved; const saved = new Promise(resolve => { onSaved = resolve; });
  const props = { close() {}, onSaved };
  day(h.render(Sheet, props), '27/11/2026').props.onPress();
  day(h.render(Sheet, props), '27/11/2026').props.onPress();
  const tree = h.render(Sheet, props);
  assert.ok(content(tree).includes('27/11/2026 → 27/11/2026'));
  action(tree, 'Xác nhận ngày đi').props.onPress(); await saved;
  assert.deepEqual(h.resets[0], ['2026-11-27', 1]);
});

test('English Settings notifications retain DD/MM/YYYY instead of switching to month/day/year', () => {
  const h = harness();
  const Settings = h.load('app/settings.tsx').default;
  const tree = h.render(Settings);
  const inbox = elements(tree, n => n.type === 'Pressable' && typeof n.props.onPress === 'function' && content(n).includes('inbox'))[0];
  assert.ok(inbox);
  inbox.props.onPress();
  const opened = h.render(Settings);
  const list = elements(opened, n => n.type === 'FlatList')[0];
  assert.ok(list);
  const row = list.props.renderItem({ item: h.notice });
  assert.ok(content(row).includes('27/11/2026 08:05'));
  assert.equal(content(row).includes('11/27/2026'), false);
});

test('Home passes the shared Vietnamese trip date into its WebView', () => {
  const h = harness(); h.draft.tripActive = true;
  const Home = h.load('app/index.tsx').default;
  const tree = h.render(Home);
  const webview = elements(tree, n => n.type === 'WebView')[0];
  assert.ok(webview);
  webview.props.ref.current = { injectJavaScript: script => h.scripts.push(script) };
  webview.props.onLoadEnd();
  const script = h.scripts[0];
  const payload = JSON.parse(script.slice(script.indexOf('(') + 1, script.lastIndexOf(');true;')));
  assert.ok(payload.tripNote.startsWith('27/11/2026 · '));
  assert.equal(h.draft.startDate, '2026-11-27');
});
