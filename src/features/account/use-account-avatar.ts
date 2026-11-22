import * as FileSystem from 'expo-file-system/legacy';

import {
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    avatarSnapshot,
    loadAccountAvatar,
    subscribeAvatar,
} from './account-avatar-store';

export function useAccountAvatar(
  uid: string | null,
) {
  const state = useSyncExternalStore(
    subscribeAvatar,
    () => avatarSnapshot(uid),
    () => avatarSnapshot(null),
  );

  useEffect(() => {
    if (uid) {
      void loadAccountAvatar(uid);
    }
  }, [uid]);

  return state;
}

export function useHomeAvatar(
  uid: string | null,
  googlePhoto: string | null,
) {
  const avatar = useAccountAvatar(uid);
  const source = avatar.uri || googlePhoto;

  const [image, setImage] = useState<{
    source: string;
    uri: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    if (source?.startsWith('file://')) {
      void FileSystem.readAsStringAsync(
        source,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        },
      )
        .then(base64 => {
          const mime = /\.png$/i.test(source)
            ? 'image/png'
            : /\.webp$/i.test(source)
              ? 'image/webp'
              : 'image/jpeg';

          if (active) {
            setImage({
              source,
              uri:
                `data:${mime};base64,${base64}`,
            });
          }
        })
        .catch(() => {
          if (active) setImage(null);
        });
    }

    return () => {
      active = false;
    };
  }, [source]);

  if (!uid) return null;

  if (!source?.startsWith('file://')) {
    return source ?? null;
  }

  return image?.source === source
    ? image.uri
    : googlePhoto;
}