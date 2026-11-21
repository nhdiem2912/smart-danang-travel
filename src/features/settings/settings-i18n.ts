import { LANGUAGES, type Language } from './settings-store';

const messages = {
  title: ['Cài đặt hệ thống', 'Settings', '설정', '設定', '设置'],
  subtitle: ['Tùy chỉnh trải nghiệm của bạn', 'Personalize your experience', '앱 환경을 설정하세요', '使いやすくカスタマイズ', '自定义使用体验'],
  guest: ['Khách vãng lai', 'Guest', '게스트', 'ゲスト', '访客'],
  localProfile: ['Hồ sơ trên thiết bị', 'Profile on this device', '기기에 저장된 프로필', 'この端末のプロフィール', '本机个人资料'],
  avatar: ['Đổi ảnh đại diện', 'Change profile photo', '프로필 사진 변경', 'プロフィール写真を変更', '更换头像'],
  edit: ['Chỉnh sửa', 'Edit', '수정', '編集', '编辑'],
  name: ['Tên hiển thị', 'Display name', '표시 이름', '表示名', '显示名称'],
  save: ['Lưu thay đổi', 'Save changes', '저장', '保存', '保存修改'],
  close: ['Đóng', 'Close', '닫기', '閉じる', '关闭'],
  appearanceGroup: ['Hiển thị & ngôn ngữ', 'Display & language', '화면 및 언어', '表示と言語', '显示与语言'],
  appearance: ['Giao diện', 'Appearance', '화면 모드', '外観', '外观'],
  appearanceScope: ['Áp dụng cho Cài đặt, thanh tab và thành phần hỗ trợ theme', 'Applies to Settings, tabs and theme-aware components', '설정, 탭 및 테마 지원 화면에 적용', '設定・タブ・テーマ対応部品に適用', '应用于设置、标签栏及支持主题的组件'],
  system: ['Theo hệ thống', 'System default', '시스템 설정', 'システム設定', '跟随系统'],
  light: ['Sáng', 'Light', '라이트', 'ライト', '浅色'],
  dark: ['Tối', 'Dark', '다크', 'ダーク', '深色'],
  language: ['Ngôn ngữ', 'Language', '언어', '言語', '语言'],
  languageScope: ['Áp dụng cho Cài đặt và thanh điều hướng', 'Applies to Settings and navigation', '설정과 탐색 메뉴에 적용', '設定とナビゲーションに適用', '应用于设置和导航栏'],
  currency: ['Đơn vị tiền tệ', 'Preferred currency', '선호 통화', '表示通貨', '首选货币'],
  currencyScope: ['Lưu lựa chọn cho phần chi phí sau này', 'Saved for future cost features', '향후 비용 기능에 사용', '今後の費用機能に使用', '保存供后续费用功能使用'],
  reminder: ['Nhắc lịch du lịch', 'Travel reminder', '여행 알림', '旅行リマインダー', '旅行提醒'],
  reminderHint: ['Nhắc lập kế hoạch mỗi ngày lúc 08:00', 'Daily planning reminder at 08:00', '매일 오전 8시 여행 계획 알림', '毎日8時に旅行計画をお知らせ', '每天08:00提醒安排旅行'],
  blocked: ['Thông báo đang bị hệ thống chặn', 'Notifications are blocked by the system', '시스템에서 알림이 차단되었습니다', 'システムが通知をブロックしています', '通知已被系统阻止'],
  openSettings: ['Mở cài đặt hệ thống', 'Open system settings', '시스템 설정 열기', 'システム設定を開く', '打开系统设置'],
  support: ['Hỗ trợ du khách', 'Visitor support', '여행자 지원', '旅行者サポート', '游客帮助'],
  inbox: ['Hòm thư thông báo', 'Notifications', '알림함', '通知一覧', '通知收件箱'],
  emptyInbox: ['Chưa có thông báo', 'No notifications yet', '알림이 없습니다', '通知はまだありません', '暂无通知'],
  readAll: ['Đánh dấu tất cả đã đọc', 'Mark all as read', '모두 읽음으로 표시', 'すべて既読にする', '全部标为已读'],
  test: ['Thử thông báo sau 5 giây', 'Test notification in 5 seconds', '5초 후 테스트 알림', '5秒後にテスト通知', '5秒后测试通知'],
  testSent: ['Đã đặt thông báo thử sau 5 giây', 'Test notification scheduled', '테스트 알림을 예약했습니다', 'テスト通知を予約しました', '已安排测试通知'],
  hotline: ['Đường dây nóng du lịch', 'Tourism hotline', '관광 안내 전화', '観光ホットライン', '旅游热线'],
  call: ['Mở trình quay số', 'Open dialer', '전화 앱 열기', '電話アプリを開く', '打开拨号界面'],
  localOnly: ['Hồ sơ và hòm thư lưu trên máy. Chưa có đăng nhập hoặc đồng bộ tài khoản.', 'Profile and inbox are stored locally. Account sign-in and sync are not available yet.', '프로필과 알림은 기기에 저장됩니다. 로그인 및 계정 동기화는 아직 지원하지 않습니다.', 'プロフィールと通知は端末に保存されます。ログインと同期は未対応です。', '个人资料和通知保存在本机，暂不支持登录和账户同步。'],
  retry: ['Thử lại', 'Retry', '다시 시도', '再試行', '重试'],
  saving: ['Đang lưu…', 'Saving…', '저장 중…', '保存中…', '正在保存…'],
  loadError: ['Không đọc được cài đặt. Dữ liệu cũ được giữ nguyên; hãy thử lại.', 'Could not load settings. Existing data is preserved; please retry.', '설정을 읽을 수 없습니다. 기존 데이터는 유지됩니다.', '設定を読み込めません。既存データは保持されています。', '无法读取设置，原有数据已保留，请重试。'],
  saveError: ['Không lưu được thay đổi. Dữ liệu cũ được giữ nguyên.', 'Could not save changes. Existing data is preserved.', '저장하지 못했습니다. 기존 데이터는 유지됩니다.', '変更を保存できません。既存データは保持されています。', '保存失败，原有数据已保留。'],
  permissionError: ['Chưa được cấp quyền thông báo. Bạn có thể mở cài đặt hệ thống để cho phép.', 'Notification permission is not granted. You can enable it in system settings.', '알림 권한이 없습니다. 시스템 설정에서 허용해 주세요.', '通知が許可されていません。システム設定で許可できます。', '尚未获得通知权限，可在系统设置中开启。'],
  photoError: ['Không chọn được ảnh. Kiểm tra quyền thư viện ảnh hoặc chọn ảnh nhỏ hơn.', 'Could not select the photo. Check photo permissions or choose a smaller image.', '사진을 선택할 수 없습니다. 권한을 확인하거나 작은 사진을 선택해 주세요.', '写真を選択できません。権限を確認するか小さい画像を選んでください。', '无法选择照片，请检查相册权限或选择较小的图片。'],
  nativeError: ['Chưa thực hiện được thao tác. Hãy thử lại.', 'Could not complete the action. Please retry.', '작업을 완료하지 못했습니다. 다시 시도해 주세요.', '操作を完了できませんでした。再試行してください。', '操作未完成，请重试。'],
  unsupported: ['Tính năng này có trên ứng dụng Android/iOS', 'Available in the Android/iOS app', 'Android/iOS 앱에서 사용할 수 있습니다', 'Android/iOSアプリで利用できます', '此功能适用于Android/iOS应用'],
  reminderTitle: ['Lên kế hoạch khám phá Đà Nẵng', 'Plan your Da Nang adventure', '다낭 여행을 계획해 보세요', 'ダナン旅行の計画を立てましょう', '安排你的岘港之旅'],
  reminderBody: ['Mở ứng dụng để xem và sắp xếp lịch trình của bạn.', 'Open the app to review and organize your itinerary.', '앱에서 여행 일정을 확인하고 정리해 보세요.', 'アプリで旅程を確認・整理しましょう。', '打开应用查看和安排你的行程。'],
  testTitle: ['Thông báo thử', 'Test notification', '테스트 알림', 'テスト通知', '测试通知'],
  testBody: ['Nhắc lịch trên thiết bị đang hoạt động.', 'Local notifications are working.', '기기 알림이 작동합니다.', '端末の通知が動作しています。', '本机通知功能正常。'],
  home: ['Trang chủ', 'Home', '홈', 'ホーム', '首页'],
  explore: ['Khám phá', 'Explore', '탐색', '探索', '探索'],
  assistant: ['Trợ lý AI', 'AI assistant', 'AI 도우미', 'AIアシスタント', 'AI助手'],
  itinerary: ['Lộ trình', 'Itinerary', '일정', '旅程', '行程'],
  settings: ['Cài đặt', 'Settings', '설정', '設定', '设置'],
} as const;

export type MessageKey = keyof typeof messages;

export function translate(
  language: Language,
  key: MessageKey,
): string {
  return (
    messages[key][LANGUAGES.indexOf(language)] ??
    messages[key][0]
  );
}