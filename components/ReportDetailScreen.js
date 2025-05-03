import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Share,
  ActivityIndicator,
  Dimensions,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReportsManager from '../supabase/manager/reports/ReportsManager';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const ReportDetailScreen = ({ route, navigation }) => {
  const { reportId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedReports, setRelatedReports] = useState([]);
  const { user, userId, isAuthenticated, signIn, signOut, signUp } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch the report details from Supabase
      const { data, error } = await ReportsManager.getReportById(reportId);
      
      if (error) throw error;
      if (!data) throw new Error('Report not found');
      
      setReport(data);
      
      // Fetch related reports in the same category
      if (data.category) {
        fetchRelatedReports(data.category, data.id);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message || 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedReports = async (category, currentReportId) => {
    try {
      const { data, error } = await ReportsManager.getReportsByCategory(category, 4);
      
      if (error) throw error;
      
      // Filter out the current report and limit to 3 related reports
      const filtered = data
        .filter(item => item.id !== currentReportId)
        .slice(0, 3);
        
      setRelatedReports(filtered);
    } catch (err) {
      console.error('Error fetching related reports:', err);
    }
  };

  const handleShare = async () => {
    try {
      if (report) {
        await Share.share({
          message: `Check out this environmental report: ${report.title}`,
          // If you have a web version, you can include a URL
          // url: `https://yourapp.com/reports/${reportId}`,
          title: report.title,
        });
      }
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const handleRelatedReportPress = (id) => {
    // Navigate to the selected report
    navigation.push('ReportDetail', { reportId: id });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366CC" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#D32F2F" />
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
          <TouchableOpacity 
            style={styles.goBackButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Return to Reports</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image
          source={{ uri: report.imageUrl }}
          style={styles.heroImage}
          defaultSource={require('../assets/resized.jpg')}
        />
        
        {/* Report Content */}
        <View style={styles.contentContainer}>
          {/* Category Badge */}
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{report.category}</Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>{report.title}</Text>
          
          {/* Author and Date Info */}
          <View style={styles.metaContainer}>
            <View style={styles.authorContainer}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{report.author}</Text>
            </View>
            
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{formatDate(report.created_at)}</Text>
            </View>
            
            {report.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{report.location}</Text>
              </View>
            )}
          </View>
          
          {/* Content */}
          <View style={styles.reportContent}>
            <Text style={styles.contentText}>{report.content}</Text>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#023020" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            
            {report.website_url && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Linking.openURL(report.website_url)}
              >
                <Ionicons name="globe-outline" size={20} color="#3366CC" />
                <Text style={styles.actionText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Related Reports Section */}
          {relatedReports.length > 0 && (
            <View style={styles.relatedReportsSection}>
              <Text style={styles.sectionTitle}>Related Reports</Text>
              <View style={styles.relatedReportsContainer}>
                {relatedReports.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.relatedReportCard}
                    onPress={() => handleRelatedReportPress(item.id)}
                  >
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.relatedReportImage}
                      defaultSource={require('../assets/resized.jpg')}
                    />
                    <Text style={styles.relatedReportCategory}>{item.category}</Text>
                    <Text style={styles.relatedReportTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 15,
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 20,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  category: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    lineHeight: 32,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  publishInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reportContent: {
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  relatedReportsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  relatedReports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  relatedReportCard: {
    width: (width - 50) / 2,
    marginBottom: 15,
  },
  relatedReportImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedReportTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  ctaButton: {
    backgroundColor: '#357002',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    color: '#3366CC',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ReportDetailScreen;