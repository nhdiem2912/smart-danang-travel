import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    Pressable,
    Text,
    View,
} from 'react-native';

import { TravelerProfileSettings } from '@/features/profile/onboarding';
import { useTravelerProfile } from '@/features/profile/profile-context';
import { useSettingsColors } from '@/features/settings/settings-colors';
import { accountActions, useAccount } from './account-store';

export function AccountProfileCard() {
  const { user } = useAccount();

  return user
    ? <ProfileCard key={user.uid} uid={user.uid} />
    : null;
}

function ProfileCard({ uid }: { uid: string }) {
  const c = useSettingsColors();
  const account = useAccount();
  const { profile } = useTravelerProfile();

  const [photo, setPhoto] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const alive = useRef(false);
  const lock = useRef(false);

  const storageKey = `@smart-danang-travel/avatar:v1:${uid}`;

  const uri = photo || account.user?.photoURL;

  const name =
    profile?.displayName ||
    account.user?.name ||
    'Du khách';

  useEffect(() => {
    alive.current = true;
    let cancelled = false;

    void AsyncStorage.getItem(storageKey)
      .then(value => {
        if (!cancelled) {
          setPhoto(value);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          Alert.alert(
            'Chưa tải được ảnh',
            'Hãy mở lại Cài đặt để thử lại.',
          );
        }
      });

    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [storageKey]);

  async function changePhoto() {
    if (!ready || lock.current || account.busy) return;

    lock.current = true;
    setBusy(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
        quality: 0.65,
        base64: Platform.OS === 'web',
      });

      if (
        result.canceled ||
        !result.assets[0] ||
        !alive.current
      ) {
        return;
      }

      const asset = result.assets[0];
      let next: string;

      if (Platform.OS === 'web') {
        if (!asset.base64) {
          throw new Error('Không đọc được ảnh.');
        }

        next =
          `data:${asset.mimeType || 'image/jpeg'};base64,` +
          asset.base64;

        if (next.length > 1000000) {
          throw new Error(
            'Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.',
          );
        }
      } else {
        if (!FileSystem.documentDirectory) {
          throw new Error('Không mở được thư mục ảnh.');
        }

        const folder =
          `${FileSystem.documentDirectory}account-avatars/`;

        await FileSystem.makeDirectoryAsync(folder, {
          intermediates: true,
        });

        const extension =
          asset.mimeType === 'image/png'
            ? 'png'
            : asset.mimeType === 'image/webp'
              ? 'webp'
              : 'jpg';

        next =
          `${folder}avatar-${Date.now()}-` +
          `${Math.random().toString(36).slice(2)}.${extension}`;

        await FileSystem.copyAsync({
          from: asset.uri,
          to: next,
        });
      }

      if (!alive.current) return;

      await AsyncStorage.setItem(storageKey, next);

      if (alive.current) {
        setPhoto(next);
        setBroken(null);
      }
    } catch (error) {
      if (alive.current) {
        Alert.alert(
          'Chưa đổi được ảnh',
          error instanceof Error
            ? error.message
            : 'Hãy thử lại.',
        );
      }
    } finally {
      lock.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  return (
    <View
      style={{
        padding: 16,
        gap: 14,
        borderRadius: 20,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi ảnh đại diện"
          disabled={!ready || busy || account.busy}
          onPress={() => {
            void changePhoto();
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: c.pale,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {uri && broken !== uri ? (
              <Image
                source={{ uri }}
                onError={() => setBroken(uri)}
                style={{
                  width: 64,
                  height: 64,
                }}
              />
            ) : (
              <Text
                style={{
                  fontSize: 25,
                  fontWeight: '800',
                  color: c.green,
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>

          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              borderRadius: 13,
              padding: 5,
              backgroundColor: c.green,
              borderWidth: 2,
              borderColor: c.card,
            }}
          >
            <Ionicons
              name="camera"
              size={12}
              color="#FFF"
            />
          </View>
        </Pressable>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: c.text,
              fontSize: 18,
              fontWeight: '800',
            }}
          >
            {name}
          </Text>

          <Text
            selectable
            style={{
              color: c.muted,
              fontSize: 12,
            }}
          >
            {account.user?.email}
          </Text>

          <Text
            style={{
              color: c.green,
              fontSize: 11,
            }}
          >
            {busy ? 'Đang lưu ảnh…' : 'Đã kết nối Google'}
          </Text>
        </View>
      </View>

      <TravelerProfileSettings />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: c.muted,
            fontSize: 10,
            lineHeight: 15,
          }}
        >
          Ảnh tự chọn lưu trên thiết bị này.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy || account.busy}
          style={{ padding: 8 }}
          onPress={() => {
            Alert.alert(
              'Đăng xuất?',
              'Bạn có thể đăng nhập lại bằng Google.',
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
            );
          }}
        >
          <Text
            style={{
              color: c.danger,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            Đăng xuất
          </Text>
        </Pressable>
      </View>

      {!!account.error && (
        <Text style={{ color: c.danger }}>
          {account.error}
        </Text>
      )}
    </View>
  );
}