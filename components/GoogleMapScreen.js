import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Modal, 
  ScrollView, 
  Linking, 
  Platform,
  StatusBar,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GoogleMapManager from './GoogleMapManager';

const GoogleMapScreen = ({ navigation }) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(GoogleMapManager.initialRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupMap = async () => {
      try {
        const hasPermission = await GoogleMapManager.requestLocationPermission();
        if (hasPermission) {
          const location = await GoogleMapManager.getCurrentLocation();
          if (location) {
            setUserLocation(location);
            setRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }
        }
      } catch (error) {
        console.log('Error setting up map:', error);
      } finally {
        setLoading(false);
      }
    };

    setupMap();
  }, []);

  const centerMapOnUserLocation = async () => {
    try {
      const location = await GoogleMapManager.getCurrentLocation();
      setUserLocation(location);
      
      mapRef.current?.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch (error) {
      console.log('Error getting current location:', error);
    }
  };

  const openDirections = () => {
    if (selectedMarker) {
      const url = GoogleMapManager.openDirections(
        selectedMarker.coordinate.latitude, 
        selectedMarker.coordinate.longitude
      );
      
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with back button */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recycling Centers</Text>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#357002" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef} 
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
          loadingEnabled={loading}
          >
          {GoogleMapManager.recyclingPoints.map(marker => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.name}
              description={marker.type}
              pinColor={marker.type === "4-in-1" ? "#4CAF50" : "#2196F3"}
              onPress={() => {
                setSelectedMarker(marker);
                setModalVisible(true);
              }}
            />
          ))}
        </MapView>
      )}

      {/* My Location Button */}
      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={centerMapOnUserLocation}
      >
        <Ionicons name="locate" size={24} color="#000" />
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>4-in-1 Collection Points</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>2-in-1 Collection Points</Text>
        </View>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            {selectedMarker && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedMarker.name}</Text>
                <Text style={styles.modalType}>{selectedMarker.type}</Text>
                <Text style={styles.modalDescription}>{selectedMarker.description}</Text>
                
                <TouchableOpacity 
                  style={styles.directionsButton} 
                  onPress={openDirections}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    position: 'absolute',
    left: 16,
    bottom: 120,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalType: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  modalDescription: {
    marginBottom: 20,
    lineHeight: 20,
  },
  directionsButton: {
    backgroundColor: '#7b68ee',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default GoogleMapScreen;