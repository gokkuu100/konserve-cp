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
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import ConstituencyManager from '../supabase/manager/constituencychange/ConstituencyManager';
import { useAuth } from '../contexts/AuthContext';
import ConstituencyChangeRequest from './ConstituencyChangeRequest';

const EditProfileScreen = ({ navigation, route }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [changeRequestModalVisible, setChangeRequestModalVisible] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const { user, userId, isAuthenticated, signIn, signOut, signUp } = useAuth();

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserProfile();
    checkPendingRequests();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, loading]);

  // Fetch user profile from ProfileManager
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await ProfileManager.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await ProfileManager.getUserProfile();
      
      if (error) throw error;
      
      if (data) {
        setUserData({
          fullName: data.full_name || '',
          email: currentUser.email || '',
          phoneNumber: data.phone_number || '',
          gender: data.gender || '',
          age: data.age || '',
          avatar: data.avatar_url || null,
          membershipType: data.membership_type || 'Standard',
          county: data.county || 'Nairobi City County',
          constituency: data.constituency || ''
        });
        
        setSelectedGender(data.gender || '');
        setSelectedAge(data.age || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load your profile information');
    } finally {
      setLoading(false);
    }
  };

  // Check pending constituency requests using ConstituencyManager
  const checkPendingRequests = async () => {
    try {
      const userId = await ProfileManager.getCurrentUserId();
      if (!userId) return;
      
      const { success, hasPendingRequest, request, error } = await ConstituencyManager.checkPendingRequests(userId);
      
      if (success && hasPendingRequest) {
        setHasPendingRequest(true);
        setPendingRequest(request);
      } else {
        setHasPendingRequest(false);
        setPendingRequest(null);
      }
    } catch (error) {
      console.error('Error checking pending requests:', error);
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

  // Function to upload avatar using ProfileManager
  const handleAvatarUpload = async (fileInfo) => {
    try {
      setLoading(true);
      
      // Update UI immediately while uploading
      setUserData({ ...userData, avatar: fileInfo.uri });
      
      const userId = await ProfileManager.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Use uploadAvatar method from ProfileManager
      const { publicUrl, error } = await ProfileManager.uploadAvatar(userId, {
        uri: fileInfo.uri,
        type: fileInfo.type,
        name: fileInfo.fileName || 'profile-image.jpg'
      });
      
      if (error) {
        throw error;
      }
      
      // Update local state with the public URL
      setUserData(prevData => ({
        ...prevData,
        avatar: publicUrl
      }));
      
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

  // Function to save profile changes using ProfileManager
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await ProfileManager.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Prepare profile data for update - matching the expected field names in ProfileManager
      const profileData = {
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber,
        email: userData.email,
        constituency: userData.constituency,
        county: userData.county,
        gender: selectedGender || userData.gender,
        age: selectedAge || userData.age
      };
      
      // Update profile using ProfileManager
      const { data, error } = await ProfileManager.updateUserDashboardData(userId, profileData);
      
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
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to determine membership type text color
  const getMembershipTypeColor = () => {
    if (!userData) return '#000000';
    
    switch (userData.membershipType.toLowerCase()) {
      case 'gold':
        return '#d4af37';
      case 'green':
        return '#00AA00';
      default:
        return '#000000';
    }
  };

  // Generate age options from 18 to 100
  const generateAgeOptions = () => {
    const ages = [];
    for (let i = 18; i <= 100; i++) {
      ages.push(i.toString());
    }
    return ages;
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    setGenderModalVisible(false);
    setUserData(prevData => ({
      ...prevData,
      gender: gender
    }));
  };

  const handleAgeSelect = (age) => {
    setSelectedAge(age);
    setAgeModalVisible(false);
    setUserData(prevData => ({
      ...prevData,
      age: age
    }));
  };

  // Handle constituency change request
  const handleConstituencyChangeRequest = () => {
    // Check if user already has a pending request
    if (hasPendingRequest) {
      Alert.alert(
        'Pending Request',
        'You already have a pending constituency change request. Would you like to view its status or cancel it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Status', 
            onPress: () => {
              Alert.alert(
                'Request Status',
                `Current Constituency: ${pendingRequest.current_constituency}\nRequested Constituency: ${pendingRequest.requested_constituency}\nStatus: ${pendingRequest.status}\nSubmitted: ${new Date(pendingRequest.created_at).toLocaleDateString()}`,
                [{ text: 'OK' }]
              );
            } 
          },
          { 
            text: 'Cancel Request', 
            style: 'destructive',
            onPress: async () => {
              try {
                const { success, error } = await ConstituencyManager.cancelRequest(pendingRequest.id);
                
                if (!success) {
                  throw new Error(error?.message || 'Failed to cancel request');
                }
                
                Alert.alert('Success', 'Your constituency change request has been cancelled.');
                setHasPendingRequest(false);
                setPendingRequest(null);
              } catch (error) {
                console.error('Error cancelling request:', error);
                Alert.alert('Error', error.message || 'Failed to cancel request');
              }
            } 
          }
        ]
      );
      return;
    }
    
    // Show the constituency change request modal
    setChangeRequestModalVisible(true);
  };
  
  // Handle successful constituency change request
  const handleRequestSubmitted = (success) => {
    setChangeRequestModalVisible(false);
    
    if (success) {
      // Refresh pending requests
      checkPendingRequests();
    }
  };

  if (loading && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#357002" />
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

        {/* Gender - Modified to use modal */}
        <Text style={styles.sectionLabel}>Gender</Text>
        <TouchableOpacity 
          style={styles.inputCard}
          onPress={() => setGenderModalVisible(true)}
        >
          <View style={styles.selectionField}>
            <Text style={userData.gender ? styles.fieldValue : styles.fieldPlaceholder}>
              {userData.gender || "Not set"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#357002" />
          </View>
        </TouchableOpacity>

        {/* Age - Added field */}
        <Text style={styles.sectionLabel}>Age</Text>
        <TouchableOpacity 
          style={styles.inputCard}
          onPress={() => setAgeModalVisible(true)}
        >
          <View style={styles.selectionField}>
            <Text style={userData.age ? styles.fieldValue : styles.fieldPlaceholder}>
              {userData.age || "Not set"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#357002" />
          </View>
        </TouchableOpacity>

        {/* County */}
        <Text style={styles.sectionLabel}>County</Text>
        <TouchableOpacity 
          style={[styles.inputCard, styles.disabledInput]}
          disabled={true}
        >
          <View style={styles.selectionField}>
            <Text style={styles.fieldValue}>
              {userData.county || "Nairobi City County"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Constituency */}
        <Text style={styles.sectionLabel}>Constituency</Text>
        <View style={styles.inputCard}>
          <View style={styles.selectionField}>
            <Text style={styles.fieldValue}>
              {userData.constituency || 'Not set'}
              {hasPendingRequest && (
                <View style={styles.pendingBadgeContainer}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Change Pending</Text>
                  </View>
                </View>
              )}
            </Text>
            <TouchableOpacity onPress={handleConstituencyChangeRequest}>
              <Text style={[styles.linkText, { color: '#357002' }]}>
                {hasPendingRequest ? 'View Request' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Membership type - Color-coded */}
        <Text style={styles.sectionLabel}>Membership type</Text>
        <View style={styles.inputCard}>
          <Text style={[styles.linkText, { color: getMembershipTypeColor() }]}>
            {userData.membershipType}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Gender Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={genderModalVisible}
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.modalOption,
                    selectedGender === gender && styles.selectedOption
                  ]}
                  onPress={() => handleGenderSelect(gender)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedGender === gender && styles.selectedOptionText
                  ]}>
                    {gender}
                  </Text>
                  {selectedGender === gender && (
                    <Ionicons name="checkmark" size={20} color="#357002" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Age Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ageModalVisible}
        onRequestClose={() => setAgeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Age</Text>
              <TouchableOpacity onPress={() => setAgeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {generateAgeOptions().map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.modalOption,
                    selectedAge === age && styles.selectedOption
                  ]}
                  onPress={() => handleAgeSelect(age)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedAge === age && styles.selectedOptionText
                  ]}>
                    {age}
                  </Text>
                  {selectedAge === age && (
                    <Ionicons name="checkmark" size={20} color="#357002" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Constituency Change Request Modal */}
      <ConstituencyChangeRequest
        visible={changeRequestModalVisible}
        onClose={handleRequestSubmitted}
        currentConstituency={userData?.constituency || 'Not set'}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
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
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  editText: {
    color: '#357002',
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
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  nameInput: {
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  disabledInput: {
    color: '#999',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#357002',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 24,
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
    marginTop: 16,
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
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#357002',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  fieldPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedOption: {
    backgroundColor: '#f0f9f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#357002',
    fontWeight: '500',
  },
  pendingBadgeContainer: {
    marginLeft: 8,
  },
  pendingBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EditProfileScreen;