import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import {
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import packageInfo from '../../package.json';

import {
  CURRENCIES,
  LANGUAGES,
  LANGUAGE_LABELS,
  SettingsError,
  settingsStore,
  useAppSettings,
  type ThemeMode,
} from '@/features/settings/settings-store';

import {
  translate,
} from '@/features/settings/settings-i18n';

import {
  SETTINGS_COLORS,
  useSettingsColors,
} from '@/features/settings/settings-colors';

import {
  chooseAvatar,
  getAvatarUri,
} from '@/features/settings/settings-avatar';

import {
  notificationStatus,
  sendTestNotification,
  setDailyReminder,
} from '@/features/settings/settings-notifications';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Colors = typeof SETTINGS_COLORS.light;

type PanelName =
  | 'profile'
  | 'theme'
  | 'language'
  | 'currency'
  | 'inbox';

const MONEY_LABELS = {
  VND: 'VNĐ (₫)',
  USD: 'USD ($)',
  EUR: 'EUR (€)',
  KRW: 'KRW (₩)',
  JPY: 'JPY (¥)',
};

const LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

function AvatarView({
  uri,
}: {
  uri: string | null;
}) {
  const [broken, setBroken] = useState(false);

  return uri && !broken ? (
    <Image
      source={{ uri }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
      }}
      onError={() => setBroken(true)}
    />
  ) : (
    <Ionicons
      name="person"
      size={25}
      color="#3E8E4F"
    />
  );
}

