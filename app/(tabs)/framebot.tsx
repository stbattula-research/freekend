import { Colors } from '@/constants/colors';
import { framebotChat, type ChatMessage } from '@/src/api/client';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const QUICK_REPLIES = ['Plan my Saturday night', 'Date night ideas', 'Family day out'];

let msgId = 0;
const nextId = () => `m${++msgId}`;

export default function FrameBotScreen() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: nextId(),
      role: 'assistant',
      content: "Hey! I'm FrameBot — tell me what you're in the mood for and I'll plan it out: movies, food, events, even a day trip. 🍿",
    },
  ]);
  const [input, setInput] = useState('');
  const [city, setCity] = useState('hyderabad');
  const [language, setLanguage] = useState('English');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<DisplayMessage>>(null);

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    const userMsg: DisplayMessage = { id: nextId(), role: 'user', content: message };
    const history: ChatMessage[] = [...messages, userMsg]
      .filter((m) => !m.streaming)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = nextId();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      await framebotChat(
        { message, history, user: { name: 'Friend' }, city: city.trim() || 'hyderabad', language: language.trim() || 'English' },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        }
      );
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, content: `⚠️ ${e?.message || 'Something went wrong. Is the API running?'}` }
            : m
        )
      );
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const renderItem = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          {!isUser && <Text style={styles.botName}>🤖 FrameBot</Text>}
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
            {item.content}
            {item.streaming && item.content === '' ? '…' : ''}
          </Text>
          {item.streaming && item.content !== '' && <Text style={styles.typing}>▍</Text>}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.settingsRow}>
        <TextInput
          style={styles.settingInput}
          placeholder="City"
          placeholderTextColor={Colors.steel}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={styles.settingInput}
          placeholder="Language"
          placeholderTextColor={Colors.steel}
          value={language}
          onChangeText={setLanguage}
        />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
      />

      <View style={styles.chipsRow}>
        {QUICK_REPLIES.map((q) => (
          <Pressable key={q} style={styles.chip} onPress={() => send(q)} disabled={sending}>
            <Text style={styles.chipText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="What do you want to do?"
          placeholderTextColor={Colors.steel}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline
        />
        <Pressable style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendText}>➤</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  settingsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  settingInput: {
    flex: 1, backgroundColor: Colors.card, color: Colors.cream,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
    borderWidth: 1, borderColor: Colors.navy,
  },
  list: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: Colors.red, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: Colors.card, borderBottomLeftRadius: 4 },
  botName: { color: Colors.red, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: Colors.white },
  botText: { color: Colors.cream },
  typing: { color: Colors.red, fontSize: 15 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: Colors.red, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: Colors.red, fontSize: 13, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: Colors.card, color: Colors.cream,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.navy,
  },
  sendBtn: { backgroundColor: Colors.red, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: Colors.white, fontSize: 20, fontWeight: '700' },
});
