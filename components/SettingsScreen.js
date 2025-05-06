import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/config/supabaseConfig';
import NotificationService from '../supabase/services/NotificationService';
import { useTheme } from '../ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user, userId, isAuthenticated, loading, signIn, signOut, signUp } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    locationServices: true,
    dataUsage: 'wifi-only',
    language: 'English',
    biometricAuth: false,
    autoBackup: true,
    dataCollection: true,
    reminderFrequency: 'daily'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load from AsyncStorage first
      const savedSettings = await AsyncStorage.getItem('userSettings');
      let settings = savedSettings ? JSON.parse(savedSettings) : null;
      
      // If user is authenticated, try to get settings from Supabase
      if (userId) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (error) {
          console.error('Error loading settings from Supabase:', error);
        } else if (data) {
          // Merge with existing settings or use defaults
          settings = {
            ...(settings || {
              notifications: true,
              sound: true,
              locationServices: true,
              dataUsage: 'wifi-only',
              language: 'English',
              biometricAuth: false,
              autoBackup: true,
              dataCollection: true,
              reminderFrequency: 'daily'
            }),
            notifications: data.notifications !== null ? data.notifications : true,
            sound: data.sound !== null ? data.sound : true,
            reminderFrequency: data.reminderFrequency || 'daily'
          };
          
          // Save merged settings back to AsyncStorage
          await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
        }
      }
      
      if (settings) {
        setSettings(settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveSettings = async (newSettings) => {
    try {
      // Save to AsyncStorage as before
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
      
      // Save notification settings to Supabase if user is authenticated
      if (userId) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            notifications: newSettings.notifications,
            sound: newSettings.sound,
            reminderFrequency: newSettings.reminderFrequency,
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error saving settings to Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };
  
  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    // If toggling notification settings, refresh permissions
    if (key === 'notifications' && newSettings.notifications === true) {
      NotificationService.requestPermissions()
        .then(hasPermission => {
          if (hasPermission && userId) {
            NotificationService.registerDeviceToken(userId);
          }
        })
        .catch(error => {
          console.error('Error requesting notification permissions:', error);
        });
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading state
              setIsLoading(true);
              
              // Clear any user-specific settings or cached data if needed
              await AsyncStorage.removeItem('userToken');
              
              // Call the signOut function from auth context
              await signOut();
              
              // Reset navigation to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }]
              });
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data including images, location data, and temporary files. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              setClearingCache(true);
              
              // Get all keys from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();
              
              // Filter out keys that should not be deleted (like auth tokens, settings)
              const keysToRemove = keys.filter(key => 
                !key.includes('auth') && 
                !key.includes('token') && 
                key !== 'userSettings' &&
                key !== 'themePreference'
              );
              
              // Remove the filtered keys
              await AsyncStorage.multiRemove(keysToRemove);
              
              // Clear image cache if available
              if (global.ImageCacheManager && typeof global.ImageCacheManager.clearCache === 'function') {
                await global.ImageCacheManager.clearCache();
              }
              
              setClearingCache(false);
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              setClearingCache(false);
              Alert.alert('Error', 'Failed to clear cache: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleReminderFrequency = () => {
    Alert.alert(
      'Reminder Frequency',
      'Select how often you want to receive reminders',
      [
        { text: 'Daily', onPress: () => {
          const newSettings = { ...settings, reminderFrequency: 'daily' };
          setSettings(newSettings);
          saveSettings(newSettings);
        }},
        { text: 'Weekly', onPress: () => {
          const newSettings = { ...settings, reminderFrequency: 'weekly' };
          setSettings(newSettings);
          saveSettings(newSettings);
        }},
        { text: 'Monthly', onPress: () => {
          const newSettings = { ...settings, reminderFrequency: 'monthly' };
          setSettings(newSettings);
          saveSettings(newSettings);
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => handleToggle('notifications')}
              trackColor={{ false: '#d3d3d3', true: theme.secondary }}
              thumbColor={settings.notifications ? theme.primary : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-medium-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Sound</Text>
            </View>
            <Switch
              value={settings.sound}
              onValueChange={() => handleToggle('sound')}
              trackColor={{ false: '#d3d3d3', true: theme.secondary }}
              thumbColor={settings.sound ? theme.primary : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.border }]} onPress={handleReminderFrequency}>
            <View style={styles.settingInfo}>
              <Ionicons name="time-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Reminder Frequency</Text>
                <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>
                  {settings.reminderFrequency
                    ? settings.reminderFrequency.charAt(0).toUpperCase() + settings.reminderFrequency.slice(1)
                    : ''}
                </Text>

              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>App Settings</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Location Services</Text>
            </View>
            <Switch
              value={settings.locationServices}
              onValueChange={() => handleToggle('locationServices')}
              trackColor={{ false: '#d3d3d3', true: theme.secondary }}
              thumbColor={settings.locationServices ? theme.primary : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#d3d3d3', true: theme.secondary }}
              thumbColor={isDarkMode ? theme.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Privacy & Security</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="analytics-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Data Collection</Text>
                <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>Help us improve by sharing usage data</Text>
              </View>
            </View>
            <Switch
              value={settings.dataCollection}
              onValueChange={() => handleToggle('dataCollection')}
              trackColor={{ false: '#d3d3d3', true: theme.secondary }}
              thumbColor={settings.dataCollection ? theme.primary : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.border }]} 
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data & Storage</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.border }]} 
            onPress={handleClearCache}
            disabled={clearingCache}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="trash-outline" size={24} color={theme.primary} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Clear Cache</Text>
                <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>
                  {clearingCache ? 'Clearing...' : 'Remove temporary files to free up space'}
                </Text>
              </View>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.text }]}>
          <TouchableOpacity 
            style={[styles.signOutButton, { backgroundColor: theme.error }]} 
            onPress={handleSignOut}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.signOutText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  signOutButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  versionInfo: {
    alignItems: 'center',
    marginVertical: 20,
  },
  versionText: {
    fontSize: 12,
  },
});

export default SettingsScreen;
