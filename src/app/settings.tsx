import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import {
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountProfileCard } from '@/features/account/account-profile-card';
import {
  accountActions,
  useAccount,
} from '@/features/account/account-store';
import { TripHistoryCard } from '@/features/discovery/trip-history-card';
import { useSettingsColors } from '@/features/settings/settings-colors';
import { translate } from '@/features/settings/settings-i18n';
import {
  notificationStatus,
  sendTestNotification,
  setDailyReminder,
} from '@/features/settings/settings-notifications';
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  SettingsError,
  settingsStore,
  useAppSettings,
  type ThemeMode,
} from '@/features/settings/settings-store';

import packageInfo from '../../package.json';

type PanelName = 'theme' | 'language' | 'inbox';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const snapshot = useAppSettings();
  const account = useAccount();
  const c = useSettingsColors();
  const insets = useSafeAreaInsets();

  const native = useSyncExternalStore(
    notificationStatus.subscribe,
    notificationStatus.getSnapshot,
    notificationStatus.getServerSnapshot,
  );

  const [panel, setPanel] =
    useState<PanelName | null>(null);

  const [height, setHeight] = useState(0);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  const lock = useRef(false);
  const value = snapshot.settings;
  const language = value?.language ?? 'vi';

  const t = (
    key: Parameters<typeof translate>[1],
  ) => translate(language, key);

  const busy = working || snapshot.saving;
  const dense = height > 0 && height < 620;

  const error =
    message ||
    (
      snapshot.error
        ? t(snapshot.error)
        : native.error
          ? t(native.error)
          : ''
    );

  const version =
    Constants.expoConfig?.version ??
    packageInfo.version;

  async function act(
    operation: () => Promise<unknown>,
    success = '',
  ) {
    if (lock.current || snapshot.saving) {
      return false;
    }

    lock.current = true;
    setWorking(true);
    setMessage('');

    try {
      await operation();
      setMessage(success);
      return true;
    } catch (e) {
      setMessage(
        t(
          e instanceof SettingsError
            ? e.code
            : 'nativeError',
        ),
      );

      return false;
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }

  function logout() {
    if (account.busy || busy) return;

    Alert.alert(
      'Đăng xuất?',
      'Bạn có thể đăng nhập lại bằng Google.',
      [
        {
          text: t('close'),
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            void accountActions.signOut();
          },
        },
      ],
    );
  }

  function row(
    icon: IconName,
    label: string,
    text: string,
    press: () => void,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={press}
        style={[
          st.row,
          {
            minHeight: dense ? 40 : 48,
            borderColor: c.line,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={c.green}
        />

        <Text
          numberOfLines={1}
          style={[st.label, { color: c.text }]}
        >
          {label}
        </Text>

        <Text
          numberOfLines={1}
          style={{
            color: c.muted,
            fontSize: 12,
            maxWidth: '42%',
          }}
        >
          {text}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={c.muted}
        />
      </Pressable>
    );
  }

  function option(
    label: string,
    selected: boolean,
    choose: () => Promise<unknown>,
  ) {
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        disabled={busy}
        onPress={() => {
          void act(choose).then(ok => {
            if (ok) setPanel(null);
          });
        }}
        style={[
          st.option,
          {
            backgroundColor:
              selected ? c.pale : c.input,
          },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: c.text,
            fontSize: 14,
          }}
        >
          {label}
        </Text>

        {selected && (
          <Ionicons
            name="checkmark-circle"
            size={21}
            color={c.green}
          />
        )}
      </Pressable>
    );
  }

  const card = {
    backgroundColor: c.card,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden' as const,
  };

  if (!snapshot.ready || !value) {
    return (
      <View
        style={[
          st.loading,
          { backgroundColor: c.background },
        ]}
      >
        {snapshot.error ? (
          <>
            <Text style={{ color: c.danger }}>
              {t(snapshot.error)}
            </Text>

            <Pressable
              onPress={() =>
                void settingsStore.load()
              }
            >
              <Text style={{ color: c.green }}>
                {t('retry')}
              </Text>
            </Pressable>
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
      <View
        onLayout={event =>
          setHeight(event.nativeEvent.layout.height)
        }
        style={[
          st.page,
          {
            gap: dense ? 6 : 10,
            paddingVertical: dense ? 8 : 12,
          },
        ]}
      >
        <View style={st.header}>
          <Text
            style={{
              flex: 1,
              color: c.text,
              fontSize: 20,
              fontWeight: '800',
            }}
          >
            {t('title')}
          </Text>

          <Text
            style={{
              color: c.green,
              fontSize: 11,
            }}
          >
            v{version}
          </Text>
        </View>

        <AccountProfileCard />

        <TripHistoryCard compact />

        <View style={card}>
          {row(
            'moon-outline',
            t('appearance'),
            t(value.theme),
            () => setPanel('theme'),
          )}

          {row(
            'language-outline',
            t('language'),
            LANGUAGE_LABELS[value.language],
            () => setPanel('language'),
          )}

          <View
            style={[
              st.row,
              {
                minHeight: dense ? 40 : 48,
                borderBottomWidth: 0,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={c.green}
            />

            <Text
              style={[
                st.label,
                { color: c.text },
              ]}
            >
              {t('reminder')}
            </Text>

            <Switch
              accessibilityLabel={t('reminder')}
              value={value.remindersEnabled}
              disabled={
                busy || Platform.OS === 'web'
              }
              trackColor={{
                false: c.line,
                true: c.green,
              }}
              thumbColor="#FFF"
              onValueChange={enabled => {
                void act(() =>
                  setDailyReminder(enabled),
                );
              }}
            />
          </View>
        </View>

        <View style={[card, st.support]}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              setMessage('');
              setPanel('inbox');
            }}
            style={st.supportButton}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={c.green}
            />

            <Text
              style={{
                color: c.text,
                fontSize: 12,
              }}
            >
              {t('inbox')}
              {unread ? ` (${unread})` : ''}
            </Text>
          </Pressable>

          <View
            style={{
              width: 1,
              height: 22,
              backgroundColor: c.line,
            }}
          />

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={st.supportButton}
            onPress={() =>
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
                    onPress: () => {
                      void act(() =>
                        Linking.openURL('tel:1022'),
                      );
                    },
                  },
                ],
              )
            }
          >
            <Ionicons
              name="call-outline"
              size={19}
              color={c.green}
            />

            <Text
              style={{
                color: c.text,
                fontSize: 12,
              }}
            >
              1022
            </Text>
          </Pressable>
        </View>

        {!!error && !panel && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setPanel('inbox')
            }
          >
            <Text
              numberOfLines={2}
              style={{
                color: c.danger,
                fontSize: 12,
              }}
            >
              {error}
            </Text>
          </Pressable>
        )}

        <View style={{ flex: 1 }} />

        {account.user && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất"
            disabled={account.busy || busy}
            onPress={logout}
            style={[
              st.logout,
              {
                borderColor: c.line,
                backgroundColor: c.card,
                opacity: account.busy ? 0.5 : 1,
              },
            ]}
          >
            {account.busy ? (
              <ActivityIndicator color={c.danger} />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={20}
                color={c.danger}
              />
            )}

            <Text
              style={{
                color: c.danger,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              Đăng xuất
            </Text>
          </Pressable>
        )}
      </View>

      {panel && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!busy) setPanel(null);
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: c.overlay,
            }}
          >
            <Pressable
              accessibilityLabel={t('close')}
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (!busy) setPanel(null);
              }}
            />

            <View
              accessibilityViewIsModal
              style={[
                st.sheet,
                {
                  backgroundColor: c.card,
                  paddingBottom: Math.max(
                    insets.bottom,
                    16,
                  ),
                },
              ]}
            >
              <View style={st.header}>
                <Text
                  style={{
                    flex: 1,
                    color: c.text,
                    fontSize: 18,
                    fontWeight: '700',
                  }}
                >
                  {t(
                    panel === 'theme'
                      ? 'appearance'
                      : panel,
                  )}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('close')}
                  disabled={busy}
                  onPress={() => setPanel(null)}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={c.muted}
                  />
                </Pressable>
              </View>

              {!!error && (
                <Text
                  accessibilityRole="alert"
                  style={{
                    color: c.danger,
                    fontSize: 12,
                  }}
                >
                  {error}
                </Text>
              )}

              {panel === 'theme' && (
                <View style={{ gap: 8 }}>
                  {(
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
                </View>
              )}

              {panel === 'language' && (
                <ScrollView
                  contentContainerStyle={{ gap: 8 }}
                >
                  {LANGUAGES.map(next =>
                    option(
                      LANGUAGE_LABELS[next],
                      value.language === next,
                      () =>
                        settingsStore.update(
                          settings => ({
                            ...settings,
                            language: next,
                          }),
                        ),
                    ),
                  )}
                </ScrollView>
              )}

              {panel === 'inbox' && (
                <>
                  {Platform.OS !== 'web' &&
                    native.ready &&
                    !native.granted && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          void act(() =>
                            Linking.openSettings(),
                          )
                        }
                      >
                        <Text
                          style={{
                            color: c.green,
                            fontSize: 12,
                          }}
                        >
                          {t('openSettings')}
                        </Text>
                      </Pressable>
                    )}

                  <FlatList
                    data={value.inbox}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{
                      gap: 8,
                      flexGrow: 1,
                    }}
                    style={{ flex: 1 }}
                    ListEmptyComponent={
                      <Text
                        style={{
                          color: c.muted,
                          paddingVertical: 24,
                        }}
                      >
                        {t('emptyInbox')}
                      </Text>
                    }
                    renderItem={({ item }) => (
                      <Pressable
                        disabled={busy}
                        style={[
                          st.option,
                          {
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            backgroundColor:
                              item.readAt
                                ? c.input
                                : c.pale,
                          },
                        ]}
                        onPress={() =>
                          void act(() =>
                            settingsStore.update(
                              settings => ({
                                ...settings,
                                inbox:
                                  settings.inbox.map(
                                    notice =>
                                      notice.id === item.id
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
                      >
                        <Text
                          style={{
                            color: c.text,
                            fontSize: 14,
                            fontWeight: '700',
                          }}
                        >
                          {item.title}
                        </Text>

                        <Text
                          style={{
                            color: c.text,
                            fontSize: 13,
                            lineHeight: 19,
                          }}
                        >
                          {item.body}
                        </Text>

                        <Text
                          style={{
                            color: c.muted,
                            fontSize: 11,
                          }}
                        >
                          {new Date(
                            item.createdAt,
                          ).toLocaleString(
                            language,
                            {
                              timeZone:
                                'Asia/Ho_Chi_Minh',
                            },
                          )}
                        </Text>
                      </Pressable>
                    )}
                  />

                  <View style={st.support}>
                    <Pressable
                      disabled={busy || !unread}
                      style={st.supportButton}
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
                    >
                      <Text
                        style={{
                          color: c.green,
                          fontSize: 12,
                        }}
                      >
                        {t('readAll')}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        busy ||
                        Platform.OS === 'web'
                      }
                      style={st.supportButton}
                      onPress={() =>
                        void act(
                          sendTestNotification,
                          t('testSent'),
                        )
                      }
                    >
                      <Text
                        style={{
                          color: c.green,
                          fontSize: 12,
                        }}
                      >
                        {t('test')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {busy && (
                <ActivityIndicator color={c.green} />
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  page: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  logout: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 14,
  },
  sheet: {
    height: '78%',
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
});