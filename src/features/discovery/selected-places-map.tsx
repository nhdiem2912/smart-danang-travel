import { useDiscoveryUI } from '@/features/discovery/ui';
import type { Place } from '@/data/place.types';
import { Text, View } from 'react-native';
import type { TravelMode } from './trip-model';
import type { RoutePoint } from './trip-routing';

export type OverviewMapProps = {
  places: Place[];
  numbers?: number[];
  origin?: RoutePoint | null;
  travelMode?: TravelMode;
  totalStops?: number;
  onError: (message: string) => void;
};

export default function SelectedPlacesMap({
  places,
  numbers,
}: OverviewMapProps) {
  const { C } = useDiscoveryUI();

  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: C.input,
      }}
    >
      <Text style={{ color: C.ink }}>
        Bản đồ tương tác có trên ứng dụng Android/iOS.
      </Text>

      {places.map((place, i) => (
        <Text key={`${place.id}-${i}`} style={{ color: C.ink }}>
          {numbers?.[i] ?? i + 1}. {place.name}
        </Text>
      ))}
    </View>
  );
}