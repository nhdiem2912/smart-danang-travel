import {
    useEffect,
    useSyncExternalStore,
} from 'react';

import {
    getCatalogState,
    subscribeCatalog,
} from './places.local';

import {
    refreshPlaces,
} from './places-sync';

export function usePlacesCatalog() {
  const state = useSyncExternalStore(
    subscribeCatalog,
    getCatalogState,
    getCatalogState,
  );

  useEffect(() => {
    void refreshPlaces();

    const timer = setInterval(
      () => {
        void refreshPlaces();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(timer);
  }, []);

  return state;
}