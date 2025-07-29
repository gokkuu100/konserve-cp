import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import WebAuthHelper from '../supabase/helpers/WebAuthHelper';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import { useTheme } from '../ThemeContext';

const { width, height } = Dimensions.get('window');
const imageHeight = height * 0.25; 
const imageWidth = width;

const LoginScreen = ({ navigation }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth(); 
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is authenticated, navigating to MainTabs');
      navigation.replace('MainTabs');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    global.authContext = { signIn, isAuthenticated };
    
    return () => {
      global.authContext = null;
    };
  }, [signIn, isAuthenticated]);

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
      
      console.log('Starting Google sign-in process...');
      const result = await WebAuthHelper.signInWithOAuth('google');
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.canceled) {
        console.log('User canceled the sign-in process');
        return;
      }
      
      if (!result.success) {
        if (global.authSucceeded && global.authSession) {
          console.log('Found session from deep link handler');
          await processAuthenticatedUser(
            global.authUser || global.authSession.user, 
            global.authSession
          );
          
          // Clear globals
          global.authSucceeded = false;
          global.authSession = null;
          global.authUser = null;
          
          return;
        }
        
        throw new Error('Authentication failed or was canceled');
      }
      
      // successful authentication
      if (result.session && result.user) {
        await processAuthenticatedUser(result.user, result.session);
      } else {
        throw new Error('No session or user returned from authentication');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      
    
      if (!error.message?.includes('canceled')) {
        Alert.alert(
          'Sign-In Failed', 
          error.message || 'Failed to authenticate with Google'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const processAuthenticatedUser = async (user, session) => {
    try {
      console.log('Processing authenticated user:', user.email);
      
      // Check if profile is complete
      const { data: profile, error: profileError } = await ProfileManager.getUserProfile(user.id);
      
      if (profileError) {
        console.log('Error fetching profile:', profileError);
      }
      
      // Profile exists but is incomplete
      if (!profile || !profile.constituency) {
        console.log('Profile is incomplete, navigating to ProfileCompletion screen');
        navigation.navigate('ProfileCompletion', { 
          user,
          email: user.email,
          name: user.user_metadata?.full_name || ''
        });
        return; 
      }
      
    
      console.log('Profile is complete, signing in user');
      await signIn(null, null, session);
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Error processing authenticated user:', error);
      throw error;
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
            source={require('../assets/loginimage.jpg')}  
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
    minHeight: height,  
    width: '100%',      
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden', 
  },
  topImage: {
    width: '100%',
    height: '100%', 
    position: 'absolute', 
    top: 0,
  },
  curve: {
    position: 'absolute', 
    top: 0,
    left: 0,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    flex: 1, 
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
