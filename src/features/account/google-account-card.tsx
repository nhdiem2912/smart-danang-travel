import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  useSettingsColors,
} from '@/features/settings/settings-colors';

import {
  accountActions,
  useAccount,
} from './account-store';

export function GoogleAccountCard() {
  const c = useSettingsColors();
  const account = useAccount();

  const [brokenPhoto, setBrokenPhoto] =
    useState<string | null>(null);

  const user = account.user;

  const disabled =
    !account.ready ||
    account.busy ||
    Platform.OS !== 'android';

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: c.card,
        padding: 16,
        gap: 12,
      }}
    >
      <Text
        style={{
          fontWeight: '800',
          fontSize: 15,
          color: c.text,
        }}
      >
        Tài khoản Google
      </Text>

      {!account.ready ? (
        <ActivityIndicator
          color={c.green}
          accessibilityLabel="Đang kiểm tra phiên đăng nhập"
        />
      ) : user ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {user.photoURL &&
            brokenPhoto !== user.photoURL ? (
              <Image
                source={{
                  uri: user.photoURL,
                }}
                onError={() =>
                  setBrokenPhoto(user.photoURL)
                }
                accessibilityLabel="Ảnh tài khoản Google"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                }}
              />
            ) : (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.pale,
                }}
              >
                <Text
                  style={{
                    color: c.green,
                    fontSize: 20,
                    fontWeight: '800',
                  }}
                >
                  {(user.name || user.email || 'G')
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <View
              style={{
                flex: 1,
                gap: 3,
              }}
            >
              <Text
                style={{
                  color: c.text,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {user.name || 'Tài khoản Google'}
              </Text>

              {!!user.email && (
                <Text
                  selectable
                  style={{
                    color: c.muted,
                    fontSize: 12,
                  }}
                >
                  {user.email}
                </Text>
              )}

              <Text
                style={{
                  color: c.green,
                  fontSize: 11,
                }}
              >
                Đã xác thực bằng Firebase
              </Text>
            </View>
          </View>

          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{
              disabled,
            }}
            onPress={() =>
              Alert.alert(
                'Đăng xuất tài khoản?',
                'Bạn sẽ cần đăng nhập Google để sử dụng lại tài khoản.',
                [
                  {
                    text: 'Hủy',
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
              )
            }
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 8,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: c.danger,
                fontWeight: '700',
              }}
            >
              Đăng xuất
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text
            style={{
              color: c.muted,
              fontSize: 12,
              lineHeight: 19,
            }}
          >
            Đăng nhập bằng tài khoản Google của bạn.
            Lần đăng nhập đầu sẽ tạo tài khoản
            Smart Da Nang Travel.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tiếp tục với Google"
            accessibilityState={{
              disabled,
            }}
            disabled={disabled}
            onPress={() => {
              void accountActions.signInGoogle();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.input,
              padding: 13,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: c.text,
                fontWeight: '700',
              }}
            >
              Tiếp tục với Google
            </Text>
          </Pressable>
        </>
      )}

      {account.busy && (
        <ActivityIndicator
          color={c.green}
          accessibilityLabel="Đang xử lý tài khoản"
        />
      )}

      {!!account.error && (
        <Text
          accessibilityRole="alert"
          style={{
            color: c.danger,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {account.error}
        </Text>
      )}

      <Text
        style={{
          color: c.muted,
          fontSize: 11,
          lineHeight: 17,
        }}
      >
       Hồ sơ khảo sát được lưu theo tài khoản Google. Dữ liệu lộ trình hiện vẫn lưu trên thiết bị.
      </Text>
    </View>
  );
}