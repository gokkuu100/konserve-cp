import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import { useTheme } from '../ThemeContext';
import LocationSelectionModal from './LocationSelectionModal';

const windowHeight = Dimensions.get('window').height;

const ProfileCompletionScreen = ({ navigation, route }) => {
  const { user, email, name } = route.params;
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  
  // Nairobi constituencies
  const constituencies = [
    "Westlands",
    "Dagoretti North",
    "Dagoretti South",
    "Langata",
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

  const [form, setForm] = useState({
    username: name || '',
    county: 'Nairobi',
    constituency: '',
  });

  const handleComplete = async () => {
    const { username, county, constituency } = form;
    
    // Validation
    if (!username.trim()) {
      Alert.alert('Missing Field', 'Please enter your username');
      return;
    }

    if (!constituency) {
      Alert.alert('Missing Field', 'Please select your constituency');
      return;
    }
  
    try {
      setIsLoading(true);
      
      console.log('Completing user profile for:', user.id);
      
      // Update the user profile
      const { error } = await ProfileManager.updateUserProfile(user.id, {
        full_name: username,
        email: email,
        county: county,
        constituency: constituency
      });
        
      if (error) {
        console.error("Profile update error:", error);
        Alert.alert('Update Failed', error.message || 'Failed to update profile');
        return;
      }
      
      console.log('Profile updated successfully');
      
      // Check if we have a session from the auth process
      let session = null;
      
      if (user.session) {
        session = user.session;
      } 
      else if (global.authSession) {
        session = global.authSession;
        
        global.authSession = null;
        global.authSucceeded = false;
        global.authUser = null;
      }
      
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      }
      
      if (session) {
        console.log('Signing in user with session');
        const { success } = await signIn(null, null, session);
        
        if (success) {
          Alert.alert(
            'Profile Completed',
            'Your profile has been updated successfully!',
            [{ 
              text: 'Continue', 
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            }]
          );
        } else {
          Alert.alert('Error', 'Failed to sign in after profile update');
        }
      } else {
        Alert.alert(
          'Profile Updated',
          'Your profile has been completed. Please sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Failed', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.contentWrapper}>
        <Image
          source={require('../assets/longleaf.jpg')}
          style={styles.leafImage}
          resizeMode="cover"
        />

        <Text style={styles.register}>Complete Your Profile</Text>
        <Text style={styles.subTitle}>We need a few more details</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(val) => setForm({ ...form, username: val.trim() })}
          />

          <TouchableOpacity 
            style={[styles.input, styles.constituencyInput]}
            onPress={() => setLocationModalVisible(true)}
          >
            <View style={styles.constituencySelector}>
              <Text style={form.constituency ? styles.constituencyText : styles.constituencyPlaceholder}>
                {form.constituency || "Select your constituency"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.completeBtn, isLoading && styles.disabledBtn]} 
          onPress={handleComplete}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.completeBtnText}>Complete Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <LocationSelectionModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCounty={(county) => setForm({ ...form, county })}
        onSelectConstituency={(constituency) => {
          setForm({ ...form, constituency });
          setLocationModalVisible(false);
        }}
        selectedCounty={form.county}
        selectedConstituency={form.constituency}
        isCountySelectable={false}
        title="Select Your Constituency"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 40,
    position: 'relative',
  },
  leafImage: {
    position: 'absolute',
    top: windowHeight / 5, 
    left: 0,
    right: 0,
    width: '100%',
    height: 500,
    zIndex: 0,
    opacity: 0.4,
  },
  register: {
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#000',
    marginTop: 10,
    zIndex: 2,
  },
  subTitle: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#000',
    marginBottom: 20,
    zIndex: 2,
  },
  inputWrapper: {
    marginTop: 10,
    width: '85%',
    zIndex: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  constituencyInput: {
    paddingVertical: 14,
  },
  constituencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  constituencyText: {
    fontSize: 16,
    color: '#000',
  },
  constituencyPlaceholder: {
    fontSize: 16,
    color: '#666',
  },
  completeBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 30,
    zIndex: 2,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#666',
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProfileCompletionScreen;
