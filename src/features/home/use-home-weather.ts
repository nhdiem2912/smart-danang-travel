import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadHomeWeather, type HomeWeather } from './home-weather';

export const WEATHER_REFRESH_MS = 5 * 60 * 1000;

export function useHomeWeather() {
  const [weather, setWeather] = useState<HomeWeather | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const refreshRequest = useRef<() => void>(() => {});
  const refreshWeather = useCallback(() => refreshRequest.current(), []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    let foreground = AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive';
    let interval: ReturnType<typeof setInterval> | undefined;
    let controller: AbortController | null = null;

    async function refresh() {
      if (!alive || !foreground || controller) return;
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 15000);
      try {
        const value = await loadHomeWeather(request.signal);
        if (alive && foreground && !request.signal.aborted) {
          setWeather(value);
          setWeatherError('');
        }
      } catch {
        if (alive && foreground && controller === request) {
          // Keep the last successful forecast visible, marked as not refreshed.
          setWeatherError('Chưa tải được thời tiết · Nhấn làm mới');
        }
      } finally {
        clearTimeout(timeout);
        if (controller === request) controller = null;
      }
    }

    function start() {
      clearInterval(interval);
      void refresh();
      interval = setInterval(() => { void refresh(); }, WEATHER_REFRESH_MS);
    }

    refreshRequest.current = () => { void refresh(); };
    const subscription = AppState.addEventListener('change', state => {
      const wasForeground = foreground;
      foreground = state === 'active';
      if (foreground && !wasForeground) start();
      if (!foreground) {
        clearInterval(interval);
        controller?.abort();
        controller = null;
      }
    });
    if (foreground) start();

    return () => {
      alive = false;
      refreshRequest.current = () => {};
      clearInterval(interval);
      controller?.abort();
      subscription.remove();
    };
  }, []));

  return { weather, weatherError, refreshWeather };
}
