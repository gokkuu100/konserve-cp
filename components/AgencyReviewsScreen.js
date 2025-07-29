import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Image, 
  Alert, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Modal 
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import FeedbackManager from '../supabase/manager/agency/FeedbackManager';
import AgencyManager from '../supabase/manager/agency/AgencyManager';
import PointsManager from '../supabase/manager/rewards/PointsManager';
import LeaderboardManager from '../supabase/manager/rewards/LeaderboardManager';
import { LinearGradient } from 'expo-linear-gradient';

const AgencyReviewsScreen = ({ route, navigation }) => {
  const { agencyId, agencyName } = route.params;
  const { user, userId, isAuthenticated, signIn, signOut, signUp } = useAuth();
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [satisfaction, setSatisfaction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [agencyDetails, setAgencyDetails] = useState(null);
  
  // Reward points and redemption related state
  const [userRedemptions, setUserRedemptions] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  
  // Leaderboard related state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
    loadInitialData();
  }, [isAuthenticated, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setLoadingRedemptions(true);
      setLoadingLeaderboard(true);
      
      await Promise.all([
        fetchAgencyDetails(),
        fetchReviews(),
        fetchUserRedemptions(),
        fetchLeaderboardData()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load agency data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencyDetails = async () => {
    try {
      const { data, error } = await AgencyManager.fetchAgencyDetails(agencyId);
      
      if (error) throw error;
      
      setAgencyDetails(data);
    } catch (error) {
      console.error('Error fetching agency details:', error);
      Alert.alert('Error', 'Failed to load agency details');
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await FeedbackManager.getAgencyFeedback(agencyId);
      
      if (error) throw error;
      
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserRedemptions = async () => {
    try {
      if (!user || !user.id) {
        console.error('No authenticated user for fetching redemptions');
        setLoadingRedemptions(false);
        return;
      }
      
      // Fetch user's redemption history
      const { data, error } = await PointsManager.fetchRedemptionHistory(user.id);
      
      if (error) {
        console.error('Error fetching redemption history:', error);
        throw error;
      }
      
      // Calculate total points from redemptions
      const points = data?.reduce((sum, redemption) => 
        sum + (redemption.points_earned || 0), 0) || 0;
      
      setUserRedemptions(data || []);
      setTotalPoints(points);
      
      // Updates user's points in the database to ensure leaderboard accuracy
      await LeaderboardManager.updateUserLeaderboardPoints(user.id);
      
    } catch (error) {
      console.error('Error in fetchUserRedemptions:', error);
      Alert.alert('Error', 'Failed to load redemption data');
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      if (!user || !user.id) {
        console.error('No authenticated user for fetching leaderboard');
        setLoadingLeaderboard(false);
        return;
      }
      
      const { data: leaderboard, error: leaderboardError } = 
        await LeaderboardManager.fetchLeaderboardData(10);
      
      if (leaderboardError) {
        console.error('Error fetching leaderboard:', leaderboardError);
        throw leaderboardError;
      }
      
      setLeaderboardData(leaderboard || []);
      
      // Fetch current user's rank data
      const { data: rankData, error: rankError } = 
        await LeaderboardManager.fetchUserRankData(user.id);
      
      if (rankError) {
        console.error('Error fetching user rank:', rankError);
        throw rankError;
      }
      
      setUserRank(rankData);
      
    } catch (error) {
      console.error('Error in fetchLeaderboardData:', error);
      Alert.alert('Error', 'Failed to load leaderboard data');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#FFD700' : '#ccc'}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSatisfactionIcon = (satisfaction) => {
    switch (satisfaction.toLowerCase()) {
      case 'satisfied':
        return { name: 'happy-outline', color: '#4CAF50' };
      case 'neutral':
        return { name: 'remove-outline', color: '#FFC107' };
      case 'dissatisfied':
        return { name: 'sad-outline', color: '#F44336' };
      default:
        return { name: 'remove-outline', color: '#757575' };
    }
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.user_name || 'Anonymous'}</Text>
        <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
      </View>
      {renderStars(item.rating)}
      <View style={styles.satisfactionContainer}>
        <Ionicons
          name={getSatisfactionIcon(item.satisfaction).name}
          size={20}
          color={getSatisfactionIcon(item.satisfaction).color}
        />
        <Text style={styles.satisfactionText}>{item.satisfaction}</Text>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
    </View>
  );

  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleSatisfactionPress = (selectedSatisfaction) => {
    setSatisfaction(selectedSatisfaction);
  };

  const handleSubmitReview = async () => {
    try {
      if (rating === 0) {
        Alert.alert('Error', 'Please select a rating');
        return;
      }

      setSubmitting(true);

      const { error } = await FeedbackManager.submitAgencyFeedback({
        userId: user.id,
        agencyId,
        rating,
        satisfaction,
        comment: comment.trim()
      });

      if (error) throw error;

      await FeedbackManager.updateAgencyRatings(agencyId);

      setShowReviewModal(false);
      resetForm();
      fetchReviews();

      Alert.alert('Success', 'Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setSatisfaction('');
    setComment('');
  };

  // Format date to readable format for redemption codes
  const formatRedemptionDate = (dateString) => {
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

  // Redemption Card Component
  const RedemptionCard = ({ redemption }) => {
    return (
      <View style={styles.redemptionCard}>
        <View style={styles.redemptionIconContainer}>
          <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#4CAF50" />
        </View>
        
        <View style={styles.redemptionDetails}>
          <Text style={styles.redemptionCodeName}>{redemption.code_name}</Text>
          <Text style={styles.redemptionDate}>{formatRedemptionDate(redemption.redeemed_at)}</Text>
        </View>
        
        <View style={styles.redemptionPoints}>
          <Text style={styles.pointsText}>+{redemption.points_earned}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>
    );
  };

  // Leaderboard Item Component
  const LeaderboardItem = ({ item, isCurrentUser }) => {
    const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=4CAF50&color=fff&name=User';
    
    // Determine medal for top 3
    const getMedalIcon = (rank) => {
      if (rank === 1) return { icon: 'medal', color: '#FFD700' }; // Gold
      if (rank === 2) return { icon: 'medal', color: '#C0C0C0' }; // Silver
      if (rank === 3) return { icon: 'medal', color: '#CD7F32' }; // Bronze
      return null;
    };
    
    const medal = getMedalIcon(item.rank);
    
    return (
      <View style={[styles.leaderboardItem, isCurrentUser && styles.highlightedItem]}>
        {medal ? (
          <View style={styles.rankContainer}>
            <MaterialCommunityIcons name={medal.icon} size={20} color={medal.color} />
          </View>
        ) : (
          <Text style={styles.rankText}>{item.rank}</Text>
        )}
        
        <Image 
          source={{ uri: item.avatar_url || DEFAULT_AVATAR + `&name=${encodeURIComponent(item.full_name || 'User')}` }} 
          style={styles.avatar} 
        />
        
        <Text style={styles.nameText} numberOfLines={1}>
          {item.full_name || 'User'} {isCurrentUser && '(You)'}
        </Text>
        
        <Text style={styles.pointsText}>{item.total_points || 0} pts</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {agencyName} Reviews
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#2E7D32', '#4CAF50', '#81C784']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsCard}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="wallet-membership" size={28} color="#fff" />
              <Text style={styles.membershipText}>REWARD POINTS</Text>
            </View>
            
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsLabel}>TOTAL POINTS</Text>
              <Text style={styles.pointsValue}>{totalPoints}</Text>
              <View style={styles.heroTag}>
                <Text style={styles.heroText}>
                  {userRank ? `Rank #${userRank.rank}` : 'Not Ranked'}
                </Text>
              </View>
            </View>
            
            <View style={styles.cardFooter}>
              <View style={styles.nameContainer}>
                <Text style={styles.nameLabel}>USER</Text>
                <Text style={styles.nameValue}>{user?.user_metadata?.full_name || 'User'}</Text>
              </View>
              
              <View style={styles.chipContainer}>
                <FontAwesome name="leaf" size={20} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Redemption Codes Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Redemption Codes</Text>
          </View>
          
          {loadingRedemptions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : userRedemptions.length > 0 ? (
            <View>
              {userRedemptions.slice(0, 3).map((redemption) => (
                <RedemptionCard key={redemption.id} redemption={redemption} />
              ))}
              
              {userRedemptions.length > 3 && (
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => navigation.navigate('Rewards')}
                >
                  <Text style={styles.moreButtonText}>
                    View all {userRedemptions.length} redemptions
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="ticket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No redemption codes yet</Text>
              <TouchableOpacity 
                style={styles.redeemCodeButton}
                onPress={() => navigation.navigate('Rewards')}
              >
                <Text style={styles.redeemCodeButtonText}>Redeem a Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Leaderboard Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <TouchableOpacity onPress={() => setShowLeaderboardModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {loadingLeaderboard ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          ) : leaderboardData.length > 0 ? (
            <View style={styles.leaderboardContainer}>
              {leaderboardData.slice(0, 5).map((item) => (
                <LeaderboardItem 
                  key={item.user_id} 
                  item={item} 
                  isCurrentUser={item.user_id === user?.id}
                />
              ))}
              
              {!leaderboardData.some(item => item.user_id === user?.id) && userRank && (
                <View>
                  <View style={styles.divider} />
                  <LeaderboardItem 
                    item={userRank} 
                    isCurrentUser={true}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No leaderboard data available</Text>
            </View>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#357002" />
            </View>
          ) : (
            reviews.length > 0 ? (
              reviews.map(item => renderReviewItem({item}))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No reviews yet</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Leaderboard Modal */}
      <Modal
        visible={showLeaderboardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLeaderboardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.leaderboardModalContainer}>
            <View style={styles.leaderboardModalHeader}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowLeaderboardModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.leaderboardModalTitle}>Points Leaderboard</Text>
              <View style={{width: 24}} />
            </View>
            
            {loadingLeaderboard ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : (
              <FlatList
                data={leaderboardData}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => (
                  <LeaderboardItem 
                    item={item} 
                    isCurrentUser={item.user_id === user?.id}
                  />
                )}
                ListHeaderComponent={
                  <View style={styles.leaderboardHeader}>
                    <Text style={styles.leaderboardHeaderText}>Top Users by Points</Text>
                    {userRank && (
                      <View style={styles.userRankContainer}>
                        <Text style={styles.userRankText}>
                          Your Rank: #{userRank.rank} with {userRank.total_points} points
                        </Text>
                      </View>
                    )}
                  </View>
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="trophy-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No leaderboard data available</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
      >
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ratingOverview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewsList: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  satisfactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  satisfactionText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  satisfactionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  satisfactionButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    width: '18%',
  },
  selectedSatisfactionButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  satisfactionButtonText: {
    fontSize: 10,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  commentInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  reviewFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#757575',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flex: 2,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  writeReviewButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  writeReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  subscriptionRequiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  subscriptionRequiredText: {
    color: '#757575',
    fontSize: 14,
    marginLeft: 8,
  },
  redemptionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  redemptionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  redemptionDetails: {
    flex: 1,
  },
  redemptionCodeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  redemptionDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  redemptionPoints: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  highlightedItem: {
    backgroundColor: '#E8F5E9',
  },
  rankContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pointsCard: {
    padding: 16,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  membershipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
  pointsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  heroTag: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  heroText: {
    fontSize: 12,
    color: '#fff',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  nameLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  nameValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  chipContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  leaderboardContainer: {
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  leaderboardModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
  },
  leaderboardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  leaderboardModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userRankContainer: {
    marginBottom: 16,
  },
  userRankText: {
    fontSize: 14,
    color: '#757575',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginTop: 16,
  },
  moreButtonText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  redeemCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginTop: 16,
  },
  redeemCodeButtonText: {
    fontSize: 14,
    color: '#fff',
  },
});

export default AgencyReviewsScreen;
