export type AccountUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
};

export type AccountSnapshot = {
  ready: boolean;
  busy: boolean;
  user: AccountUser | null;
  error: string | null;
};

export const INITIAL_ACCOUNT: AccountSnapshot = {
  ready: false,
  busy: false,
  user: null,
  error: null,
};

export function accountError(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  if (['SIGN_IN_CANCELLED', '12501'].includes(code)) {
    return '';
  }

  if (code === 'IN_PROGRESS') {
    return 'Đang xử lý đăng nhập. Hãy chờ một chút.';
  }

  if (code === 'PLAY_SERVICES_NOT_AVAILABLE') {
    return 'Cần Google Play Services để đăng nhập trên Android.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Không kết nối được. Kiểm tra Internet rồi thử lại.';
  }

  if (code === 'auth/user-disabled') {
    return 'Tài khoản đã bị vô hiệu hóa.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Chưa bật đăng nhập Google trong Firebase Authentication.';
  }

  if (
    code === 'auth/account-exists-with-different-credential'
  ) {
    return 'Tài khoản đã dùng phương thức đăng nhập khác.';
  }

  if (code === '10' || code === 'DEVELOPER_ERROR') {
    return (
      'Cấu hình Google chưa khớp. Kiểm tra package, ' +
      'SHA-1 và Web client ID, sau đó build lại app.'
    );
  }

  return (
    'Không hoàn tất được thao tác tài khoản. ' +
    'Kiểm tra cấu hình Firebase và thử lại.'
  );
}