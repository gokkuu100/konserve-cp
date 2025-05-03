import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native'; // To navigate after login
import { useAuth } from '../contexts/AuthContext'; // Updated import path
import AuthManager from '../supabase/manager/auth/AuthManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import { useTheme } from '../ThemeContext';

const { width, height } = Dimensions.get('window');
const imageHeight = height * 0.25; // Adjust this value to control the height of the image
const imageWidth = width;

const LoginScreen = ({ navigation }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth(); // Using useAuth hook
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, navigating to MainTabs');
      navigation.replace('MainTabs');
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await signIn(email, password);
      
      if (!success) {
        Alert.alert('Error', error?.message || 'Failed to login');
        return;
      }
      
      // No need to navigate here as the useEffect will handle it
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      
      const { data, error } = await AuthManager.signInWithGoogle();
      
      if (error) {
        throw new Error(error.message || 'Google sign-in failed');
      }

      // Check if profile exists
      const { data: profile } = await ProfileManager.getUserProfile();
      
      // Sign in using auth context
      await signIn(data.session);

      // If profile is not complete, navigate to profile completion
      if (!profile || !profile.constituency) {
        navigation.navigate('ProfileCompletion', { 
          user: data.session.user,
          existingProfile: profile || null
        });
      } else {
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Sign-In Failed', error.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.imageContainer, { height: imageHeight }, { width: imageWidth }]}>
          <Svg
            height={imageHeight}
            width={width}
            viewBox={`0 0 ${width} ${imageHeight}`}
            preserveAspectRatio="none"
            style={styles.curve}
          >
            <Path
              fill="#fff"
              d={`M0,0 C${width / 2},${imageHeight / 2} ${width / 2},${imageHeight} ${width},${imageHeight}`}
            />
          </Svg>
          <Image
            source={require('../assets/loginimage.jpg')}  // Use the imported image variable
            style={styles.topImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Image source={require('../assets/leaf.jpg')} style={styles.leafIcon} />
          </View>

          <Text style={styles.subText}>Login to your account</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#666"
            style={styles.input}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#666"
              secureTextEntry={!passwordVisible}
              style={styles.passwordInput}
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
              <Ionicons
                name={passwordVisible ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Text style={styles.googleText}>Sign in with Google</Text>
            {isGoogleLoading && <ActivityIndicator size="small" color="#fff" />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signupText}>
              <Text style={{ fontStyle: 'italic' }}>Don't have an account? </Text>
              <Text style={{ fontStyle: 'italic', fontWeight: 'bold' }}>Sign up here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    minHeight: height,  // Ensures the container fills the screen
    width: '100%',      // Ensures the container fills the width
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden', // Hide any part of the image that goes out of bounds
  },
  topImage: {
    width: '100%',
    height: '100%',   // Ensure the image fills the container
    position: 'absolute', // Ensures the image stays behind the SVG path
    top: 0,
  },
  curve: {
    position: 'absolute', // Ensures the curve overlays the image
    top: 0,
    left: 0,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    flex: 1, // Ensures the content below the image takes the remaining space
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  leafIcon: {
    width: 30,
    height: 30,
    marginLeft: 10,
    resizeMode: 'contain',
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 50,
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 50,
    marginTop: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 10,
  },
  signupText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
    fontSize: 16,
  },
});
