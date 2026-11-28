import {
  TripAccountGate,
} from '@/features/discovery/trip-account-gate';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import {
  router,
  useRootNavigationState,
} from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  accountActions,
  useAccount,
} from '@/features/account/account-store';

import {
  GoogleAccountCard,
} from '@/features/account/google-account-card';

import {
  useSettingsColors,
} from '@/features/settings/settings-colors';

import {
  TravelerProfileProvider,
  useTravelerProfile,
} from './profile-context';

import {
  initialPreferences,
  OPTIONS,
  profileInputError,
  type ProfileInput,
} from './profile-model';

function Button({
  text,
  onPress,
  disabled = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 15,
        borderRadius: 15,
        backgroundColor: '#087F61',
        opacity: disabled ? 0.5 : 1,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: '#FFF',
          fontWeight: '800',
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function Frame({
  children,
}: {
  children: ReactNode;
}) {
  const c = useSettingsColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          flexGrow: 1,
          maxWidth: 680,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function Choices({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: readonly (
    readonly [string, string]
  )[];
  selected: readonly string[];
  onSelect: (id: string) => void;
}) {
  const c = useSettingsColors();

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: c.text,
          fontWeight: '800',
        }}
      >
        {title}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 9,
        }}
      >
        {options.map(([id, label]) => {
          const active = selected.includes(id);

          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
              }}
              onPress={() => onSelect(id)}
              style={{
                padding: 13,
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  active ? c.green : c.line,
                backgroundColor:
                  active ? c.pale : c.card,
              }}
            >
              <Text
                style={{
                  color:
                    active ? c.green : c.text,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PreferenceSurvey({
  initial,
  onCancel,
}: {
  initial: ProfileInput;
  onCancel?: () => void;
}) {
  const c = useSettingsColors();
  const { save } = useTravelerProfile();

  const [value, setValue] =
    useState<ProfileInput>(() => ({
      ...initial,
      interests: [...initial.interests],
    }));

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lock = useRef(false);

  function edit<K extends keyof ProfileInput>(
    key: K,
    next: ProfileInput[K],
  ) {
    setValue(previous => ({
      ...previous,
      [key]: next,
    }));

    setError('');
  }

  const titles = [
    'Đôi nét về bạn',
    'Bạn đi cùng ai?',
    'Bạn thích trải nghiệm gì?',
    'Ngân sách mỗi ngày',
    'Khung giờ yêu thích',
    'Hồ sơ du lịch của bạn',
  ];

  const nextAllowed =
    step === 0
      ? !!value.displayName.trim() &&
        value.displayName.trim().length <= 80
      : step === 1
        ? !!value.companion
        : step === 2
          ? value.interests.length > 0
          : step === 3
            ? !!value.budget
            : !!value.timeSlot;

  async function submit() {
    if (lock.current) return;

    const message = profileInputError(value);

    if (message) {
      setError(message);
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await save(value);
      onCancel?.();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được hồ sơ.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Frame>
      <Text
        style={{
          color: c.green,
          fontWeight: '800',
        }}
      >
        SMART DA NANG TRAVEL
      </Text>

      <Text style={{ color: c.muted }}>
        Bước {Math.min(step + 1, 5)}/5
        {step === 5
          ? ' · Xác nhận hồ sơ'
          : ''}
      </Text>

      <Text
        style={{
          color: c.text,
          fontSize: 25,
          fontWeight: '900',
        }}
      >
        {titles[step]}
      </Text>

      <Text
        style={{
          color: c.muted,
          lineHeight: 21,
        }}
      >
        Lưu sở thích để cá nhân hóa trải nghiệm.
        Bạn có thể chỉnh lại trong Cài đặt.
      </Text>

      {step === 0 && (
        <>
          <TextInput
            accessibilityLabel="Tên hiển thị"
            value={value.displayName}
            maxLength={80}
            onChangeText={v =>
              edit('displayName', v)
            }
            placeholder="Tên hiển thị"
            placeholderTextColor={c.muted}
            style={{
              padding: 14,
              color: c.text,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 13,
            }}
          />

          <Choices
            title="Giới tính (tùy chọn)"
            options={OPTIONS.gender}
            selected={[value.gender]}
            onSelect={v => edit('gender', v)}
          />

          <Choices
            title="Nhóm tuổi (tùy chọn)"
            options={OPTIONS.ageGroup}
            selected={[value.ageGroup]}
            onSelect={v => edit('ageGroup', v)}
          />
        </>
      )}

      {step === 1 && (
        <Choices
          title="Người đồng hành"
          options={OPTIONS.companion}
          selected={[value.companion]}
          onSelect={v => edit('companion', v)}
        />
      )}

      {step === 2 && (
        <Choices
          title="Chọn ít nhất một sở thích"
          options={OPTIONS.interests}
          selected={value.interests}
          onSelect={v =>
            edit(
              'interests',
              value.interests.includes(v)
                ? value.interests.filter(
                    x => x !== v,
                  )
                : [...value.interests, v],
            )
          }
        />
      )}

      {step === 3 && (
        <>
          <Choices
            title="Mức chi tiêu bạn ưu tiên"
            options={OPTIONS.budget}
            selected={[value.budget]}
            onSelect={v => edit('budget', v)}
          />

          <Text style={{ color: c.muted }}>
            Đây là sở thích ngân sách, chưa phải
            báo giá hay tổng chi phí chuyến đi.
          </Text>
        </>
      )}

      {step === 4 && (
        <Choices
          title="Khung giờ ưu tiên"
          options={OPTIONS.timeSlot}
          selected={[value.timeSlot]}
          onSelect={v => edit('timeSlot', v)}
        />
      )}

      {step === 5 && (
        <View
          style={{
            padding: 18,
            gap: 12,
            borderRadius: 18,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontWeight: '800',
            }}
          >
            {value.displayName}
          </Text>

          {(
            [
              'gender',
              'ageGroup',
              'companion',
              'budget',
              'timeSlot',
            ] as const
          ).map(key => (
            <Text
              key={key}
              style={{ color: c.text }}
            >
              {
                OPTIONS[key].find(
                  row =>
                    row[0] === value[key],
                )?.[1]
              }
            </Text>
          ))}

          <Text style={{ color: c.green }}>
            {OPTIONS.interests
              .filter(row =>
                value.interests.includes(
                  row[0],
                ),
              )
              .map(row => row[1])
              .join(' · ')}
          </Text>

          <Text
            style={{
              color: c.muted,
              lineHeight: 20,
            }}
          >
            Hồ sơ được lưu riêng theo tài khoản
            Google. Khảo sát này chưa tự tạo
            lộ trình hoặc tính chi phí.
          </Text>
        </View>
      )}

      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.danger }}
        >
          {error}
        </Text>
      )}

      {busy && (
        <ActivityIndicator color={c.green} />
      )}

      <View
        style={{
          marginTop: 'auto',
          gap: 12,
        }}
      >
        <Button
          text={
            step === 5
              ? busy
                ? 'Đang lưu hồ sơ…'
                : 'Lưu hồ sơ & tiếp tục'
              : 'Tiếp tục'
          }
          disabled={
            busy ||
            (step < 5 && !nextAllowed)
          }
          onPress={() => {
            if (step === 5) {
              void submit();
            } else {
              setStep(n => n + 1);
            }
          }}
        />

        {step > 0 && (
          <Button
            text="Quay lại"
            disabled={busy}
            onPress={() =>
              setStep(n => n - 1)
            }
          />
        )}

        {onCancel && (
          <Button
            text="Hủy chỉnh sửa"
            disabled={busy}
            onPress={onCancel}
          />
        )}

        {!onCancel && (
          <Button
            text="Đăng xuất"
            disabled={busy}
            onPress={() => {
              void accountActions.signOut();
            }}
          />
        )}
      </View>
    </Frame>
  );
}

