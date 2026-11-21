import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useSettingsColors,
} from '@/features/settings/settings-colors';

import {
  useAppSettings,
} from '@/features/settings/settings-store';

// Chỉ là URL công khai. Không đặt API key trong app.
const BACKEND_URL =
  'https://smart-danang-chat.ngohongdiem2912.workers.dev';

type Turn = {
  role: 'user' | 'assistant';
  text: string;
};

type Message = Turn & {
  id: string;
  status: 'done' | 'loading' | 'error';
};

type ChatRequest = {
  turns: Turn[];
  assistantId: string;
};

const ERRORS: Record<string, string> = {
  DAILY_LIMIT:
    'Trợ lý đã hết lượt phục vụ hôm nay. Vui lòng quay lại sau.',
  RATE_LIMIT:
    'Có nhiều yêu cầu cùng lúc. Hãy chờ khoảng một phút rồi thử lại.',
  AI_BUSY:
    'Dịch vụ AI đang chạm hạn mức. Bạn hãy thử lại sau.',
  AI_TIMEOUT:
    'AI phản hồi quá lâu. Bạn có thể thử lại.',
  AI_UNAVAILABLE:
    'Dịch vụ AI tạm thời chưa sẵn sàng. Hãy thử lại sau.',
  RENDER_CONNECT_FAILED:
    'Chưa kết nối được máy chủ AI. Hãy thử lại sau.',
  MODEL_UNAVAILABLE:
    'Mô hình AI hiện không khả dụng.',
  NOT_CONFIGURED:
    'Trợ lý đang được thiết lập. Vui lòng quay lại sau.',
  LIMITER_UNAVAILABLE:
    'Trợ lý tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  BAD_REQUEST:
    'Không gửi được nội dung này. Hãy thử câu hỏi ngắn hơn.',
  TOO_LARGE:
    'Hội thoại quá dài. Hãy tạo cuộc trò chuyện mới.',
  NO_ANSWER:
    'AI chưa tạo được câu trả lời phù hợp. Hãy thử hỏi ngắn gọn hơn.',
};

const SUGGESTIONS = [
  'Lần đầu đến Đà Nẵng nên đi đâu?',
  'Gợi ý hoạt động trong nhà khi trời mưa',
  'Đi Đà Nẵng 2 ngày nên chuẩn bị gì?',
];

function makeTurns(
  previous: Turn[],
  text: string,
): Turn[] {
  let turns: Turn[] = [
    ...previous.slice(-6),
    {
      role: 'user',
      text,
    },
  ];

  // Bỏ cả cặp hỏi/đáp cũ nếu nội dung quá dài.
  while (
    turns.length > 1 &&
    JSON.stringify(turns).length > 5000
  ) {
    turns = turns.slice(2);
  }

  return turns;
}

