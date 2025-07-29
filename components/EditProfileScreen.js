import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/config/supabaseConfig';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import ConstituencyManager from '../supabase/manager/constituencychange/ConstituencyManager';
import { useTheme } from '../ThemeContext';
import ConstituencyChangeRequest from './ConstituencyChangeRequest';

const EditProfileScreen = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
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
          county: data.county || 'Nairobi County',
          constituency: data.constituency || ''
        });
        
        setSelectedGender(data.gender || '');
        setSelectedAge(data.age || '');
        
        // Check for any pending constituency change requests
        await checkPendingRequests();
        
        // Check if there are any approved changes that need processing
        await ConstituencyManager.processApprovedChanges();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load your profile information');
    } finally {
      setLoading(false);
    }
  };

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

// Function to handle image selection and upload
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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true 
          });
      
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.base64) {
              handleAvatarUploadWithBase64(asset);
            } else {
              Alert.alert('Error', 'Failed to get image data. Please try again.');
            }
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
            base64: true 
          });
      
          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (asset.base64) {
              handleAvatarUploadWithBase64(asset);
            } else {
              Alert.alert('Error', 'Failed to get image data. Please try again.');
            }
          }
        } 
      },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
};

// Function to handle buffer-based avatar upload
const handleAvatarUploadWithBase64 = async (asset) => {
  try {
    setLoading(true);
    
    setUserData(prevData => ({
      ...prevData,
      avatar: asset.uri
    }));
    
    // Get current user ID
    const userId = await ProfileManager.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Determine file type and extension
    const fileType = asset.type || 'image/jpeg';
    const fileExt = fileType.split('/')[1] || 'jpg';
    
    // Create a unique filename
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    console.log(`Uploading ${fileType} file to ${filePath}`);
    console.log(`Base64 data length: ${asset.base64.length} characters`);
    
    const base64Data = asset.base64;
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Upload the buffer to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from('profileimages')
      .upload(filePath, bytes.buffer, {
        contentType: fileType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profileimages')
      .getPublicUrl(filePath);
    
    const avatarUrl = urlData.publicUrl;
    console.log("Avatar URL:", avatarUrl);
    
    // Update user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error("Profile update error:", updateError);
      throw updateError;
    }
    
    // Update local state
    setUserData(prevData => ({ 
      ...prevData, 
      avatar: avatarUrl 
    }));
    
    Alert.alert("Success", "Profile picture updated successfully");
  } catch (error) {
    console.error("Avatar upload error:", error);
    Alert.alert("Error", "Failed to upload profile picture: " + error.message);
    fetchUserProfile();
  } finally {
    setLoading(false);
  }
};

// Helper function to convert base64 to buffer
function atob(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  
  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++));
    const enc2 = chars.indexOf(input.charAt(i++));
    const enc3 = chars.indexOf(input.charAt(i++));
    const enc4 = chars.indexOf(input.charAt(i++));
    
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    
    output += String.fromCharCode(chr1);
    
    if (enc3 !== 64) {
      output += String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output += String.fromCharCode(chr3);
    }
  }
  
  return output;
}

  // Function to save profile changes using ProfileManager
  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user ID
      const userId = await ProfileManager.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
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
  
  const handleRequestSubmitted = (success) => {
    setChangeRequestModalVisible(false);
    
    if (success) {
      checkPendingRequests();
    }
  };

  if (loading && !userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>Failed to load profile data.</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={fetchUserProfile}
          >
            <Text style={[styles.retryButtonText, { color: theme.surface }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, { 
        backgroundColor: theme.surface, 
        borderBottomColor: theme.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        style={[styles.scrollContainer, { backgroundColor: theme.background }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile picture and name card */}
        <View style={[styles.card, { 
          backgroundColor: theme.surface,
          shadowColor: theme.text
        }]}>
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {userData.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: isDarkMode ? '#444' : '#e0e0e0' }]}>
                  <Ionicons name="person" size={60} color={isDarkMode ? '#aaa' : '#333'} />
                </View>
              )}
              <TouchableOpacity onPress={handleImageSelection}>
                <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileTextContainer}>
              <Text style={[styles.profileInstructionText, { color: theme.textSecondary }]}>
                Enter your name and add an optional profile picture
              </Text>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          {/* Name Input */}
          <TextInput
            style={[styles.nameInput, { color: theme.text }]}
            value={userData.fullName}
            onChangeText={(text) => setUserData({ ...userData, fullName: text })}
            placeholder="Full Name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Email - Non-editable */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Email</Text>
        <View style={[styles.inputCard, { 
          backgroundColor: theme.surface,
          shadowColor: theme.text
        }]}>
          <TextInput
            style={[styles.input, styles.disabledInput, { color: isDarkMode ? '#888' : '#999' }]}
            value={userData.email}
            editable={false}
          />
        </View>

        {/* Phone number */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Phone number</Text>
        <View style={[styles.inputCard, { 
          backgroundColor: theme.surface,
          shadowColor: theme.text
        }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={userData.phoneNumber}
            onChangeText={(text) => setUserData({ ...userData, phoneNumber: text })}
            keyboardType="phone-pad"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Gender - Modified to use modal */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Gender</Text>
        <TouchableOpacity 
          style={[styles.inputCard, { 
            backgroundColor: theme.surface,
            shadowColor: theme.text
          }]}
          onPress={() => setGenderModalVisible(true)}
        >
          <View style={styles.selectionField}>
            <Text style={[
              userData.gender ? styles.fieldValue : styles.fieldPlaceholder,
              { color: userData.gender ? theme.text : theme.textSecondary }
            ]}>
              {userData.gender || "Not set"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </View>
        </TouchableOpacity>

        {/* Age - Added field */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Age</Text>
        <TouchableOpacity 
          style={[styles.inputCard, { 
            backgroundColor: theme.surface,
            shadowColor: theme.text
          }]}
          onPress={() => setAgeModalVisible(true)}
        >
          <View style={styles.selectionField}>
            <Text style={[
              userData.age ? styles.fieldValue : styles.fieldPlaceholder,
              { color: userData.age ? theme.text : theme.textSecondary }
            ]}>
              {userData.age || "Not set"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </View>
        </TouchableOpacity>

        {/* County */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>County</Text>
        <TouchableOpacity 
          style={[styles.inputCard, styles.disabledInput, { 
            backgroundColor: theme.surface,
            shadowColor: theme.text
          }]}
          disabled={true}
        >
          <View style={styles.selectionField}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {userData.county || "Nairobi City County"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Constituency */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Constituency</Text>
        <View style={[styles.inputCard, { 
          backgroundColor: theme.surface,
          shadowColor: theme.text
        }]}>
          <View style={styles.constituencyField}>
            <View style={{flex: 1}}>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {userData.constituency || 'Not set'}
              </Text>
              {hasPendingRequest && (
                <View style={[styles.pendingBadge, { backgroundColor: isDarkMode ? '#5D4037' : '#FFC107' }]}>
                  <Text style={[styles.pendingText, { color: isDarkMode ? '#FFF' : '#333' }]}>
                    Requested: {pendingRequest?.requested_constituency}
                  </Text>
                  <Text style={[styles.pendingText, {fontSize: 10, color: isDarkMode ? '#FFF' : '#333'}]}>
                    Status: Pending
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleConstituencyChangeRequest}>
              <Text style={[styles.linkText, { color: theme.primary }]}>
                {hasPendingRequest ? 'View Request' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Membership type */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Membership type</Text>
        <View style={[styles.inputCard, { 
          backgroundColor: theme.surface,
          shadowColor: theme.text
        }]}>
          <Text style={[styles.linkText, { color: getMembershipTypeColor() }]}>
            {userData.membershipType}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
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
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Gender</Text>
              <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    selectedGender === gender && [
                      styles.selectedOption, 
                      { backgroundColor: isDarkMode ? '#1e3a1e' : '#f0f9f0' }
                    ]
                  ]}
                  onPress={() => handleGenderSelect(gender)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: theme.text },
                    selectedGender === gender && 
                    [styles.selectedOptionText, { color: theme.primary }]
                  ]}>
                    {gender}
                  </Text>
                  {selectedGender === gender && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
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
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Age</Text>
              <TouchableOpacity onPress={() => setAgeModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {generateAgeOptions().map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    selectedAge === age && [
                      styles.selectedOption, 
                      { backgroundColor: isDarkMode ? '#1e3a1e' : '#f0f9f0' }
                    ]
                  ]}
                  onPress={() => handleAgeSelect(age)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: theme.text },
                    selectedAge === age && 
                    [styles.selectedOptionText, { color: theme.primary }]
                  ]}>
                    {age}
                  </Text>
                  {selectedAge === age && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
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
  constituencyField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    maxWidth: '85%'
  },
  pendingText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default EditProfileScreen;