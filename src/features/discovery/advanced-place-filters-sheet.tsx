import { useDiscoveryUI } from '@/features/discovery/ui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  applyDiscoveryFilters, copyDiscoveryFilters, defaultDiscoveryFilters,
  discoveryFilterError, type DiscoveryFilters, type FilterablePlace
} from './place-filters';
import { getTripLocation } from './trip-location';


type IconName = ComponentProps<typeof Ionicons>['name'];


function Chip({ label, active, disabled = false, onPress }: {
  label: string; active: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { C } = useDiscoveryUI();
  const st = createSt(C);

  const { C: c } = useDiscoveryUI();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active, disabled }}
    disabled={disabled} onPress={onPress} style={[st.chip, {
      borderColor: active ? c.green : c.line, backgroundColor: active ? c.pale : c.card,
      opacity: disabled ? 0.4 : 1,
    }]}>
    <Text style={{ color: active ? c.green : c.text, fontSize: 11, fontWeight: active ? '800' : '500', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
}
function Section({ icon, tint, title, badge, children }: {
  icon: IconName; tint: string; title: string; badge?: string; children: ReactNode;
}) {
  const { C } = useDiscoveryUI();
  const st = createSt(C);

  const { C: c } = useDiscoveryUI();
  return <View style={[st.section, { backgroundColor: c.card, borderColor: c.line }]}>
    <View style={st.sectionHeader}>
      <Ionicons name={icon} size={15} color={tint} />
      <Text style={{ flex: 1, fontSize: 10, fontWeight: '800', color: c.text }}>{title}</Text>
      {!!badge && <Text style={[st.badge, { color: c.green, backgroundColor: c.pale }]}>{badge}</Text>}
    </View>
    {children}
  </View>;
}
function RangeControl({ value, min, max, step, onChange, label, disabled = false }: {
  value: number; min: number; max: number; step: number; onChange: (value: number) => void;
  label: string; disabled?: boolean;
}) {
  const { C: c } = useDiscoveryUI();
  const [width, setWidth] = useState(0);
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  function changeFromTouch(event: GestureResponderEvent) {
    if (disabled || width <= 20) return;
    const raw = min + Math.max(0, Math.min(1, (event.nativeEvent.locationX - 10) / (width - 20))) * (max - min);
    onChange(Math.max(min, Math.min(max, min + Math.round((raw - min) / step) * step)));
  }
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)}
    accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityState={{ disabled }} accessibilityValue={{ min, max, now: value }}
    accessibilityActions={[{ name: 'increment', label: 'Tăng' }, { name: 'decrement', label: 'Giảm' }]}
    onAccessibilityAction={event => {
      if (disabled) return;
      if (event.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
      if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
    }}
    onStartShouldSetResponder={() => !disabled} onMoveShouldSetResponder={() => !disabled}
    onResponderGrant={changeFromTouch} onResponderMove={changeFromTouch}
    onResponderTerminationRequest={() => false}
    style={{ height: 34, justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
    <View pointerEvents="none" style={{ position: 'absolute', left: 10, right: 10, height: 4, borderRadius: 4, backgroundColor: c.line }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 10, width: Math.max(0, width - 20) * ratio,
      height: 4, borderRadius: 4, backgroundColor: disabled ? c.muted : c.green }} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 1 + Math.max(0, width - 20) * ratio,
      width: 18, height: 18, borderRadius: 9, backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 }} />
  </View>;
}

