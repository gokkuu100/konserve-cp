import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LeaderboardManager from '../supabase/manager/rewards/LeaderboardManager';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=4CAF50&color=fff&name=User';

const FullLeaderboardScreen = ({ onClose }) => {
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userNotRanked, setUserNotRanked] = useState(false);

  // Authentication check and data loading
  useEffect(() => {
    if (!authLoading) {
      fetchLeaderboardData();
    }
  }, [authLoading, isAuthenticated]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setUserNotRanked(false);
      
      console.log('Fetching full leaderboard data...');
      
      // Fetch complete leaderboard data
      const { data, error } = await LeaderboardManager.fetchLeaderboardData(100);
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }
      
      // Ensure users are sorted by points in descending order
      const sortedUsers = [...(data || [])].sort((a, b) => b.total_points - a.total_points);
      
      console.log('Leaderboard data:', sortedUsers);
      setLeaderboardData(sortedUsers);
      
      // If user is authenticated, find them directly in the leaderboard data
      if (isAuthenticated && userId) {
        const currentUserInLeaderboard = sortedUsers.find(user => 
          user.user_id === userId
        );
        
        if (currentUserInLeaderboard) {
          console.log('Found user in leaderboard data:', currentUserInLeaderboard);
          setUserRank(currentUserInLeaderboard);
        } else {
          console.log('User not found in leaderboard data');
          setUserNotRanked(true);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboardData();
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.user_id === userId;
    
    return (
      <View style={[
        styles.userItem, 
        isCurrentUser && styles.currentUserItem
      ]}>
        {/* Rank or Medal */}
        {item.rank <= 3 ? (
          <View style={[
            styles.medalContainer,
            item.rank === 1 ? styles.goldMedal : 
            item.rank === 2 ? styles.silverMedal : 
            item.rank === 3 ? styles.bronzeMedal : null
          ]}>
            <MaterialCommunityIcons 
              name="medal" 
              size={24} 
              color="#fff" 
            />
          </View>
        ) : (
          <Text style={styles.rankText}>{item.rank}</Text>
        )}
        
        <Image 
          source={{ 
            uri: item.avatar_url || 
            `${DEFAULT_AVATAR}&name=${encodeURIComponent(item.full_name || 'User')}` 
          }} 
          style={styles.avatar}
        />
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.full_name || 'User'}
            {isCurrentUser && <Text style={styles.youText}> (You)</Text>}
          </Text>
        </View>
        
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{item.total_points}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>Top Users</Text>
      
      {userRank && (
        <View style={styles.userRankInfo}>
          <Text style={styles.userRankText}>
            Your Rank: #{userRank.rank} with {userRank.total_points} points
          </Text>
        </View>
      )}
      
      {/* Show the "not ranked yet" banner if applicable */}
      {userNotRanked && (
        <View style={styles.notRankedInfo}>
          <MaterialIcons name="emoji-events" size={24} color="#FFA000" style={styles.trophyIcon} />
          <View style={styles.notRankedTextContainer}>
            <Text style={styles.notRankedTitle}>You're not on the leaderboard yet</Text>
            <Text style={styles.notRankedInstructions}>
              Redeem reward codes to earn points and join the rankings!
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLeaderboardData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={leaderboardData}
          renderItem={renderItem}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No leaderboard data available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 24,
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userRankInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  userRankText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  currentUserItem: {
    backgroundColor: '#E8F5E9',
  },
  medalContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldMedal: {
    backgroundColor: '#FFD700',
  },
  silverMedal: {
    backgroundColor: '#C0C0C0',
  },
  bronzeMedal: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    width: 32,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  youText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    padding: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  notRankedInfo: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  trophyIcon: {
    marginRight: 12,
  },
  notRankedTextContainer: {
    flex: 1,
  },
  notRankedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notRankedInstructions: {
    fontSize: 12,
    color: '#666',
  },
});

export default FullLeaderboardScreen;