export default function AssistantScreen() {
  const c = useSettingsColors();
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const [failed, setFailed] =
    useState<ChatRequest | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 'welcome',
        role: 'assistant',
        status: 'done',
        text:
          'Chào bạn! Mình có thể gợi ý hoạt động, địa điểm ' +
          'và cách chuẩn bị cho chuyến đi Đà Nẵng. ' +
          'Bạn muốn khám phá gì?',
      },
    ]);

  const list = useRef<FlatList<Message>>(null);
  const history = useRef<Turn[]>([]);
  const locked = useRef(false);
  const active = useRef(true);
  const sequence = useRef(0);

  const controller =
    useRef<AbortController | null>(null);

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  async function perform(request: ChatRequest) {
    if (locked.current) return;

    locked.current = true;
    setBusy(true);
    setFailed(null);

    setMessages(previous =>
      previous.map(message =>
        message.id === request.assistantId
          ? {
              ...message,
              status: 'loading',
              text: '',
            }
          : message,
      ),
    );

    const abort = new AbortController();
    controller.current = abort;

    const timer = setTimeout(
      () => abort.abort(),
      75000,
    );

    try {
      const response = await fetch(
        `${BACKEND_URL}/chat`,
        {
          method: 'POST',
          signal: abort.signal,
          headers: {
            'Content-Type':
              'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            language: settings?.language ?? 'vi',
            messages: request.turns,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          ERRORS[data?.code] ??
          'Chưa kết nối được dịch vụ AI. Vui lòng thử lại sau.',
        );
      }

      if (
        typeof data?.reply !== 'string' ||
        !data.reply.trim() ||
        data.reply.length > 2000
      ) {
        throw new Error(
          'Phản hồi chưa hợp lệ. Bạn hãy thử lại.',
        );
      }

      if (!active.current) return;

      const answer = data.reply.trim();

      const answerTurn: Turn = {
        role: 'assistant',
        text: answer,
      };

      history.current = [
        ...request.turns,
        answerTurn,
      ].slice(-6);

      setMessages(previous =>
        previous.map(message =>
          message.id === request.assistantId
            ? {
                ...message,
                status: 'done',
                text:
                  answer +
                  (
                    data.truncated
                      ? '\n\n(Câu trả lời đã chạm giới hạn độ dài.)'
                      : ''
                  ),
              }
            : message,
        ),
      );
    } catch (error) {
      if (!active.current) return;

      const text = abort.signal.aborted
        ? 'Kết nối quá lâu. Bạn hãy kiểm tra mạng rồi thử lại.'
        : error instanceof Error &&
            error.message !== 'Network request failed'
          ? error.message
          : 'Không kết nối được. Hãy kiểm tra Internet rồi thử lại.';

      setMessages(previous =>
        previous.map(message =>
          message.id === request.assistantId
            ? {
                ...message,
                status: 'error',
                text,
              }
            : message,
        ),
      );

      setFailed(request);
    } finally {
      clearTimeout(timer);
      locked.current = false;
      controller.current = null;

      if (active.current) {
        setBusy(false);
      }
    }
  }

  function send(value = input) {
    const text = value.trim();

    if (!text || locked.current) return;

    if (text.length > 1000) {
      Alert.alert(
        'Câu hỏi quá dài',
        'Bạn nhập tối đa 1.000 ký tự mỗi tin nhắn nhé.',
      );

      return;
    }

    sequence.current += 1;

    const id = `message-${sequence.current}`;

    const assistantId = `${id}-assistant`;
    const turns = makeTurns(history.current, text);

    setMessages(previous => [
      ...previous,
      {
        id,
        role: 'user' as const,
        text,
        status: 'done' as const,
      },
      {
        id: assistantId,
        role: 'assistant' as const,
        text: '',
        status: 'loading' as const,
      },
    ].slice(-60));

    setInput('');

    void perform({
      turns,
      assistantId,
    });
  }

  function clearChat() {
    if (locked.current) return;

    Alert.alert(
      'Cuộc trò chuyện mới',
      'Xóa nội dung đang hiển thị và bắt đầu lại?',
      [
        {
          text: 'Giữ lại',
          style: 'cancel',
        },
        {
          text: 'Bắt đầu lại',
          onPress: () => {
            history.current = [];
            setMessages([]);
            setFailed(null);
            setInput('');
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View
        style={[
          styles.header,
          { borderColor: c.line },
        ]}
      >
        <View
          style={{
            padding: 10,
            borderRadius: 14,
            backgroundColor: c.pale,
          }}
        >
          <Ionicons
            name="sparkles"
            size={23}
            color={c.green}
          />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: c.text,
            }}
          >
            Trợ lý du lịch AI
          </Text>

          <Text
            style={{
              fontSize: 11,
              color: c.muted,
            }}
          >
            Smart Da Nang Travel
          </Text>
        </View>

        <Pressable
          onPress={clearChat}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Cuộc trò chuyện mới"
          hitSlop={10}
        >
          <Ionicons
            name="create-outline"
            size={24}
            color={busy ? c.muted : c.green}
          />
        </Pressable>
      </View>

      <View
        style={{
          margin: 12,
          marginBottom: 0,
          padding: 11,
          borderRadius: 12,
          backgroundColor: c.pale,
        }}
      >
        <Text
          style={{
            color: c.text,
            fontSize: 11,
            lineHeight: 17,
          }}
        >
          Gợi ý từ AI cần được kiểm tra lại.
          Bản này chưa đọc hoặc chỉnh lịch trình,
          chưa tra cứu giá, giờ mở cửa và thời tiết trực tiếp.
        </Text>
      </View>

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 14,
          gap: 14,
          flexGrow: 1,
        }}
        onContentSizeChange={() =>
          list.current?.scrollToEnd({
            animated: true,
          })
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf:
                item.role === 'user'
                  ? 'flex-end'
                  : 'flex-start',
              maxWidth: '92%',
              backgroundColor:
                item.role === 'user'
                  ? '#087F61'
                  : c.card,
              borderRadius: 18,
              borderBottomRightRadius:
                item.role === 'user' ? 4 : 18,
              borderBottomLeftRadius:
                item.role === 'assistant' ? 4 : 18,
              padding: 13,
              gap: 8,
              borderWidth:
                item.role === 'assistant' ? 1 : 0,
              borderColor: c.line,
            }}
          >
            {item.status === 'loading' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  size="small"
                  color={c.green}
                />

                <View style={{ gap: 3 }}>
                  <Text
                    style={{
                      color: c.text,
                      fontSize: 12,
                    }}
                  >
                    Đang trả lời…
                  </Text>

                  <Text
                    style={{
                      color: c.muted,
                      fontSize: 10,
                    }}
                  >
                    Lần đầu kết nối có thể mất lâu hơn.
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                selectable
                style={{
                  color:
                    item.role === 'user'
                      ? '#FFF'
                      : item.status === 'error'
                        ? c.danger
                        : c.text,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                {item.text}
              </Text>
            )}

            {item.status === 'error' &&
              failed?.assistantId === item.id &&
              !busy && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (failed) {
                      void perform(failed);
                    }
                  }}
                >
                  <Text
                    style={{
                      color: c.green,
                      fontWeight: '700',
                    }}
                  >
                    ↻ Thử lại
                  </Text>
                </Pressable>
              )}
          </View>
        )}
        ListFooterComponent={
          messages.length <= 1 ? (
            <View
              style={{
                gap: 8,
                marginTop: 12,
              }}
            >
              {SUGGESTIONS.map(text => (
                <Pressable
                  key={text}
                  disabled={busy}
                  onPress={() => send(text)}
                  style={{
                    borderWidth: 1,
                    borderColor: c.line,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: c.card,
                  }}
                >
                  <Text
                    style={{
                      color: c.green,
                      fontSize: 12,
                    }}
                  >
                    {text} →
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : undefined
        }
      />

      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderColor: c.line,
          backgroundColor: c.card,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 9,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          editable={!busy}
          accessibilityLabel="Câu hỏi cho trợ lý"
          placeholder="Bạn muốn khám phá gì ở Đà Nẵng?"
          placeholderTextColor={c.muted}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            backgroundColor: c.input,
            color: c.text,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 11,
            fontSize: 13,
          }}
        />

        <Pressable
          onPress={() => send()}
          disabled={busy || !input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            backgroundColor: '#087F61',
            alignItems: 'center',
            justifyContent: 'center',
            opacity:
              busy || !input.trim()
                ? 0.45
                : 1,
          }}
        >
          <Ionicons
            name="arrow-up"
            size={23}
            color="#FFF"
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderBottomWidth: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});