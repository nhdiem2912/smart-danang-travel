import {
    useSettingsColors,
} from '@/features/settings/settings-colors';
import { useMemo, type ReactNode } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const C = {
  green: '#3E8E4F',
  deep: '#087F61',
  pale: '#ECFDF5',
  ink: '#253347',
  muted: '#7A899E',
  line: '#E1E9F1',
  bg: '#F6F9FC',
};

export function Action({
  label,
  onPress,
  solid = false,
  disabled = false,
  danger = false,
  style,
}: {
  label: string;
  onPress: () => void;
  solid?: boolean;
  disabled?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) { 
     const { C, s } = useDiscoveryUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
               solid && { backgroundColor: C.deep, borderColor: C.deep },
        danger && { backgroundColor: C.dangerBg, borderColor: C.danger },
        (pressed || disabled) && { opacity: 0.55 },
        style,
      ]}
    >
      <Text
        style={[
          s.buttonText,
          solid && { color: C.onAccent },
          danger && { color: C.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Sheet({
  title,
  subtitle,
  visible,
  close,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
  close: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { C, s } = useDiscoveryUI();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.backdrop}
      >
        <Pressable
          accessibilityLabel="Đóng bảng"
          style={StyleSheet.absoluteFill}
          onPress={close}
        />

        <View
          accessibilityViewIsModal
          style={[
            s.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={s.sheetHeader}>
            <View style={s.titleIcon}>
              <Text style={{ color: C.deep, fontSize: 24 }}>＋</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.title}>{title}</Text>
              {!!subtitle && (
                <Text style={s.muted}>{subtitle}</Text>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={close}
              hitSlop={8}
              style={s.close}
            >
              <Text style={{ fontSize: 19, color: C.muted }}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.sheetBody}
          >
            {children}
          </ScrollView>

          {footer && (
            <View style={s.sheetFooter}>{footer}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Loading({
  error,
  retry,
}: {
    
  error?: string | null;
  retry: () => void;
}) {
      const { C, s } = useDiscoveryUI();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      {error ? (
        <>
          <Text style={s.error}>{error}</Text>
          <Action label="Thử đọc lại bản nháp" onPress={retry} />
        </>
      ) : (
        <>
          <ActivityIndicator color={C.deep} />
          <Text style={s.muted}>Đang đọc bản nháp đã lưu…</Text>
        </>
      )}
    </View>
  );
}

export const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
  },
  muted: {
    fontSize: 10,
    lineHeight: 15,
    color: C.muted,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 12,
    gap: 9,
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: C.ink,
    backgroundColor: '#F8FAFC',
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.deep,
  },
  error: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#0F172A88',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  titleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  sheetBody: {
    padding: 16,
    gap: 12,
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  pillActive: {
    borderColor: '#34D399',
    backgroundColor: C.pale,
  },
});
// Discovery theme fix v1
export function discoveryUIForColors(
  colors: ReturnType<typeof useSettingsColors>,
) {
  const dark = colors.background === '#0C1421';

  const palette = {
    ...C,
    isDark: dark,
    bg: colors.background,
    background: colors.background,
    card: colors.card,
    input: colors.input,
    ink: colors.text,
    text: colors.text,
    muted: colors.muted,
    green: colors.green,
    deep: colors.green,
    pale: colors.pale,
    line: colors.line,
    danger: colors.danger,
    overlay: colors.overlay,
    onAccent: dark ? '#09251B' : '#FFFFFF',
    warning: dark ? '#F5CC77' : '#9A6200',
    warningBg: dark ? '#392D19' : '#FFFBEE',
    successBg: dark ? '#15382D' : '#F1FCF6',
    dangerBg: dark ? '#40232D' : '#FFF1F2',
  };

  return {
    C: palette,
    s: {
      ...s,
      title: [s.title, { color: colors.text }],
      muted: [s.muted, { color: colors.muted }],
      label: [s.label, { color: colors.muted }],
      card: [
        s.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      input: [
        s.input,
        {
          backgroundColor: colors.input,
          color: colors.text,
          borderColor: colors.line,
        },
      ],
      button: [
        s.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      buttonText: [
        s.buttonText,
        { color: colors.green },
      ],
      error: [s.error, { color: colors.danger }],
      backdrop: [
        s.backdrop,
        { backgroundColor: colors.overlay },
      ],
      sheet: [
        s.sheet,
        { backgroundColor: colors.card },
      ],
      sheetHeader: [
        s.sheetHeader,
        { borderBottomColor: colors.line },
      ],
      sheetFooter: [
        s.sheetFooter,
        { borderTopColor: colors.line },
      ],
      close: [
        s.close,
        { backgroundColor: colors.input },
      ],
      titleIcon: [
        s.titleIcon,
        { backgroundColor: colors.pale },
      ],
      pill: [
        s.pill,
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
        },
      ],
      pillActive: [
        s.pillActive,
        {
          backgroundColor: colors.pale,
          borderColor: colors.green,
        },
      ],
    },
  };
}

export function useDiscoveryUI() {
  const colors = useSettingsColors();

  return useMemo(
    () => discoveryUIForColors(colors),
    [colors],
  );
}