export function AdvancedPlaceFiltersSheet({
  initialFilters,
  areas,
  candidates,
  selected,
  onApply,
  close,
}: {
  initialFilters: DiscoveryFilters;
  areas: readonly string[];
  candidates: readonly FilterablePlace[];
  selected: ReadonlySet<string>;
  onApply: (filters: DiscoveryFilters) => void;
  close: () => void;
}) {
  const { C } = useDiscoveryUI();
  const st = createSt(C);

  const { C: c } = useDiscoveryUI();
  const insets = useSafeAreaInsets();
const [draft, setDraft] = useState(
  () => copyDiscoveryFilters(initialFilters),
);

const [areasOpen, setAreasOpen] = useState(false);  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const locationRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; locationRequest.current?.abort(); };
  }, []);
  const validationError = discoveryFilterError(draft);
  const total = useMemo(() => validationError ? null : applyDiscoveryFilters(candidates, draft, selected).length,
    [candidates, draft, selected, validationError]);
  function edit<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) {
    setDraft(previous => previous[key] === value ? previous : ({ ...previous, [key]: value })); setError('');
  }
  async function locate() {
    if (locationRequest.current) return;
    const abort = new AbortController(); locationRequest.current = abort;
    setLocating(true); setError('');
    try {
      const location = await getTripLocation(abort.signal);
      if (!active.current) return;
      setDraft(previous => ({ ...previous, origin: { latitude: location.coords.latitude, longitude: location.coords.longitude }, radiusKm: previous.radiusKm ?? 10 }));
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : 'Không lấy được vị trí.');
    } finally {
      locationRequest.current = null;
      if (active.current) setLocating(false);
    }
  }

  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <View style={{ flex: 1, backgroundColor: '#0F172A66', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Đóng bộ lọc" />
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 680, maxHeight: '92%', backgroundColor: c.background,
        borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: Math.max(insets.bottom, 10) }}>
        <View style={[st.header, { backgroundColor: c.card, borderBottomColor: c.line }]}>
          <View style={{ padding: 9, borderRadius: 20, backgroundColor: c.pale }}><Ionicons name="options-outline" size={20} color={c.green} /></View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>Bộ lọc nâng cao</Text>
            <Text style={{ fontSize: 10, color: c.muted }}>Khoảng cách, khu vực và đánh giá</Text>
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Đóng bộ lọc" hitSlop={10}
            style={{ backgroundColor: c.input, padding: 7, borderRadius: 20 }}><Ionicons name="close" size={17} color={c.muted} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }}>
          <Section icon="location" tint="#319664" title="KHOẢNG CÁCH (BÁN KÍNH)"
            badge={draft.radiusKm === null ? 'Không giới hạn' : `Trong ${draft.radiusKm} km`}>
            <RangeControl label="Bán kính theo km" value={draft.radiusKm ?? 10} min={1} max={30} step={1} onChange={value => edit('radiusKm', value)} />
            <View style={st.wrap}>
              <Chip label="Tất cả" active={draft.radiusKm === null} onPress={() => edit('radiusKm', null)} />
              {[3, 5, 10, 20, 30].map(value => <Chip key={value} label={value === 3 ? 'Gần tôi (3 km)' : `${value} km`}
                active={draft.radiusKm === value} onPress={() => edit('radiusKm', value)} />)}
            </View>
            <Pressable onPress={() => void locate()} disabled={locating} accessibilityRole="button" style={st.gps}>
              {locating ? <ActivityIndicator size="small" color={c.green} /> : <Ionicons name="locate-outline" size={15} color={c.green} />}
              <Text style={{ color: c.green, fontWeight: '700', fontSize: 11 }}>{locating ? 'Đang lấy vị trí…' : draft.origin ? 'Cập nhật GPS hiện tại' : 'Lấy vị trí GPS'}</Text>
            </Pressable>
            <Text style={{ color: draft.radiusKm !== null && !draft.origin ? c.danger : c.muted, fontSize: 10, lineHeight: 15 }}>
              {draft.radiusKm !== null && !draft.origin ? 'Cần lấy GPS để áp dụng bán kính. ' : ''}Khoảng cách đường chim bay từ vị trí đã lấy.
            </Text>
          </Section>
          <Section
  icon="map"
  tint="#319664"
  title="KHU VỰC"
