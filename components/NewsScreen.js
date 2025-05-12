import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useTheme } from '../ThemeContext';
import { newsService } from '../supabase/manager/news/NewsManager';

// Format relative time (e.g., "2 hours ago")
const getRelativeTime = (dateString) => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.log('Error formatting relative time:', error);
    return '';
  }
};

// Format date (e.g., "Sep 10, 2023")
const formatDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.log('Error formatting date:', error);
    return '';
  }
};

// News categories for filtering
const NEWS_CATEGORIES = ['All', 'Events', 'Announcements', 'Reports'];

const NewsScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [newsData, setNewsData] = useState([]);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [readArticles, setReadArticles] = useState([]);

  useEffect(() => {
    fetchNewsData();
  }, []);

  useEffect(() => {
    filterNewsData(activeFilter);
  }, [activeFilter]);

  // Fetch user's read articles
  const fetchReadArticles = async () => {
    try {
      const { data, error } = await newsService.getReadArticles();
      if (error) throw error;
      setReadArticles(data || []);
    } catch (err) {
      console.error('Error fetching read articles:', err);
    }
  };

  const fetchNewsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch read articles
      await fetchReadArticles();
      
      // Fetch all news
      const { data: allNews, error: newsError } = await newsService.getAllNews();
      if (newsError) throw newsError;
      
      // Fetch featured news
      const { data: featured, error: featuredError } = await newsService.getFeaturedNews();
      if (featuredError) throw featuredError;
      
      setFeaturedNews(featured || []);
      setNewsData(allNews || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterNewsData = async (filter) => {
    try {
      setLoading(true);
      
      if (filter === 'All') {
        const { data, error } = await newsService.getAllNews();
        if (error) throw error;
        setNewsData(data || []);
      } else {
        const { data, error } = await newsService.getNewsByCategory(filter);
        if (error) throw error;
        setNewsData(data || []);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error filtering news:', err);
      setError('Failed to filter news');
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNewsData();
  };

  const handleViewFullNews = async (newsId) => {
    try {
      // Mark news as read in Supabase
      await newsService.markAsRead(newsId);
      
      // Update local read status
      setReadArticles(prev => [...prev, newsId]);
      
      // Navigate to news detail screen
      navigation.navigate('NewsDetail', { newsId });
    } catch (err) {
      console.error('Error marking news as read:', err);
    }
  };

  // Get excerpt from full content
  const getExcerpt = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  // Render loading skeleton for featured news carousel
  const renderFeaturedSkeleton = () => (
    <View style={styles.carouselContainer}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredCarousel}
      >
        {[1, 2, 3].map(key => (
          <View 
            key={key} 
            style={[styles.featuredSkeletonCard, { backgroundColor: isDarkMode ? '#444' : '#E0E0E0' }]}
          >
            <View style={[styles.skeletonTitle, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={[styles.skeletonText, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={[styles.skeletonText, { width: '70%', backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={styles.skeletonMeta}>
              <View style={[styles.skeletonAuthor, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
              <View style={[styles.skeletonDate, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Render loading skeleton for regular news list
  const renderNewsListSkeleton = () => (
    <View style={styles.newsListContainer}>
      {[1, 2, 3, 4].map(key => (
        <View 
          key={key} 
          style={[styles.newsSkeletonCard, { backgroundColor: isDarkMode ? '#444' : '#E0E0E0' }]}
        >
          <View style={[styles.skeletonImage, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonCategory, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={[styles.skeletonTitle, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={[styles.skeletonText, { backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
            <View style={[styles.skeletonText, { width: '60%', backgroundColor: isDarkMode ? '#555' : '#F0F0F0' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render featured news carousel item
  const renderFeaturedItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      style={[styles.featuredCard, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}
      onPress={() => handleViewFullNews(item.id)}
    >
      <Image 
        source={{ uri: item.image_url }} 
        style={styles.featuredImage}
        defaultSource={require('../assets/resized.jpg')}
      />
      <View style={styles.featuredContent}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={[styles.featuredTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.featuredExcerpt, { color: theme.textSecondary }]} numberOfLines={2}>
          {getExcerpt(item.content, 80)}
        </Text>
        <View style={styles.featuredMeta}>
          <Text style={[styles.newsAuthor, { color: theme.textSecondary }]}>{item.author}</Text>
          <Text style={[styles.newsDate, { color: theme.textSecondary }]}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
      
      {item.category === 'Announcements' && !readArticles.includes(item.id) && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );

  // Render regular news item (vertical layout)
  const renderNewsItemVertical = (item) => (
    <TouchableOpacity 
      style={[
        styles.newsCardVertical, 
        { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' },
        item.category === 'Announcements' && !readArticles.includes(item.id) && styles.unreadCardHighlight
      ]}
      onPress={() => handleViewFullNews(item.id)}
    >
      <Image 
        source={{ uri: item.image_url }}
        style={styles.newsImageVertical}
        defaultSource={require('../assets/resized.jpg')}
      />
      <View style={styles.newsContentVertical}>
        <View style={styles.newsHeaderVertical}>
          <View style={styles.categoryBadgeSmall}>
            <Text style={styles.categoryTextSmall}>{item.category}</Text>
          </View>
          {item.category === 'Announcements' && !readArticles.includes(item.id) && (
            <View style={styles.unreadIndicatorSmall} />
          )}
        </View>
        
        <Text style={[styles.newsTitleVertical, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={[styles.newsExcerptVertical, { color: theme.textSecondary }]} numberOfLines={3}>
          {getExcerpt(item.content, 100)}
        </Text>
        
        <View style={styles.newsMetaVertical}>
          <View style={styles.authorRow}>
            <Ionicons name="person-circle-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.newsAuthorVertical, { color: theme.textSecondary }]}>
              {item.author}
            </Text>
          </View>
          
          <View style={styles.dateTimeRow}>
            <Text style={[styles.newsRelativeTime, { color: theme.textSecondary }]}>
              {getRelativeTime(item.created_at)}
            </Text>
            <Text style={[styles.newsFullDate, { color: theme.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render horizontal news item (for "All" filter)
  const renderNewsItemHorizontal = (item) => (
    <TouchableOpacity 
      style={[
        styles.newsCardHorizontal, 
        { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' },
        item.category === 'Announcements' && !readArticles.includes(item.id) && styles.unreadCardHighlight
      ]}
      onPress={() => handleViewFullNews(item.id)}
    >
      <Image 
        source={{ uri: item.image_url }}
        style={styles.newsImageHorizontal}
        defaultSource={require('../assets/resized.jpg')}
      />
      <View style={styles.newsContentHorizontal}>
        <View style={styles.newsHeaderHorizontal}>
          <View style={styles.categoryBadgeSmall}>
            <Text style={styles.categoryTextSmall}>{item.category}</Text>
          </View>
          {item.category === 'Announcements' && !readArticles.includes(item.id) && (
            <View style={styles.unreadIndicatorSmall} />
          )}
        </View>
        
        <Text style={[styles.newsTitleHorizontal, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={[styles.newsExcerptHorizontal, { color: theme.textSecondary }]} numberOfLines={2}>
          {getExcerpt(item.content, 60)}
        </Text>
        
        <View style={styles.newsMetaHorizontal}>
          <Text style={[styles.newsAuthor, { color: theme.textSecondary }]}>
            {item.author}
          </Text>
          <Text style={[styles.newsDate, { color: theme.textSecondary }]}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.surface} />
      
      {/* Top Navigation */}
      <View style={[styles.topNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>News & Updates</Text>

        <TouchableOpacity onPress={() => navigation.navigate('Options')}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.background }]}>
            <Ionicons name="person-circle-outline" size={32} color={theme.text} />
          </View>
        </TouchableOpacity>
      </View>

      
      
      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {NEWS_CATEGORIES.map(filter => (
          <TouchableOpacity 
            key={filter}
            style={[
              styles.filterButton, 
              activeFilter === filter && {
                backgroundColor: isDarkMode ? theme.primary + '30' : theme.primary + '15',
                borderColor: theme.primary 
              }
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text 
              style={[
                styles.filterText, 
                { color: activeFilter === filter ? theme.primary : theme.textSecondary }
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]} 
            onPress={fetchNewsData}
          >
            <Text style={[styles.retryButtonText, { color: theme.surface }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[theme.primary]} 
              tintColor={theme.primary}
              progressBackgroundColor={theme.surface}
            />
          }
        >
          {/* Featured News Section - Only show in "All" filter */}
          {activeFilter === 'All' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured</Text>
              </View>
              
              {loading ? renderFeaturedSkeleton() : (
                <View style={styles.carouselContainer}>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredCarousel}
                    data={featuredNews}
                    renderItem={({item, index}) => renderFeaturedItem(item)}
                    keyExtractor={item => item.id}
                    onScroll={(event) => {
                      const slideWidth = 292; // width of card (280) + right margin (12)
                      const offset = event.nativeEvent.contentOffset.x;
                      const index = Math.round(offset / slideWidth);
                      setCurrentFeaturedIndex(index);
                    }}
                    pagingEnabled={false}
                    snapToInterval={292} // width of card (280) + right margin (12)
                    snapToAlignment="start"
                    decelerationRate="fast"
                  />
                  
                  {/* Pagination dots */}
                  {featuredNews.length > 0 ? (
                    <View style={styles.paginationDots}>
                      {featuredNews.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.paginationDot,
                            { backgroundColor: index === currentFeaturedIndex ? theme.primary : theme.border }
                          ]}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
                      No featured news available
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
          
          {/* Latest News Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {activeFilter === 'All' ? 'Latest Updates' : activeFilter}
              </Text>
            </View>
            
            {loading ? renderNewsListSkeleton() : (
              <View style={styles.newsListContainer}>
                {newsData.length > 0 ? (
                  newsData.map(item => (
                    <React.Fragment key={item.id}>
                      {activeFilter === 'All' 
                        ? renderNewsItemHorizontal(item)
                        : renderNewsItemVertical(item)}
                    </React.Fragment>
                  ))
                ) : (
                  <View style={styles.noDataContainer}>
                    <MaterialIcons name="article" size={48} color={theme.textSecondary} />
                    <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
                      No {activeFilter === 'All' ? 'news articles' : activeFilter.toLowerCase()} found
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Monthly Leaderboard Section - Only show in "All" filter */}
          {activeFilter === 'All' && (
            <View style={[styles.leaderboardContainer, { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }]}>
              <View style={styles.leaderboardHeader}>
                <MaterialIcons name="leaderboard" size={24} color={theme.primary} />
                <Text style={[styles.leaderboardTitle, { color: theme.text }]}>Monthly Recycling Leaders</Text>
              </View>
              
{/*               
              <TouchableOpacity 
                style={[styles.viewAllButton, { borderColor: theme.primary }]}
                onPress={() => navigation.navigate('Leaderboard')}
              >
                <Text style={[styles.viewAllText, { color: theme.primary }]}>View All Rankings</Text>
              </TouchableOpacity> */}
            </View>
          )}
        </ScrollView>
      )}
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
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  carouselContainer: {
    marginBottom: 16,
  },
  featuredCarousel: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  featuredCard: {
    width: 280,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  featuredSkeletonCard: {
    width: 280,
    height: 220,
    borderRadius: 12,
    marginRight: 12,
    padding: 16,
    backgroundColor: '#E0E0E0',
  },
  featuredImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  featuredContent: {
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  categoryBadgeSmall: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryTextSmall: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4CAF50',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  featuredExcerpt: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsAuthor: {
    fontSize: 12,
    color: '#777',
  },
  newsDate: {
    fontSize: 11,
    color: '#888',
  },
  newsListContainer: {
    paddingHorizontal: 16,
  },
  // Horizontal card styles (for "All" filter)
  newsCardHorizontal: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  newsImageHorizontal: {
    width: 120,
    height: '100%',
    resizeMode: 'cover',
  },
  newsContentHorizontal: {
    flex: 1,
    padding: 12,
  },
  newsHeaderHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  newsTitleHorizontal: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  newsExcerptHorizontal: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666',
    marginBottom: 6,
  },
  newsMetaHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  
  // Vertical card styles (for filtered views)
  newsCardVertical: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  newsImageVertical: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  newsContentVertical: {
    padding: 14,
  },
  newsHeaderVertical: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTitleVertical: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  newsExcerptVertical: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  newsMetaVertical: {
    marginTop: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  newsAuthorVertical: {
    fontSize: 13,
    color: '#777',
    marginLeft: 6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsRelativeTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  newsFullDate: {
    fontSize: 12,
    color: '#888',
  },
  
  // Unread indicators
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
  },
  unreadIndicatorSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  unreadCardHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  
  // Skeleton loading styles
  newsSkeletonCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E0E0E0',
  },
  skeletonImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  skeletonCategory: {
    width: 60,
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '90%',
  },
  skeletonText: {
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
    width: '100%',
  },
  skeletonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  skeletonAuthor: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  skeletonDate: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  
  // Error and empty states
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
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#777',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Leaderboard section
  leaderboardContainer: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 16,
    marginBottom: 20,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  leaderboardContent: {
    marginBottom: 16,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  leaderRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  leaderScore: {
    fontSize: 14,
    color: '#666',
  },
  viewAllButton: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  // Pagination dots styles
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default NewsScreen;