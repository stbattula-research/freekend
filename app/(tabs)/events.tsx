import { Colors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎭</Text>
      <Text style={styles.title}>Events</Text>
      <Text style={styles.sub}>Sprint 4 — BookMyShow Integration</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: Colors.bg, alignItems:'center', justifyContent:'center' },
  emoji:     { fontSize: 56, marginBottom: 16 },
  title:     { fontSize: 24, fontWeight: '700', color: Colors.cream },
  sub:       { fontSize: 13, color: Colors.steel, marginTop: 8 },
});