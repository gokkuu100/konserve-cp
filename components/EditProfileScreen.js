import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import SupabaseManager from './SupabaseManager';

const EditProfileScreen = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSetGender, setHasSetGender] = useState(false);
  const [isEditingGender, setIsEditingGender] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupabaseManager.getUserProfile();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setUserData({
          fullName: data.full_name || '',
          email: data.email || '',
          phoneNumber: data.phone_number || '',
          location: data.location || '',
          gender: data.gender || '',
          avatar: data.avatar_url || null,
          membershipType: data.membership_type || 'Standard'
        });
        
        // Check if gender has been set previously
        setHasSetGender(!!data.gender);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load your profile information');
    } finally {
      setLoading(false);
    }
  };

  // Request permission for image library
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload images.');
        }
      }
    })();
  }, []);

  // Function to handle image selection options
  const handleImageSelection = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { 
          text: 'Take Photo', 
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Sorry, we need camera permissions to take pictures.');
              return;
            }
        
            let result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
        
            if (!result.canceled) {
              handleAvatarUpload(result.assets[0]);
            }
          } 
        },
        { 
          text: 'Choose from Gallery', 
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
        
            if (!result.canceled) {
              handleAvatarUpload(result.assets[0]);
            }
          } 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Function to upload avatar to Supabase
  const handleAvatarUpload = async (fileInfo) => {
    try {
      setLoading(true);
      
      // Update UI immediately while uploading
      setUserData({ ...userData, avatar: fileInfo.uri });
      
      const { data, error } = await SupabaseManager.uploadAvatar(fileInfo, fileInfo.uri);
      
      if (error) {
        throw error;
      }
      
      // Refresh user data to get the updated avatar URL
      fetchUserProfile();
      
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
      // Revert to previous avatar on error
      fetchUserProfile();
    } finally {
      setLoading(false);
    }
  };

  // Function to save profile changes
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Prepare profile data for update
      const profileData = {
        full_name: userData.fullName,
        phone_number: userData.phoneNumber,
        location: userData.location
      };
      
      // Only update gender if it hasn't been set before and user is editing it
      if (!hasSetGender && isEditingGender && userData.gender) {
        profileData.gender = userData.gender;
        setHasSetGender(true);
      }
      
      const { error } = await SupabaseManager.updateUserProfile(profileData);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Success', 'Profile updated successfully');
      
      // Pass updated user data back to Options screen
      navigation.navigate('Options', { 
        updatedUser: {
          fullName: userData.fullName,
          avatar: userData.avatar,
          membershipType: userData.membershipType
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Function to determine membership type text color
  const getMembershipTypeColor = () => {
    if (!userData) return '#000000';
    
    switch (userData.membershipType.toLowerCase()) {
      case 'gold':
        return '#FFD700';
      case 'green':
        return '#00AA00';
      default:
        return '#000000';
    }
  };

  if (loading && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366CC" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile data.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile picture and name card */}
        <View style={styles.card}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person" size={60} color="#333" />
                </View>
              )}
              <TouchableOpacity onPress={handleImageSelection}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileTextContainer}>
              <Text style={styles.profileInstructionText}>
                Enter your name and add an optional profile picture
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Name Input */}
          <TextInput
            style={styles.nameInput}
            value={userData.fullName}
            onChangeText={(text) => setUserData({ ...userData, fullName: text })}
            placeholder="Full Name"
          />
        </View>

        {/* Email - Non-editable */}
        <Text style={styles.sectionLabel}>Email</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={userData.email}
            editable={false}
          />
        </View>

        {/* Phone number */}
        <Text style={styles.sectionLabel}>Phone number</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={userData.phoneNumber}
            onChangeText={(text) => setUserData({ ...userData, phoneNumber: text })}
            keyboardType="phone-pad"
          />
        </View>

        {/* Gender - Modified to require user action to edit */}
        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.inputCard}>
          {hasSetGender ? (
            <TextInput 
              style={[styles.input, styles.disabledInput]}
              value={userData.gender}
              editable={false}
            />
          ) : isEditingGender ? (
            <Picker
              selectedValue={userData.gender}
              style={styles.input}
              onValueChange={(itemValue) => setUserData({ ...userData, gender: itemValue })}
            >
              <Picker.Item label="Select gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
              <Picker.Item label="Prefer not to say" value="Prefer not to say" />
            </Picker>
          ) : (
            <TouchableOpacity 
              style={styles.genderEditButton} 
              onPress={() => setIsEditingGender(true)}
            >
              <Text style={styles.genderEditText}>
                {userData.gender || "Click to set gender"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#3366CC" />
            </TouchableOpacity>
          )}
        </View>

        {/* Location/Address */}
        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={userData.location}
            onChangeText={(text) => setUserData({ ...userData, location: text })}
          />
        </View>

        {/* Membership type - Color-coded */}
        <Text style={styles.sectionLabel}>Membership type</Text>
        <View style={styles.inputCard}>
          <Text style={[styles.linkText, { color: getMembershipTypeColor() }]}>
            {userData.membershipType}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  editText: {
    color: '#3366cc',
    fontWeight: '500',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileInstructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#e1e1e1',
    marginVertical: 16,
  },
  nameInput: {
    fontSize: 16,
    height: 50,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    padding: 16,
    height: 50,
  },
  disabledInput: {
    color: '#888',
    backgroundColor: '#f9f9f9',
  },
  linkText: {
    fontSize: 16,
    padding: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3366cc',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3366cc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  genderEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 16,
  },
  genderEditText: {
    fontSize: 16,
    color: '#3366CC',
  },
});

export default EditProfileScreen;