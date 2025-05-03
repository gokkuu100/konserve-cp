import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import ReportsManager from '../supabase/manager/reports/ReportsManager';
import { useAuth } from '../contexts/AuthContext';

const ReportEnvironmentScreen = ({ navigation }) => {
  const { user, userId, isAuthenticated, loading } = useAuth();
  // State variables
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [isUsingLiveLocation, setIsUsingLiveLocation] = useState(false);
  const [address, setAddress] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [incidentType, setIncidentType] = useState('');
  const [severity, setSeverity] = useState('medium');
  
  // Authentication check
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, loading]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  
  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setLocationPermission(locationStatus === 'granted');
      
      if (locationStatus === 'granted') {
        fetchCurrentLocation();
      }
    })();
  }, []);

  // Animation effect for the modal
  useEffect(() => {
    if (showModal) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Animation sequence for checkmark
      Animated.sequence([
        Animated.timing(checkmarkScale, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
      
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      checkmarkScale.setValue(0);
      checkmarkOpacity.setValue(0);
    }
  }, [showModal, fadeAnim, checkmarkScale, checkmarkOpacity]);

  // Fetch current location
  const fetchCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
      
      // Reverse geocode to get address
      const [result] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result) {
        const addressStr = `${result.street || ''}, ${result.city || ''}, ${result.region || ''}, ${result.country || ''}`;
        setAddress(addressStr.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ','));
      }
      
      setIsUsingLiveLocation(true);
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Location Error', 'Unable to fetch your current location. Please try again or enter location manually.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Pick images from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if adding new images would exceed the limit
        if (images.length + result.assets.length > 5) {
          Alert.alert('Limit Exceeded', 'You can only upload a maximum of 5 images.');
          return;
        }
        
        setImages([...images, ...result.assets.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert('Limit Reached', 'You can only upload a maximum of 5 images.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  // Remove image
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // Toggle map view
  const toggleMap = () => {
    setShowMap(!showMap);
  };

  // Handle custom location selection from map
  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setLocation(coordinate);
    setIsUsingLiveLocation(false);
    
    // Reverse geocode to get address
    (async () => {
      try {
        const [result] = await Location.reverseGeocodeAsync(coordinate);
        if (result) {
          const addressStr = `${result.street || ''}, ${result.city || ''}, ${result.region || ''}, ${result.country || ''}`;
          setAddress(addressStr.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ','));
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
      }
    })();
  };

  // Submit report
  const submitReport = async () => {
    try {
      if (!description) {
        Alert.alert('Description Required', 'Please provide a description of the environmental issue.');
        return;
      }
      
      if (!location) {
        Alert.alert('Location Required', 'Please provide the location of the incident.');
        return;
      }
      
      if (!incidentType) {
        Alert.alert('Incident Type Required', 'Please select the type of environmental incident.');
        return;
      }

      setSubmitting(true);
      
      // Format images for upload
      const formattedImages = images.map(uri => ({
        uri,
        type: 'image/jpeg',
        name: `image-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      }));
      
      // Create report data object aligned with database schema
      const reportData = {
        incident_type: incidentType,
        description: description,
        address: address,
        location_lat: location ? location.latitude : null,
        location_lng: location ? location.longitude : null,
        severity: severity,
        user_id: userId,
        status: 'pending',
        images: formattedImages
      };
      
      // Submit report to Supabase
      const { data, error } = await ReportsManager.submitEnvironmentalCase(reportData);
      
      if (error) {
        console.error('Error submitting report:', error);
        Alert.alert('Submission Error', error.message || 'Failed to submit your report. Please try again.');
        setSubmitting(false);
        return;
      }
      
      // Show success modal
      setShowModal(true);
      
      // Reset form after successful submission (after modal is shown)
      setTimeout(() => {
        setShowModal(false);
        setImages([]);
        setDescription('');
        setIncidentType('');
        setSeverity('medium');
        // Keep location as is for convenience
        
        // Navigate back after processing
        navigation.navigate('Options', { reportSubmitted: true });
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const incidentTypes = [
    { id: 'illegal_dumping', label: 'Illegal Dumping', icon: 'trash' },
    { id: 'water_pollution', label: 'Water Pollution', icon: 'water' },
    { id: 'deforestation', label: 'Deforestation', icon: 'tree' },
    { id: 'air_pollution', label: 'Air Pollution', icon: 'cloud' },
    { id: 'other', label: 'Other', icon: 'exclamation-circle' }
  ];

  const severityLevels = [
    { id: 'low', label: 'Low', color: '#4CAF50' },
    { id: 'medium', label: 'Medium', color: '#FFC107' },
    { id: 'high', label: 'High', color: '#F44336' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report Environmental Issue</Text>
          </View>

          {/* Incident Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Type</Text>
            <Text style={styles.sectionSubtitle}>Select the type of environmental issue</Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.incidentTypeContainer}
            >
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.incidentTypeButton,
                    incidentType === type.id && styles.incidentTypeButtonActive
                  ]}
                  onPress={() => setIncidentType(type.id)}
                >
                  <FontAwesome5 
                    name={type.icon} 
                    size={20} 
                    color={incidentType === type.id ? '#fff' : '#555'} 
                  />
                  <Text 
                    style={[
                      styles.incidentTypeText,
                      incidentType === type.id && styles.incidentTypeTextActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Severity Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity Level</Text>
            <Text style={styles.sectionSubtitle}>How severe is this environmental issue?</Text>
            
            <View style={styles.severityContainer}>
              {severityLevels.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.severityButton,
                    severity === level.id && {
                      backgroundColor: `${level.color}20`, // Add transparency to color
                      borderColor: level.color,
                      borderWidth: 2,
                      shadowColor: level.color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 3
                    }
                  ]}
                  onPress={() => setSeverity(level.id)}
                >
                  <View 
                    style={[
                      styles.severityDot, 
                      { backgroundColor: level.color },
                      severity === level.id && {
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        shadowColor: level.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 5
                      }
                    ]} 
                  />
                  <Text 
                    style={[
                      styles.severityText,
                      severity === level.id && { 
                        color: level.color, 
                        fontWeight: '700',
                        fontSize: 16
                      }
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.sectionSubtitle}>Add up to 5 photos of the environmental issue</Text>
            
            <View style={styles.photoContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <View style={styles.photoButtonsContainer}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={28} color="#4CAF50" />
                    <Text style={styles.photoButtonText}>Camera</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="images" size={28} color="#4CAF50" />
                    <Text style={styles.photoButtonText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.sectionSubtitle}>Provide the location of the environmental issue</Text>
            
            <View style={styles.locationContainer}>
              <View style={styles.locationHeader}>
                <View style={styles.locationIconContainer}>
                  <Ionicons 
                    name={isUsingLiveLocation ? "location" : "location-outline"} 
                    size={24} 
                    color={isUsingLiveLocation ? "#4CAF50" : "#666"} 
                  />
                  <Text style={styles.locationStatus}>
                    {isUsingLiveLocation ? "Using current location" : "Custom location"}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={fetchCurrentLocation}
                  disabled={loadingLocation || !locationPermission}
                >
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={16} color="#fff" />
                      <Text style={styles.locationButtonText}>Use My Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.locationInput}
                placeholder="Enter address or description of location"
                value={address}
                onChangeText={setAddress}
                multiline
              />
              
              <TouchableOpacity
                style={styles.mapToggleButton}
                onPress={toggleMap}
              >
                <Ionicons name={showMap ? "map" : "map-outline"} size={18} color="#4CAF50" />
                <Text style={styles.mapToggleText}>
                  {showMap ? "Hide Map" : "Show Map"}
                </Text>
              </TouchableOpacity>
              
              {showMap && location && (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onPress={handleMapPress}
                  >
                    <Marker
                      coordinate={location}
                      draggable
                      onDragEnd={(e) => handleMapPress(e)}
                    />
                  </MapView>
                  <Text style={styles.mapInstructions}>
                    Tap or drag the marker to set the exact location
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionSubtitle}>Describe the environmental issue in detail</Text>
            
            <TextInput
              style={styles.descriptionInput}
              placeholder="Provide details about the environmental issue. What do you see? How severe is it? When did you notice it?"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              numberOfLines={6}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitReport}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {submitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Submitting your report...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we process your information</Text>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Animated.View style={{
                transform: [{ scale: checkmarkScale }],
                opacity: checkmarkOpacity,
              }}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={64} color="#fff" />
                </View>
              </Animated.View>
            </View>
            
            <Text style={styles.modalTitle}>Report Submitted!</Text>
            <Text style={styles.modalText}>
              Thank you for your contribution to environmental protection. 
              Your report has been sent to the relevant authorities.
            </Text>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  incidentTypeContainer: {
    paddingVertical: 8,
  },
  incidentTypeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 100,
  },
  incidentTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  incidentTypeText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  incidentTypeTextActive: {
    color: '#fff',
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  photoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    width: 100,
    height: 100,
    backgroundColor: '#f9fff9',
    margin: 5,
  },
  photoButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
  },
  locationContainer: {
    marginTop: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationStatus: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
  mapToggleText: {
    marginLeft: 4,
    color: '#4CAF50',
    fontSize: 14,
  },
  mapContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  map: {
    height: 200,
    width: '100%',
  },
  mapInstructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
  },
  submitButtonContainer: {
    margin: 16,
    marginBottom: 30,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 30,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Severity styles
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  severityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    flex: 1,
    backgroundColor: '#fff',
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ReportEnvironmentScreen;