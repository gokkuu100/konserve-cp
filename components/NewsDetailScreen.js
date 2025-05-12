import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import { newsService } from '../supabase/manager/news/NewsManager';
import { useTheme } from '../ThemeContext';

// Format date from ISO string
const formatDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMMM d, yyyy • h:mm a');
  } catch (error) {
    console.log('Error formatting date:', error);
    return '';
  }
};

// Format relative time
const getRelativeTime = (dateString) => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.log('Error formatting relative time:', error);
    return '';
  }
};



// Related News Component
const RelatedNewsSection = ({ currentNewsId, category, navigation, theme, isDarkMode }) => {
  const [relatedNews, setRelatedNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedNews = async () => {
      try {
        setLoading(true);
        // Fetch news by category
        const { data, error } = await newsService.getNewsByCategory(category);
        
        if (error) throw error;
        
        // Filter out the current article and limit to 2 related articles
        const filtered = (data || [])
          .filter(item => item.id !== currentNewsId)
          .slice(0, 2);
        
        setRelatedNews(filtered);
      } catch (err) {
        console.error('Error fetching related news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedNews();
  }, [currentNewsId, category]);

  if (loading || relatedNews.length === 0) {
    return null; // Don't show the section if there are no related articles
  }

  return (
    <View style={styles.relatedNewsSection}>
      <Text style={[styles.relatedNewsTitle, { color: theme.text }]}>Related News</Text>
      
      <View style={styles.relatedNewsContainer}>
        {relatedNews.map(relatedItem => (
          <TouchableOpacity
            key={relatedItem.id}
            style={[styles.relatedNewsItem, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}
            onPress={() => {
              navigation.replace('NewsDetail', { newsId: relatedItem.id });
            }}
          >
            <Image
              source={{ uri: relatedItem.image_url }}
              style={styles.relatedNewsImage}
              defaultSource={require('../assets/resized.jpg')}
            />
            <View style={styles.relatedNewsContent}>
              <Text style={[styles.relatedNewsItemTitle, { color: theme.text }]} numberOfLines={2}>
                {relatedItem.title}
              </Text>
              <Text style={[styles.relatedNewsItemDate, { color: theme.textSecondary }]}>
                {getRelativeTime(relatedItem.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const NewsDetailScreen = ({ route, navigation }) => {
  const { newsId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNewsDetail();
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch news article from Supabase
      const { data, error } = await newsService.getNewsById(newsId);
      
      if (error) throw error;
      
      if (data) {
        // Mark as read in Supabase
        await newsService.markAsRead(newsId);
        
        setNews(data);
      } else {
        setError('News article not found');
      }
    } catch (err) {
      console.error('Error fetching news detail:', err);
      setError('Failed to load news article');
    } finally {
      setLoading(false);
    }
  };

  const shareNews = async () => {
    if (!news) return;
    
    try {
      await Share.share({
        message: `${news.title}\n\n${news.content}\n\nShared from Konserve App`,
        title: news.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !news) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error || 'Article not found'}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: theme.surface }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      
      {/* Top Navigation */}
      <View style={[styles.topNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.actionButton} onPress={shareNews}>
            <Ionicons name="share-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Image */}
        <Image 
          source={{ uri: news.image_url }} 
          style={styles.heroImage}
          defaultSource={require('../assets/resized.jpg')}
        />
        
        {/* Article Content */}
        <View style={styles.articleContent}>
          <View style={styles.categoryContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{news.category}</Text>
            </View>
            <Text style={[styles.publishDate, { color: theme.textSecondary }]}>
              {formatDate(news.created_at)}
            </Text>
          </View>
          
          <Text style={[styles.articleTitle, { color: theme.text }]}>{news.title}</Text>
          
          <View style={styles.authorInfo}>
            <Ionicons name="person-circle" size={24} color={theme.textSecondary} />
            <Text style={[styles.authorName, { color: theme.textSecondary }]}>By {news.author}</Text>
            <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
              • {getRelativeTime(news.created_at)}
            </Text>
          </View>
          
          <Text style={[styles.articleBody, { color: theme.text }]}>
            {news.content}
          </Text>
        </View>
        
        {/* Action Buttons */}
        {news.category === 'Events' && (
          <View style={[styles.actionButtons, { borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.actionButtonLarge, { backgroundColor: isDarkMode ? theme.cardBackground : '#F5F5F5' }]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Add to Calendar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButtonLarge, { backgroundColor: theme.primary }]}
              onPress={shareNews}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonTextLight}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Related News Section */}
        <RelatedNewsSection 
          currentNewsId={news.id} 
          category={news.category} 
          navigation={navigation} 
          theme={theme} 
          isDarkMode={isDarkMode} 
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 20,
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  articleContent: {
    padding: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  publishDate: {
    fontSize: 14,
    color: '#777',
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 32,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  authorName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  articleBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 24,
  },
  actionButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#4CAF50',
  },
  actionButtonTextLight: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#FFF',
  },
  relatedNewsSection: {
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  relatedNewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  relatedNewsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relatedNewsItem: {
    width: '48%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  relatedNewsImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  relatedNewsContent: {
    padding: 10,
  },
  relatedNewsItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  relatedNewsItemDate: {
    fontSize: 12,
    color: '#888',
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
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NewsDetailScreen;