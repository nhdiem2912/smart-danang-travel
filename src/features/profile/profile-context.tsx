import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import {
    loadProfile,
    saveProfile,
} from './profile-api';

import {
    isTravelerProfile,
    profileInputError,
    type ProfileInput,
    type TravelerProfile,
} from './profile-model';

type State = {
  ready: boolean;
  profile: TravelerProfile | null;
  error: string | null;
  offline: boolean;
};

type Value = State & {
  uid: string;
  retry: () => void;
  save: (input: ProfileInput) => Promise<void>;
};

const Context = createContext<Value | null>(
  null,
);

export function TravelerProfileProvider({
  uid,
  children,
}: {
  uid: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>({
    ready: false,
    profile: null,
    error: null,
    offline: false,
  });

  const [attempt, setAttempt] = useState(0);

  const alive = useRef(false);
  const saving = useRef(false);

  const saveRequest =
    useRef<AbortController | null>(null);

  const cacheKey =
    `@smart-danang-travel/profile:v1:${uid}`;

  useEffect(() => {
    alive.current = true;

    const controller = new AbortController();

    void (async () => {
      let cached: TravelerProfile | null = null;

      try {
        const raw =
          await AsyncStorage.getItem(cacheKey);

        const parsed: unknown =
          raw ? JSON.parse(raw) : null;

        if (isTravelerProfile(parsed)) {
          cached = parsed;
        }
      } catch {
        // Cache lỗi không ghi đè hồ sơ cloud.
      }

      try {
        const profile = await loadProfile(
          uid,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setState({
          ready: true,
          profile,
          error: null,
          offline: false,
        });

        try {
          if (profile) {
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify(profile),
            );
          } else {
            await AsyncStorage.removeItem(
              cacheKey,
            );
          }
        } catch {
          // Hồ sơ cloud đã tải thành công.
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          ready: true,
          profile: cached,
          offline: !!cached,
          error: cached
            ? null
            : error instanceof Error
              ? error.message
              : 'Không tải được hồ sơ.',
        });
      }
    })();

    return () => {
      alive.current = false;
      controller.abort();
      saveRequest.current?.abort();
    };
  }, [uid, cacheKey, attempt]);

  const save = useCallback(
    async (input: ProfileInput) => {
      if (saving.current) {
        throw new Error('Đang lưu hồ sơ.');
      }

      const error = profileInputError(input);

      if (error) {
        throw new Error(error);
      }

      saving.current = true;

      const controller =
        new AbortController();

      saveRequest.current = controller;

      try {
        const profile = await saveProfile(
          uid,
          {
            ...input,
            displayName:
              input.displayName.trim(),
            interests: [...input.interests],
            version: 1,
            onboardingComplete: true,
            updatedAt:
              new Date().toISOString(),
          },
          controller.signal,
        );

        if (
          !alive.current ||
          controller.signal.aborted
        ) {
          throw new Error(
            'Phiên đăng nhập đã thay đổi.',
          );
        }

        setState({
          ready: true,
          profile,
          error: null,
          offline: false,
        });

        try {
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify(profile),
          );
        } catch {
          // Đã lưu cloud; cache có thể thử lại sau.
        }
      } finally {
        saving.current = false;
        saveRequest.current = null;
      }
    },
    [uid, cacheKey],
  );

  return (
    <Context.Provider
      value={{
        ...state,
        uid,
        save,
        retry: () => {
          setState(previous => ({
            ...previous,
            ready: false,
            error: null,
          }));

          setAttempt(n => n + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useTravelerProfile() {
  const value = useContext(Context);

  if (!value) {
    throw new Error(
      'Thiếu TravelerProfileProvider.',
    );
  }

  return value;
}