import {
    useState,
} from 'react';

import {
    Text,
    TextInput,
    View,
} from 'react-native';

import {
    TripOriginPicker,
} from './trip-origin-picker';

import type {
    TripSettings,
} from './trip-model';

import {
    tripActions,
    useTripDraft,
} from './use-trip-draft';

import { Action, Sheet, useDiscoveryUI } from './ui';

export function TripSettingsSheet({
  close,
}: {
  close: () => void;
}) {
  const { s } = useDiscoveryUI();

  const {
    draft,
    saving,
  } = useTripDraft();

  const [settings, setSettings] =
    useState<TripSettings>(
      () => ({
        ...draft!.settings,
      }),
    );

  const [minutes, setMinutes] =
    useState(
      String(
        draft!.settings
          .defaultVisitMinutes,
      ),
    );

  const [busy, setBusy] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState('');

  async function save(
    optimize: boolean,
  ) {
    if (
      !draft ||
      busy ||
      saving ||
      locating
    ) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (
        !/^\d+$/.test(minutes)
      ) {
        throw new Error(
          'Nhập thời gian dừng ' +
          'bằng số phút nguyên.',
        );
      }

      await tripActions.configure(
        draft.startDate,
        draft.dayCount,
        {
          ...settings,
          defaultVisitMinutes:
            Number(minutes),
        },
        optimize,
      );

      close();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không lưu được cấu hình.',
      );
    } finally {
      setBusy(false);
    }
  }

  const disabled =
    busy ||
    saving ||
    locating;

  return (
    <Sheet
      title="Cấu hình chuyến đi"
      subtitle={
        'Giờ, phương tiện và tối ưu · ' +
        'không có danh sách địa điểm'
      }
      visible
      close={() => {
        if (!disabled) {
          close();
        }
      }}
      footer={
        <View
          style={{
            gap: 8,
          }}
        >
          <Action
            label="Lưu cấu hình"
            disabled={disabled}
            onPress={() =>
              void save(false)
            }
          />

          <Action
            solid
            label={
              busy
                ? 'Đang xử lý…'
                : 'Tối ưu thứ tự & xếp giờ'
            }
            disabled={
              disabled ||
              !draft?.stops.length
            }
            onPress={() =>
              void save(true)
            }
          />
        </View>
      }
    >
      <TripOriginPicker
        value={settings}
        disabled={
          busy || saving
        }
        onChange={setSettings}
        onBusyChange={setLocating}
      />

      <Text style={s.label}>
        GIỜ BẮT ĐẦU (HH:mm)
      </Text>

      <TextInput
        style={s.input}
        value={settings.startTime}
        onChangeText={value =>
          setSettings(previous => ({
            ...previous,
            startTime: value,
          }))
        }
      />

      <Text style={s.label}>
        GIỜ KẾT THÚC (HH:mm)
      </Text>

      <TextInput
        style={s.input}
        value={settings.endTime}
        onChangeText={value =>
          setSettings(previous => ({
            ...previous,
            endTime: value,
          }))
        }
      />

      <Text style={s.label}>
        PHƯƠNG TIỆN
      </Text>

      <View style={s.row}>
        {(
          [
            ['driving', 'Ô tô'],
            ['walking', 'Đi bộ'],
          ] as const
        ).map(([id, label]) => (
          <Action
            key={id}
            label={label}
            solid={
              settings.travelMode === id
            }
            onPress={() =>
              setSettings(previous => ({
                ...previous,
                travelMode: id,
              }))
            }
          />
        ))}
      </View>

      <Text style={s.label}>
        THỜI GIAN DỪNG MẶC ĐỊNH (PHÚT)
      </Text>

      <TextInput
        style={s.input}
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
      />

      <Text style={s.muted}>
        Đổi ngày dùng calendar riêng và sẽ
        reset toàn bộ chuyến hiện tại.
      </Text>

      {!!error && (
        <Text style={s.error}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}