// import { MapView } from '@googlemaps/react-native-navigation-sdk';

// export default function ItineraryMap() {
//   return (
//     <MapView
//       style={{ flex: 1 }}
//       initialCameraPosition={{
//         target: {
//           lat: 16.0598,
//           lng: 108.2468,
//         },
//         zoom: 13,
//       }}
//       mapToolbarEnabled={false}
//     />
//   );
// }
import { MapView } from '@googlemaps/react-native-navigation-sdk';

export default function ItineraryMap() {
  return (
    <MapView
      style={{ flex: 1 }}
      initialCameraPosition={{
        target: {
          lat: 16.0598,
          lng: 108.2468,
        },
        zoom: 13,
      }}
      mapToolbarEnabled={false}
    />
  );
}