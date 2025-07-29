import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import authManager from '../supabase/manager/auth/AuthManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import LeaderboardManager from '../supabase/manager/rewards/LeaderboardManager';
import PointsManager from '../supabase/manager/rewards/PointsManager';
import { useTheme } from '../ThemeContext';
import FullLeaderboardScreen from './FullLeaderboardScreen';
import MiniLeaderboard from './MiniLeaderboard';

const { width } = Dimensions.get('window');

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
const ActivityCard = ({ activity, theme }) => {
  const isDarkMode = theme.isDarkMode;
  
  return (
    <View style={[styles.activityCard, { 
      backgroundColor: isDarkMode ? '#2a2a2a' : '#f9f9f9',
      borderColor: isDarkMode ? '#444' : 'transparent',
      borderWidth: isDarkMode ? 1 : 0,
      shadowColor: isDarkMode ? '#000' : 'transparent',
      shadowOffset: isDarkMode ? { width: 0, height: 2 } : { width: 0, height: 0 },
      shadowOpacity: isDarkMode ? 0.2 : 0,
      shadowRadius: isDarkMode ? 3 : 0,
      elevation: isDarkMode ? 3 : 0
    }]}>
      <View style={[styles.activityIconContainer, {
        backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)'
      }]}>
        <MaterialCommunityIcons 
          name="ticket-confirmation" 
          size={24} 
          color={isDarkMode ? '#6abf69' : theme.primary} 
        />
      </View>
      
      <View style={styles.activityDetails}>
        <Text style={[styles.activityCodeName, { 
          color: isDarkMode ? '#e0e0e0' : theme.text,
          fontWeight: '600'
        }]}>{activity.codeName}</Text>
        <Text style={[styles.activityDate, { 
          color: isDarkMode ? '#999' : theme.textSecondary 
        }]}>{formatDate(activity.date)}</Text>
      </View>
      
      <View style={styles.activityPoints}>
        <Text style={[styles.pointsText, { 
          color: isDarkMode ? '#6abf69' : theme.primary,
          fontWeight: 'bold'
        }]}>+{activity.points}</Text>
        <Text style={[styles.pointsLabel, { 
          color: isDarkMode ? '#999' : theme.textSecondary 
        }]}>points</Text>
      </View>
    </View>
  );
};

// All Activities Screen Component
const AllActivitiesScreen = ({ activities, onClose, theme }) => {
  const isDarkMode = theme.isDarkMode;
  const totalPoints = activities.reduce((sum, activity) => sum + activity.points, 0);
  
  return (
    <View style={[styles.allActivitiesContainer, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.allActivitiesHeader, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.allActivitiesTitle}>Reward History</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={[styles.filterContainer, { 
        borderBottomColor: theme.border,
        backgroundColor: isDarkMode ? '#1a1a1a' : theme.surface 
      }]}>
        <View style={[styles.filterPill, { 
          backgroundColor: isDarkMode ? '#2c3e2c' : '#E8F5E9' 
        }]}>
          <Text style={[styles.filterText, { 
            color: isDarkMode ? '#6abf69' : theme.primary 
          }]}>All</Text>
        </View>
      </View>
      
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard activity={item} theme={theme} />}
        contentContainerStyle={[styles.activitiesList, { 
          backgroundColor: isDarkMode ? '#121212' : theme.background,
          paddingTop: 16
        }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.totalPointsHeader}>
            <View style={[styles.totalPointsContainer, { 
              backgroundColor: isDarkMode ? '#2c3e2c' : '#E8F5E9'
            }]}>
              <Text style={[styles.totalPointsValue, { 
                color: isDarkMode ? '#6abf69' : theme.primary 
              }]}>{totalPoints}</Text>
              <Text style={[styles.totalPointsLabel, { 
                color: isDarkMode ? '#6abf69' : theme.primary 
              }]}>Total Points Earned</Text>
            </View>
          </View>
        }
      />
    </View>
  );
};

