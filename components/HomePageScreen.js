import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import ReportsManager from '../supabase/manager/reports/ReportsManager';
import { useTheme } from '../ThemeContext';

// Helper function to get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const HomePageScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('User');
  const [greeting, setGreetingState] = useState(getGreeting());
  
  // Get auth context values including loading state
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  
  // Check authentication on mount and when auth state changes
  useEffect(() => {
    console.log('Authentication state in HomePageScreen:', 
      authLoading ? 'Loading auth state...' : 
      isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    // Only redirect if auth is not loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to Login');
      navigation.replace('Login');
      return;
    }
    
    // If authenticated and not loading, load data
    if (isAuthenticated && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  // Update greeting periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      setGreetingState(getGreeting());
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.error('No user logged in');
        setError('Please log in to view reports');
        setLoading(false);
        return;
      }
      
      console.log('Loading data for user:', user.id);
      
      // Fetch user's full name
      const { data: profile, error: profileError } = await ProfileManager.getUserProfile();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else if (profile) {
        console.log('User profile fetched successfully:', profile.full_name);
        setUserName(profile.full_name || 'User');
      } else {
        console.log('No profile data returned');
      }
      
      // Fetch reports
      await fetchReports();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      console.log('Fetching reports...');
      const { data, error } = await ReportsManager.getAllReports();
      
      if (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }
      
      console.log('Reports fetched successfully:', data?.length || 0, 'reports');
      setReports(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load environmental reports');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleViewFullReport = (reportId) => {
    navigation.navigate('ReportDetail', { reportId });
  };

  // Get excerpt from full content (first 100 characters)
  const getExcerpt = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  // Featured report is the first one, if any
  const featuredReport = reports.length > 0 ? reports[0] : null;
  // The rest are regular reports
  const regularReports = reports.length > 1 ? reports.slice(1) : [];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      
      {/* Top Navigation */}
      <View style={[styles.topNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.appTitle, { color: theme.text }]}>Konserve</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('Options')}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.background }]}>
            <Ionicons name="person-circle-outline" size={32} color={theme.text} />
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Welcome Message */}
      <View style={[styles.welcomeContainer, { backgroundColor: theme.surface }]}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          {greeting}, <Text style={[styles.userName, { color: theme.primary }]}>{userName}</Text>
        </Text>
        <Text style={[styles.welcomeSubtext, { color: theme.textSecondary }]}>Stay updated with environmental reports</Text>
      </View>
      
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} 
            colors={[theme.primary]} 
            tintColor={theme.primary}
            progressBackgroundColor={theme.surface}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]} 
              onPress={fetchReports}
            >
              <Text style={[styles.retryButtonText, { color: theme.surface }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Featured Report */}
            {featuredReport && (
              <TouchableOpacity 
                style={styles.featuredReportContainer}
                onPress={() => handleViewFullReport(featuredReport.id)}
              >
                <Image 
                  source={{ uri: featuredReport.imageUrl }} 
                  style={styles.featuredImage}
                  defaultSource={require('../assets/resized.jpg')}
                />
                <View style={[styles.featuredOverlay, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)' }]}>
                  <Text style={styles.reportCategory}>{featuredReport.category}</Text>
                  <Text style={styles.featuredTitle}>{featuredReport.title}</Text>
                  <Text style={styles.reportExcerpt} numberOfLines={2}>
                    {getExcerpt(featuredReport.content)}
                  </Text>
                  <View style={styles.reportMeta}>
                    <Text style={styles.reportAuthor}>By {featuredReport.author}</Text>
                    <Text style={styles.reportTime}>
                      {new Date(featuredReport.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.readMoreButton, { backgroundColor: theme.primary }]}
                    onPress={() => handleViewFullReport(featuredReport.id)}
                  >
                    <Text style={[styles.readMoreText, { color: isDarkMode ? theme.text : '#fff' }]}>View Full Report</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Latest Reports Section */}
            <View style={[styles.latestReportsContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Latest Reports</Text>
                <TouchableOpacity>
                  <Ionicons name="filter-outline" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {regularReports.length === 0 ? (
                <Text style={[styles.noReportsText, { color: theme.textSecondary }]}>No recent reports available</Text>
              ) : (
                /* List of Regular Reports */
                regularReports.map(report => (
                  <TouchableOpacity 
                    key={report.id}
                    style={[styles.reportCard, { borderBottomColor: theme.border }]}
                    onPress={() => handleViewFullReport(report.id)}
                  >
                    <Image 
                      source={{ uri: report.imageUrl }} 
                      style={styles.reportImage}
                      defaultSource={require('../assets/resized.jpg')}
                    />
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportCategory}>{report.category}</Text>
                      <Text style={[styles.reportTitle, { color: theme.text }]}>{report.title}</Text>
                      <Text style={[styles.reportExcerpt, { color: theme.textSecondary }]} numberOfLines={2}>
                        {getExcerpt(report.content, 60)}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={[styles.reportAuthor, { color: theme.textSecondary }]}>{report.author}</Text>
                        <Text style={[styles.reportTime, { color: theme.textSecondary }]}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.viewButton, { backgroundColor: isDarkMode ? theme.secondary : '#F0F0F0' }]}
                        onPress={() => handleViewFullReport(report.id)}
                      >
                        <Text style={[styles.viewButtonText, { color: isDarkMode ? theme.text : '#3366CC' }]}>Read More</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  welcomeContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  featuredReportContainer: {
    height: 300,
    position: 'relative',
    marginBottom: 15,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  reportExcerpt: {
    fontSize: 14,
    color: '#DDD',
    marginBottom: 8,
  },
  reportCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  reportMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportAuthor: {
    fontSize: 13,
    color: '#DDD',
  },
  reportTime: {
    fontSize: 12,
    color: '#CCC',
  },
  readMoreButton: {
    backgroundColor: '#357002',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  latestReportsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reportCard: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 15,
  },
  reportImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    marginRight: 15,
  },
  reportInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 10,
  },
  viewButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#3366CC',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3366CC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  noReportsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});

export default HomePageScreen;