const WELCOME_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQoZpu1KpIBhIn9CC0BR3N15U6BMpnQLWXNX3eKxpCrSyJCuDzfQSambdn3SMACWD94ffQokYRH3zGy2bQYQzBLtEYO5dUjZecZYeFN4okYjXM_KmehJZcom1z8Xi739EYVYu4HvIjcfuFh5CAMxyUP9zGJQ67xHSJ2u5-u5BKnTkMVEwQU2VJOz4CAg1W0kngwKE6D7r6x3L6JtglorcNhWOz6v9yNWuaAufYCHc';

function EnterHome() {
  const navigation =
    useRootNavigationState();

  const done = useRef(false);

  useEffect(() => {
    if (!navigation?.key || done.current) {
      return;
    }

    done.current = true;
    router.replace('/');
  }, [navigation?.key]);

  return null;
}

function ProfileEntry({
  children,
}: {
  children: ReactNode;
}) {
  const c = useSettingsColors();
  const data = useTravelerProfile();
  const account = useAccount();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 600 || width < 360;
  const gutter = compact ? 16 : 24;

  const [welcome, setWelcome] =
    useState(true);

  if (!data.ready) {
    return (
      <Frame>
        <ActivityIndicator color={c.green} />
        <Text style={{ color: c.text }}>
          Đang tải hồ sơ tài khoản…
        </Text>
      </Frame>
    );
  }

  if (data.error) {
    return (
      <Frame>
        <Text style={{ color: c.danger }}>
          {data.error}
        </Text>

        <Button
          text="Thử lại"
          onPress={data.retry}
        />

        <Button
          text="Đăng xuất"
          onPress={() => {
            void accountActions.signOut();
          }}
        />
      </Frame>
    );
  }

  if (data.profile) {
    return (
      <>
        {children}
        <EnterHome />
      </>
    );
  }

  if (welcome) {
    return (
      <ImageBackground
        source={{ uri: WELCOME_IMAGE }}
        resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
        style={{ flex: 1, backgroundColor: '#0A0F18' }}
      >
        <StatusBar style="light" />
        <ScrollView
          style={{ flex: 1, backgroundColor: '#061D1855' }}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingTop: insets.top + gutter,
            paddingBottom: insets.bottom + gutter,
            paddingLeft: insets.left + gutter,
            paddingRight: insets.right + gutter,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              alignSelf: 'center',
              gap: compact ? 14 : 22,
            }}
          >
            <Text
              style={{
                color: '#A7F3D0',
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              SMART DA NANG TRAVEL
            </Text>

            <Text
              style={{
                color: '#FFF',
                fontSize: compact ? 28 : 34,
                lineHeight: compact ? 35 : 43,
                fontWeight: '900',
              }}
            >
              Chạm vào Đà Nẵng theo cách của bạn
            </Text>

            <Text
              style={{
                color: '#E2E8F0',
                fontSize: 15,
                lineHeight: 25,
              }}
            >
              Chào {account.user?.name || 'bạn'}!
              Chia sẻ sở thích để chuẩn bị hành
              trình phù hợp với bạn.
            </Text>

            <Button
              text="Bắt đầu khảo sát →"
              onPress={() =>
                setWelcome(false)
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void accountActions.signOut();
              }}
              style={{
                padding: 10,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#E2E8F0',
                }}
              >
                Đăng xuất
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <PreferenceSurvey
      initial={initialPreferences(
        account.user?.name || '',
      )}
    />
  );
}

