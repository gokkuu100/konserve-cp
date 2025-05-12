import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AgencyManager from '../supabase/manager/agency/AgencyManager';
import FeedbackManager from '../supabase/manager/agency/FeedbackManager';
import { useTheme } from '../ThemeContext';

const AgencyReviewScreen = ({ route, navigation }) => {
  const { agencyId, agencyName, canAddReview = false } = route.params || {};
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [agencyDetails, setAgencyDetails] = useState(null);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [satisfaction, setSatisfaction] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAgencyDetails(),
        fetchReviews()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load agency data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencyDetails = async () => {
    try {
      const agencyData = await AgencyManager.fetchAgencyDetails(agencyId);
      setAgencyDetails(agencyData);
    } catch (error) {
      console.error('Error fetching agency details:', error);
      setError('Failed to load agency details');
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await FeedbackManager.getAgencyFeedback(agencyId);
      
      if (error) throw error;
      
      setReviews(data || []);
      
      // Calculate average rating
      if (data && data.length > 0) {
        const totalRating = data.reduce((sum, review) => sum + (review.rating || 0), 0);
        const avgRating = totalRating / data.length;
        setAverageRating(avgRating);
        setReviewsCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    if (!satisfaction) {
      Alert.alert('Error', 'Please select your satisfaction level');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const feedbackData = {
        agency_id: agencyId,
        agency_name: agencyName,
        rating,
        satisfaction,
        comment
      };
      
      const { data, error } = await FeedbackManager.submitAgencyFeedback(feedbackData);
      
      if (error) throw error;
      
      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowReviewForm(false);
              setRating(0);
              setSatisfaction(null);
              setComment('');
              fetchReviews(); // Refresh reviews after submission
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const halfStar = (rating || 0) % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <FontAwesome key={`star-${i}`} name="star" size={16} color="#FFD700" style={styles.star} />
        );
      } else if (i === fullStars && halfStar) {
        stars.push(
          <FontAwesome key={`star-half-${i}`} name="star-half-o" size={16} color="#FFD700" style={styles.star} />
        );
      } else {
        stars.push(
          <FontAwesome key={`star-o-${i}`} name="star-o" size={16} color="#FFD700" style={styles.star} />
        );
      }
    }
    
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  const renderReviewItem = ({ item }) => (
    <View style={[styles.reviewItem, {
      backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
      borderColor: isDarkMode ? '#444' : undefined,
      borderWidth: isDarkMode ? 1 : 0
    }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, {
            color: isDarkMode ? theme.text : '#333'
          }]}>{item.user_name || 'Anonymous User'}</Text>
          <Text style={[styles.reviewDate, {
            color: isDarkMode ? theme.textSecondary : '#999'
          }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.reviewRating}>
          {renderStars(item.rating)}
          <Text style={[styles.satisfactionLabel, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>
            {item.satisfaction === 'positive' ? 'Satisfied' : 
             item.satisfaction === 'negative' ? 'Dissatisfied' : 'Neutral'}
          </Text>
        </View>
      </View>
      
      {item.comment && (
        <Text style={[styles.reviewComment, {
          color: isDarkMode ? theme.textSecondary : '#666'
        }]}>{item.comment}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, {
        backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
      }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, {
          color: isDarkMode ? theme.textSecondary : '#666'
        }]}>Loading reviews...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
    }]}>
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : undefined,
        borderBottomWidth: isDarkMode ? 1 : 0
      }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#333'
        }]}>{agencyName} Reviews</Text>
      </View>
      
      <View style={[styles.summaryContainer, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#eee'
      }]}>
        <View style={styles.ratingContainer}>
          <Text style={[styles.averageRating, {
            color: isDarkMode ? theme.text : '#333'
          }]}>{averageRating.toFixed(1)}</Text>
          {renderStars(averageRating)}
          <Text style={[styles.reviewsCount, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>({reviewsCount} reviews)</Text>
        </View>
        
        {canAddReview && (
          <TouchableOpacity 
            style={styles.addReviewButton}
            onPress={() => setShowReviewForm(true)}
          >
            <MaterialIcons name="rate-review" size={18} color="#FFF" />
            <Text style={styles.addReviewButtonText}>Add Review</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#F44336" />
          <Text style={[styles.errorText, {
            color: isDarkMode ? '#ff6b6b' : '#F44336'
          }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.reviewsList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, {
              backgroundColor: isDarkMode ? 'transparent' : undefined
            }]}>
              <MaterialIcons name="rate-review" size={48} color={isDarkMode ? '#555' : "#CCCCCC"} />
              <Text style={[styles.emptyText, {
                color: isDarkMode ? theme.textSecondary : '#999'
              }]}>No reviews yet</Text>
              {canAddReview && (
                <TouchableOpacity 
                  style={styles.beFirstButton}
                  onPress={() => setShowReviewForm(true)}
                >
                  <Text style={styles.beFirstButtonText}>Be the first to review!</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      
      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.reviewFormContainer, {
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff'
          }]}>
            <View style={[styles.reviewFormHeader, {
              borderBottomColor: isDarkMode ? '#444' : '#eee'
            }]}>
              <Text style={[styles.reviewFormTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Rate {agencyName}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowReviewForm(false)}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? theme.text : "#333"} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.reviewFormContent}>
              <View style={styles.ratingSelector}>
                <Text style={[styles.sectionLabel, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Your Rating:</Text>
                <View style={styles.starSelector}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity 
                      key={star}
                      onPress={() => handleRatingPress(star)}
                      style={styles.starButton}
                    >
                      <FontAwesome 
                        name={rating >= star ? "star" : "star-o"} 
                        size={32} 
                        color="#FFD700" 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.satisfactionSelector}>
                <Text style={[styles.sectionLabel, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>How satisfied are you?</Text>
                <View style={styles.satisfactionOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.satisfactionOption, 
                      { borderColor: isDarkMode ? '#444' : '#ddd' },
                      satisfaction === 'positive' && styles.selectedSatisfactionPositive
                    ]}
                    onPress={() => setSatisfaction('positive')}
                  >
                    <MaterialIcons 
                      name="sentiment-very-satisfied" 
                      size={24} 
                      color={satisfaction === 'positive' ? "#FFF" : "#4CAF50"} 
                    />
                    <Text style={[
                      styles.satisfactionText,
                      { color: isDarkMode && satisfaction !== 'positive' ? theme.text : '#666' },
                      satisfaction === 'positive' && styles.selectedSatisfactionText
                    ]}>
                      Satisfied
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.satisfactionOption, 
                      { borderColor: isDarkMode ? '#444' : '#ddd' },
                      satisfaction === 'neutral' && styles.selectedSatisfactionNeutral
                    ]}
                    onPress={() => setSatisfaction('neutral')}
                  >
                    <MaterialIcons 
                      name="sentiment-neutral" 
                      size={24} 
                      color={satisfaction === 'neutral' ? "#FFF" : "#FF9800"} 
                    />
                    <Text style={[
                      styles.satisfactionText,
                      { color: isDarkMode && satisfaction !== 'neutral' ? theme.text : '#666' },
                      satisfaction === 'neutral' && styles.selectedSatisfactionText
                    ]}>
                      Neutral
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.satisfactionOption, 
                      { borderColor: isDarkMode ? '#444' : '#ddd' },
                      satisfaction === 'negative' && styles.selectedSatisfactionNegative
                    ]}
                    onPress={() => setSatisfaction('negative')}
                  >
                    <MaterialIcons 
                      name="sentiment-very-dissatisfied" 
                      size={24} 
                      color={satisfaction === 'negative' ? "#FFF" : "#F44336"} 
                    />
                    <Text style={[
                      styles.satisfactionText,
                      { color: isDarkMode && satisfaction !== 'negative' ? theme.text : '#666' },
                      satisfaction === 'negative' && styles.selectedSatisfactionText
                    ]}>
                      Dissatisfied
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.commentContainer}>
                <Text style={[styles.sectionLabel, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Your Comments (Optional):</Text>
                <TextInput
                  style={[styles.commentInput, {
                    borderColor: isDarkMode ? '#444' : '#ddd',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                    color: isDarkMode ? theme.text : '#333'
                  }]}
                  placeholder="Share your experience with this agency..."
                  placeholderTextColor={isDarkMode ? '#777' : '#999'}
                  multiline={true}
                  numberOfLines={4}
                  value={comment}
                  onChangeText={setComment}
                />
              </View>
            </ScrollView>
            
            <View style={[styles.reviewFormFooter, {
              borderTopColor: isDarkMode ? '#444' : '#eee'
            }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, {
                  borderColor: isDarkMode ? '#444' : '#ddd',
                  backgroundColor: isDarkMode ? '#333' : 'transparent'
                }]}
                onPress={() => setShowReviewForm(false)}
              >
                <Text style={[styles.cancelButtonText, {
                  color: isDarkMode ? theme.textSecondary : '#666'
                }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ratingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  averageRating: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    marginRight: 2,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addReviewButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  reviewsList: {
    padding: 8,
  },
  reviewItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  reviewRating: {
    alignItems: 'flex-end',
  },
  satisfactionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  beFirstButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  beFirstButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reviewFormContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  reviewFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  reviewFormContent: {
    padding: 16,
    maxHeight: 400,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  starSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  satisfactionSelector: {
    marginBottom: 16,
  },
  satisfactionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  satisfactionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedSatisfactionPositive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  selectedSatisfactionNeutral: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  selectedSatisfactionNegative: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  satisfactionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  selectedSatisfactionText: {
    color: '#fff',
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
  },
  reviewFormFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default AgencyReviewScreen;
