import {
    getAccountToken,
} from '@/features/account/account-store';

import {
    decodeProfile,
    encodeProfile,
    type TravelerProfile,
} from './profile-model';

const BASE =
  'https://firestore.googleapis.com/v1/projects/' +
  'smart-da-nang-travel-5f0b7/' +
  'databases/(default)/documents/users/';

async function request(
  uid: string,
  method: 'GET' | 'PATCH',
  signal: AbortSignal,
  profile?: TravelerProfile,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();

  signal.addEventListener('abort', abort);

  if (signal.aborted) {
    controller.abort();
  }

  const timer = setTimeout(abort, 15000);

  try {
    const token = await getAccountToken(uid);

    const response = await fetch(
      BASE + encodeURIComponent(uid),
      {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(profile
          ? {
              body: JSON.stringify({
                fields: encodeProfile(profile),
              }),
            }
          : {}),
      },
    );

    if (
      method === 'GET' &&
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          'Chưa được phép truy cập hồ sơ. ' +
          'Kiểm tra Firestore Rules đã Publish.',
        );
      }

      if (response.status === 401) {
        throw new Error(
          'Phiên đăng nhập hết hiệu lực. ' +
          'Hãy đăng nhập lại.',
        );
      }

      throw new Error(
        `Không truy cập được hồ sơ ` +
        `(HTTP ${response.status}). Hãy thử lại.`,
      );
    }

    return decodeProfile(
      await response.json(),
    );
  } catch (e) {
    if (controller.signal.aborted) {
      throw new Error(
        'Đã hết thời gian chờ hoặc hủy kết nối. ' +
        'Hãy thử lại.',
      );
    }

    throw e;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function loadProfile(
  uid: string,
  signal: AbortSignal,
) {
  return request(uid, 'GET', signal);
}

export async function saveProfile(
  uid: string,
  profile: TravelerProfile,
  signal: AbortSignal,
) {
  const result = await request(
    uid,
    'PATCH',
    signal,
    profile,
  );

  if (!result) {
    throw new Error(
      'Máy chủ chưa xác nhận lưu hồ sơ.',
    );
  }

  return result;
}