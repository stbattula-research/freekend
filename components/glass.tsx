// Shared Apple-glass primitives. Designed fresh for Freekend — no library imports.
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Colors, Glass } from '@/constants/colors';

// iOS-style soft drop shadow. BlurView needs overflow:hidden for its radius,
// so the shadow lives on an outer wrapper.
export const softShadow = {
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }
    : {}),
  ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
  ...(Platform.OS === 'web' ? { boxShadow: '0 8px 20px rgba(0,0,0,0.08)' } : {}),
} as unknown as ViewStyle;

export function GlassCard({
  children,
  style,
  radius = Glass.radius,
  intensity = Glass.blur,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
}) {
  return (
    <View style={[{ borderRadius: radius }, softShadow, style]}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={[styles.blur, { borderRadius: radius }]}
      >
        {children}
      </BlurView>
    </View>
  );
}

export function LargeTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.largeTitle, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function Caption({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

// iOS-style search field: frosted, magnifier, no heavy borders.
export function SearchField({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.searchWrap, style]}>
      <Ionicons name="search" size={17} color={Colors.secondary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.tertiary}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={Colors.tertiary} />
        </Pressable>
      )}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable style={[styles.primaryBtn, style]} onPress={onPress}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

// Icon per plan-item type — Ionicons only, never emoji.
export const TYPE_ICON: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  movie: 'film-outline',
  restaurant: 'restaurant-outline',
  event: 'ticket-outline',
  activity: 'airplane-outline',
};

// Deterministic pastel artwork tint per title — reads as intentional art
// direction (Apple-Music-like), not a missing-image fallback.
export function artTint(title: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return { bg: `hsl(${h}, 48%, 89%)`, fg: `hsl(${h}, 42%, 30%)` };
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.ink,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.ink,
  },
  caption: {
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: Colors.ink, padding: 0 },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
