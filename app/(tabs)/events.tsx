import { Colors } from '@/constants/colors';
import { getEvents, type FreekendEvent } from '@/src/api/client';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.categoryBadge}>{item.category}</Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.venue}>📍 {item.venue}</Text>
      <Text style={styles.datetime}>🗓 {item.date} • {item.time}</Text>
      {!!item.url && (
        <Pressable style={styles.bookBtn} onPress={() => WebBrowser.openBrowserAsync(item.url)}>
          <Text style={styles.bookText}>Book 🎟</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.cityRow}>
        <TextInput
          style={styles.cityInput}
          placeholder="City"
          placeholderTextColor={Colors.steel}
          value={city}
          onChangeText={setCity}
          returnKeyType="search"
          onSubmitEditing={() => load(city, category)}
        />
        <Pressable style={styles.findBtn} onPress={() => load(city, category)}>
          <Text style={styles.findText}>Find</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => selectCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text style={styles.statusText}>Finding events…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(city, category)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.statusText}>No events found for this filter. Try another city or category.</Text>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: 12 },
  cityRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  cityInput: {
    flex: 1, backgroundColor: Colors.card, color: Colors.cream,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: Colors.navy,
  },
  findBtn: { backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  findText: { color: Colors.white, fontWeight: '700' },
  chipsRow: { maxHeight: 44, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: Colors.navy, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.card },
  chipActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  chipText: { color: Colors.steel, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { color: Colors.red, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  price: { color: Colors.success, fontSize: 13, fontWeight: '700' },
  title: { color: Colors.cream, fontSize: 17, fontWeight: '700', marginTop: 6 },
  venue: { color: Colors.steel, fontSize: 13, marginTop: 6 },
  datetime: { color: Colors.steel, fontSize: 13, marginTop: 4 },
  bookBtn: { marginTop: 12, backgroundColor: Colors.red, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  bookText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusText: { color: Colors.steel, marginTop: 12, fontSize: 15, textAlign: 'center' },
  errorText: { color: Colors.warning, fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },
});
