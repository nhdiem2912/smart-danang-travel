import { findPlaceById } from '@/data/places.local';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { PlaceThumb } from './place-thumb';
import {
  dateForDay,
  displayDate,
  PERIODS,
  sortedStops,
  type DraftStop,
  type TravelMode,
  type TripSettings,
} from './trip-model';
import { TripOriginPicker } from './trip-origin-picker';
import { currentPlan } from './trip-plan';
import { Action, C, s, Sheet } from './ui';
import { tripActions, useTripDraft } from './use-trip-draft';

export function TripSummarySheet({
  close,
  onEdit,
}: {
  close: () => void;
  onEdit?: (stop: DraftStop) => void;
}) {
  const { draft, saving } = useTripDraft();
  const [optimizing, setOptimizing] = useState(false);
  const busy = saving || optimizing;

  const [startDate] = useState(
    draft?.startDate ?? '',
  );

  const [dayCount] = useState(
    String(draft?.dayCount ?? 3),
  );
  const [settings, setSettings] = useState<TripSettings>(
    draft!.settings,
  );
  const [defaultMinutes, setDefaultMinutes] = useState(
    String(draft!.settings.defaultVisitMinutes),
  );

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [locating, setLocating] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  if (!draft) return null;

  const ordered = sortedStops(draft.stops);
  const activeLeg =
    draft.stops.some(stop => stop.progress);

  const configurationChanged =
    startDate !== draft.startDate ||
    Number(dayCount) !== draft.dayCount ||
    Number(defaultMinutes) !==
      draft.settings.defaultVisitMinutes ||
    JSON.stringify(settings) !==
      JSON.stringify(draft.settings);

  const needsPlan =
    !currentPlan(draft) || configurationChanged;
  const visitTotal = ordered.reduce(
    (sum, stop) =>
      sum +
      (
        stop.visitMinutes ??
        findPlaceById(stop.placeId)?.visit_duration_minutes ??
        settings.defaultVisitMinutes
      ),
    0,
  );

  function editSetting<K extends keyof TripSettings>(
    key: K,
    value: TripSettings[K],
  ) {
    setSettings(previous => ({
      ...previous,
      [key]: value,
    }));
  }

  function parsedSettings() {
    if (
      !/^\d+$/.test(dayCount) ||
      !/^\d+$/.test(defaultMinutes)
    ) {
      throw new Error(
        'Số ngày và thời gian tham quan phải là số nguyên.',
      );
    }

    return {
      count: Number(dayCount),
      value: {
        ...settings,
        defaultVisitMinutes: Number(defaultMinutes),
      },
    };
  }

    async function configure(reorder = false, begin = false) {
     if (busy || locating) return;

    setOptimizing(true);

    try {
      setError('');
      setNotice('');

      const parsed = parsedSettings();

      await tripActions.configure(
        startDate,
        parsed.count,
        parsed.value,
        reorder,
      );

      if (begin) {
        close();
        router.push('/itinerary');
      } else {
        setSettings(parsed.value);

        setNotice(
          reorder
            ? 'Đã xếp lịch theo tuyến đường và khung giờ từng buổi. Thời gian tham quan có thể được rút ngắn. Chưa xét giao thông trực tiếp hoặc xác minh giờ mở cửa.'
            : 'Đã lưu cấu hình chuyến đi.',
        );
      }
        } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được cấu hình.',
      );
    } finally {
      setOptimizing(false);
    }
  }

  async function act(operation: () => Promise<unknown>) {
    try {
      setError('');
      await operation();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được thay đổi.',
      );
    }
  }


  return (
    <Sheet
      title="Danh sách địa điểm trong lộ trình"
      subtitle={`${ordered.length} điểm được chọn trong lộ trình`}
      visible
            close={() => {
        if (!busy && !locating) close();
      }}
      footer={
        <>
          <View style={s.between}>
            <Action
              danger
              label="Xóa tất cả"
              disabled={busy || !ordered.length}
              onPress={() => setConfirmClear(true)}
            />

            <View style={s.row}>
              <Action
                label="Đóng"
                onPress={close}
                disabled={busy || locating}
              />
              <Action
                solid
                                label={
                  optimizing
                    ? 'Đang xếp giờ…'
                    : '✓ Xếp giờ & xem lộ trình'
                }
                disabled={
                  busy || locating || !ordered.length
                }
                               onPress={() =>
                  void configure(
                    needsPlan && !activeLeg,
                    true,
                  )
                }
              />
            </View>
          </View>

          {confirmClear && (
            <View style={{ gap: 8 }}>
              <Text style={s.error}>
                Xóa toàn bộ {ordered.length} điểm đã chọn?
              </Text>

              <View style={s.row}>
                <Action
                  label="Giữ lại"
                  onPress={() => setConfirmClear(false)}
                />
                <Action
                  danger
                  label="Xác nhận xóa"
                  disabled={busy}
                  onPress={() =>
                    void act(async () => {
                      await tripActions.clear();
                      setConfirmClear(false);
                    })
                  }
                />
              </View>
            </View>
          )}
        </>
      }
    >
      <View style={[s.card, { borderColor: '#A7F3D0' }]}>
        <View style={s.between}>
          <Text
            style={[
              s.label,
              { color: C.deep, flex: 1 },
            ]}
          >
            ☷ CẤU HÌNH TIMELINE & PHƯƠNG TIỆN
          </Text>

          <Action
      label={optimizing ? 'Đang tính lịch…' : 'Tối ưu & xem giờ'}
            disabled={
                           busy ||
              activeLeg ||
              !ordered.length ||
              locating
            }
                      onPress={() => void configure(true, true)}
          />
        </View>

                <TripOriginPicker
          value={settings}
          disabled={busy}
          onChange={setSettings}
          onBusyChange={setLocating}
        />

        <View style={s.row}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.label}>GIỜ BẮT ĐẦU</Text>
            <TextInput
              accessibilityLabel="Giờ bắt đầu"
              style={s.input}
              value={settings.startTime}
              onChangeText={value =>
                editSetting('startTime', value)
              }
              placeholder="09:00"
            />
          </View>

          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.label}>GIỜ KẾT THÚC</Text>
            <TextInput
              accessibilityLabel="Giờ kết thúc"
              style={s.input}
              value={settings.endTime}
              onChangeText={value =>
                editSetting('endTime', value)
              }
              placeholder="18:30"
            />
          </View>
        </View>
        {activeLeg && (
          <Text style={s.error}>
            Có chặng đang dở. Hoàn tất hoặc hủy
            chặng để xếp lại giờ; kết quả check-in
            cũ được giữ nguyên.
          </Text>
        )}
        <Text style={s.label}>PHƯƠNG TIỆN DI CHUYỂN</Text>

        <View style={s.row}>
          {(
            [
              { id: 'two_wheeler', label: '🛵 Xe máy' },
              { id: 'driving', label: '🚗 Ô tô' },
              { id: 'walking', label: '🚶 Đi bộ' },
            ] as { id: TravelMode; label: string }[]
          ).map(mode => (
            <Pressable
              key={mode.id}
              accessibilityRole="button"
              accessibilityLabel={mode.label}
              accessibilityState={{
                selected: settings.travelMode === mode.id,
              }}
              onPress={() =>
                editSetting('travelMode', mode.id)
              }
              style={[
                s.pill,
                { flex: 1, paddingHorizontal: 4 },
                settings.travelMode === mode.id &&
                  s.pillActive,
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: C.deep,
                  textAlign: 'center',
                  fontWeight: '700',
                }}
              >
                                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.muted}>
          Tối ưu hiện hỗ trợ đi bộ và ô tô, chưa có giao thông trực tiếp.
          Xe máy chưa có nguồn tuyến phù hợp. Mỗi điểm có 5 phút đệm;
          thời gian tham quan có thể giảm xuống tối thiểu 10 phút,
          hoặc giữ mức thấp hơn nếu bạn đã nhập.
        </Text>

        <Text style={s.muted}>
          Buổi sáng 06:30–11:30 · Trưa 11:30–14:00 ·
          Chiều 14:00–18:00 · Tối 18:00–22:30.
          Nhấn Tối ưu lịch trình sau khi chọn đủ điểm và cấu hình.
        </Text>

        <View style={s.between}>
          <Action
            label={
              advanced
                ? 'Thu gọn ngày & thời gian'
                : 'Ngày đi & thời gian dừng ›'
            }
            onPress={() => setAdvanced(value => !value)}
          />
          <Action
            label="Lưu cấu hình"
            disabled={busy || locating}
            onPress={() => void configure()}
          />
        </View>

        {advanced && (
          <View style={{ gap: 9 }}>
            <View style={s.row}>
              <View style={{ flex: 2, gap: 5 }}>
                <Text style={s.label}>
                  NGÀY BẮT ĐẦU (YYYY-MM-DD)
                </Text>
                <TextInput
                  accessibilityLabel="Ngày bắt đầu chuyến đi"
                  style={s.input}
                  value={startDate}
                  editable={false}
                  placeholder="2026-11-13"
                />
              </View>

              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.label}>SỐ NGÀY</Text>
                <TextInput
                  accessibilityLabel="Số ngày đi"
                  keyboardType="number-pad"
                  style={s.input}
                  value={dayCount}
                 editable={false}
                />
              </View>
            </View>

                        <Text style={s.muted}>
              Đổi ngày tại màn Lộ trình → Đổi ngày.
              Xác nhận đổi ngày sẽ xóa toàn bộ
              địa điểm và tiến trình để chọn lại
              từ đầu.
            </Text>

            <Text style={s.label}>
              THỜI GIAN DỪNG MẶC ĐỊNH (PHÚT, ƯỚC TÍNH)
            </Text>
            <TextInput
              accessibilityLabel="Thời gian dừng mặc định"
              keyboardType="number-pad"
              style={s.input}
              value={defaultMinutes}
              onChangeText={setDefaultMinutes}
            />
          </View>
        )}

        <Text style={[s.muted, { color: C.deep }]}>
          {ordered.length} điểm dừng · khoảng {visitTotal} phút
          tham quan. Chưa tính thời gian di chuyển.
        </Text>
      </View>

      {!!notice && (
        <Text
          accessibilityRole="alert"
          style={[s.muted, { color: C.deep }]}
        >
          {notice}
        </Text>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}

      <View style={s.between}>
        <Text style={s.label}>THỨ TỰ THAM QUAN</Text>
        <Text style={s.muted}>
          ▲ ▼ trong cùng ngày và buổi
        </Text>
      </View>

      {ordered.map((stop, index) => {
        const place = findPlaceById(stop.placeId);

        const group = ordered.filter(
          item =>
            item.dayIndex === stop.dayIndex &&
            item.period === stop.period,
        );

        const groupIndex = group.findIndex(
          item => item.id === stop.id,
        );

        return (
          <View
            key={stop.id}
            style={[
              s.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                padding: 9,
                gap: 7,
              },
            ]}
          >
            <View
              style={{
                width: 23,
                height: 23,
                borderRadius: 12,
                backgroundColor: '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: C.deep,
                  fontWeight: '800',
                }}
              >
                {index + 1}
              </Text>
            </View>

            {place && (
              <PlaceThumb place={place} size={42} />
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                `Sửa ${place?.name ?? stop.placeId}`
              }
              onPress={() => onEdit?.(stop)}
              style={{ flex: 1 }}
            >
              <Text
                style={[s.title, { fontSize: 11 }]}
                numberOfLines={2}
              >
                {place?.name ??
                  'Địa điểm không còn trong danh mục'}
              </Text>

              <Text style={s.muted} numberOfLines={1}>
                {place?.address ?? 'Chưa cập nhật địa chỉ'}
              </Text>

              <Text style={[s.muted, { color: C.deep }]}>
                Ngày {stop.dayIndex + 1} ·{' '}
                {displayDate(
                  dateForDay(draft.startDate, stop.dayIndex),
                )}{' '}
                ·{' '}
                {PERIODS.find(
                  item => item.id === stop.period,
                )?.label}
              </Text>

              {!!stop.note && (
                <Text style={s.muted} numberOfLines={2}>
                  Ghi chú: {stop.note}
                </Text>
              )}
            </Pressable>

            <View style={{ gap: 4 }}>
              <Action
                label={`▲ ${index + 1}`}
                disabled={busy || groupIndex === 0}
                onPress={() =>
                  void act(() =>
                    tripActions.move(stop.id, -1),
                  )
                }
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                }}
              />
              <Action
                label={`▼ ${index + 1}`}
                disabled={
                  busy ||
                  groupIndex === group.length - 1
                }
                onPress={() =>
                  void act(() =>
                    tripActions.move(stop.id, 1),
                  )
                }
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                }}
              />
            </View>

            <Action
              danger
              label={`× ${index + 1}`}
              disabled={busy}
              onPress={() =>
                void act(() =>
                  tripActions.remove(stop.id),
                )
              }
              style={{
                paddingHorizontal: 7,
                paddingVertical: 6,
              }}
            />
          </View>
        );
      })}

      {!ordered.length && (
        <Text style={s.muted}>
          Chưa có địa điểm. Đóng bảng và chọn địa điểm
          trong Khám phá.
        </Text>
      )}
    </Sheet>
  );
}