import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import {
  useColorScheme,
} from '@/hooks/use-color-scheme';

import {
  AnimatedSplashOverlay,
} from '@/components/animated-icon';

import AppTabs from '@/components/app-tabs-shared';

import {
  SettingsRuntime,
} from '@/features/settings/settings-runtime';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <StatusBar
        style={
          colorScheme === 'dark'
            ? 'light'
            : 'dark'
        }
      />

      <AnimatedSplashOverlay />
      <SettingsRuntime />
      <AppTabs />
    </ThemeProvider>
  );
}