function Panel({
  title,
  closeLabel,
  close,
  children,
  colors,
  scroll = true,
  message,
  messageColor,
}: {
  title: string;
  closeLabel: string;
  close: () => void;
  children: ReactNode;
  colors: Colors;
  scroll?: boolean;
  message?: string;
  messageColor?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel={closeLabel}
        />

        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 650,
            maxHeight: '88%',
            ...(scroll ? {} : { height: '80%' }),
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: Math.max(
              insets.bottom,
              12,
            ),
          }}
        >
          <View
            style={{
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 17,
                fontWeight: '800',
              }}
            >
              {title}
            </Text>

            <Pressable
              onPress={close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
            >
              <Ionicons
                name="close"
                size={23}
                color={colors.muted}
              />
            </Pressable>
          </View>

          {!!message && (
            <Text
              accessibilityRole="alert"
              style={{
                padding: 14,
                color:
                  messageColor ??
                  colors.danger,
              }}
            >
              {message}
            </Text>
          )}

          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: 18,
                gap: 12,
              }}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={{
                flex: 1,
                padding: 16,
                gap: 12,
              }}
            >
              {children}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({
  icon,
  tint,
  title,
  hint,
  value,
  onPress,
  right,
  disabled,
  last = false,
}: {
  icon: IconName;
  tint: string;
  title: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  disabled?: boolean;
  last?: boolean;
}) {
  const c = useSettingsColors();

  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    gap: 11,
    borderBottomWidth: last ? 0 : 1,
    borderColor: c.line,
  };

  const content = (
    <>
      <View
        style={{
          width: 33,
          height: 33,
          borderRadius: 11,
          backgroundColor: tint + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={icon}
          size={18}
          color={tint}
        />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: c.text,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>

        {!!hint && (
          <Text
            style={{
              color: c.muted,
              fontSize: 10,
              lineHeight: 15,
            }}
          >
            {hint}
          </Text>
        )}
      </View>

      {right ?? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {!!value && (
            <Text
              style={{
                color: c.green,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {value}
            </Text>
          )}

          <Ionicons
            name="chevron-forward"
            size={15}
            color={c.muted}
          />
        </View>
      )}
    </>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>
      {content}
    </View>
  );
}

function SettingsButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={{
        paddingVertical: 11,
        paddingHorizontal: 14,
        backgroundColor: '#087F61',
        borderRadius: 12,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          color: '#FFF',
          fontSize: 12,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const snapshot = useAppSettings();

  const native = useSyncExternalStore(
    notificationStatus.subscribe,
    notificationStatus.getSnapshot,
    notificationStatus.getServerSnapshot,
  );

  const c = useSettingsColors();
  const insets = useSafeAreaInsets();

  const [panel, setPanel] =
    useState<PanelName | null>(null);

  const [name, setName] = useState('');
  const [working, setWorking] = useState(false);

  const lock = useRef(false);

  const [message, setMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const value = snapshot.settings;
  const language = value?.language ?? 'vi';

  const t = (
    key: Parameters<typeof translate>[1],
  ) => translate(language, key);

  const busy = working || snapshot.saving;

  const version =
    Constants.expoConfig?.version ??
    packageInfo.version;

  async function act(
    operation: () => Promise<unknown>,
    success?: string,
  ) {
    if (
      lock.current ||
      snapshot.saving
    ) {
      return false;
    }

    lock.current = true;
    setWorking(true);
    setMessage(null);

    try {
      await operation();

      if (success) {
        setMessage({
          text: success,
          ok: true,
        });
      }

      return true;
    } catch (error) {
      setMessage({
        text: t(
          error instanceof SettingsError
            ? error.code
            : 'nativeError',
        ),
        ok: false,
      });

      return false;
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  const card = {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 18,
    overflow: 'hidden' as const,
  };

  const heading = (text: string) => (
    <Text
      style={{
        color: c.muted,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginLeft: 4,
      }}
    >
      {text}
    </Text>
  );

  const close = () => {
    if (
      !lock.current &&
      !snapshot.saving
    ) {
      setPanel(null);
    }
  };

  if (!snapshot.ready || !value) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          gap: 14,
          backgroundColor: c.background,
        }}
      >
        {snapshot.error ? (
          <>
            <Text style={{ color: c.danger }}>
              {t(snapshot.error)}
            </Text>

            <SettingsButton
              label={t('retry')}
              onPress={() =>
                void settingsStore.load()
              }
              disabled={busy}
            />
          </>
        ) : (
          <ActivityIndicator color={c.green} />
        )}
      </View>
    );
  }

  const unread = value.inbox.filter(
    notice => notice.readAt === null,
  ).length;

  const avatarUri = getAvatarUri(
    value.profile.avatar,
  );

  const errorText =
    message?.text ??
    (
      snapshot.error
        ? t(snapshot.error)
        : native.error
          ? t(native.error)
          : undefined
    );

  const option = (
    label: string,
    selected: boolean,
    choose: () => Promise<unknown>,
  ) => (
    <Pressable
      key={label}
      disabled={busy}
      onPress={() => {
        void act(choose).then(ok => {
          if (ok) setPanel(null);
        });
      }}
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor:
          selected ? c.pale : c.input,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: c.text,
          fontWeight: selected ? '800' : '500',
        }}
      >
        {label}
      </Text>

      {selected && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={c.green}
        />
      )}
    </Pressable>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 14,
          gap: 14,
          paddingBottom: Math.max(
            24,
            insets.bottom,
          ),
          width: '100%',
          maxWidth: 680,
          alignSelf: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: '900',
                color: c.text,
              }}
            >
              {t('title')}
            </Text>

            <Text
              style={{
                color: c.muted,
                fontSize: 11,
              }}
            >
              {t('subtitle')}
            </Text>
          </View>

          <Text
            style={{
              paddingHorizontal: 9,
              paddingVertical: 5,
              backgroundColor: c.pale,
              color: c.green,
              borderRadius: 12,
              fontSize: 10,
              fontWeight: '800',
            }}
          >
            v{version}
          </Text>
        </View>

        <View
          style={[
            card,
            {
              flexDirection: 'row',
              padding: 15,
              alignItems: 'center',
              gap: 12,
            },
          ]}
        >
          <Pressable
            disabled={busy}
            onPress={() =>
              void act(chooseAvatar)
            }
            accessibilityRole="button"
            accessibilityLabel={t('avatar')}
          >
            <View
              style={{
                width: 50,
                height: 50,
                backgroundColor: '#E8F5E9',
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <AvatarView
                key={avatarUri ?? 'none'}
                uri={avatarUri}
              />
            </View>

            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                backgroundColor: '#087F61',
                borderRadius: 10,
                padding: 3,
                borderWidth: 2,
                borderColor: c.card,
              }}
            >
              <Ionicons
                name="camera"
                size={10}
                color="#FFF"
              />
            </View>
          </Pressable>

          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: c.text,
                fontWeight: '800',
                fontSize: 14,
              }}
            >
              {value.profile.name || t('guest')}
            </Text>

            <Text
              style={{
                color: c.muted,
                fontSize: 10,
              }}
            >
              {t('localProfile')}
            </Text>
          </View>

          <SettingsButton
            label={t('edit')}
            disabled={busy}
            onPress={() => {
              setName(value.profile.name);
              setMessage(null);
              setPanel('profile');
            }}
          />
        </View>

        {heading(t('appearanceGroup'))}

        <View style={card}>
          <Row
            icon="moon-outline"
            tint="#9364D8"
            title={t('appearance')}
            hint={t('appearanceScope')}
            value={t(value.theme)}
            disabled={busy}
            onPress={() => setPanel('theme')}
          />

          <Row
            icon="language-outline"
            tint="#4388DF"
            title={t('language')}
            value={
              LANGUAGE_LABELS[value.language]
            }
            hint={t('languageScope')}
            disabled={busy}
            onPress={() => setPanel('language')}
          />

          <Row
            icon="cash-outline"
            tint="#22A775"
            title={t('currency')}
            value={MONEY_LABELS[value.currency]}
            hint={t('currencyScope')}
            disabled={busy}
            onPress={() => setPanel('currency')}
          />

          <Row
            icon="notifications-outline"
            tint="#D89A24"
            title={t('reminder')}
            hint={
              Platform.OS === 'web'
                ? t('unsupported')
                : value.remindersEnabled &&
                    native.ready &&
                    !native.granted
                  ? t('blocked')
                  : t('reminderHint')
            }
            right={
              <Switch
                value={value.remindersEnabled}
                disabled={
                  busy ||
                  Platform.OS === 'web'
                }
                accessibilityLabel={t('reminder')}
                trackColor={{
                  false: c.line,
                  true: '#3E8E4F',
                }}
                thumbColor="#FFF"
                onValueChange={enabled =>
                  void act(() =>
                    setDailyReminder(enabled),
                  )
                }
              />
            }
            last
          />
        </View>

        {Platform.OS !== 'web' &&
          native.ready &&
          !native.granted && (
            <Pressable
              onPress={() =>
                void act(() =>
                  Linking.openSettings(),
                )
              }
            >
              <Text
                style={{
                  color: c.green,
                  fontSize: 11,
                }}
              >
                {t('openSettings')}
              </Text>
            </Pressable>
          )}

        {heading(t('support'))}

        <View style={card}>
          <Row
            icon="mail-outline"
            tint="#22A775"
            title={t('inbox')}
            value={String(unread)}
            disabled={busy}
            onPress={() => {
              setMessage(null);
              setPanel('inbox');
            }}
          />

          <Row
            icon="call-outline"
            tint="#20A3BE"
            title={t('hotline')}
            value="1022"
            last
            disabled={busy}
            onPress={() => {
              Alert.alert(
                t('hotline'),
                '1022',
                [
                  {
                    text: t('close'),
                    style: 'cancel',
                  },
                  {
                    text: t('call'),
                    onPress: () =>
                      void act(() =>
                        Linking.openURL(
                          'tel:1022',
                        ),
                      ),
                  },
                ],
              );
            }}
          />
        </View>

        {busy && (
          <ActivityIndicator color={c.green} />
        )}

        {!!errorText && (
          <Text
            accessibilityRole="alert"
            style={{
              color:
                message?.ok
                  ? c.green
                  : c.danger,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {errorText}
          </Text>
        )}

        <Text
          style={{
            color: c.muted,
            fontSize: 10,
            lineHeight: 16,
          }}
        >
          {t('localOnly')}
        </Text>

        <Text
          style={{
            color: c.muted,
            textAlign: 'center',
            fontSize: 10,
          }}
        >
          Smart Da Nang Travel
        </Text>
      </ScrollView>

      {panel && (
        <Panel
          colors={c}
          title={t(
            panel === 'profile'
              ? 'edit'
              : panel === 'theme'
                ? 'appearance'
                : panel,
          )}
          closeLabel={t('close')}
          close={close}
          scroll={panel !== 'inbox'}
          message={errorText}
          messageColor={
            message?.ok ? c.green : c.danger
          }
        >
          {panel === 'profile' && (
            <>
              <Text style={{ color: c.muted }}>
                {t('name')}
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={60}
                editable={!busy}
                accessibilityLabel={t('name')}
                placeholder={t('guest')}
                placeholderTextColor={c.muted}
                style={{
                  backgroundColor: c.input,
                  borderColor: c.line,
                  borderWidth: 1,
                  borderRadius: 12,
                  color: c.text,
                  padding: 12,
                }}
              />

              <SettingsButton
                label={
                  busy
                    ? t('saving')
                    : t('save')
                }
                disabled={busy}
                onPress={() => {
                  void act(() =>
                    settingsStore.update(
                      settings => ({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          name: name.trim(),
                        },
                      }),
                    ),
                  ).then(ok => {
                    if (ok) setPanel(null);
                  });
                }}
              />
            </>
          )}

          {panel === 'theme' &&
            (
              [
                'system',
                'light',
                'dark',
              ] as ThemeMode[]
            ).map(theme =>
              option(
                t(theme),
                value.theme === theme,
                () =>
                  settingsStore.update(
                    settings => ({
                      ...settings,
                      theme,
                    }),
                  ),
              ),
            )}

          {panel === 'language' &&
            LANGUAGES.map(language =>
              option(
                LANGUAGE_LABELS[language],
                value.language === language,
                () =>
                  settingsStore.update(
                    settings => ({
                      ...settings,
                      language,
                    }),
                  ),
              ),
            )}

          {panel === 'currency' &&
            CURRENCIES.map(currency =>
              option(
                MONEY_LABELS[currency],
                value.currency === currency,
                () =>
                  settingsStore.update(
                    settings => ({
                      ...settings,
                      currency,
                    }),
                  ),
              ),
            )}

          {panel === 'inbox' && (
            <>
              <FlatList
                data={value.inbox}
                keyExtractor={item => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  gap: 10,
                  flexGrow: 1,
                }}
                ListEmptyComponent={
                  <View
                    style={{
                      alignItems: 'center',
                      padding: 35,
                      gap: 10,
                    }}
                  >
                    <Ionicons
                      name="notifications-off-outline"
                      size={36}
                      color={c.muted}
                    />

                    <Text
                      style={{
                        color: c.muted,
                      }}
                    >
                      {t('emptyInbox')}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      void act(() =>
                        settingsStore.update(
                          settings => ({
                            ...settings,
                            inbox:
                              settings.inbox.map(
                                notice =>
                                  notice.id ===
                                  item.id
                                    ? {
                                        ...notice,
                                        readAt:
                                          notice.readAt ??
                                          new Date().toISOString(),
                                      }
                                    : notice,
                              ),
                          }),
                        ),
                      )
                    }
                    style={{
                      backgroundColor:
                        item.readAt
                          ? c.input
                          : c.pale,
                      borderRadius: 13,
                      padding: 13,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: c.text,
                        fontWeight: '800',
                      }}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={{
                        color: c.text,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {item.body}
                    </Text>

                    <Text
                      style={{
                        color: c.muted,
                        fontSize: 10,
                      }}
                    >
                      {new Date(
                        item.createdAt,
                      ).toLocaleString(
                        LOCALES[language],
                      )}
                    </Text>
                  </Pressable>
                )}
              />

              <SettingsButton
                label={t('readAll')}
                disabled={
                  busy ||
                  unread === 0
                }
                onPress={() =>
                  void act(() =>
                    settingsStore.update(
                      settings => ({
                        ...settings,
                        inbox:
                          settings.inbox.map(
                            notice => ({
                              ...notice,
                              readAt:
                                notice.readAt ??
                                new Date().toISOString(),
                            }),
                          ),
                      }),
                    ),
                  )
                }
              />

              <SettingsButton
                label={t('test')}
                onPress={() =>
                  void act(
                    sendTestNotification,
                    t('testSent'),
                  )
                }
                disabled={
                  busy ||
                  Platform.OS === 'web'
                }
              />
            </>
          )}
        </Panel>
      )}
    </View>
  );
}