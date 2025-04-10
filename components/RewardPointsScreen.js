import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  FlatList,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, FontAwesome5, Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import SupabaseManager from './SupabaseManager'; 

const { width } = Dimensions.get('window');

// Sample data for recent activities
const recentActivitiesData = [
  {
    id: '1',
    codeName: 'EARTH2023',
    points: 120,
    date: '2025-04-08T14:23:00',
    status: 'success'
  },
  {
    id: '2',
    codeName: 'RECYCLE50',
    points: 50,
    date: '2025-04-05T09:15:00',
    status: 'success'
  },
  {
    id: '3',
    codeName: 'GOGREEN',
    points: 75,
    date: '2025-04-01T16:45:00',
    status: 'success'
  },
  {
    id: '4',
    codeName: 'SAVEWATER',
    points: 100,
    date: '2025-03-28T11:30:00',
    status: 'success'
  },
  {
    id: '5',
    codeName: 'PLANTMORE',
    points: 200,
    date: '2025-03-20T14:10:00',
    status: 'success'
  },
];

// Format date to readable format
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) {
    return 'Today';
  } else if (diff === 1) {
    return 'Yesterday';
  } else if (diff < 7) {
    return `${diff} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Activity Card Component
const ActivityCard = ({ activity }) => {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityIconContainer}>
        <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#4CAF50" />
      </View>
      
      <View style={styles.activityDetails}>
        <Text style={styles.activityCodeName}>{activity.codeName}</Text>
        <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
      </View>
      
      <View style={styles.activityPoints}>
        <Text style={styles.pointsText}>+{activity.points}</Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>
    </View>
  );
};

// All Activities Screen Component
const AllActivitiesScreen = ({ activities, onClose }) => {
  const totalPoints = activities.reduce((sum, activity) => sum + activity.points, 0);
  
  return (
    <View style={styles.allActivitiesContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.allActivitiesHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.allActivitiesTitle}>Reward History</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.filterContainer}>
        <View style={styles.filterPill}>
          <Text style={styles.filterText}>All</Text>
        </View>
        <View style={[styles.filterPill, styles.inactivePill]}>
          <Text style={styles.inactiveFilterText}>Last 30 Days</Text>
        </View>
        <View style={[styles.filterPill, styles.inactivePill]}>
          <Text style={styles.inactiveFilterText}>Last Year</Text>
        </View>
      </View>
      
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard activity={item} />}
        contentContainerStyle={styles.activitiesList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.totalPointsHeader}>
            <View style={styles.totalPointsContainer}>
              <Text style={styles.totalPointsValue}>{totalPoints}</Text>
              <Text style={styles.totalPointsLabel}>Total Points Earned</Text>
            </View>
          </View>
        }
      />
    </View>
  );
};

const RewardPointsScreen = () => {
  const [rewardCode, setRewardCode] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [userName, setUserName] = useState('User');
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  // Fetch initial data
  useEffect(() => {
    loadUserData();
    setupRealtimeSubscriptions();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await SupabaseManager.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please login to view your rewards');
        return;
      }

      // Fetch user profile to get full name
      const { data: profile, error } = await SupabaseManager.getUserProfile();

      if (!error && profile) {
        setUserName(profile.full_name);
      } else {
        console.error('Failed to fetch profile:', error?.message);
      }

      // Fetch points
      const { data: points, error: pointsError } = await SupabaseManager.fetchUserPoints(user.id);
      if (!pointsError) {
        setUserPoints(points || 0);
      }

      // Fetch redemption history
      const { data: history, error: historyError } = await SupabaseManager.fetchRedemptionHistory(user.id);
      if (!historyError) {
        setRecentActivities(history || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to points updates
    SupabaseManager.subscribeToPointsUpdates(async (newPoints) => {
      setUserPoints(newPoints);
    });

    // Subscribe to redemption updates
    SupabaseManager.subscribeToRedemptions(async (newRedemption) => {
      setRecentActivities(prev => [newRedemption, ...prev]);
    });
  };

  const handleRedeemCode = async () => {
    if (!rewardCode.trim()) {
      Alert.alert('Error', 'Please enter a reward code');
      return;
    }

    setIsRedeeming(true);
    try {
      const user = await SupabaseManager.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please login to redeem codes');
        return;
      }

      const result = await SupabaseManager.redeemRewardCode(user.id, rewardCode);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'OK',
            onPress: () => setRewardCode('')
          }
        ]);
        // Points and activities will update automatically through subscriptions
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to redeem code. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Format the activities data for display
  const formattedActivities = recentActivities.map(activity => ({
    id: activity.id,
    codeName: activity.code_name,
    points: activity.points_earned,
    date: activity.redeemed_at,
    status: 'success'
  }));

  const totalPoints = formattedActivities.reduce((sum, activity) => sum + activity.points, 0);


  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Update the card section to show actual user points
  const userData = {
    name: userName,
    points: totalPoints,
    year: new Date().getFullYear() + 10,
    memberStatus: totalPoints >= 1000 ? 'PLATINUM' : totalPoints >= 500 ? 'GOLD' : 'GREEN',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Rewards Card - Update with real data */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#2E7D32', '#4CAF50', '#81C784']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="wallet-membership" size={28} color="#fff" />
              <Text style={styles.membershipText}>{userData.memberStatus} REWARDS</Text>
            </View>
            
            {/* Card Points */}
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsLabel}>AVAILABLE POINTS</Text>
              <Text style={styles.pointsValue}>{userData.points}</Text>
              <View style={styles.heroTag}>
                <Text style={styles.heroText}>
                  {userData.memberStatus} Member
                </Text>
              </View>
            </View>
            
            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.nameContainer}>
                <Text style={styles.nameLabel}>CARD HOLDER</Text>
                <Text style={styles.nameValue}>{userData.name}</Text>
              </View>
              
              <View style={styles.expiryContainer}>
                <Text style={styles.expiryLabel}>VALID UNTIL</Text>
                <Text style={styles.expiryValue}>{userData.year}</Text>
              </View>
              
              <View style={styles.chipContainer}>
                <FontAwesome5 name="leaf" size={20} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </View>
        
        {/* Redemption Section */}
        <View style={styles.redemptionContainer}>
          <Text style={styles.sectionTitle}>Redeem Your Rewards</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter reward code"
            placeholderTextColor="#888"
            value={rewardCode}
            onChangeText={setRewardCode}
            editable={!isRedeeming}
          />
          
          <TouchableOpacity 
            style={[
              styles.redeemButton,
              isRedeeming && styles.redeemButtonDisabled
            ]}
            onPress={handleRedeemCode}
            disabled={isRedeeming}
          >
            {isRedeeming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.redeemButtonText}>Redeem Code</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.withdrawButton}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.withdrawButtonText}>Withdraw Points</Text>
          </TouchableOpacity>
        </View>
        
        {/* Recent Activity Section */}
        <View style={styles.activityContainer}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {formattedActivities.length > 0 && (
              <TouchableOpacity onPress={() => setShowAllActivities(true)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {formattedActivities.length > 0 ? (
            <View>
              {formattedActivities.slice(0, 2).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
              
              {formattedActivities.length > 2 && (
                <TouchableOpacity 
                  style={styles.moreActivitiesButton}
                  onPress={() => setShowAllActivities(true)}
                >
                  <Text style={styles.moreActivitiesText}>
                    +{formattedActivities.length - 2} more activities
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <MaterialCommunityIcons name="history" size={36} color="#888" />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Withdraw Points Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowWithdrawModal(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            
            <View style={styles.modalContent}>
              <View style={styles.creditCardIconContainer}>
                <LinearGradient
                  colors={['#424242', '#212121']}
                  style={styles.creditCardGradient}
                >
                  <MaterialCommunityIcons name="credit-card-wireless" size={40} color="#fff" />
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" style={styles.plusIcon} />
                </LinearGradient>
              </View>
              
              <Text style={styles.comingSoonText}>Coming soon</Text>
              
              <Text style={styles.modalDescription}>
                This feature isn't available just yet, but it's on the way. Stay tuned for updates.
              </Text>
              
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* All Activities Modal */}
      <Modal
        visible={showAllActivities}
        animationType="slide"
        onRequestClose={() => setShowAllActivities(false)}
      >
        <AllActivitiesScreen 
          activities={formattedActivities} 
          onClose={() => setShowAllActivities(false)} 
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  cardContainer: {
    marginVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    height: 220,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membershipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pointsContainer: {
    alignItems: 'flex-start',
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  heroTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  heroText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  nameContainer: {
    flex: 2,
  },
  nameLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  nameValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expiryContainer: {
    flex: 1,
    alignItems: 'center',
  },
  expiryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  expiryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chipContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
  },
  redemptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyActivityText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  // Activity Card Styles
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityCodeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#888',
  },
  activityPoints: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#888',
  },
  moreActivitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  moreActivitiesText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  creditCardIconContainer: {
    marginBottom: 20,
  },
  creditCardGradient: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  progressBar: {
    width: '60%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  // All Activities Screen Styles
  allActivitiesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  allActivitiesHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allActivitiesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    marginRight: 10,
  },
  inactivePill: {
    backgroundColor: '#f0f0f0',
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  inactiveFilterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activitiesList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  totalPointsHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  totalPointsContainer: {
    alignItems: 'center',
  },
  totalPointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  totalPointsLabel: {
    fontSize: 14,
    color: '#666',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    opacity: 0.7,
  },
});

export default RewardPointsScreen;