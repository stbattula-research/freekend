import { Colors } from '@/constants/colors';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const CARDS = [
  { emoji: '🤖', title: 'Ask FrameBot', desc: 'Chat your plan into existence', route: '/(tabs)/framebot' as const },
  { emoji: '🎬', title: 'Movies', desc: 'Trending films & OTT picks', route: '/(tabs)/movies' as const },
  { emoji: '🍽', title: 'Eat', desc: 'Restaurants near you', route: '/(tabs)/eat' as const },
  { emoji: '🎭', title: 'Events', desc: 'What’s on in your city', route: '/(tabs)/events' as const },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FREE<Text style={styles.logoRed}>KEND</Text></Text>
      <Text style={styles.tagline}>Your weekend. Your scene.</Text>
      <Text style={styles.intro}>Chat with FrameBot or browse — movies, food, events and trips, all in one place.</Text>

      <View style={styles.cards}>
        {CARDS.map((c) => (
          <Pressable key={c.title} style={styles.card} onPress={() => router.push(c.route)}>
            <Text style={styles.cardEmoji}>{c.emoji}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{c.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.cream,
    letterSpacing: -1,
  },
  logoRed: {
    color: Colors.red,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 4,
    color: Colors.steel,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  intro: {
    fontSize: 14,
    color: Colors.steel,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  cards: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.red,
  },
  cardEmoji: { fontSize: 30, marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { color: Colors.cream, fontSize: 18, fontWeight: '700' },
  cardDesc: { color: Colors.steel, fontSize: 13, marginTop: 2 },
});
