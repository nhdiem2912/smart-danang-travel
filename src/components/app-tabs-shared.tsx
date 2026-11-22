import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSettingsColors } from '@/features/settings/settings-colors';
import {
  translate,
  type MessageKey,
} from '@/features/settings/settings-i18n';
import { useAppSettings } from '@/features/settings/settings-store';

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
    icon: 'git-network-outline',
    activeIcon: 'git-network',
  },
  {
    name: 'settings',
    title: 'settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];

function TravelTabBar({
  state,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const c = useSettingsColors();
  const { settings } = useAppSettings();

  return (
    <View style={[
      styles.bar,
      {
        backgroundColor: c.card,
        borderTopColor: c.line,
        paddingBottom: Math.max(insets.bottom, 6),
      },
    ]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const tab = tabs.find(
            item => item.name === route.name,
          );

          if (!tab) return null;

          const focused = state.index === index;
          const center = tab.name === 'assistant';

          const label = translate(
            settings?.language ?? 'vi',
            tab.title,
          );

          return (
            <Pressable
              key={route.key}
              testID={`tab-${tab.name}`}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{
                selected: focused,
              }}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (
                  !focused &&
                  !event.defaultPrevented
                ) {
                  navigateToTab(route.key);
                }
              }}
              onLongPress={() =>
                emitter.emit({
                  type: 'tabLongPress',
                  target: route.key,
                })
              }
              style={({ pressed }) => [
                styles.item,
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              {center ? (
                <View style={[
                  styles.robotRing,
                  {
                    borderColor: c.card,
                    backgroundColor: c.pale,
                  },
                ]}>
                  <View style={styles.robotFace}>
                    <MaterialCommunityIcons
                      name="robot-happy-outline"
                      size={27}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              ) : (
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
                  style={styles.icon}
                />
              )}

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  styles.label,
                  {
                    color:
                      focused || center
                        ? c.green
                        : c.muted,
                    fontWeight:
                      focused ? '800' : '600',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabsShared() {
  const { settings } = useAppSettings();

  return (
    <Tabs
      tabBar={props => <TravelTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
  },
  row: {
    height: 59,
    flexDirection: 'row',
    overflow: 'visible',
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
  },
  robotRing: {
    position: 'absolute',
    bottom: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#087F61',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 5,
  },
  robotFace: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3E8E4F',
  },
});