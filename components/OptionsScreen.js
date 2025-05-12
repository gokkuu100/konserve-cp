import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import { useTheme } from '../ThemeContext';

const OptionsScreen = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
  const { user: authUser, userId, isAuthenticated, loading: authLoading, signOut, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({
    fullName: 'User',
    membershipType: 'standard',
    avatar: null
  });

  // Check authentication status
  useEffect(() => {
    console.log('Auth state in OptionsScreen:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to Login');
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, authLoading]);

  // Load user data when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated]);

  // Handle updates from other screens
  useEffect(() => {
    if (route.params?.updatedUser) {
      setUser(prevUser => ({
        ...prevUser,
        ...route.params.updatedUser
      }));
    }
  }, [route.params]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await ProfileManager.getUserProfile();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load user profile');
        return;
      }
      
      if (profile) {
        setUser({
          fullName: profile.full_name || 'User',
          membershipType: profile.membership_type || 'standard',
          avatar: profile.avatar_url || null,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading user data');
    } finally {
      setLoading(false);
    }
  };

  const renderMembershipType = () => {
    const membershipType = user.membershipType.toLowerCase();
    
    if (membershipType === 'standard') {
      return (
        <Text style={[styles.membershipText, { color: theme.text }]}>
          Membership Type: <Text style={styles.standardMembership}>standard</Text>
        </Text>
      );
    } else if (membershipType === 'gold') {
      return (
        <Text style={[styles.membershipText, { color: theme.text }]}>
          Membership Type: <Text style={styles.goldMembership}>gold</Text>
        </Text>
      );
    } else {
      return (
        <Text style={[styles.membershipText, { color: theme.text }]}>
          Membership Type: {membershipType}
        </Text>
      );
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('UserDashboard', { user });
  };

  const handleSignOut = async () => {
    try {
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
                await signOut();
                // The AuthContext will handle the navigation automatically
                // when isAuthenticated state changes, the App.js conditional rendering will take over
              } catch (error) {
                console.error('Error signing out:', error);
                Alert.alert('Error', `Failed to sign out: ${error.message}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in sign out process:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    }
  };

  const handleBackToHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBackToHome}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
        <Text style={[styles.backButtonText, { color: theme.text }]}>Home</Text>
      </TouchableOpacity>

      <View style={[styles.topSection, { 
        backgroundColor: theme.surface, 
        borderBottomColor: theme.border 
      }]}>
        <View style={styles.userInfoContainer}>
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>{user.fullName}</Text>
            {user.membershipType && (
              <View style={styles.ratingContainer}>
                {renderMembershipType()}
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.placeholderAvatar, { backgroundColor: isDarkMode ? '#444' : '#e1e1e1' }]}>
                <Feather name="user" size={30} color={isDarkMode ? '#aaa' : '#ccc'} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.scrollContent, { backgroundColor: theme.background }]}>
        {/* Option Cards */}
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.text }]} 
          onPress={() => navigation.navigate('ReportEnvironment')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Report Environmental Case</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Report environmental cases directly to agencies</Text>
            </View>
            <View style={styles.cardIcon}>
              <MaterialIcons name="nature-people" size={40} color={theme.primary} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.text }]} 
          onPress={() => navigation.navigate('Feedback')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Provide Feedback</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Help us improve our services</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons 
                name="chatbubble-ellipses-outline" 
                size={40} 
                color={isDarkMode ? theme.secondary : "#2196F3"} 
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.text }]} 
          onPress={() => navigation.navigate('InviteFriends')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Invite friends</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Get rewarded points when you invite your friends to our application</Text>
            </View>
            <Image 
              source={require('../assets/invitefriends.png')} 
              style={styles.inviteImage}
              defaultSource={require('../assets/resized.jpg')}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.text }]} 
          onPress={() => navigation.navigate('EcoImpact')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Estimated CO₂ saved</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Track your environmental impact</Text>
            </View>
            <View style={styles.ecoContainer}>
              <Feather name="leaf" size={20} color={theme.primary} />
              <Text style={[styles.ecoText, { color: theme.text }]}>0 g</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Options */}
        <View style={styles.bottomOptions}>
          <TouchableOpacity 
            style={[styles.bottomOption, { 
              backgroundColor: theme.surface, 
              borderBottomColor: theme.border 
            }]} 
            onPress={() => navigation.navigate('OrgMessages')}
          >
            <Ionicons name="chatbox-ellipses-outline" size={24} color={theme.text} />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={[styles.bottomOptionTitle, { color: theme.text }]}>Messages</Text>
              <Text style={[styles.bottomOptionSubtitle, { color: theme.textSecondary }]}>Receive direct messages from environmental agencies</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bottomOption, { 
              backgroundColor: theme.surface, 
              borderBottomColor: theme.border 
            }]} 
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={[styles.bottomOptionTitle, { color: theme.text }]}>Settings</Text>
              <Text style={[styles.bottomOptionSubtitle, { color: theme.textSecondary }]}>App preferences and account</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bottomOption, { 
              backgroundColor: theme.surface, 
              borderBottomColor: theme.border 
            }]} 
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.text} />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={[styles.bottomOptionTitle, { color: theme.text }]}>Sign Out</Text>
              <Text style={[styles.bottomOptionSubtitle, { color: theme.textSecondary }]}>Log out from your account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  topSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  membershipText: {
    fontSize: 16,
    color: '#333',
  },
  standardMembership: {
    color: '#357002',
    fontWeight: 'bold',
  },
  goldMembership: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e1e1e1',
  },
  scrollContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    maxWidth: '85%',
  },
  cardIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteImage: {
    width: 50,
    height: 80,
    resizeMode: 'contain',
  },
  ecoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomOptions: {
    marginTop: 20,
    marginBottom: 30,
  },
  bottomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    backgroundColor: '#fff',
  },
  bottomOptionTextContainer: {
    marginLeft: 15,
  },
  bottomOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default OptionsScreen;