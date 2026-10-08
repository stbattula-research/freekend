import { Colors } from '@/constants/colors';
import { Caption, GlassCard, LargeTitle, PrimaryButton, SearchField } from '@/components/glass';
import { getEvents, type FreekendEvent } from '@/src/api/client';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const CATEGORIES = ['All', 'Music', 'Comedy', 'Sports', 'Festival', 'Cultural', 'Literature'];

export default function EventsScreen() {
  const [city, setCity] = useState('hyderabad');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<FreekendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (c: string, cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvents(c.trim() || 'hyderabad', cat === 'All' ? undefined : cat);
      setResults(res.results);
    } catch (e: any) {
      setError(e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('hyderabad', 'All');
  }, [load]);

  const selectCategory = (cat: string) => {
    setCategory(cat);
    load(city, cat);
  };

  const renderItem = ({ item }: { item: FreekendEvent }) => (
    <GlassCard style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Text style={styles.eyebrow}>{item.category}</Text>
          <Text style={styles.price}>{item.price}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.metaLine}>
          <Ionicons name="location-outline" size={13} color={Colors.secondary} />
          <Text style={styles.metaText} numberOfLines={1}>{item.venue}</Text>
        </View>
        <View style={styles.metaLine}>
          <Ionicons name="calendar-outline" size={13} color={Colors.secondary} />
          <Text style={styles.metaText}>{item.date} · {item.time}</Text>
        </View>
        {!!item.url && (
          <Pressable style={styles.bookBtn} onPress={() => WebBrowser.openBrowserAsync(item.url)}>
            <Text style={styles.bookText}>Book</Text>
            <Ionicons name="open-outline" size={14} color={Colors.accent} />
          </Pressable>
        )}
      </View>
    </GlassCard>
  );

  const header = (
    <View style={styles.header}>
      <LargeTitle>Events</LargeTitle>
      <SearchField
        value={city}
        onChangeText={setCity}
        placeholder="City"
        onSubmit={() => load(city, category)}
        style={styles.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => selectCategory(cat)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.center}>
          {header}
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          <Caption>Finding events…</Caption>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          {header}
          <Caption style={styles.errorText}>{error}</Caption>
          <PrimaryButton label="Retry" onPress={() => load(city, category)} style={styles.retry} />
        </View>
      )}

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          {header}
          <Caption>No events found for this filter. Try another city or category.</Caption>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={header}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 2 },
  search: { marginTop: 14 },
  pills: { gap: 8, paddingVertical: 14, paddingRight: 20 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: Colors.accent },
  pillText: { color: Colors.secondary, fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: Colors.white },
  center: { flex: 1, paddingHorizontal: 20 },
  loader: { marginTop: 40, marginBottom: 12 },
  errorText: { marginTop: 40, textAlign: 'center' },
  retry: { marginTop: 16, alignSelf: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 110, gap: 14 },
  card: { padding: 0 },
  cardInner: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { color: Colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  price: { color: Colors.success, fontSize: 13, fontWeight: '700' },
  title: { color: Colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginTop: 8 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  metaText: { color: Colors.secondary, fontSize: 13, flex: 1 },
  bookBtn: {
    marginTop: 14,
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bookText: { color: Colors.accent, fontWeight: '700', fontSize: 15 },
});
