import { Text, View } from 'react-native';

export default function ItineraryMap() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <Text style={{ color: '#64748B', fontSize: 11 }}>
        Kiểm tra bản đồ Google Maps trên bản Android.
      </Text>
    </View>
  );
}