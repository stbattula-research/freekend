import { Colors } from '@/constants/colors';
import { artTint, Caption, GlassCard, LargeTitle, PrimaryButton, SearchField } from '@/components/glass';
import { getMovieDetails, getTrendingMovies, searchMovies, type Movie, type MoviesResponse } from '@/src/api/client';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Art-directed poster: deterministic pastel artwork with serif title —
// intentional design, never a "missing image" box.
function Poster({ movie, posterBase, size }: { movie: Movie; posterBase: string; size: 'grid' | 'detail' }) {
  const uri = movie.poster_path ? `${posterBase}${movie.poster_path}` : null;
  const tint = artTint(movie.title);
  if (!uri) {
    return (
      <View style={[styles.artFallback, size === 'grid' ? styles.posterGrid : styles.posterDetail, { backgroundColor: tint.bg }]}>
        <Text style={[styles.watermark, { color: tint.fg }]} numberOfLines={1}>
          {movie.title.charAt(0).toUpperCase()}
        </Text>
        <Text style={[styles.artTitle, size === 'detail' && styles.artTitleLarge, { color: tint.fg }]} numberOfLines={4}>
          {movie.title}
        </Text>
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

  const yearOf = (m: Movie) => (m.release_date ? m.release_date.slice(0, 4) : '');

  const renderItem = ({ item }: { item: Movie }) => (
    <Pressable style={styles.tile} onPress={() => openDetails(item.id)}>
      <Poster movie={item} posterBase={data?.poster_base ?? ''} size="grid" />
      <Text style={styles.tileTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.tileMeta}>
        ★ {item.vote_average.toFixed(1)}{yearOf(item) ? ` · ${yearOf(item)}` : ''}
      </Text>
    </Pressable>
  );

  const header = (
    <View style={styles.header}>
      <LargeTitle>{mode === 'search' ? 'Results' : 'Movies'}</LargeTitle>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies"
        onSubmit={() => load(query.trim() || undefined)}
        style={styles.search}
      />
      {mode === 'search' && (
        <Pressable onPress={() => { setQuery(''); load(); }} hitSlop={8}>
          <Text style={styles.clearText}>Clear — back to trending</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.center}>
          {header}
          <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          <Caption>Loading movies…</Caption>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          {header}
          <Caption style={styles.errorText}>{error}</Caption>
          <PrimaryButton label="Retry" onPress={() => load(query.trim() || undefined)} style={styles.retry} />
        </View>
      )}

      {!loading && !error && data && data.results.length === 0 && (
        <View style={styles.center}>
          {header}
          <Caption>No movies found. Try another search.</Caption>
        </View>
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <FlatList
          data={data.results}
          keyExtractor={(m) => String(m.id)}
          numColumns={2}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
        />
      )}

      <Modal visible={selectedId !== null} animationType="slide" onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modal}>
          <Pressable style={styles.closeBtn} onPress={() => setSelectedId(null)} hitSlop={10}>
            <Ionicons name="close" size={20} color={Colors.ink} />
          </Pressable>
          {detailsLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          )}
          {!detailsLoading && details && (
            <ScrollView contentContainerStyle={styles.detailBody}>
              <Poster movie={details} posterBase={details.poster_base} size="detail" />
              <Text style={styles.detailTitle}>{details.title}</Text>
              <Text style={styles.detailMeta}>
                ★ {details.vote_average.toFixed(1)}{details.release_date ? `  ·  ${details.release_date}` : ''}
              </Text>
              <GlassCard style={styles.overviewCard}>
                <Text style={styles.detailOverview}>{details.overview || 'No overview available.'}</Text>
              </GlassCard>
            </ScrollView>
          )}
          {!detailsLoading && !details && (
            <View style={styles.center}>
              <Caption>Could not load details.</Caption>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 6 },
  search: { marginTop: 14 },
  clearText: { color: Colors.accent, fontSize: 14, fontWeight: '600', marginTop: 10 },
  center: { flex: 1, paddingHorizontal: 20 },
  loader: { marginTop: 40, marginBottom: 12 },
  errorText: { marginTop: 40, textAlign: 'center' },
  retry: { marginTop: 16, alignSelf: 'center' },
  grid: { paddingHorizontal: 14, paddingBottom: 110 },
  row: { justifyContent: 'space-between' },
  tile: { width: '48%', marginBottom: 22 },
  posterGrid: { width: '100%', aspectRatio: 2 / 3, borderRadius: 16 },
  artFallback: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  watermark: {
    position: 'absolute',
    fontFamily: 'Georgia',
    fontSize: 150,
    fontWeight: '700',
    opacity: 0.13,
  },
  artTitle: {
    fontFamily: 'Georgia',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  artTitleLarge: { fontSize: 30, lineHeight: 38 },
  tileTitle: { color: Colors.ink, fontSize: 15, fontWeight: '600', marginTop: 8, letterSpacing: -0.2 },
  tileMeta: { color: Colors.secondary, fontSize: 13, marginTop: 3 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  closeBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: { paddingTop: 110, paddingHorizontal: 24, paddingBottom: 60, alignItems: 'center' },
  posterDetail: { width: 210, aspectRatio: 2 / 3, borderRadius: 20 },
  detailTitle: { color: Colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.5, marginTop: 20, textAlign: 'center' },
  detailMeta: { color: Colors.secondary, fontSize: 15, marginTop: 8 },
  overviewCard: { marginTop: 22, padding: 18, alignSelf: 'stretch' },
  detailOverview: { color: Colors.ink, fontSize: 15, lineHeight: 23 },
});
