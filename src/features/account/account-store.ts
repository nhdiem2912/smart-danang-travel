import type { AccountSnapshot } from './account-types';

const state: AccountSnapshot = {
  ready: true,
  busy: false,
  user: null,
  error:
    'Đăng nhập Google trong bản này dành cho ' +
    'ứng dụng Android development build.',
};

export function useAccount(): AccountSnapshot {
  return state;
}

export const accountActions = {
  async signInGoogle() {
    // Native Google sign-in không được bật trên web.
  },

  async signOut() {
    // Chưa có phiên đăng nhập web.
  },
};
export async function getAccountToken(
  _uid: string,
): Promise<string> {
  throw new Error(
    'Bản này chỉ hỗ trợ xác thực Firebase trên Android.',
  );
}