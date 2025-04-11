import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import SupabaseManager from './SupabaseManager';

const OptionsScreen = ({ navigation, route }) => {
  // Mock user data - in a real app, this would come from your authentication context or props
  const [user, setUser] = useState({
    fullName: '',
    membershipType: '',
    avatar: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

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
      const { data, error } = await SupabaseManager.getUserProfile();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setUser({
          fullName: data.full_name || 'User',
          membershipType: data.membership_type || '',
          avatar: data.avatar_url || null,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get membership color based on type
  const getMembershipColor = () => {
    switch (user.membershipType) {
      case 'Gold':
        return '#FFD700';
      case 'Green':
        return '#4CAF50';
      default:
        return '#000000';
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { user });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Static top section with green borders */}
      <View style={styles.topSection}>
        <View style={styles.userInfoContainer}>
          <View>
            <Text style={styles.userName}>{user.fullName}</Text>
            {user.membershipType && (
              <View style={styles.ratingContainer}>
                <Text style={{ color: getMembershipColor(), fontSize: 16 }}> MemberShip Type:
                {user.membershipType} </Text>
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
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReportCases')}>
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
              <Text style={styles.cardSubtitle}>Each of you will get KES 150 off 5 rides</Text>
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
          <TouchableOpacity style={styles.bottomOption} onPress={() => navigation.navigate('Family')}>
            <Ionicons name="people" size={24} color="black" />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={styles.bottomOptionTitle}>Family</Text>
              <Text style={styles.bottomOptionSubtitle}>Manage a family profile</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomOption} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color="black" />
            <View style={styles.bottomOptionTextContainer}>
              <Text style={styles.bottomOptionTitle}>Settings</Text>
              <Text style={styles.bottomOptionSubtitle}>App preferences and account</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomOption} onPress={() => {
            // Add your logout logic here
            // Example: AuthContext.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}>
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
  topSection: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#4ded94',
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
  ratingText: {
    fontSize: 16,
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
    width: 80,
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