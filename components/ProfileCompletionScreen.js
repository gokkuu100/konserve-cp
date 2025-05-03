import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import SupabaseManager from './SupabaseManager';
import authManager from '../auth';
import LocationSelectionModal from './LocationSelectionModal';
import { Ionicons } from '@expo/vector-icons';

const ProfileCompletionScreen = ({ route, navigation }) => {
  const { user } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    county: 'Nairobi',
    constituency: '',
    phone_number: '',
  });
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  
  // Nairobi constituencies
  const constituencies = [
    "Westlands",
    "Dagoretti North",
    "Dagoretti South",
    "Lang'ata",
    "Kibra",
    "Roysambu",
    "Kasarani",
    "Ruaraka",
    "Embakasi South",
    "Embakasi North",
    "Embakasi Central",
    "Embakasi East",
    "Embakasi West",
    "Makadara",
    "Kamukunji",
    "Starehe",
    "Mathare"
  ];

  useEffect(() => {
    // If user has some existing profile data, pre-fill the form
    if (route.params?.existingProfile) {
      const { username, county, constituency, phone_number } = route.params.existingProfile;
      setForm({
        username: username || '',
        county: county || 'Nairobi',
        constituency: constituency || '',
        phone_number: phone_number || '',
      });
    }
  }, [route.params]);

  const handleSubmit = async () => {
    // Validate form
    if (!form.username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    
    if (!form.constituency) {
      Alert.alert('Error', 'Please select your constituency');
      return;
    }
    
    if (!form.phone_number.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    
    // Simple phone number validation
    const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(form.phone_number)) {
      Alert.alert('Error', 'Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current user
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Update user profile
      const { success, error } = await SupabaseManager.updateUserProfileAfterGoogleSignIn(
        currentUser.id,
        form
      );
      
      if (!success) {
        throw new Error(error || 'Failed to update profile');
      }
      
      Alert.alert(
        'Success',
        'Your profile has been updated successfully',
        [{ text: 'OK', onPress: () => navigation.replace('Home') }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Please provide the following information to continue</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={form.username}
            onChangeText={(text) => setForm({ ...form, username: text })}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>County</Text>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerText}>Nairobi</Text>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Constituency</Text>
          <TouchableOpacity 
            style={styles.locationSelector}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={form.constituency ? styles.locationText : styles.locationPlaceholder}>
              {form.constituency || "Select your constituency"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#357002" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 0712345678 or +254712345678"
            value={form.phone_number}
            onChangeText={(text) => setForm({ ...form, phone_number: text })}
            keyboardType="phone-pad"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <LocationSelectionModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCounty={(county) => setForm({ ...form, county })}
        onSelectConstituency={(constituency) => setForm({ ...form, constituency })}
        selectedCounty={form.county}
        selectedConstituency={form.constituency}
        isCountySelectable={false}
        title="Select Your Location"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fdf6fb',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  submitButton: {
    backgroundColor: '#357002',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  locationPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
});

export default ProfileCompletionScreen;
