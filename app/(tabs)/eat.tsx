import { Colors } from '@/constants/colors';
import { getRestaurants, type Restaurant } from '@/src/api/client';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function priceString(level?: number): string {
  if (level === undefined || level === null) return '—';
  return '$'.repeat(Math.max(1, Math.min(4, level)));
}

export default function EatScreen() {
  const [city, setCity] = useState('hyderabad');
  const [cuisine, setCuisine] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (c: string, cui: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRestaurants(c.trim() || 'hyderabad', cui.trim() || undefined);
      setResults(res.results);
    } catch (e: any) {
      setError(e?.message || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('hyderabad', '');
  }, [load]);

  const renderItem = ({ item }: { item: Restaurant }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        {item.open_now !== undefined && (
          <Text style={[styles.badge, item.open_now ? styles.openBadge : styles.closedBadge]}>
            {item.open_now ? 'Open now' : 'Closed'}
          </Text>
        )}
      </View>
      <Text style={styles.cuisine}>{item.cuisine || item.types?.[0] || 'Restaurant'}</Text>
      <View style={styles.metaRow}>
        {item.rating !== undefined && <Text style={styles.meta}>★ {item.rating.toFixed(1)}</Text>}
        <Text style={styles.meta}>{priceString(item.price_level)}</Text>
      </View>
      {!!item.vicinity && <Text style={styles.address}>📍 {item.vicinity}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor={Colors.steel}
          value={city}
          onChangeText={setCity}
          returnKeyType="search"
          onSubmitEditing={() => load(city, cuisine)}
        />
        <TextInput
          style={styles.input}
          placeholder="Cuisine (optional)"
          placeholderTextColor={Colors.steel}
          value={cuisine}
          onChangeText={setCuisine}
          returnKeyType="search"
          onSubmitEditing={() => load(city, cuisine)}
        />
        <Pressable style={styles.findBtn} onPress={() => load(city, cuisine)}>
          <Text style={styles.findText}>Find</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text style={styles.statusText}>Finding restaurants…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(city, cuisine)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.statusText}>No restaurants found. Try another city or cuisine.</Text>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(r) => r.place_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  input: {
    flex: 1, backgroundColor: Colors.card, color: Colors.cream,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: Colors.navy,
  },
  findBtn: { backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  findText: { color: Colors.white, fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: Colors.cream, fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  openBadge: { backgroundColor: Colors.success, color: Colors.bg },
  closedBadge: { backgroundColor: Colors.steel, color: Colors.bg },
  cuisine: { color: Colors.steel, fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  meta: { color: Colors.cream, fontSize: 14, fontWeight: '600' },
  address: { color: Colors.steel, fontSize: 13, marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusText: { color: Colors.steel, marginTop: 12, fontSize: 15, textAlign: 'center' },
  errorText: { color: Colors.warning, fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },
});
