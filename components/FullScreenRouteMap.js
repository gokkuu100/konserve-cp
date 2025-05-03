import React from 'react';
import { StyleSheet, View, TouchableOpacity, SafeAreaView, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

const FullScreenRouteMap = ({ route, onClose }) => {
  const getRegion = () => {
    const coordinates = route.route_coordinates;
    let minLat = Math.min(...coordinates.map(coord => coord.lat));
    let maxLat = Math.max(...coordinates.map(coord => coord.lat));
    let minLng = Math.min(...coordinates.map(coord => coord.lng));
    let maxLng = Math.max(...coordinates.map(coord => coord.lng));

    const padding = 0.005;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + padding * 2,
      longitudeDelta: (maxLng - minLng) + padding * 2,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{route.route_name}</Text>
      </View>
      
      <MapView
        style={styles.map}
        initialRegion={getRegion()}
      >
        <Polyline
          coordinates={route.route_coordinates.map(coord => ({
            latitude: coord.lat,
            longitude: coord.lng,
          }))}
          strokeWidth={3}
          strokeColor="#4CAF50"
        />
        
        <Marker
          coordinate={{
            latitude: route.route_coordinates[0].lat,
            longitude: route.route_coordinates[0].lng,
          }}
          pinColor="#4CAF50"
        >
          <MaterialIcons name="location-on" size={24} color="#4CAF50" />
        </Marker>
      </MapView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
});

export default FullScreenRouteMap; 