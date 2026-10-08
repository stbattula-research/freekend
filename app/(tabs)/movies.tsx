import { Colors } from '@/constants/colors';
import { getMovieDetails, getTrendingMovies, searchMovies, type Movie, type MoviesResponse } from '@/src/api/client';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function Poster({ movie, posterBase, size }: { movie: Movie; posterBase: string; size: 'grid' | 'detail' }) {
  const uri = movie.poster_path ? `${posterBase}${movie.poster_path}` : null;
  if (!uri) {
    return (
      <View style={[styles.posterFallback, size === 'grid' ? styles.posterGrid : styles.posterDetail]}>
        <Text style={styles.posterFallbackText}>{movie.title}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={size === 'grid' ? styles.posterGrid : styles.posterDetail}
      contentFit="cover"
      transition={200}
    />
  );
}

export default function MoviesScreen() {
  const [data, setData] = useState<MoviesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'trending' | 'search'>('trending');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<(Movie & { poster_base: string }) | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = q ? await searchMovies(q) : await getTrendingMovies(1);
      setData(res);
      setMode(q ? 'search' : 'trending');
    } catch (e: any) {
      setError(e?.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetails = async (id: number) => {
    setSelectedId(id);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const d = await getMovieDetails(id);
      setDetails(d);
    } catch {
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Movie }) => (
    <Pressable style={styles.tile} onPress={() => openDetails(item.id)}>
      <Poster movie={item} posterBase={data?.poster_base ?? ''} size="grid" />
      <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.tileMeta}>★ {item.vote_average.toFixed(1)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies…"
          placeholderTextColor={Colors.steel}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => load(query.trim() || undefined)}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={() => load(query.trim() || undefined)}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      {mode === 'search' && data && (
        <Pressable onPress={() => { setQuery(''); load(); }}>
          <Text style={styles.clearText}>✕ Clear — back to trending</Text>
        </Pressable>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.red} />
          <Text style={styles.statusText}>Loading movies…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load(query.trim() || undefined)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && data && data.results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.statusText}>No movies found. Try another search.</Text>
        </View>
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <FlatList
          data={data.results}
          keyExtractor={(m) => String(m.id)}
          numColumns={3}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}

      <Modal visible={selectedId !== null} animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modal}>
          <Pressable style={styles.backBtn} onPress={() => setSelectedId(null)}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          {detailsLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.red} />
            </View>
          )}
          {!detailsLoading && details && (
            <ScrollView contentContainerStyle={styles.detailBody}>
              <Poster movie={details} posterBase={details.poster_base} size="detail" />
              <Text style={styles.detailTitle}>{details.title}</Text>
              <Text style={styles.detailMeta}>
                ★ {details.vote_average.toFixed(1)}  •  {details.release_date || '—'}
              </Text>
              <Text style={styles.detailOverview}>{details.overview || 'No overview available.'}</Text>
            </ScrollView>
          )}
          {!detailsLoading && !details && (
            <View style={styles.center}>
              <Text style={styles.errorText}>Could not load details.</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: 12 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.card, color: Colors.cream,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    borderWidth: 1, borderColor: Colors.navy,
  },
  searchBtn: { backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: Colors.white, fontWeight: '700' },
  clearText: { color: Colors.steel, paddingHorizontal: 14, paddingBottom: 6, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  statusText: { color: Colors.steel, marginTop: 12, fontSize: 15 },
  errorText: { color: Colors.warning, fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: Colors.red, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },
  grid: { paddingHorizontal: 8, paddingBottom: 24 },
  row: { justifyContent: 'flex-start' },
  tile: { width: '33.333%', padding: 6 },
  posterGrid: { width: '100%', aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: Colors.card },
  posterFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.navy, padding: 8 },
  posterFallbackText: { color: Colors.cream, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  tileTitle: { color: Colors.cream, fontSize: 12, fontWeight: '600', marginTop: 6 },
  tileMeta: { color: Colors.steel, fontSize: 11, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.bg, paddingTop: 48 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  backText: { color: Colors.red, fontSize: 16, fontWeight: '700' },
  detailBody: { padding: 20, alignItems: 'center' },
  posterDetail: { width: 220, aspectRatio: 2 / 3, borderRadius: 14, backgroundColor: Colors.card },
  detailTitle: { color: Colors.cream, fontSize: 24, fontWeight: '800', marginTop: 18, textAlign: 'center' },
  detailMeta: { color: Colors.steel, fontSize: 14, marginTop: 8 },
  detailOverview: { color: Colors.silver, fontSize: 15, lineHeight: 22, marginTop: 16, textAlign: 'center' },
});
