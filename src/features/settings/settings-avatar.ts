import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import {
    SettingsError,
    settingsStore,
    type Avatar,
} from './settings-store';

export function getAvatarUri(
  avatar: Avatar,
): string | null {
  if (!avatar) return null;

  if (avatar.kind === 'data') {
    return avatar.uri;
  }

  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}profile-avatars/${avatar.name}`
    : null;
}

export async function chooseAvatar() {
  if (Platform.OS !== 'web') {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new SettingsError('photoError');
    }
  }

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
    !result.assets[0]
  ) {
    return;
  }

  const asset = result.assets[0];
  let avatar: Avatar;

  if (Platform.OS === 'web') {
    if (!asset.base64) {
      throw new SettingsError('photoError');
    }

    const uri =
      `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;

    if (uri.length > 1000000) {
      throw new SettingsError('photoError');
    }

    avatar = {
      kind: 'data',
      uri,
    };
  } else {
    if (!FileSystem.documentDirectory) {
      throw new SettingsError('photoError');
    }

    const folder =
      `${FileSystem.documentDirectory}profile-avatars/`;

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

    const name =
      `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    await FileSystem.copyAsync({
      from: asset.uri,
      to: folder + name,
    });

    avatar = {
      kind: 'file',
      name,
    };
  }

  await settingsStore.update(settings => ({
    ...settings,
    profile: {
      ...settings.profile,
      avatar,
    },
  }));
}