export function AccountEntryGate({
  children,
}: {
  children: ReactNode;
}) {
  const c = useSettingsColors();
  const account = useAccount();

  if (!account.ready) {
    return (
      <Frame>
        <ActivityIndicator color={c.green} />
        <Text style={{ color: c.text }}>
          Đang kiểm tra đăng nhập…
        </Text>
      </Frame>
    );
  }

  if (!account.user) {
    return (
      <Frame>
        <Text
          style={{
            color: c.green,
            fontWeight: '900',
          }}
        >
          SMART DA NANG TRAVEL
        </Text>

        <Text
          style={{
            color: c.text,
            fontSize: 29,
            fontWeight: '900',
          }}
        >
          Chào mừng bạn
        </Text>

        <Text
          style={{
            color: c.muted,
            lineHeight: 22,
          }}
        >
          Đăng nhập hoặc tạo tài khoản bằng Google
          để bắt đầu. Lần đầu đăng nhập sẽ tạo
          tài khoản cho bạn.
        </Text>

        <GoogleAccountCard />
      </Frame>
    );
  }

   return (
    <TravelerProfileProvider
      key={account.user.uid}
      uid={account.user.uid}
    >
      <TripAccountGate
        key={account.user.uid}
        uid={account.user.uid}
      >
        <ProfileEntry>
          {children}
        </ProfileEntry>
      </TripAccountGate>
    </TravelerProfileProvider>
  );
}

export function TravelerProfileSettings() {
  const c = useSettingsColors();

  const {
    profile,
    offline,
  } = useTravelerProfile();

  const [open, setOpen] = useState(false);

  if (!profile) return null;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderColor: c.line,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              color: c.text,
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            Sở thích du lịch
          </Text>

          {offline && (
            <Text
              style={{
                color: c.muted,
                fontSize: 11,
              }}
            >
              Bản lưu offline
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={c.green}
        />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() =>
          setOpen(false)
        }
      >
        {open && (
          <PreferenceSurvey
            initial={profile}
            onCancel={() =>
              setOpen(false)
            }
          />
        )}
      </Modal>
    </View>
  );
}