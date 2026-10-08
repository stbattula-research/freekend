import { Colors } from '@/constants/colors';
import { Caption, GlassCard, TYPE_ICON } from '@/components/glass';
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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
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
      content: "Hey! I'm FrameBot — tell me what you're in the mood for and I'll plan it out: movies, food, events, even a day trip.",
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
      setWebHint('Reminders need the mobile app — enable them there to get notified.');
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
            ? { ...m, streaming: false, content: `Something went wrong: ${e?.message || 'is the API running?'}` }
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
    if (isUser) {
      return (
        <View style={[styles.bubbleRow, styles.userRow]}>
          <View style={[styles.bubble, styles.userBubble]}>
            <Text style={[styles.bubbleText, styles.userText]}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.bubbleRow, styles.botRow]}>
        <BlurView intensity={55} tint="light" style={[styles.bubble, styles.botBubble]}>
          <Text style={styles.botName}>FrameBot</Text>
          <Text style={[styles.bubbleText, styles.botText]}>
            {item.content}
            {item.streaming && item.content === '' ? '…' : ''}
          </Text>
          {item.streaming && item.content !== '' && <Text style={styles.typing}>▍</Text>}
          {item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.cardsWrap}>
              {item.suggestions.map((s) => (
                <Pressable
                  key={`${s.type}-${s.title}`}
                  testID={`suggestion-card-${s.title}`}
                  onPress={() => send(`Add ${s.title}`)}
                  disabled={sending}
                >
                  <GlassCard style={styles.card} radius={14} intensity={80}>
                    <View style={styles.cardInner}>
                      <View style={styles.cardIcon}>
                        <Ionicons name={TYPE_ICON[s.type] ?? 'ellipse-outline'} size={16} color={Colors.accent} />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>{s.title}</Text>
                        {s.details ? <Text style={styles.cardDetails} numberOfLines={2}>{s.details}</Text> : null}
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          )}
        </BlurView>
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
          placeholderTextColor={Colors.tertiary}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={styles.settingInput}
          placeholder="Language"
          placeholderTextColor={Colors.tertiary}
          value={language}
          onChangeText={setLanguage}
        />
        {coords && (
          <View style={styles.nearYou}>
            <Ionicons name="location" size={13} color={Colors.accent} />
            <Text style={styles.nearYouText}>Near you</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
      />

      <GlassCard style={styles.daySection} radius={20}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>Your day</Text>
          <View style={styles.dayHeaderRight}>
            {plan.length > 0 && (
              <Pressable onPress={clearDay} hitSlop={8}>
                <Text style={styles.clearText}>Clear day</Text>
              </Pressable>
            )}
            <View style={styles.remindRow}>
              <Text style={styles.remindLabel}>Remind me</Text>
              <Switch
                value={remindMe}
                onValueChange={toggleRemindMe}
                trackColor={{ false: 'rgba(0,0,0,0.12)', true: Colors.accent }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>
        {webHint && <Text style={styles.webHint}>{webHint}</Text>}
        {plan.length === 0 ? (
          <Caption>Nothing planned yet — agree to a suggestion and I’ll build your day here.</Caption>
        ) : (
          plan.map((item, i) => (
            <View key={item.id} style={[styles.dayItem, i > 0 && styles.dayDivider]}>
              <View style={styles.dayIcon}>
                <Ionicons name={TYPE_ICON[item.type] ?? 'ellipse-outline'} size={17} color={Colors.ink} />
              </View>
              <View style={styles.dayInfo}>
                <Text style={styles.dayItemTitle}>
                  {item.title}
                  {remindedIds.includes(item.id) && (
                    <Text>  <Ionicons name="alarm-outline" size={12} color={Colors.accent} /></Text>
                  )}
                </Text>
                <Text style={styles.dayItemDetails}>
                  {item.time} · {item.details}
                </Text>
              </View>
              <Pressable onPress={() => removeItem(item.id)} hitSlop={10}>
                <Ionicons name="close" size={18} color={Colors.tertiary} />
              </Pressable>
            </View>
          ))
        )}
      </GlassCard>

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
          placeholderTextColor={Colors.tertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          multiline
          testID="chat-input"
        />
        <Pressable testID="send-button" style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={() => send(input)} disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 64,
    alignItems: 'center',
  },
  settingInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    color: Colors.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  nearYou: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  nearYouText: { color: Colors.ink, fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11 },
  userBubble: { backgroundColor: Colors.accent, borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.78)', borderBottomLeftRadius: 6, overflow: 'hidden' },
  botName: { color: Colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  userText: { color: Colors.white },
  botText: { color: Colors.ink },
  typing: { color: Colors.accent, fontSize: 15 },
  cardsWrap: { gap: 8, marginTop: 12 },
  card: { padding: 11 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardText: { flex: 1 },
  cardTitle: { color: Colors.ink, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  cardDetails: { color: Colors.secondary, fontSize: 13, marginTop: 2, lineHeight: 17 },
  daySection: { marginHorizontal: 12, marginBottom: 10, padding: 14 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayTitle: { color: Colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  remindLabel: { color: Colors.ink, fontSize: 13, fontWeight: '600' },
  webHint: { color: Colors.warning, fontSize: 12, marginBottom: 8, lineHeight: 16 },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  dayDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hairline },
  dayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInfo: { flex: 1 },
  dayItemTitle: { color: Colors.ink, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  dayItemDetails: { color: Colors.secondary, fontSize: 13, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { backgroundColor: Colors.accentSoft, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 104,
    paddingTop: 2,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
    color: Colors.ink,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 16,
    maxHeight: 110,
  },
  sendBtn: {
    backgroundColor: Colors.accent,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.55 },
});
