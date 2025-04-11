import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SupabaseManager from './SupabaseManager';

const HomePageScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('User');
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    loadData();
    setGreeting(getGreeting());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's full name
      const fullName = await SupabaseManager.getUserFullName();
      setUserName(fullName);
      
      // Fetch reports
      await fetchReports();
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await SupabaseManager.getAllReports();
      
      if (error) throw error;
      
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366CC" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.appTitle}>Konserve</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('Options')}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={32} color="#333" />
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>
          {greeting}, <Text style={styles.userName}>{userName}</Text>
        </Text>
        <Text style={styles.welcomeSubtext}>Stay updated with environmental reports</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={fetchReports}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
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
                <View style={styles.featuredOverlay}>
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
                    style={styles.readMoreButton}
                    onPress={() => handleViewFullReport(featuredReport.id)}
                  >
                    <Text style={styles.readMoreText}>View Full Report</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Latest Reports Section */}
            <View style={styles.latestReportsContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Latest Reports</Text>
                <TouchableOpacity>
                  <Ionicons name="filter-outline" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {regularReports.length === 0 ? (
                <Text style={styles.noReportsText}>No recent reports available</Text>
              ) : (
                /* List of Regular Reports */
                regularReports.map(report => (
                  <TouchableOpacity 
                    key={report.id}
                    style={styles.reportCard}
                    onPress={() => handleViewFullReport(report.id)}
                  >
                    <Image 
                      source={{ uri: report.imageUrl }} 
                      style={styles.reportImage}
                      defaultSource={require('../assets/resized.jpg')}
                    />
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportCategory}>{report.category}</Text>
                      <Text style={styles.reportTitle}>{report.title}</Text>
                      <Text style={styles.reportExcerpt} numberOfLines={2}>
                        {getExcerpt(report.content, 60)}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={styles.reportAuthor}>{report.author}</Text>
                        <Text style={styles.reportTime}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleViewFullReport(report.id)}
                      >
                        <Text style={styles.viewButtonText}>Read More</Text>
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
    backgroundColor: '#3366CC',
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