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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ReportDetailScreen = ({ route, navigation }) => {
  const { reportId } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch the report details from Supabase
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportId)
          .single();
          
        if (error) throw error;
        
        setReport(data);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report details');
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetails();
  }, [reportId]);

  const handleShare = async () => {
    try {
      if (report) {
        await Share.share({
          message: `Check out this environmental report: ${report.title}`,
          url: `https://ecotracker.app/reports/${reportId}`,
        });
      }
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
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
          {/* Category and Date */}
          <View style={styles.metaInfo}>
            <View style={styles.categoryContainer}>
              <Text style={styles.category}>{report.category}</Text>
            </View>
            <Text style={styles.date}>
              Published on {new Date(report.created_at).toLocaleDateString()}
            </Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>{report.title}</Text>
          
          {/* Author Info */}
          <View style={styles.authorContainer}>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>By {report.author}</Text>
              <Text style={styles.publishInfo}>{report.location}</Text>
            </View>
          </View>
          
          {/* Content */}
          <View style={styles.reportContent}>
            <Text style={styles.contentText}>{report.content}</Text>
          </View>
          
          {/* Stats and Actions */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={18} color="#666" />
              <Text style={styles.statText}>{report.views || 0} views</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={18} color="#666" />
              <Text style={styles.statText}>{report.comments || 0} comments</Text>
            </View>
          </View>
          
          {/* Related Reports Section */}
          {report.relatedReports && report.relatedReports.length > 0 && (
            <View style={styles.relatedReportsSection}>
              <Text style={styles.sectionTitle}>Related Reports</Text>
              <View style={styles.relatedReports}>
                {report.relatedReports.map((relatedReport) => (
                  <TouchableOpacity 
                    key={relatedReport.id}
                    style={styles.relatedReportCard}
                    onPress={() => navigation.replace('ReportDetail', { reportId: relatedReport.id })}
                  >
                    <Image 
                      source={{ uri: relatedReport.imageUrl }} 
                      style={styles.relatedReportImage}
                      defaultSource={require('../assets/resized.jpg')}
                    />
                    <Text style={styles.relatedReportTitle} numberOfLines={2}>
                      {relatedReport.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* Call to Action */}
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Take Action Now</Text>
          </TouchableOpacity>
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
    backgroundColor: '#3366CC',
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