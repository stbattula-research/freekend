import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Caption, GlassCard } from '@/components/glass';
import { Colors } from '@/constants/colors';

const CARDS: { icon: ComponentProps<typeof Ionicons>['name']; title: string; desc: string; route: '/(tabs)/framebot' | '/(tabs)/movies' | '/(tabs)/eat' | '/(tabs)/events' }[] = [
  { icon: 'chatbubble-ellipses-outline', title: 'Ask FrameBot', desc: 'Tell me the vibe — I’ll plan your day', route: '/(tabs)/framebot' },
  { icon: 'film-outline', title: 'Movies', desc: 'Trending films and OTT picks', route: '/(tabs)/movies' },
  { icon: 'restaurant-outline', title: 'Eat', desc: 'Restaurants near you', route: '/(tabs)/eat' },
  { icon: 'ticket-outline', title: 'Events', desc: 'What’s on in your city', route: '/(tabs)/events' },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.wordmark}>Freekend</Text>
      <Caption style={styles.subtitle}>
        Your AI planner for movies, food, events and trips — all in one place.
      </Caption>

      <View style={styles.cards}>
        {CARDS.map((c) => (
          <Pressable key={c.title} onPress={() => router.push(c.route)}>
            <GlassCard style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.iconCircle}>
                  <Ionicons name={c.icon} size={22} color={Colors.accent} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardDesc}>{c.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.tertiary} />
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 72, paddingHorizontal: 20, paddingBottom: 110 },
  wordmark: {
    fontFamily: 'Georgia',
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: -1,
    color: Colors.ink,
  },
  subtitle: { marginTop: 10, fontSize: 16, lineHeight: 22, maxWidth: 320 },
  cards: { marginTop: 30, gap: 14 },
  card: { padding: 16 },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { color: Colors.ink, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  cardDesc: { color: Colors.secondary, fontSize: 13, marginTop: 3, lineHeight: 18 },
});
