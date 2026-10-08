import { Colors } from '@/constants/colors';
import { Caption, GlassCard, LargeTitle, PrimaryButton, SearchField } from '@/components/glass';
import { getRestaurants, type Restaurant } from '@/src/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function priceString(level?: number): string {
  if (level === undefined || level === null) return '';
  return '· ' + '$'.repeat(Math.max(1, Math.min(4, level)));
}

function Row({ item, last }: { item: Restaurant; last: boolean }) {
  const sub = [item.cuisine || item.types?.[0], item.vicinity].filter(Boolean).join(' · ');
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowMain}>
        <View style={styles.rowHeader}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.open_now !== undefined && (
            <Text style={[styles.openState, { color: item.open_now ? Colors.success : Colors.tertiary }]}>
              {item.open_now ? 'Open' : 'Closed'}
            </Text>
          )}
        </View>
        {!!sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
        <View style={styles.metaRow}>
          {item.rating !== undefined && (
            <Text style={styles.meta}>★ {item.rating.toFixed(1)}</Text>
          )}
          {!!priceString(item.price_level) && <Text style={styles.metaDim}>{priceString(item.price_level)}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.tertiary} />
    </View>
  );
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

  const header = (
    <View style={styles.header}>
      <LargeTitle>Restaurants</LargeTitle>
      <View style={styles.filters}>
        <SearchField value={city} onChangeText={setCity} placeholder="City" onSubmit={() => load(city, cuisine)} style={styles.field} />
        <SearchField value={cuisine} onChangeText={setCuisine} placeholder="Cuisine" onSubmit={() => load(city, cuisine)} style={styles.field} />
      </View>
      <Pressable style={styles.findBtn} onPress={() => load(city, cuisine)}>
        <Text style={styles.findText}>Find restaurants</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.center}>
          {header}
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          <Caption>Finding restaurants…</Caption>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          {header}
          <Caption style={styles.errorText}>{error}</Caption>
          <PrimaryButton label="Retry" onPress={() => load(city, cuisine)} style={styles.retry} />
        </View>
      )}

      {!loading && !error && results.length === 0 && (
        <View style={styles.center}>
          {header}
          <Caption>No restaurants found. Try another city or cuisine.</Caption>
        </View>
      )}

      {!loading && !error && results.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {header}
          <GlassCard style={styles.group}>
            {results.map((r, i) => (
              <Row key={r.place_id} item={r} last={i === results.length - 1} />
            ))}
          </GlassCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 4 },
  filters: { flexDirection: 'row', gap: 10, marginTop: 14 },
  field: { flex: 1 },
  findBtn: {
    marginTop: 12,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  findText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  center: { flex: 1, paddingHorizontal: 20 },
  loader: { marginTop: 40, marginBottom: 12 },
  errorText: { marginTop: 40, textAlign: 'center' },
  retry: { marginTop: 16, alignSelf: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  group: { marginTop: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.hairline },
  rowMain: { flex: 1, marginRight: 8 },
  rowHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { color: Colors.ink, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, flex: 1, marginRight: 8 },
  openState: { fontSize: 12, fontWeight: '600' },
  sub: { color: Colors.secondary, fontSize: 13, marginTop: 3 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'baseline' },
  meta: { color: Colors.ink, fontSize: 14, fontWeight: '600' },
  metaDim: { color: Colors.secondary, fontSize: 13 },
});
