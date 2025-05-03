import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';

const OptionsScreen = ({ navigation, route }) => {
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
        <Text style={styles.membershipText}>
          Membership Type: <Text style={styles.standardMembership}>standard</Text>
        </Text>
      );
    } else if (membershipType === 'gold') {
      return (
        <Text style={styles.membershipText}>
          Membership Type: <Text style={styles.goldMembership}>gold</Text>
        </Text>
      );
    } else {
      return (
        <Text style={styles.membershipText}>
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
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', `Failed to sign out: ${error.message}`);
    }
  };

  const handleBackToHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBackToHome}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={styles.backButtonText}>Home</Text>
      </TouchableOpacity>

      <View style={styles.topSection}>
        <View style={styles.userInfoContainer}>
          <View>
            <Text style={styles.userName}>{user.fullName}</Text>
            {user.membershipType && (
              <View style={styles.ratingContainer}>
                {renderMembershipType()}
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile} >
                {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                <View style={styles.placeholderAvatar}>
                    <Feather name="user" size={30} color="#ccc" />
                </View>
                )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Option Cards */}
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReportEnvironment')}>
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.cardTitle}>Report Environmental Case</Text>
              <Text style={styles.cardSubtitle}>Report environmental cases directly to agencies</Text>
            </View>
            <View style={styles.cardIcon}>
              <MaterialIcons name="nature-people" size={40} color="#4CAF50" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Feedback')}>
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.cardTitle}>Provide Feedback</Text>
              <Text style={styles.cardSubtitle}>Help us improve our services</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#2196F3" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('InviteFriends')}>
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.cardTitle}>Invite friends</Text>
              <Text style={styles.cardSubtitle}>Get rewarded points when you invite your friends to our application</Text>
            </View>
            <Image 
              source={require('../assets/invitefriends.png')} 
              style={styles.inviteImage}
              defaultSource={require('../assets/resized.jpg')}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('EcoImpact')}>
          <View style={styles.cardContent}>
            <View>
              <Text style={styles.cardTitle}>Estimated CO₂ saved</Text>
              <Text style={styles.cardSubtitle}>Track your environmental impact</Text>
            </View>
            <View style={styles.ecoContainer}>
              <Feather name="leaf" size={20} color="#4CAF50" />
              <Text style={styles.ecoText}>0 g</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Options */}
        <View style={styles.bottomOptions}>
          <TouchableOpacity style={styles.bottomOption} onPress={() => navigation.navigate('OrgMessages')}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color="black" />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={styles.bottomOptionTitle}>Messages</Text>
              <Text style={styles.bottomOptionSubtitle}>Receive direct messages from environmental agencies</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomOption} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="black" />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={styles.bottomOptionTitle}>Settings</Text>
              <Text style={styles.bottomOptionSubtitle}>App preferences and account</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomOption} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="black" />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={styles.bottomOptionTitle}>Sign Out</Text>
              <Text style={styles.bottomOptionSubtitle}>Log out from your account</Text>
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