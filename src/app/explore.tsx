import Ionicons from '@expo/vector-icons/Ionicons';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PLACE_CATEGORIES,
  type Place,
  type PlaceCategory,
} from '@/data/place.types';
import {
  findPlaceById,
  normalizeSearch,
  places,
} from '@/data/places.local';

import { AddStopSheet } from '@/features/discovery/add-stop-sheet';
import { AdvancedPlaceFiltersSheet } from '@/features/discovery/advanced-place-filters-sheet';
import { PlaceDetailsSheet } from '@/features/discovery/place-details-sheet';
import {
  applyDiscoveryFilters, defaultDiscoveryFilters, discoveryAreas, discoveryFilterCount,
  distanceFromPlace, hasDiscoveryPriceData, type DiscoveryFilters,
} from '@/features/discovery/place-filters';
import { PlaceThumb } from '@/features/discovery/place-thumb';
import type { DraftStop } from '@/features/discovery/trip-model';
import { TripSummarySheet } from '@/features/discovery/trip-summary-sheet';
import {
  Action,
  C,
  Loading,
  s,
} from '@/features/discovery/ui';
import {
  tripStore,
  useTripDraft,
} from '@/features/discovery/use-trip-draft';

const categories: [PlaceCategory | 'all', string][] = [
  ['all', '🌐 Tất cả'],
  ['tham_quan', '♜ Tham quan'],
  ['khach_san', '▥ Khách sạn'],
  ['nha_hang', '♨ Ăn uống'],
  ['mua_sam', '♧ Mua sắm'],
  ['giai_tri', '✧ Giải trí'],
  ['bai_bien', '☀ Bãi biển'],
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { draft, ready, saving, error } = useTripDraft();

  const [query, setQuery] = useState('');
  const [category, setCategory] =
    useState<PlaceCategory | 'all'>('all');
  const [limit, setLimit] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DiscoveryFilters>(defaultDiscoveryFilters);
  const listRef = useRef<FlatList<Place>>(null);
  const onlySelected = activeFilters.onlySelected;
  const activeFilterCount = discoveryFilterCount(activeFilters);
  const areaOptions = useMemo(() => discoveryAreas(places), []);
  const priceAvailable = useMemo(() => hasDiscoveryPriceData(places), []);

  const [addPlace, setAddPlace] = useState<Place | null>(null);
  const [editing, setEditing] = useState<DraftStop | undefined>();
  const [details, setDetails] = useState<Place | null>(null);
  const [summary, setSummary] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const selected = useMemo(
    () => new Set(draft?.stops.map(stop => stop.placeId) ?? []),
    [draft?.stops],
  );

  const candidates = useMemo(() => {
    const term = normalizeSearch(deferredQuery);
    return places.filter(place =>
      (category === 'all' || place.category === category) &&
      (!term || normalizeSearch(place.search_text || `${place.name} ${place.address ?? ''}`).includes(term)),
    );
  }, [category, deferredQuery]);

  const filtered = useMemo(
    () => applyDiscoveryFilters(candidates, activeFilters, selected),
    [candidates, activeFilters, selected],
  );

  function openAdd(place: Place, stop?: DraftStop) {
    setDetails(null);
    setSummary(false);
    setEditing(stop);
    setAddPlace(place);
  }

  function editStop(stop: DraftStop) {
    const place = findPlaceById(stop.placeId);

    if (place) openAdd(place, stop);
  }

  if (!ready || !draft) {
    return (
      <Loading
        error={error}
        retry={() => void tripStore.load()}
      />
    );
  }

  const header = (
    <View style={{ gap: 14, paddingBottom: 10 }}>
      <View style={st.search}>
        <Text style={{ fontSize: 23, color: '#94A3B8' }}>
          ⌕
        </Text>

        <TextInput
          accessibilityLabel="Tìm địa điểm"
          value={query}
          onChangeText={value => {
            setQuery(value);
            setLimit(20);
          }}
          placeholder="Tìm địa điểm, khách sạn, nhà hàng, bãi biển"
          placeholderTextColor="#94A3B8"
          style={st.searchInput}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc địa điểm"
          onPress={() => setFiltersOpen(true)}
          style={st.filterButton}
        >
          <Ionicons name="options-outline" color={C.green} size={22} />
          {activeFilterCount > 0 && (
            <Text style={st.filterBadge}>{activeFilterCount}</Text>
          )}
        </Pressable>
      </View>

      {activeFilterCount > 0 && (
        <View style={s.between}>
          <Text style={[s.muted, { color: C.deep }]}>Đang áp dụng {activeFilterCount} nhóm lọc</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            setActiveFilters(defaultDiscoveryFilters());
            setLimit(20);
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}><Text style={{ color: C.deep, fontSize: 11, fontWeight: '700' }}>Xóa bộ lọc</Text></Pressable>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={s.label}>DANH MỤC DỊCH VỤ</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7 }}
        >
          {categories.map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{
                selected: category === id,
              }}
              onPress={() => {
                setCategory(id);
                setLimit(20);
              }}
              style={[
                s.pill,
                st.category,
                category === id && s.pillActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color:
                    category === id ? C.deep : '#596579',
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={s.between}>
        <Text style={[s.label, { color: C.ink }]}>
          ĐỊA ĐIỂM {onlySelected ? 'ĐÃ CHỌN' : 'KHÁM PHÁ'}
        </Text>

        <Text style={s.muted}>
          {filtered.length} địa điểm
          {query ? ' phù hợp' : ''}
        </Text>
      </View>

      {!!error && (
        <Text style={s.error}>{error}</Text>
      )}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <FlatList
        ref={listRef}
        data={filtered.slice(0, limit)}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={st.content}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (limit < filtered.length) {
            setLimit(current =>
              Math.min(current + 20, filtered.length),
            );
          }
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 10 }} />
        )}
        ListEmptyComponent={
          <View style={s.card}>
            <Text style={s.title}>
              Không tìm thấy địa điểm
            </Text>
            <Text style={s.muted}>
              Thử từ khóa, danh mục khác hoặc tắt bộ lọc đã chọn.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 16, gap: 5 }}>
            <Text style={s.muted}>
              Đã hiển thị {Math.min(limit, filtered.length)}
              /{filtered.length} địa điểm · Cuộn để xem thêm
            </Text>

            <Text style={s.muted}>
              Ảnh và đánh giá theo dữ liệu thu thập, có thể thay đổi.
              Khoảng cách hiển thị là đường chim bay.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const distance = distanceFromPlace(item, activeFilters.origin);
          return (
          <View style={st.placeCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chi tiết ${item.name}`}
              onPress={() => setDetails(item)}
            >
              <PlaceThumb place={item} size={78} />
            </Pressable>

            <View style={{ flex: 1, gap: 4 }}>
              {item.rating !== null && (
                <Text style={st.rating}>
                  ★ {item.rating}
                  {item.rating_count === null
                    ? ''
                    : ` (${item.rating_count})`}
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem ${item.name}`}
                onPress={() => setDetails(item)}
              >
                <Text
                  style={[s.title, { fontSize: 12 }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </Pressable>

              <Text style={s.muted} numberOfLines={2}>
                📍 {item.address ?? 'Chưa cập nhật địa chỉ'}
              </Text>

              {distance !== null && (
                <Text style={[s.muted, { color: C.deep }]}>
                  ↔ {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} · đường chim bay
                </Text>
              )}

              <Text
                style={[s.muted, { fontSize: 9 }]}
                numberOfLines={1}
              >
                {PLACE_CATEGORIES[item.category]} ·{' '}
                {item.opening_hours_raw ??
                  'Chưa có giờ mở cửa'}
              </Text>

              <View
                style={{
                  alignItems: 'flex-end',
                  marginTop: 3,
                }}
              >
                <Action
                  label={
                    selected.has(item.id)
                      ? '✓ Đã thêm'
                      : '＋ Thêm'
                  }
                  disabled={saving}
                  solid
                  style={[
                    { paddingVertical: 5 },
                    selected.has(item.id) && {
                      backgroundColor: '#334155',
                      borderColor: '#334155',
                    },
                  ]}
                  onPress={() =>
                    openAdd(
                      item,
                      draft.stops.find(
                        stop => stop.placeId === item.id,
                      ),
                    )
                  }
                />
              </View>
            </View>
          </View>
          );
        }}
      />

      {draft.stops.length > 0 && (
        <View
          style={[
            st.footer,
            { paddingBottom: Math.max(8, insets.bottom) },
          ]}
        >
          <Action
            label={
              `☷ Danh sách đã chọn (${draft.stops.length})`
            }
            solid
            onPress={() => setSummary(true)}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {addPlace && (
        <AddStopSheet
          key={`${addPlace.id}-${editing?.id ?? 'new'}`}
          place={addPlace}
          editing={editing}
          onDuplicate={() => setEditing(undefined)}
          close={() => setAddPlace(null)}
          onSaved={() => {
          setAddPlace(null);
          setEditing(undefined);
          setSummary(false);
        }}
        />
      )}

      {details && (
        <PlaceDetailsSheet
          place={details}
          close={() => setDetails(null)}
          onAdd={() =>
            openAdd(
              details,
              draft.stops.find(
                stop => stop.placeId === details.id,
              ),
            )
          }
        />
      )}

      {summary && (
        <TripSummarySheet
          close={() => setSummary(false)}
          onEdit={editStop}
        />
      )}

      {filtersOpen && (
        <AdvancedPlaceFiltersSheet
          initialFilters={activeFilters}
          areas={areaOptions}
          priceAvailable={priceAvailable}
          candidates={candidates}
          selected={selected}
          close={() => setFiltersOpen(false)}
          onApply={value => {
            setActiveFilters(value);
            setLimit(20);
            setFiltersOpen(false);
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  content: {
    padding: 14,
    paddingBottom: 18,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: C.ink,
    paddingVertical: 10,
  },
  filterBadge: {
    position: 'absolute', top: 0, right: -2, minWidth: 16, height: 16,
    paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#087F61',
    color: '#FFF', fontSize: 9, fontWeight: '800', textAlign: 'center', lineHeight: 16,
  },
  filterButton: {
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
  },
  category: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 11,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  rating: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D99A20',
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFFF2',
    borderTopWidth: 1,
    borderTopColor: C.line,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
});