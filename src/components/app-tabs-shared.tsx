import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import {
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
    useAppSettings,
} from '@/features/settings/settings-store';

import {
    translate,
    type MessageKey,
} from '@/features/settings/settings-i18n';

import {
    useSettingsColors,
} from '@/features/settings/settings-colors';

type IconName =
  ComponentProps<typeof Ionicons>['name'];

const tabs: {
  name: string;
  title: MessageKey;
  icon: IconName;
  activeIcon: IconName;
}[] = [
  {
    name: 'index',
    title: 'home',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: 'explore',
    title: 'explore',
    icon: 'compass-outline',
    activeIcon: 'compass',
  },
  {
    name: 'assistant',
    title: 'assistant',
    icon: 'chatbubble-ellipses-outline',
    activeIcon: 'chatbubble-ellipses',
  },
  {
    name: 'itinerary',
    title: 'itinerary',
    icon: 'map-outline',
    activeIcon: 'map',
  },
  {
    name: 'settings',
    title: 'settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

export default function AppTabsShared() {
  const insets = useSafeAreaInsets();
  const { settings } = useAppSettings();
  const c = useSettingsColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 13,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
        },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.line,
          height: 62 + insets.bottom,
          paddingTop: 5,
          paddingBottom: Math.max(
            insets.bottom,
            5,
          ),
        },
      }}
    >
      {tabs.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: translate(
              settings?.language ?? 'vi',
              tab.title,
            ),
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={
                  focused
                    ? tab.activeIcon
                    : tab.icon
                }
                size={23}
                color={
                  focused
                    ? c.green
                    : c.muted
                }
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}