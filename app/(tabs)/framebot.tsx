import { Colors } from '@/constants/colors';
import {
  clearPlan,
  framebotChat,
  getPlan,
  removePlanItem,
  type ChatMessage,
  type PlanItem,
  type Suggestion,
} from '@/src/api/client';
import {
  cancelAllReminders,
  requestPermission,
  schedulePlanReminders,
} from '@/src/notifications';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  suggestions?: Suggestion[];
}

const QUICK_REPLIES = ['Plan my Saturday night', 'Date night ideas', 'Family day out'];

const TYPE_EMOJI: Record<PlanItem['type'], string> = {
  movie: '🎬',
  restaurant: '🍽',
  event: '🎭',
  activity: '✈️',
};

let msgId = 0;
const nextId = () => `m${++msgId}`;

function newSessionId(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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
  const [sessionId] = useState(newSessionId);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [remindMe, setRemindMe] = useState(false);
  const [remindedIds, setRemindedIds] = useState<string[]>([]);
  const [webHint, setWebHint] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const listRef = useRef<FlatList<DisplayMessage>>(null);
  const remindMeRef = useRef(false);
  const assistantIdRef = useRef<string | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  coordsRef.current = coords;

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  // Load any existing plan for this session on mount
  useEffect(() => {
    getPlan(sessionId)
      .then((r) => setPlan(r.items))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocation: ask once for foreground permission; when granted, every chat
  // call carries lat/lng so suggestions sort near-first with distances.
  // Denied/unavailable → silent fallback to the city text input.
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // DEMO-ONLY hook for the web build: ?lat=..&lng=.. injects a demo
          // location (e.g. ?lat=17.3850&lng=78.4867). Not used on native.
          const q = new URLSearchParams(window.location.search);
          const la = parseFloat(q.get('lat') || '');
          const ln = parseFloat(q.get('lng') || '');
          if (Number.isFinite(la) && Number.isFinite(ln)) {
            setCoords({ lat: la, lng: ln });
          }
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // location unavailable — city input remains the fallback
      }
    })();
  }, []);

  /** (Re)schedule reminders for the current plan when reminders are on. */
  const refreshReminders = async (items: PlanItem[]) => {
    if (!remindMeRef.current) return;
    if (Platform.OS === 'web') {
      // Web can't schedule — badge the items that would notify on mobile.
      setRemindedIds(
        items.filter((i) => new Date(i.startsAt).getTime() > Date.now()).map((i) => i.id)
      );
      return;
    }
    const ids = await schedulePlanReminders(items);
    setRemindedIds(ids);
  };

  const applyPlan = (items: PlanItem[]) => {
    setPlan(items);
    void refreshReminders(items);
  };

  const toggleRemindMe = async () => {
    if (remindMeRef.current) {
      remindMeRef.current = false;
      setRemindMe(false);
      setRemindedIds([]);
      setWebHint(null);
      await cancelAllReminders();
      return;
    }
    if (Platform.OS === 'web') {
      // Web has no local-notification scheduling; the prompt doubles as
      // approval on mobile. Show the hint and badge future items visually.
      remindMeRef.current = true;
      setRemindMe(true);
      setWebHint('⏰ Reminders need the mobile app — enable them there to get notified.');
      setRemindedIds(
        plan.filter((i) => new Date(i.startsAt).getTime() > Date.now()).map((i) => i.id)
      );
      return;
    }
    const granted = await requestPermission();
    if (!granted) return; // the permission prompt IS the approval
    remindMeRef.current = true;
    setRemindMe(true);
    const ids = await schedulePlanReminders(plan);
    setRemindedIds(ids);
  };

  const removeItem = async (itemId: string) => {
    try {
      const r = await removePlanItem(sessionId, itemId);
      applyPlan(r.items);
    } catch {
      // keep local state on failure
    }
  };

  const clearDay = async () => {
    try {
      const r = await clearPlan(sessionId);
      applyPlan(r.items);
    } catch {
      // keep local state on failure
    }
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
    assistantIdRef.current = assistantId;
    // Fresh turn: drop stale suggestion cards; new ones arrive via onSuggestions.
    setMessages((prev) => [
      ...prev.map((m) => (m.suggestions ? { ...m, suggestions: undefined } : m)),
      userMsg,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const c = coordsRef.current;
      await framebotChat(
        {
          message,
          history,
          user: { name: 'Friend' },
          city: city.trim() || 'hyderabad',
          language: language.trim() || 'English',
          sessionId,
          ...(c ? { lat: c.lat, lng: c.lng } : {}),
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        },
        (items) => applyPlan(items),
        (suggestions) => {
          const id = assistantIdRef.current;
          if (!id) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, suggestions } : m))
          );
          scrollToEnd();
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
          {!isUser && item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.cardsWrap}>
              {item.suggestions.map((s) => (
                <Pressable
                  key={`${s.type}-${s.title}`}
                  testID={`suggestion-card-${s.title}`}
                  style={styles.card}
                  onPress={() => send(`Add ${s.title}`)}
                  disabled={sending}
                >
                  <Text style={styles.cardTitle}>
                    {TYPE_EMOJI[s.type]} {s.title}
                  </Text>
                  {s.details ? <Text style={styles.cardDetails}>{s.details}</Text> : null}
                </Pressable>
              ))}
            </View>
          )}
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
        {coords && <Text style={styles.nearYou}>📍 Near you</Text>}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
      />

      <View style={styles.daySection}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>📅 Your day</Text>
          <View style={styles.dayHeaderRight}>
            {plan.length > 0 && (
              <Pressable onPress={clearDay}>
                <Text style={styles.clearText}>Clear day</Text>
              </Pressable>
            )}
            <View style={styles.remindRow}>
              <Text style={styles.remindLabel}>Remind me</Text>
              <Switch
                value={remindMe}
                onValueChange={toggleRemindMe}
                trackColor={{ false: Colors.navy, true: Colors.red }}
                thumbColor={Colors.cream}
              />
            </View>
          </View>
        </View>
        {webHint && <Text style={styles.webHint}>{webHint}</Text>}
        {plan.length === 0 ? (
          <Text style={styles.dayEmpty}>
            Nothing planned yet — agree to a suggestion and I&apos;ll build your day here.
          </Text>
        ) : (
          plan.map((item) => (
            <View key={item.id} style={styles.dayItem}>
              <Text style={styles.dayEmoji}>{TYPE_EMOJI[item.type]}</Text>
              <View style={styles.dayInfo}>
                <Text style={styles.dayItemTitle}>
                  {item.title}
                  {remindedIds.includes(item.id) ? ' ⏰' : ''}
                </Text>
                <Text style={styles.dayItemDetails}>
                  {item.time} · {item.details}
                </Text>
              </View>
              <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

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
  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  cardTitle: { color: Colors.cream, fontSize: 14, fontWeight: '700' },
  cardDetails: { color: Colors.steel, fontSize: 12, marginTop: 3 },
  nearYou: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  daySection: {
    marginHorizontal: 12, marginBottom: 8, backgroundColor: Colors.card,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.navy,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayTitle: { color: Colors.cream, fontSize: 15, fontWeight: '700' },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearText: { color: Colors.steel, fontSize: 12, textDecorationLine: 'underline' },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remindLabel: { color: Colors.cream, fontSize: 13, fontWeight: '600' },
  webHint: { color: Colors.warning, fontSize: 12, marginBottom: 8 },
  dayEmpty: { color: Colors.steel, fontSize: 13, lineHeight: 18 },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.navy },
  dayEmoji: { fontSize: 20 },
  dayInfo: { flex: 1 },
  dayItemTitle: { color: Colors.cream, fontSize: 14, fontWeight: '700' },
  dayItemDetails: { color: Colors.steel, fontSize: 12, marginTop: 2 },
  removeText: { color: Colors.steel, fontSize: 22, fontWeight: '700', paddingHorizontal: 4 },
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