>
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Chọn khu vực"
    accessibilityState={{
      expanded: areasOpen,
    }}
    onPress={() =>
      setAreasOpen(value => !value)
    }
    style={[
      st.areaSelect,
      {
        borderColor: c.line,
        backgroundColor: c.input,
      },
    ]}
  >
    <Text
      numberOfLines={1}
      style={{
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: c.text,
      }}
    >
      {!draft.areas.length
        ? 'Tất cả khu vực'
        : draft.areas.length === 1
          ? draft.areas[0]
          : `Đã chọn ${draft.areas.length} khu vực`}
    </Text>

    <Ionicons
      name={
        areasOpen
          ? 'chevron-up'
          : 'chevron-down'
      }
      size={17}
      color={c.green}
    />
  </Pressable>

  {areasOpen && (
    <ScrollView
      nestedScrollEnabled
      style={{ maxHeight: 180 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: !draft.areas.length,
        }}
        onPress={() => edit('areas', [])}
        style={st.areaOption}
      >
        <Text style={{
          flex: 1,
          color: c.text,
          fontSize: 12,
        }}>
          Tất cả khu vực
        </Text>

        <Ionicons
          name={
            !draft.areas.length
              ? 'checkbox'
              : 'square-outline'
          }
          size={20}
          color={c.green}
        />
      </Pressable>

      {areas.map(area => (
        <Pressable
          key={area}
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: draft.areas.includes(area),
          }}
          onPress={() =>
            edit(
              'areas',
              draft.areas.includes(area)
                ? draft.areas.filter(
                    value => value !== area,
                  )
                : [...draft.areas, area],
            )
          }
          style={st.areaOption}
        >
          <Text style={{
            flex: 1,
            color: c.text,
            fontSize: 12,
          }}>
            {area}
          </Text>

          <Ionicons
            name={
              draft.areas.includes(area)
                ? 'checkbox'
                : 'square-outline'
            }
            size={20}
            color={c.green}
          />
        </Pressable>
      ))}
    </ScrollView>
  )}

  <Text style={{
    color: c.muted,
    fontSize: 10,
  }}>
    {draft.areas.length
      ? draft.areas.join(' · ')
      : 'Có thể chọn một hoặc nhiều khu vực.'}
  </Text>
</Section>
          
          <Section icon="star" tint="#EEB321" title="ĐÁNH GIÁ (RATING)">
            <View style={st.wrap}>
              <Chip label="Tất cả" active={draft.minRating === null} onPress={() => edit('minRating', null)} />
              {[4.5, 4, 3.5].map(rating => <Chip key={rating} label={`${rating.toFixed(1)}+ ★`} active={draft.minRating === rating} onPress={() => edit('minRating', rating)} />)}
              <Chip label="Ưu tiên nhiều đánh giá" active={draft.popularFirst} onPress={() => edit('popularFirst', !draft.popularFirst)} />
            </View>
          </Section>
          <Pressable onPress={() => edit('onlySelected', !draft.onlySelected)} accessibilityRole="checkbox"
            accessibilityState={{ checked: draft.onlySelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 }}>
            <Ionicons name={draft.onlySelected ? 'checkbox' : 'square-outline'} size={20} color={c.green} />
            <Text style={{ color: c.text, fontSize: 12 }}>Chỉ địa điểm đã thêm ({selected.size})</Text>
          </Pressable>
          {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, fontSize: 12 }}>{error}</Text>}
        </ScrollView>
        <View style={[st.footer, { backgroundColor: c.card, borderTopColor: c.line }]}>
          <Pressable onPress={() => { setDraft(previous => ({ ...defaultDiscoveryFilters(), origin: previous.origin })); setError(''); }}
            accessibilityRole="button" style={[st.reset, { borderColor: c.line }]}><Text style={{ color: c.text, fontWeight: '700', fontSize: 12 }}>Đặt lại</Text></Pressable>
          <Pressable disabled={Boolean(validationError) || locating} accessibilityRole="button"
            onPress={() => { const message = discoveryFilterError(draft); if (message) { setError(message); return; } onApply(copyDiscoveryFilters(draft)); }}
            style={[st.apply, { opacity: validationError || locating ? 0.45 : 1 }]}>
            <Text style={{ color: C.onAccent, fontWeight: '800', fontSize: 12 }}>Áp dụng bộ lọc{total === null ? '' : ` · ${total} điểm`}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const createSt = (C: ReturnType<typeof useDiscoveryUI>['C']) => StyleSheet.create({
  areaSelect: {
  minHeight: 44,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
areaOption: {
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 6,
},
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  section: { padding: 12, gap: 9, borderWidth: 1, borderRadius: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontSize: 9, fontWeight: '800', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { flexGrow: 1, flexBasis: '28%', minWidth: 70, borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8 },
  gps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 6 },
  footer: { flexDirection: 'row', gap: 9, padding: 13, borderTopWidth: 1 },
  reset: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  apply: { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.deep },
});
