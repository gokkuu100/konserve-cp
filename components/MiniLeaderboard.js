import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LeaderboardManager from '../supabase/manager/rewards/LeaderboardManager';
import { useTheme } from '../ThemeContext';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=4CAF50&color=fff&name=User';

const MiniLeaderboard = ({ onViewFullLeaderboard, theme: propTheme, isDarkMode: propIsDarkMode }) => {
  const themeContext = useTheme();
  // Use provided theme props or fall back to context
  const theme = propTheme || themeContext.theme;
  const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : themeContext.isDarkMode;
  
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [displayUsers, setDisplayUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userNotRanked, setUserNotRanked] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    
    if (isAuthenticated && userId) {
      fetchLeaderboardData(userId);
    }
  }, [isAuthenticated, userId, authLoading]);

  const fetchLeaderboardData = async (currentUserId) => {
    try {
      setLoading(true);
      setError(null);
      setUserNotRanked(false);

      if (!currentUserId) {
        console.error('No user ID available for fetching leaderboard data');
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      // First, get complete leaderboard data (limit to top 20 for efficiency)
      const { data: allLeaderboardData, error: leaderboardError } = 
        await LeaderboardManager.fetchLeaderboardData(20, 0);
      
      if (leaderboardError) {
        console.error('Error fetching leaderboard data:', leaderboardError);
        throw leaderboardError;
      }
      
      // Always show top 3 users by default
      const topUsers = (allLeaderboardData || []).slice(0, 3);
      setDisplayUsers(topUsers);
      
      // IMPORTANT: Find current user directly in the leaderboard data
      const currentUserRank = allLeaderboardData?.find(user => 
        user.user_id === currentUserId
      );
      
      if (currentUserRank) {
        // User is on the leaderboard
        setUserRank(currentUserRank);
        
        // If user rank is more than 3, show users around them instead of top 3
        if (currentUserRank.rank > 3) {
          try {
            // Find users directly above and below current user
            const usersAround = [];
            
            // Find user above (if exists)
            const userAbove = allLeaderboardData.find(user => 
              user.rank === currentUserRank.rank - 1
            );
            if (userAbove) usersAround.push(userAbove);
            
            // Add current user
            usersAround.push(currentUserRank);
            
            // Find user below (if exists)
            const userBelow = allLeaderboardData.find(user => 
              user.rank === currentUserRank.rank + 1
            );
            if (userBelow) usersAround.push(userBelow);
            
            // If we found surrounding users, display them
            if (usersAround.length > 1) {
              setDisplayUsers(usersAround);
            }
          } catch (error) {
            console.error('Error getting surrounding users:', error);
            // Fall back to showing top 3 users
          }
        }
      } else {
        // User is not on leaderboard
        console.log('User not found in leaderboard data');
        setUserNotRanked(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchLeaderboardData:', error);
      setError('Failed to load leaderboard data');
      setLoading(false);
    }
  };

  const handleViewFullLeaderboard = () => {
    if (onViewFullLeaderboard) {
      onViewFullLeaderboard();
    }
  };

  const renderLeaderboardItem = (item, index) => {
    // Check if the user_id matches the current user
    const isCurrentUser = item.user_id === userId;
    
    // Determine medal or rank number to display
    const renderRankIndicator = (rank) => {
      if (rank === 1) {
        return (
          <View style={styles.medalContainer}>
            <MaterialCommunityIcons name="medal" size={20} color="#FFD700" />
          </View>
        );
      } else if (rank === 2) {
        return (
          <View style={styles.medalContainer}>
            <MaterialCommunityIcons name="medal" size={20} color="#C0C0C0" />
          </View>
        );
      } else if (rank === 3) {
        return (
          <View style={styles.medalContainer}>
            <MaterialCommunityIcons name="medal" size={20} color="#CD7F32" />
          </View>
        );
      } else {
        return (
          <View style={styles.rankContainer}>
            <Text style={[styles.rankText, { color: theme.text }]}>{item.rank || index + 1}</Text>
          </View>
        );
      }
    };
    
    return (
      <View 
        key={item.user_id} 
        style={[
          styles.leaderboardItem, 
          isCurrentUser && [
            styles.highlightedItem, 
            { backgroundColor: isDarkMode ? '#2c3e2c' : '#E8F5E9' }
          ]
        ]}
      >
        {renderRankIndicator(item.rank)}
        
        <Image 
          source={{ uri: item.avatar_url || DEFAULT_AVATAR + `&name=${encodeURIComponent(item.full_name || 'User')}` }} 
          style={styles.avatar} 
        />
        
        <Text 
          style={[
            styles.nameText, 
            { color: theme.text },
            isCurrentUser && { fontWeight: '600' }
          ]} 
          numberOfLines={1}
        >
          {item.full_name || 'User'} {isCurrentUser && '(You)'}
        </Text>
        
        <Text style={[styles.pointsText, { 
          color: isDarkMode ? '#6abf69' : theme.primary 
        }]}>{item.total_points || 0} pts</Text>
      </View>
    );
  };


  // New UI for when user is not in leaderboard yet
  const renderUserNotRankedMessage = () => (
    <View style={styles.notRankedContainer}>
      <MaterialCommunityIcons name="trophy-outline" size={24} color="#888" />
      <Text style={styles.notRankedText}>
        You're not on the leaderboard yet
      </Text>
      <Text style={styles.notRankedInstructions}>
        Redeem your first code to join the rankings!
      </Text>
    </View>
  );


  if (loading) {
    return (
      <View style={[styles.container, { 
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
        borderColor: isDarkMode ? '#333' : 'transparent',
        borderWidth: isDarkMode ? 1 : 0
      }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.headerText, { color: theme.text }]}>Leaderboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={isDarkMode ? '#6abf69' : theme.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { 
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
        borderColor: isDarkMode ? '#333' : 'transparent',
        borderWidth: isDarkMode ? 1 : 0
      }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.headerText, { color: theme.text }]}>Leaderboard</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          {error === 'User not authenticated' ? (
            <Text style={[styles.errorSubText, { color: theme.textSecondary }]}>
              Please log in to view the leaderboard
            </Text>
          ) : (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: isDarkMode ? '#2c5c2c' : theme.primary }]} 
              onPress={() => fetchLeaderboardData(userId)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { 
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
      shadowColor: isDarkMode ? '#000' : '#000',
      borderColor: isDarkMode ? '#333' : 'transparent',
      borderWidth: isDarkMode ? 1 : 0
    }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, { color: theme.text }]}>Leaderboard</Text>
        <TouchableOpacity onPress={handleViewFullLeaderboard}>
          <Text style={[styles.viewAllText, { color: isDarkMode ? '#6abf69' : theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {displayUsers.length > 0 ? (
        <View style={styles.leaderboardContainer}>
          {displayUsers.map((item, index) => renderLeaderboardItem(item, index))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="trophy-outline" 
            size={36} 
            color={isDarkMode ? '#555' : '#ccc'} 
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No leaderboard data available
          </Text>
        </View>
      )}
      
      {/* Show this when user is not yet in leaderboard */}
      {userNotRanked && (
        <View style={[styles.notRankedContainer, {
          backgroundColor: isDarkMode ? '#3e3e26' : '#FFF9C4',
          borderLeftColor: isDarkMode ? '#b39f00' : '#FFC107'
        }]}>
          <MaterialCommunityIcons 
            name="trophy-outline" 
            size={24} 
            color={isDarkMode ? '#e6c700' : '#FFC107'} 
          />
          <Text style={[styles.notRankedText, { color: theme.text }]}>
            You're not on the leaderboard yet
          </Text>
          <Text style={[styles.notRankedInstructions, { color: theme.textSecondary }]}>
            Redeem your first code to join the rankings!
          </Text>
        </View>
      )}
      
      {/* Only show this section when user is in leaderboard but not visible in top section */}
      {userRank && !displayUsers.some(user => user.user_id === userId) && !userNotRanked && (
        <View style={[styles.currentUserContainer, { 
          borderTopColor: isDarkMode ? '#333' : '#e0e0e0' 
        }]}>
          <Text style={[styles.yourRankLabel, { color: theme.textSecondary }]}>Your Rank</Text>
          {renderLeaderboardItem(userRank, -1)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
  },
  leaderboardContainer: {
    marginBottom: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  highlightedItem: {
    backgroundColor: '#E8F5E9',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    width: 32,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  nameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  currentUserContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  yourRankLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  medalContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notRankedContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  notRankedText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  notRankedInstructions: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default MiniLeaderboard;