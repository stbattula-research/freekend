import { Colors } from '@/constants/colors';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle:           { backgroundColor: Colors.navy },
        headerTitleStyle:      { color: Colors.cream, fontWeight: '700', fontSize: 18 },
        tabBarStyle:           { backgroundColor: Colors.navy, borderTopColor: Colors.red, borderTopWidth: 2 },
        tabBarActiveTintColor:   Colors.red,
        tabBarInactiveTintColor: Colors.steel,
        tabBarLabelStyle:      { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Freekend',
          tabBarLabel: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Movies',
          tabBarLabel: 'Movies',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎬</Text>,
        }}
      />
      <Tabs.Screen
        name="eat"
        options={{
          title: 'Restaurants',
          tabBarLabel: 'Eat',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🍽</Text>,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarLabel: 'Events',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎭</Text>,
        }}
      />
      <Tabs.Screen
        name="framebot"
        options={{
          title: 'FrameBot',
          tabBarLabel: 'FrameBot',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🤖</Text>,
        }}
      />
    </Tabs>
  );
}