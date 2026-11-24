import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';

import { findPlaceById } from '@/data/places.local';
import { formatTravelTime } from './trip-metrics';

import {
  minuteToTime,
  type DraftStop,
  type StopSchedule
} from './trip-model';

import { Action, useDiscoveryUI } from './ui';

type Props = {
  stop: DraftStop;
  defaultMinutes: number;
  disabled: boolean;
  onStart: () => void;
    plannedSchedule?: StopSchedule;
  onEdit: () => void;
  onRemove: () => void;
  onCheckIn: () => void;
  onCancel: () => void;
};

export function TripStopCard({
  stop,
  defaultMinutes,
    plannedSchedule,
  disabled,
  onStart,
  onEdit,
  onRemove,
  onCheckIn,
  onCancel,
}: Props) {
  const { C, s } = useDiscoveryUI();

  const place = findPlaceById(stop.placeId);
  const schedule =
    plannedSchedule ??
    (stop.completed ? stop.schedule : undefined);

  const arrived =
    stop.completed && stop.result
      ? new Date(stop.result.arrivedAt)
      : null;

  const arrivedLabel =
    arrived && Number.isFinite(arrived.getTime())
      ? arrived.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;
  const active = !!stop.progress;

  const color = active
    ? C.warning
    : stop.completed
      ? C.deep
      : C.muted;

  const background = active
    ? C.warningBg
    : stop.completed
      ? C.successBg
      : C.input;

    const wanted =
    stop.visitMinutes ??
    place?.visit_duration_minutes ??
    defaultMinutes;

  const status = active
    ? 'Chặng đang dở'
    : stop.completed
      ? 'Đã check-in'
      : 'Chưa bắt đầu';

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: active ? C.warning : C.line,
        borderRadius: 15,
        backgroundColor: background,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: 12,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 48,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color,
              fontWeight: '800',
              fontSize: 15,
            }}
          >
            {schedule
              ? minuteToTime(schedule.visitStartMinute)
              : arrivedLabel ?? '—'}
          </Text>
          <Text
            style={{
              fontSize: 9,
              color,
              marginTop: 3,
            }}
          >
            {schedule
              ? plannedSchedule
                ? 'Kế hoạch'
                : 'KH cũ'
              : arrivedLabel
                ? 'Đã đến'
                : 'Chưa xếp'}
          </Text>
          <View
            style={{
              width: 2,
              
              flex: 1,
              minHeight: 38,
              marginTop: 8,
              backgroundColor: active
                ? C.warning
                : C.line,
            }}
          />
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <Text style={[s.title, { flex: 1 }]}>
              {place?.name ?? stop.placeId}
            </Text>

            <Pressable
              disabled={disabled || active}
              onPress={() =>
                Alert.alert(
                  'Xóa địa điểm?',
                  'Địa điểm này sẽ được bỏ khỏi ngày đã chọn.',
                  [
                    {
                      text: 'Giữ lại',
                      style: 'cancel',
                    },
                    {
                      text: 'Xóa',
                      style: 'destructive',
                      onPress: onRemove,
                    },
                  ],
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Xóa địa điểm"
              style={{ padding: 5 }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 17,
                }}
              >
                ×
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: 7,
              paddingHorizontal: 7,
              paddingVertical: 3,
              backgroundColor: active
                ? C.warningBg
                : C.input,
            }}
          >
            <Text
              style={{
                color,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {status}
            </Text>
          </View>

          <Text style={s.muted} numberOfLines={2}>
            {place?.address ?? 'Chưa có địa chỉ'}
          </Text>

          {schedule ? (
            <>
              <Text style={s.muted}>
                Khởi hành{' '}
                {minuteToTime(schedule.departureMinute)}
                {' · '}Đi khoảng{' '}
                {Math.ceil(schedule.travelSeconds / 60)}
                {' phút · '}
                {(schedule.travelMeters / 1000).toFixed(1)}
                {' km'}
              </Text>

              <Text style={s.muted}>
                Đến {minuteToTime(schedule.arrivalMinute)}
                {' · '}Đệm {schedule.bufferMinutes} phút
              </Text>

              <Text style={[s.muted, { color }]}>
                Tham quan{' '}
                {minuteToTime(schedule.visitStartMinute)}
                –
                {minuteToTime(schedule.endMinute)}
                {' '}({schedule.visitMinutes} phút)
              </Text>

              {schedule.visitMinutes <
                schedule.requestedVisitMinutes && (
                <Text style={s.muted}>
                  Đã rút từ{' '}
                  {schedule.requestedVisitMinutes} phút
                  để vừa lịch.
                </Text>
              )}
            </>
          ) : (
            <Text style={s.muted}>
              Dự kiến {wanted} phút · Chưa xếp giờ.
              Mở Danh sách → Tối ưu lịch trình.
            </Text>
          )}

          {!!stop.note && (
            <Text style={s.muted}>
              Ghi chú: {stop.note}
            </Text>
          )}
          {arrivedLabel && (
            <Text style={s.muted}>
              Đã đến thực tế: {arrivedLabel}
            </Text>
          )}
          {stop.completed && stop.result && (
            <Text style={s.muted}>
              Đã ghi nhận:{' '}
              {formatTravelTime(stop.result.activeSeconds)}
              {' · GPS '}
              {stop.result.gpsMeters === null
                ? 'chưa đủ dữ liệu'
                : `${(
                    stop.result.gpsMeters / 1000
                  ).toFixed(2)} km`}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: C.line,
          padding: 10,
          gap: 8,
        }}
      >
        <View style={s.between}>
          <Text
            style={[
              s.muted,
              { color, flex: 1 },
            ]}
          >
            {active
              ? '● Đã lưu chặng · có thể tiếp tục'
              : stop.completed
                ? '● Check-in hoàn tất'
                : '○ Sẵn sàng bắt đầu'}
          </Text>

          <Action
            solid={!stop.completed || active}
            label={
              active
                ? '▶ Tiếp tục'
                : stop.completed
                  ? '↻ Đi lại'
                  : 'Bắt đầu →'
            }
            disabled={
              disabled || !place?.coordinates_valid
            }
            onPress={onStart}
          />
        </View>

        <View
          style={[
            s.row,
            { flexWrap: 'wrap' },
          ]}
        >
          {active ? (
            <Action
              danger
              label="Hủy chặng đang dở"
              disabled={disabled}
              onPress={() =>
                Alert.alert(
                  'Hủy chặng đang dở?',
                  'Số đo chưa hoàn tất của lượt này sẽ bị bỏ. Kết quả check-in cũ được giữ nguyên.',
                  [
                    {
                      text: 'Giữ lại',
                      style: 'cancel',
                    },
                    {
                      text: 'Hủy chặng',
                      style: 'destructive',
                      onPress: onCancel,
                    },
                  ],
                )
              }
            />
          ) : (
            <>
              <Action
                label="Sửa"
                disabled={disabled || !place}
                onPress={onEdit}
              />

              <Action
  label={
    stop.completed
      ? 'Đã check-in'
      : 'Check-in thủ công'
  }
  disabled={disabled || stop.completed}
  onPress={onCheckIn}
/>
            </>
          )}
        </View>
      </View>
    </View>
  );
}