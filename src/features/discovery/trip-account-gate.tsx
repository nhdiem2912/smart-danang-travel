import {
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import {
    ActivityIndicator,
    Text,
    View,
} from 'react-native';

import {
    activateTripAccount,
} from './trip-account-store';

import {
    recoverArchivedTrip,
} from './trip-lifecycle';

export function TripAccountGate({
  uid,
  children,
}: {
  uid: string;
  children: ReactNode;
}) {
  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    let alive = true;

    void activateTripAccount(uid).then(
      async () => {
        try {
          await recoverArchivedTrip();
        } catch {
          // Mất mạng: giữ chuyến trên máy để thử lại.
        }

        if (alive) {
          setReady(true);
        }
      },
    );

    return () => {
      alive = false;
      void activateTripAccount(null);
    };
  }, [uid]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ActivityIndicator />

        <Text>
          Đang mở chuyến đi của tài khoản…
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}