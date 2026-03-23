import { Colors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>FREE<Text style={styles.logoRed}>KEND</Text></Text>
      <Text style={styles.tagline}>YOUR WEEKEND. YOUR SCENE.</Text>
      <Text style={styles.sub}>Sprint 2 coming soon — Movie Discovery 🎬</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
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
  sub: {
    fontSize: 14,
    color: Colors.steel,
    marginTop: 32,
    opacity: 0.6,
  },
});