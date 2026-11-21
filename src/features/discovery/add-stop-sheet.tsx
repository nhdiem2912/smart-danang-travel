import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Place } from '@/data/place.types';
import {
    dateForDay,
    displayDate,
    PERIODS,
    type DraftStop,
    type Period,
} from './trip-model';
import { Action, C, s, Sheet } from './ui';
import { tripActions, useTripDraft } from './use-trip-draft';

export function AddStopSheet({
  place,
  editing,
  close,
  onSaved,
  onDuplicate,
}: {
  place: Place;
  editing?: DraftStop;
  close: () => void;
  onSaved: () => void;
  onDuplicate?: () => void;
}) {
  const { draft, saving } = useTripDraft();

  const [day, setDay] = useState(
    editing?.dayIndex ??
      Array.from(
        { length: draft?.dayCount ?? 3 },
        (_, i) => i,
      ).find(
        i =>
          !draft?.stops.some(
            stop =>
              stop.placeId === place.id &&
              stop.dayIndex === i,
          ),
      ) ??
      0,
  );

  const [period, setPeriod] = useState<Period>(
    editing?.period ?? 'morning',
  );
  const [note, setNote] = useState(editing?.note ?? '');
    const [orderLocked, setOrderLocked] = useState(
    editing?.orderLocked ?? false,
  );
  const [minutes, setMinutes] = useState(
    editing?.visitMinutes?.toString() ?? '',
  );
  const [showDays, setShowDays] = useState(false);
  const [error, setError] = useState('');

  if (!draft) return null;

  async function submit() {
    try {
      setError('');

      if (
        minutes.trim() &&
        (
          !/^\d+$/.test(minutes.trim()) ||
          Number(minutes) < 1 ||
          Number(minutes) > 720
        )
      ) {
        throw new Error(
          'Thời gian dừng phải là số phút nguyên từ 1 đến 720.',
        );
      }

      await tripActions.add({
        id: editing?.id,
        placeId: place.id,
        dayIndex: day,
        period,
        note: note.trim(),
        
        visitMinutes: minutes.trim() ? Number(minutes) : null,
           orderLocked,
      });

      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được địa điểm. Hãy thử lại.',
      );
    }
  }
async function remove() {
  if (!editing) return;

  try {
    setError('');
    await tripActions.remove(editing.id);
    onSaved();
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : 'Không xóa được địa điểm.',
    );
  }
}
  return (
    <Sheet
      title={
        editing
          ? 'Sửa địa điểm trong lộ trình'
          : 'Thêm địa điểm vào lộ trình'
      }
      subtitle="Chọn ngày và khung giờ mong muốn"
      visible
      close={() => {
        if (!saving) close();
      }}
      footer={
  <View style={{ gap: 8 }}>
    {editing && (
      <Action
        danger
        label="Xóa địa điểm khỏi ngày này"
        disabled={saving}
        onPress={() => void remove()}
      />
    )}

    <View style={s.row}>
      <Action
        label="Hủy"
        onPress={close}
        disabled={saving}
      />

      <Action
        label={
          saving
            ? 'Đang lưu…'
            : editing
              ? '✓ Lưu thay đổi'
              : '✓ Thêm ngay vào lộ trình'
        }
        onPress={() => void submit()}
        solid
        disabled={saving}
        style={{ flex: 1 }}
      />
    </View>
  </View>
}
    >
      <View
        style={[
          s.card,
          { flexDirection: 'row', alignItems: 'center' },
        ]}
      >
        <Text style={{ fontSize: 20 }}>📍</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{place.name}</Text>
          <Text style={s.muted}>
            {place.address ?? 'Chưa cập nhật địa chỉ'}
          </Text>
        </View>
      </View>

      {editing && onDuplicate && (
        <Action
          label="＋ Thêm điểm này ở ngày khác"
          onPress={onDuplicate}
          disabled={
            saving ||
            draft.stops.filter(
              stop => stop.placeId === place.id,
            ).length >= draft.dayCount
          }
        />
      )}

      <Text style={s.label}>THÊM VÀO NGÀY</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn ngày đi"
        onPress={() => setShowDays(!showDays)}
        style={s.input}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: C.ink,
          }}
        >
          Ngày {day + 1}:{' '}
          {displayDate(dateForDay(draft.startDate, day))} ⌄
        </Text>
      </Pressable>

      {showDays && (
        <View style={{ gap: 6 }}>
          {Array.from({ length: draft.dayCount }, (_, i) => (
            <Action
              key={i}
              label={`Ngày ${i + 1}: ${displayDate(
                dateForDay(draft.startDate, i),
              )}`}
              onPress={() => {
                setDay(i);
                setShowDays(false);
              }}
              solid={day === i}
            />
          ))}
        </View>
      )}

      <Text style={s.label}>KHUNG GIỜ TRONG NGÀY</Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {PERIODS.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{
              selected: period === item.id,
            }}
            onPress={() => setPeriod(item.id)}
            style={[
              s.pill,
              { width: '48%' },
              period === item.id && s.pillActive,
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: period === item.id ? C.deep : C.ink,
              }}
            >
              {item.icon} {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      
      <Action
        label={
          editing?.completed
            ? 'Đã hoàn thành · giữ thứ tự'
            : orderLocked
              ? '🔒 Giữ thứ tự · nhấn để mở khóa'
              : 'Cho phép tối ưu thứ tự · nhấn để khóa'
        }
        disabled={saving || editing?.completed}
        onPress={() =>
          setOrderLocked(value => !value)
        }
      />
      <Text style={s.label}>GHI CHÚ THÊM</Text>

      <TextInput
        accessibilityLabel="Ghi chú địa điểm"
        multiline
        maxLength={1000}
        value={note}
        onChangeText={setNote}
        placeholder="VD: Chụp ảnh check-in, ăn hải sản..."
        placeholderTextColor={C.muted}
        style={[
          s.input,
          { minHeight: 62, textAlignVertical: 'top' },
        ]}
      />

      <Text style={s.label}>
        THỜI GIAN DỪNG DỰ KIẾN (PHÚT, TÙY CHỌN)
      </Text>

      <TextInput
        accessibilityLabel="Thời gian dừng dự kiến"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
        placeholder={
          `Để trống: dùng ${draft.settings.defaultVisitMinutes} phút ước tính`
        }
        placeholderTextColor={C.muted}
        style={s.input}
      />

      <Text style={s.muted}>
        Một địa điểm chỉ xuất hiện một lần trong mỗi ngày.
        Có thể chọn lại ở ngày khác.
      </Text>

      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}