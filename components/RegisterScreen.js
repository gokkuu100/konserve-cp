import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
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
import Feather from 'react-native-vector-icons/Feather';
import { supabase } from '../supabase/config/supabaseConfig';
import { useTheme } from '../ThemeContext';
import LocationSelectionModal from './LocationSelectionModal';

const windowHeight = Dimensions.get('window').height;

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    county: 'Nairobi',
    constituency: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const supabaseUrl = Constants.expoConfig.extra.SUPABASE_URL;
  const supabaseKey = Constants.expoConfig.extra.SUPABASE_KEY;


  const handleRegister = async () => {
    const { username, email, password, confirmPassword, county, constituency } = form;
    
    // Validation code remains the same...
    // Validate all fields
    if (!username.trim()) {
      Alert.alert('Missing Field', 'Please enter your username');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Missing Field', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Missing Field', 'Please enter your password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Missing Field', 'Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (!constituency) {
      Alert.alert('Missing Field', 'Please select your constituency');
      return;
    }
  
    try {
      setIsLoading(true);
      
      // First check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
        
      if (existingUser?.email) {
        Alert.alert(
          'Already Registered', 
          'This email is already registered. Please log in instead.',
          [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
        );
        setIsLoading(false);
        return;
      }
      
      // Register with temporary client (prevents auto-authentication)
      console.log("Registering user with email:", email.trim().toLowerCase());
      
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      });
      
      // Register using the temporary client
      const { data, error } = await tempSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: username,
            county: county,
            constituency: constituency
          }
        }
      });
      
      if (error) {
        console.error("Registration error:", error);
        Alert.alert('Registration Failed', error.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }
      
      console.log("User registered successfully with ID:", data?.user?.id);
      
      // NEW CODE: Create user profile in the users table using admin API
      if (data?.user?.id) {
        try {
          console.log("Creating user profile via edge function");
          
          const functionResponse = await fetch(
            `${supabaseUrl}/functions/v1/register-user`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}` // Anon key is fine here
              },
              body: JSON.stringify({
                userId: data.user.id,
                userData: {
                  full_name: username,
                  email: email.trim().toLowerCase(),
                  county: county,
                  constituency: constituency
                }
              })
            }
          );
          
          const result = await functionResponse.json();
          
          if (!result.success) {
            console.error("Edge function error:", result.error);
          } else {
            console.log("User profile created successfully via edge function!");
          }
        } catch (functionError) {
          console.error("Error calling edge function:", functionError);
        }
      }
      
      // Show success message and navigate to login
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully! Please log in to continue.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
      
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'An unexpected error occurred');
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

        <Text style={styles.register}>Register</Text>
        <Text style={styles.subTitle}>Create a new profile</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(val) => setForm({ ...form, username: val.trim() })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.email}
            onChangeText={(val) => setForm({ ...form, email: val.trim() })}
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

          <View style={styles.passwordField}>
            <TextInput
              style={styles.input}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(val) => setForm({ ...form, password: val })}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordField}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#666"
              secureTextEntry={!showConfirmPassword}
              value={form.confirmPassword}
              onChangeText={(val) =>
                setForm({ ...form, confirmPassword: val })
              }
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Feather
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#555"
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.policy}>
          By signing you agree to all our terms of use and privacy notice
        </Text>

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
          <Text style={styles.registerBtnText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleBtnText}>Sign up with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signinRedirect}>
            Already have an account?{' '}
            <Text style={styles.signinText}>SignIn</Text>
          </Text>
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
    marginBottom: 10,
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
  passwordField: {
    position: 'relative',
    marginBottom: 6,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    zIndex: 3,
  },
  policy: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#000',
    textAlign: 'center',
    marginVertical: 10,
    marginHorizontal: 20,
    zIndex: 2,
  },
  registerBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 30,
    zIndex: 2,
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  googleBtn: {
    backgroundColor: '#0288D1',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 10,
    zIndex: 2,
  },
  googleBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signinRedirect: {
    fontSize: 16,
    color: '#000',
    fontStyle: 'italic',
    marginTop: 20,
    zIndex: 2,
  },
  signinText: {
    fontWeight: 'bold',
    color: '#000',
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
});

export default RegisterScreen;