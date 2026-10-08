import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

const ICONS: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  index: 'home-outline',
  movies: 'film-outline',
  eat: 'restaurant-outline',
  events: 'ticket-outline',
  framebot: 'chatbubble-ellipses-outline',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarBackground: () => (
          <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.hairline,
          elevation: 0,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.secondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={25} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="movies" options={{ title: 'Movies' }} />
      <Tabs.Screen name="eat" options={{ title: 'Eat' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="framebot" options={{ title: 'FrameBot' }} />
    </Tabs>
  );
}
