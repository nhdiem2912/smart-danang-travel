import Ionicons from '@expo/vector-icons/Ionicons';
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

import { saveAccountAvatar } from './account-avatar-store';
import { useAccount } from './account-store';
import { useAccountAvatar } from './use-account-avatar';

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
  const avatar = useAccountAvatar(uid);

  const [broken, setBroken] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const alive = useRef(false);
  const lock = useRef(false);

  const uri =
    avatar.uri || account.user?.photoURL;

  const name =
    profile?.displayName ||
    account.user?.name ||
    'Du khách';

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  async function changePhoto() {
    if (
      !avatar.ready ||
      lock.current ||
      account.busy
    ) {
      return;
    }

    lock.current = true;
    setBusy(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
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
          `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

        if (next.length > 1000000) {
          throw new Error(
            'Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.',
          );
        }
      } else {
        if (!FileSystem.documentDirectory) {
          throw new Error(
            'Không mở được thư mục ảnh.',
          );
        }

        const folder =
          `${FileSystem.documentDirectory}account-avatars/`;

        await FileSystem.makeDirectoryAsync(
          folder,
          { intermediates: true },
        );

        const extension =
          asset.mimeType === 'image/png'
            ? 'png'
            : asset.mimeType === 'image/webp'
              ? 'webp'
              : 'jpg';

        next =
          `${folder}avatar-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

        await FileSystem.copyAsync({
          from: asset.uri,
          to: next,
        });
      }

      if (!alive.current) return;

      await saveAccountAvatar(uid, next);

      if (alive.current) {
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
        padding: 8,
        gap: 4,
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
          disabled={
            !avatar.ready ||
            busy ||
            account.busy
          }
          onPress={() => {
            void changePhoto();
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
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
                  width: 48,
                  height: 48,
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
            numberOfLines={1}
            style={{
              color: c.text,
              fontSize: 16,
              fontWeight: '800',
            }}
          >
            {name}
          </Text>

          <Text
            numberOfLines={1}
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
            {busy
              ? 'Đang lưu ảnh…'
              : 'Đã kết nối Google'}
          </Text>
        </View>
      </View>

      <TravelerProfileSettings />

      {!!account.error && (
        <Text style={{ color: c.danger }}>
          {account.error}
        </Text>
      )}
    </View>
  );
}