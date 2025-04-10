import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native'; // To navigate after login
import SupabaseManager from './SupabaseManager'; // ✅ CORRECT


const { width, height } = Dimensions.get('window');
const imageHeight = height * 0.25; // Adjust this value to control the height of the image
const imageWidth = width;

export default function LoginScreen() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation(); // Get the navigation prop to navigate to the next screen

  const handleLogin = async () => {
    console.log("Login button pressed");
  
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      // Show loading indicator
      setIsLoading(true);
      
      SupabaseManager.loginUser(email, password, (success, message) => {
        setIsLoading(false);
        
        if (success) {
          console.log("Navigating to Chat screen...");
          // Navigate to chat screen
          navigation.replace('MainTabs');
        } else {
          Alert.alert('Login Error', message || 'Failed to login. Please try again.');
        }
      });
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
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

          <TouchableOpacity style={styles.googleButton}>
            <Text style={styles.googleText}>Sign in with Googl</Text>
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
}

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
  },
  googleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signupText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
    fontSize: 16,
  },
});
