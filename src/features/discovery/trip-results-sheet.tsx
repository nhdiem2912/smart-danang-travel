import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  finishTrip,
} from './trip-lifecycle';

import { formatTravelTime } from './trip-metrics';
import type { LegResult } from './trip-model';
import { Action, C, s } from './ui';
import {
  useTripDraft,
} from './use-trip-draft';

type Props = {
  result?: LegResult;
  placeName?: string;
  nextName?: string;
  onContinue?: () => void;
  onClose: () => void;
};

export function TripResultsSheet({
  result,
  placeName,
  nextName,
  onContinue,
  onClose,
}: Props) {
  const { draft } = useTripDraft();
  const [rating, setRating] = useState(draft?.review?.rating ?? 0);
  const [note, setNote] = useState(draft?.review?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const completed =
    draft?.stops.filter(stop => stop.completed) ?? [];

  const results = result
    ? [result]
    : completed.flatMap(stop => (stop.result ? [stop.result] : []));

  const gpsResults = results.filter(item => item.gpsMeters !== null);

  const seconds = results.reduce(
    (sum, item) => sum + item.activeSeconds,
    0,
  );

  const meters = gpsResults.reduce(
    (sum, item) => sum + (item.gpsMeters ?? 0),
    0,
  );

  const finished =
    !!draft?.stops.length &&
    completed.length === draft.stops.length;

  const partial =
    results.some(item => item.gpsPartial) ||
    gpsResults.length !== results.length;

    async function saveReview() {
    if (busy || !rating) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      await finishTrip(
        rating,
        note,
      );

      setMessage(
        'Đã lưu lịch sử vào tài khoản ' +
        'và kết thúc chuyến đi.',
      );

      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Chưa lưu được lịch sử. ' +
            'Chuyến hiện tại vẫn được giữ.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            maxHeight: '85%',
            width: '100%',
            maxWidth: 440,
            alignSelf: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={[
                s.title,
                { color: C.deep, textAlign: 'center' },
              ]}
            >
              {result
                ? '✓ ĐÃ ĐẾN NƠI'
                : finished
                  ? '🎉 HÀNH TRÌNH HOÀN TẤT'
                  : 'TỔNG KẾT HIỆN TẠI'}
            </Text>

            {result ? (
              <Text style={[s.title, { textAlign: 'center' }]}>
                {placeName}
              </Text>
            ) : (
              <Text style={s.muted}>
                {completed.length}/{draft?.stops.length ?? 0} điểm
                đã check-in
              </Text>
            )}

            <View style={s.card}>
              <Text style={s.muted}>
                Thời gian đi đã ghi nhận · không gồm tạm dừng
              </Text>
              <Text style={s.title}>
                {results.length
                  ? formatTravelTime(seconds)
                  : 'Chưa có dữ liệu'}
              </Text>

              <Text style={s.muted}>Quãng đường GPS ước tính</Text>
              <Text style={s.title}>
                {gpsResults.length
                  ? `${(meters / 1000).toFixed(2)} km`
                  : 'Chưa đủ dữ liệu GPS'}
              </Text>

              {partial && (
                <Text style={s.muted}>
                  Có đoạn tạm dừng hoặc GPS thiếu/kém chính xác;
                  không phải số đo đầy đủ toàn hành trình.
                </Text>
              )}
            </View>

            {!result && (
              <Text style={s.muted}>
                Có số đo thời gian ở {results.length}/
                {completed.length} điểm đã hoàn tất; có số đo GPS
                ở {gpsResults.length} điểm. Check-in cũ/thủ công
                không được tự gán số đo.
              </Text>
            )}

            {result && (
              <Text style={s.muted}>
                Đã lưu check-in lúc{' '}
                {new Date(result.arrivedAt).toLocaleTimeString(
                  'vi-VN',
                  { hour: '2-digit', minute: '2-digit' },
                )}
                .
              </Text>
            )}

            {result && onContinue && (
              <Action
                solid
                label={
                  `Tiếp tục chặng kế tiếp` +
                  `${nextName ? ` (${nextName})` : ''} →`
                }
                onPress={onContinue}
              />
            )}

            {!result && finished && (
              <>
                <Text style={s.title}>
                  Đánh giá chuyến đi · tùy chọn
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {[1, 2, 3, 4, 5].map(value => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`${value} sao`}
                      disabled={busy}
                      onPress={() => setRating(value)}
                      style={{ padding: 4 }}
                    >
                      <Text
                        style={{
                          fontSize: 30,
                          color:
                            value <= rating
                              ? '#F59E0B'
                              : '#CBD5E1',
                        }}
                      >
                        ★
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  editable={!busy}
                  multiline
                  maxLength={1000}
                  placeholder="Chia sẻ cảm nhận về chuyến đi…"
                  style={{
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: C.line,
                    borderRadius: 12,
                    padding: 12,
                    textAlignVertical: 'top',
                    color: C.ink,
                  }}
                />

                <Action
                  solid
                  label={busy ? 'Đang lưu…' : 'Lưu đánh giá'}
                  disabled={busy || !rating}
                  onPress={() => void saveReview()}
                />

                {!!message && (
                  <Text style={s.muted}>{message}</Text>
                )}
                {!!error && <Text style={s.error}>{error}</Text>}
              </>
            )}

            <Action
              label={result ? 'Xem lại lộ trình' : 'Đóng tổng kết'}
              onPress={onClose}
              disabled={busy}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}