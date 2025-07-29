import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FeedbackManager from '../supabase/manager/agency/FeedbackManager';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import NotificationManager from '../supabase/manager/notifications/NotificationManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import authManager from '../supabase/manager/auth/AuthManager';
import AgencyManager from '../supabase/manager/agency/AgencyManager';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AgencyFeedbackScreen = ({ route, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { user, isAuthenticated, loading } = useAuth();
  // Agency data comes from route params
  const { agencyId: preselectedAgencyId, agency: preselectedAgency } = route?.params || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Subscription states
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [showAgencySelector, setShowAgencySelector] = useState(false);

  const themeColors = {
    text: isDarkMode ? '#FFF' : '#333',
    textSecondary: isDarkMode ? '#BBB' : '#666',
    background: isDarkMode ? '#1E1E1E' : '#F5F5F5',
    cardBackground: isDarkMode ? '#333' : '#FFF',
    border: isDarkMode ? '#444' : '#E0E0E0',
    inputBackground: isDarkMode ? '#444' : '#F0F0F0',
    ...theme
  };

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        if (!isAuthenticated) {
          Alert.alert(
            'Authentication Required',
            'Please log in to submit feedback.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.replace('Login')
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => navigation.goBack()
              }
            ]
          );
          return;
        }

        // Verify user exists before accessing its properties
        if (user && user.id) {
          await registerForPushNotifications(user.id);
          await loadUserSubscriptions();
        }
      } catch (error) {
        console.error('Error initializing screen:', error);
        Alert.alert('Error', 'Failed to initialize. Please try again.');
      }
    };

    if (!loading) {
      initializeScreen();
    }
  }, [isAuthenticated, loading, user]);

  const loadUserSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      setSubscriptionError(null);

      if (!user?.id) {
        setSubscriptionError('You must be logged in to view subscriptions');
        return;
      }

      const { active, error } = await SubscriptionManager.loadUserSubscriptions(user.id);
      
      if (error) {
        setSubscriptionError('Failed to load subscriptions');
        return;
      }

      setActiveSubscriptions(active);

      // Handle preselected agency
      if (preselectedAgencyId) {
        const matchingActive = active.find(sub => sub.agencyId === preselectedAgencyId);

        if (matchingActive) {
          setSelectedAgency(matchingActive.agency);
        } else if (preselectedAgency) {
          Alert.alert(
            'Subscription Required',
            'You need an active subscription to this agency to submit feedback.',
            [
              {
                text: 'Subscribe',
                onPress: () => navigation.navigate('SubscriptionScreen', { agencyId: preselectedAgencyId })
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } else if (active.length > 0) {
        setSelectedAgency(active[0].agency);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptionError('An unexpected error occurred');
    } finally {
      setLoadingSubscriptions(false);
    }
  };


  const openAgencySelector = () => {
    setShowAgencySelector(true);
  };

  // Select an agency
  const handleAgencySelect = (agency) => {
    setSelectedAgency(agency);
    setShowAgencySelector(false);
    // Reset rating and comment
    setRating(0);
    setComment('');
  };

  // Navigate to subscription screen
  const navigateToSubscriptions = () => {
    navigation.navigate('CollectionAgencies');
  };

  // Function for push notifications
  const registerForPushNotifications = async (userId) => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      
      // Save token to user's notification preferences
      await NotificationManager.updatePushToken(userId, tokenData.data);
    } catch (error) {
      console.error('Error registering for notifications:', error);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Submit feedback to Supabase
  const handleSubmit = async () => {
    if (!selectedAgency) {
      setError('Please select an agency to rate');
      return;
    }

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    if (comment.trim().length < 3) {
      setError('Please provide a comment (minimum 3 characters)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const feedbackData = {
        agency_id: selectedAgency.id,
        agency_name: selectedAgency.name,
        rating,
        satisfaction: getSatisfactionFromRating(rating),
        comment,
      };

      const { data, error } = await FeedbackManager.submitAgencyFeedback(feedbackData);

      if (error) {
        setError('Failed to submit feedback. Please try again.');
        console.error('Feedback submission error:', error);
      } else {
        await scheduleReminderNotification(selectedAgency.name);
        resetForm();
        Alert.alert(
          'Feedback Submitted',
          'Thank you for your feedback!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Feedback submission exception:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule a local reminder notification
  const scheduleReminderNotification = async (agencyName) => {
    try {
      const trigger = new Date();
      trigger.setDate(trigger.getDate() + 30); 

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Feedback Reminder',
          body: `How's your experience with ${agencyName}? Share your feedback!`,
        },
        trigger,
      });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setRating(0);
    setComment('');
  };

  // Get rating text based on rating value
  const getRatingText = () => {
    switch(rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "";
    }
  };

  // Get satisfaction from rating
  const getSatisfactionFromRating = (rating) => {
    switch(rating) {
      case 1: return 'negative';
      case 2: return 'neutral';
      case 3: return 'neutral';
      case 4: return 'positive';
      case 5: return 'positive';
      default: return null;
    }
  };

  return (
    <>
      {/* Top Safe Area - colored */}
      {Platform.OS === 'ios' && (
        <SafeAreaView style={{ flex: 0, backgroundColor: '#4CAF50' }} />
      )}
      
      {/* Main Content */}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#4CAF50' }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedAgency ? `Rate ${selectedAgency.name}` : 'Agency Feedback'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {loadingSubscriptions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
              Loading your subscriptions...
            </Text>
          </View>
        ) : subscriptionError ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#F44336" />
            <Text style={[styles.errorText, isDarkMode && styles.darkText]}>
              {subscriptionError}
            </Text>
          </View>
        ) : activeSubscriptions.length === 0 ? (
          <View style={styles.noSubscriptionsContainer}>
            <MaterialIcons name="subscriptions" size={60} color="#BDBDBD" />
            <Text style={[styles.noSubscriptionsText, isDarkMode && styles.darkText]}>
              You don't have any active subscriptions
            </Text>
            <Text style={[styles.noSubscriptionsSubtext, isDarkMode && styles.darkSubText]}>
              Subscribe to a collection agency to provide feedback
            </Text>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={navigateToSubscriptions}
            >
              <Text style={styles.subscribeButtonText}>View Subscription Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={100}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Agency Selector */}
              <TouchableOpacity 
                style={[styles.agencySelector, { backgroundColor: themeColors.cardBackground }]} 
                onPress={openAgencySelector}
              >
                <View style={styles.agencySelectorContent}>
                  <View style={styles.agencySelectorLeft}>
                    <Text style={[styles.agencySelectorLabel, isDarkMode && styles.darkText]}>
                      Selected Agency:
                    </Text>
                    {selectedAgency ? (
                      <View style={styles.selectedAgencyContainer}>
                        {selectedAgency.logo_url ? (
                          <Image 
                            source={{ uri: selectedAgency.logo_url }} 
                            style={styles.miniAgencyLogo} 
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.miniAgencyLogoPlaceholder}>
                            <Text style={styles.miniAgencyLogoInitial}>
                              {selectedAgency.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.selectedAgencyName, isDarkMode && styles.darkText]}>
                          {selectedAgency.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.noAgencyText, isDarkMode && { color: themeColors.textSecondary }]}>
                        Tap to select an agency
                      </Text>
                    )}
                  </View>
                  <View style={styles.agencySelectorButton}>
                    <MaterialIcons name="arrow-drop-down" size={28} color={isDarkMode ? '#fff' : '#4CAF50'} />
                  </View>
                </View>
              </TouchableOpacity>
              
              {selectedAgency && (
                <>
                  {/* Agency Info Card */}
                  <View style={[styles.agencyCard, isDarkMode && styles.darkCard]}>
                    <View style={styles.agencyHeader}>
                      {selectedAgency.logo_url ? (
                        <Image 
                          source={{ uri: selectedAgency.logo_url }} 
                          style={styles.agencyLogo} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.agencyLogoPlaceholder}>
                          <Text style={styles.agencyLogoInitial}>
                            {selectedAgency.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.agencyInfo}>
                        <Text style={[styles.agencyName, isDarkMode && styles.darkText]}>
                          {selectedAgency.name}
                        </Text>
                        <Text style={[styles.agencyLocation, isDarkMode && styles.darkSubText]}>
                          {selectedAgency.constituency || 'Location not available'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Rating Form */}
                  <View style={[styles.formCard, isDarkMode && styles.darkCard]}>
                    <Text style={[styles.formTitle, isDarkMode && styles.darkText]}>
                      Rate Your Experience
                    </Text>
                    
                    {/* Star Rating */}
                    <View style={styles.ratingContainer}>
                      <Text style={[styles.ratingLabel, isDarkMode && styles.darkText]}>
                        Overall Rating
                      </Text>
                      <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            style={styles.starButton}
                          >
                            <MaterialIcons
                              name={rating >= star ? "star" : "star-outline"}
                              size={40}
                              color={rating >= star ? "#FFD700" : (isDarkMode ? "#555" : "#ccc")}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {rating > 0 && (
                        <Text style={[styles.ratingText, isDarkMode && styles.darkText]}>
                          {getRatingText()}
                        </Text>
                      )}
                    </View>
                    
                    {/* Comment Input */}
                    <View style={styles.commentContainer}>
                      <Text style={[styles.commentLabel, isDarkMode && styles.darkText]}>
                        Your Comments
                      </Text>
                      <TextInput
                        style={[styles.commentInput, isDarkMode && styles.darkInput]}
                        placeholder="Share your experience with this agency..."
                        placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
                        value={comment}
                        onChangeText={setComment}
                        multiline={true}
                        numberOfLines={5}
                        textAlignVertical="top"
                      />
                    </View>
                    
                    {error ? (
                      <Text style={styles.errorMessage}>{error}</Text>
                    ) : null}
                    
                    {/* Submit Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        (rating === 0 || isSubmitting) && styles.submitButtonDisabled
                      ]}
                      onPress={handleSubmit}
                      disabled={rating === 0 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        
        {/* Agency Selector Modal */}
        <Modal
          visible={showAgencySelector}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAgencySelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowAgencySelector(false)}
                >
                  <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#333'} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>
                  Select an Agency
                </Text>
                <View style={{ width: 24 }} />
              </View>
              
              <FlatList
                data={activeSubscriptions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.agencyItem, 
                      { borderBottomColor: isDarkMode ? '#444' : '#e0e0e0' },
                      selectedAgency?.id === item.agency.id && styles.selectedAgencyItem
                    ]}
                    onPress={() => handleAgencySelect(item.agency)}
                  >
                    <View style={styles.agencyItemContent}>
                      {item.agency.logo_url ? (
                        <Image 
                          source={{ uri: item.agency.logo_url }} 
                          style={styles.agencyItemLogo} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[
                          styles.agencyItemLogoPlaceholder,
                          selectedAgency?.id === item.agency.id && styles.selectedAgencyLogoPlaceholder
                        ]}>
                          <Text style={styles.agencyItemLogoInitial}>
                            {item.agency.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.agencyItemDetails}>
                        <Text style={[
                          styles.agencyItemName, 
                          isDarkMode && styles.darkText,
                          selectedAgency?.id === item.agency.id && styles.selectedAgencyItemText
                        ]}>
                          {item.agency.name}
                        </Text>
                        <Text style={[
                          styles.agencyItemLocation, 
                          isDarkMode && styles.darkSubText
                        ]}>
                          {item.agency.constituency || 'Location not available'}
                        </Text>
                        <View style={styles.subscriptionBadge}>
                          <View style={styles.activeDot} />
                          <Text style={styles.subscriptionBadgeText}>Active Subscription</Text>
                        </View>
                      </View>
                      {selectedAgency?.id === item.agency.id && (
                        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.agencyList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.noAgenciesContainer}>
                    <MaterialIcons name="business" size={48} color="#BDBDBD" />
                    <Text style={[styles.noAgenciesText, isDarkMode && styles.darkText]}>
                      No active subscriptions found
                    </Text>
                    <Text style={[styles.noAgenciesSubtext, isDarkMode && styles.darkSubText]}>
                      Subscribe to an agency to provide feedback
                    </Text>
                  </View>
                }
              />
              
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowAgencySelector(false)}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  agencySelector: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agencySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agencySelectorLeft: {
    flex: 1,
  },
  agencySelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  selectedAgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAgencyLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  miniAgencyLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniAgencyLogoInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  selectedAgencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noAgencyText: {
    fontSize: 16,
    color: '#999',
  },
  agencySelectorButton: {
    padding: 4,
  },
  
  agencyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  agencyLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  agencyLogoInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  agencyLocation: {
    fontSize: 16,
    color: '#666',
  },
  // Form Card Styles
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  // Rating Styles
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    color: '#4CAF50',
  },
  // Comment Styles
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#fff',
    color: '#333',
  },
  // Error Message
  errorMessage: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  // Submit Button
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    color: '#333',
    textAlign: 'center',
  },
  // No Subscriptions State
  noSubscriptionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSubscriptionsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  noSubscriptionsSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  agencyList: {
    paddingHorizontal: 16,
  },
  agencyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 16,
  },
  selectedAgencyItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  agencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyItemLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  agencyItemLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedAgencyLogoPlaceholder: {
    backgroundColor: '#4CAF50',
  },
  agencyItemLogoInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  agencyItemDetails: {
    flex: 1,
  },
  agencyItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedAgencyItemText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  agencyItemLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  subscriptionBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalDoneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noAgenciesContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAgenciesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  noAgenciesSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  // Dark mode styles
  darkContainer: {
    backgroundColor: '#1E1E1E',
  },
  darkText: {
    color: '#fff',
  },
  darkSubText: {
    color: '#BBB',
  },
  darkCard: {
    backgroundColor: '#333',
  },
  darkInput: {
    backgroundColor: '#444',
    borderColor: '#555',
    color: '#fff',
  },
});

export default AgencyFeedbackScreen;