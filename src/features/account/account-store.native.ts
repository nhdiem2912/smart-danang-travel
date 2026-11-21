import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';

import {
  useEffect,
  useSyncExternalStore,
} from 'react';

import { Platform } from 'react-native';

import {
  GOOGLE_WEB_CLIENT_ID,
} from './google-config';

import {
  accountError,
  INITIAL_ACCOUNT,
  type AccountSnapshot,
} from './account-types';

let snapshot: AccountSnapshot = INITIAL_ACCOUNT;

const listeners = new Set<() => void>();

let unsubscribe: (() => void) | null = null;
let consumers = 0;
let configured = false;

function emit(change: Partial<AccountSnapshot>) {
  snapshot = {
    ...snapshot,
    ...change,
  };

  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function start() {
  if (unsubscribe) return;

  if (Platform.OS !== 'android') {
    emit({
      ready: true,
      error:
        'Đăng nhập Google đang được cấu hình cho Android. ' +
        'iOS cần cấu hình Firebase riêng.',
    });

    return;
  }

  try {
    if (!configured) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });

      configured = true;
    }

    unsubscribe = onAuthStateChanged(
      getAuth(),
      user => {
        emit({
          ready: true,
          error: null,
          user: user
            ? {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
              }
            : null,
        });
      },
    );
  } catch {
    emit({
      ready: true,
      error:
        'Chưa tải được Firebase native. Cần prebuild ' +
        'và build lại development app sau khi cài thư viện.',
    });
  }
}

export function useAccount() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => INITIAL_ACCOUNT,
  );

  useEffect(() => {
    consumers += 1;
    start();

    return () => {
      consumers -= 1;

      if (!consumers) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };
  }, []);

  return state;
}

export const accountActions = {
  async signInGoogle() {
    if (snapshot.busy) return;

    if (Platform.OS !== 'android') {
      throw new Error(
        'Bản này đang hỗ trợ đăng nhập Google trên Android.',
      );
    }

    emit({
      busy: true,
      error: null,
    });

    let credentialAccepted = false;

    try {
      start();

      if (!configured || !unsubscribe) return;

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') return;

      const token = response.data.idToken;

      if (!token) {
        throw new Error(
          'Không nhận được Google ID token.',
        );
      }

      const credential =
        GoogleAuthProvider.credential(token);

      await signInWithCredential(
        getAuth(),
        credential,
      );

      credentialAccepted = true;
    } catch (error) {
      if (!credentialAccepted) {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Dọn phiên Google nếu có thể.
        }
      }

      const message = accountError(error);

      if (message) {
        emit({
          error: message,
        });
      }
    } finally {
      emit({
        busy: false,
      });
    }
  },

  async signOut() {
    if (snapshot.busy) return;

    emit({
      busy: true,
      error: null,
    });

    try {
      await signOut(getAuth());

      try {
        await GoogleSignin.signOut();
      } catch {
        // Firebase đã đăng xuất thành công.
      }
    } catch (error) {
      emit({
        error: accountError(error),
      });
    } finally {
      emit({
        busy: false,
      });
    }
  },
  
};
export async function getAccountToken(
  uid: string,
): Promise<string> {
  const user = getAuth().currentUser;

  if (!user || user.uid !== uid) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  const token = await user.getIdToken();

  if (getAuth().currentUser?.uid !== uid) {
    throw new Error('Phiên đăng nhập đã thay đổi.');
  }

  return token;
}