const RewardPointsScreen = () => {
  const { theme, isDarkMode } = useTheme();
  const { user, userId } = useAuth();
  const navigation = useNavigation();
  const [rewardCode, setRewardCode] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [userName, setUserName] = useState('User');
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [leaderboardKey, setLeaderboardKey] = useState(0); 

  // Calculate total points from activities
  const calculateTotalPoints = (activities) => {
    return activities.reduce((sum, activity) => sum + activity.points_earned, 0);
  };

  useEffect(() => {
    if (!user) {
      navigation.replace('Login');
      return;
    }
    loadUserData();
    setupRealtimeSubscriptions();
    
    // Initial refresh of the leaderboard
    refreshLeaderboard();
    
    return () => {
    };
  }, []);

  // Function to refresh the leaderboard
  const refreshLeaderboard = async () => {
    try {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) return;
      
      console.log('Fetching leaderboard data for user:', currentUser.id);
      
      // Update the current user's points in the leaderboard
      await LeaderboardManager.updateUserLeaderboardPoints(currentUser.id);
      
      setLeaderboardKey(prevKey => prevKey + 1);
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const [totalPointsResponse, profileResponse, historyResponse] = await Promise.all([
        PointsManager.fetchTotalUserPoints(currentUser.id),
        ProfileManager.getUserProfile(currentUser.id),
        PointsManager.fetchRedemptionHistory(currentUser.id)
      ]);

      if (totalPointsResponse.error) throw totalPointsResponse.error;
      if (profileResponse.error) throw profileResponse.error;
      if (historyResponse.error) throw historyResponse.error;

      setUserPoints(totalPointsResponse.data || 0);
      
      if (profileResponse.data) {
        setUserName(profileResponse.data.full_name || 'User');
      }

      if (historyResponse.data) {
        const formattedActivities = historyResponse.data.map(activity => ({
          id: activity.id,
          codeName: activity.code_name,
          points: activity.points_earned,
          date: activity.redeemed_at,
          status: 'success'
        }));
        setRecentActivities(formattedActivities);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;

    // Subscribe to points updates
    PointsManager.subscribeToPointsUpdates(currentUser.id, (newPoints) => {
      setUserPoints(newPoints);
      refreshLeaderboard();
    });

    // Subscribe to redemption updates
    PointsManager.subscribeToRedemptions(currentUser.id, (newRedemption) => {
      setRecentActivities(prev => {
        const formattedNewRedemption = {
          id: newRedemption.id,
          codeName: newRedemption.code_name,
          points: newRedemption.points_earned,
          date: newRedemption.redeemed_at,
          status: 'success'
        };
        return [formattedNewRedemption, ...prev];
      });
      
      refreshLeaderboard();
    });
  };

  const handleRedeemCode = async () => {
    if (!rewardCode.trim()) {
      Alert.alert('Error', 'Please enter a reward code');
      return;
    }

    setIsRedeeming(true);
    try {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please login to redeem codes');
        return;
      }

      const result = await PointsManager.redeemRewardCode(currentUser.id, rewardCode);
      
      if (result.success) {
        // Update local state with the new total points
        setUserPoints(result.data.totalPoints);
        
        const newActivity = {
          id: result.data.redemptionId,
          codeName: result.data.codeName,
          points: result.data.pointsEarned,
          date: new Date().toISOString(),
          status: 'success'
        };
        
        setRecentActivities(prev => [newActivity, ...prev]);
        
        // Refresh the leaderboard
        refreshLeaderboard();
        
        Alert.alert('Success', result.message);
        setRewardCode(''); 
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to redeem code. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Format activities for display
  const formattedActivities = recentActivities.map(activity => ({
    id: activity.id,
    codeName: activity.codeName,
    points: activity.points,
    date: activity.date,
    status: activity.status
  }));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Update the card section to show actual user points
  const userData = {
    name: userName,
    points: userPoints,
    year: new Date().getFullYear() + 10,
    memberStatus: userPoints >= 1000 ? 'PLATINUM' : userPoints >= 500 ? 'GOLD' : 'GREEN',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={isDarkMode ? 
              ['#1b4d1d', '#2d6930', '#3a7e3d'] : 
              ['#2E7D32', '#4CAF50', '#81C784']}
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
        <View style={[styles.redemptionContainer, { 
          backgroundColor: theme.surface, 
          shadowColor: isDarkMode ? '#000' : '#000',
          borderColor: isDarkMode ? theme.border : 'transparent',
          borderWidth: isDarkMode ? 1 : 0
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Redeem Your Rewards</Text>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
              borderColor: isDarkMode ? theme.border : 'transparent',
              borderWidth: 1,
              color: theme.text
            }]}
            placeholder="Enter reward code"
            placeholderTextColor={theme.textSecondary}
            value={rewardCode}
            onChangeText={setRewardCode}
            editable={!isRedeeming}
          />
          
          <TouchableOpacity 
            style={[
              styles.redeemButton,
              { backgroundColor: theme.primary },
              isRedeeming && { backgroundColor: isDarkMode ? '#2c5c2c' : '#A5D6A7' }
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
            style={[styles.withdrawButton, { 
              backgroundColor: theme.surface,
              borderColor: theme.primary 
            }]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={[styles.withdrawButtonText, { color: theme.primary }]}>Withdraw Points</Text>
          </TouchableOpacity>
        </View>
        
        {/* Leaderboard Section */}
        <View style={styles.leaderboardWrapper}>
          <MiniLeaderboard 
            key={leaderboardKey}
            onViewFullLeaderboard={() => setShowLeaderboard(true)}
            theme={theme}
            isDarkMode={isDarkMode}
          />

          {recentActivities.length === 0 && (
            <View style={[styles.leaderboardInfoBox, { 
              backgroundColor: isDarkMode ? '#1a3a5a' : '#E3F2FD',
              borderLeftColor: isDarkMode ? '#0d47a1' : '#1565C0'
            }]}>
              <MaterialCommunityIcons name="information-outline" size={22} color={isDarkMode ? '#64b5f6' : '#1565C0'} />
              <Text style={[styles.leaderboardInfoText, { color: theme.text }]}>
                Redeem your first code to earn points and join the leaderboard rankings!
              </Text>
            </View>
          )}
        </View>
        
        {/* Recent Activity Section */}
        <View style={[styles.activityContainer, { 
          backgroundColor: isDarkMode ? '#1a1a1a' : theme.surface, 
          shadowColor: isDarkMode ? '#000' : '#000',
          borderColor: isDarkMode ? '#333' : 'transparent',
          borderWidth: isDarkMode ? 1 : 0
        }]}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            {formattedActivities.length > 0 && (
              <TouchableOpacity onPress={() => setShowAllActivities(true)}>
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {formattedActivities.length > 0 ? (
            <View>
              {formattedActivities.slice(0, 2).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} theme={theme} />
              ))}
              
              {formattedActivities.length > 2 && (
                <TouchableOpacity 
                  style={[styles.moreActivitiesButton, {
                    backgroundColor: isDarkMode ? '#2a2a2a' : 'transparent',
                    borderRadius: 8,
                    padding: 8
                  }]}
                  onPress={() => setShowAllActivities(true)}
                >
                  <Text style={[styles.moreActivitiesText, { color: theme.primary }]}>
                    +{formattedActivities.length - 2} more activities
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <MaterialCommunityIcons 
                name="history" 
                size={36} 
                color={isDarkMode ? '#555' : theme.textSecondary} 
              />
              <Text style={[styles.emptyActivityText, { 
                color: isDarkMode ? '#888' : theme.textSecondary 
              }]}>No recent activity</Text>
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
          <View style={[styles.modalContainer, { 
            backgroundColor: theme.surface,
            borderColor: isDarkMode ? theme.border : 'transparent',
            borderWidth: isDarkMode ? 1 : 0
          }]}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowWithdrawModal(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <View style={styles.modalContent}>
              <View style={styles.creditCardIconContainer}>
                <LinearGradient
                  colors={isDarkMode ? ['#333', '#222'] : ['#424242', '#212121']}
                  style={styles.creditCardGradient}
                >
                  <MaterialCommunityIcons name="credit-card-wireless" size={40} color="#fff" />
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" style={styles.plusIcon} />
                </LinearGradient>
              </View>
              
              <Text style={[styles.comingSoonText, { color: theme.text }]}>Coming soon</Text>
              
              <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                This feature isn't available just yet, but it's on the way. Stay tuned for updates.
              </Text>
              
              <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#444' : '#e0e0e0' }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.primary }]} />
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
          theme={theme}
        />
      </Modal>
      
      {/* Leaderboard Modal */}
      <Modal
        visible={showLeaderboard}
        animationType="slide"
        onRequestClose={() => setShowLeaderboard(false)}
      >
        <FullLeaderboardScreen 
          onClose={() => {
            setShowLeaderboard(false);
            refreshLeaderboard();
          }} 
          theme={theme}
          isDarkMode={isDarkMode}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  nameContainer: {},
  nameLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginBottom: 2,
  },
  nameValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expiryContainer: {},
  expiryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginBottom: 2,
  },
  expiryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chipContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redemptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  redeemButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  withdrawButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  activityIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  moreActivitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  moreActivitiesText: {
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 4,
  },
  emptyActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyActivityText: {
    marginTop: 8,
    color: '#888',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  creditCardIconContainer: {
    marginBottom: 24,
  },
  creditCardGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  allActivitiesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  allActivitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allActivitiesTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  filterText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  activitiesList: {
    padding: 16,
  },
  totalPointsHeader: {
    marginBottom: 24,
  },
  totalPointsContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  totalPointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  totalPointsLabel: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  leaderboardWrapper: {
    marginBottom: 20,
  },
  leaderboardInfoBox: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  leaderboardInfoText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
});

export default RewardPointsScreen;