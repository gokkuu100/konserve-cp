import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Alert } from 'react-native';
import SupabaseManager from './SupabaseManager'; 
import { useNavigation } from '@react-navigation/native';


const windowHeight = Dimensions.get('window').height;

const RegisterScreen = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigation = useNavigation(); 

  const handleRegister = async () => {
    const { username, email, password, confirmPassword } = form;
  
    // Check for missing fields
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
  
    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
  
    try {
      // Attempt to register the user
      const success = SupabaseManager.registerUser(email, password, username);
      
      if (success) {
        Alert.alert('Registration Successful', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Login');
            },
          },
        ]);
      } else {
        Alert.alert('Registration Failed', 'An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      // Handle errors that occur during registration (e.g., network issues, server errors)
      console.error(error); 
      Alert.alert('Registration Failed', error.message || 'An unknown error occurred. Please try again.');
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
            value={form.username}
            onChangeText={(val) => setForm({ ...form, username: val })}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(val) => setForm({ ...form, email: val })}
          />

          {/* Password Field with Toggle */}
          <View style={styles.passwordField}>
            <TextInput
              style={styles.input}
              placeholder="Password"
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
    paddingRight: 40, // add spacing for the icon
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
});

export default RegisterScreen;

