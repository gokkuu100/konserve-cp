import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import FeedbackManager from '../supabase/manager/feedback/FeedbackManager';

const FeedbackScreen = ({ navigation }) => {
  const { user, userId, isAuthenticated, loading: authLoading } = useAuth();
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const animationRef = useRef(null);

  const ratings = [
    { emoji: '😡', description: 'Very Dissatisfied', value: 1 },
    { emoji: '😕', description: 'Dissatisfied', value: 2 },
    { emoji: '😐', description: 'Neutral', value: 3 },
    { emoji: '🙂', description: 'Satisfied', value: 4 },
    { emoji: '😄', description: 'Very Satisfied', value: 5 }
  ];

  const features = [
    { id: 'quality_speed', name: 'Quality Speed' },
    { id: 'design_visuals', name: 'Design & visuals' },
    { id: 'usefulness', name: 'Usefulness and convenience of stuff' },
    { id: 'customer_support', name: 'Customer support' },
    { id: 'overall_service', name: 'Overall service' }
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, authLoading]);

  const handleRatingSelect = (index) => {
    setSelectedRating(index);
  };

  const handleFeatureToggle = (id) => {
    setSelectedFeatures(prev => 
      prev.includes(id) 
        ? prev.filter(featureId => featureId !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    try {
      if (selectedRating === null) {
        Alert.alert('Rating Required', 'Please select a rating before submitting');
        return;
      }

      setIsLoading(true);

      const feedbackData = {
        userId: userId || user.id,
        rating: ratings[selectedRating].value,
        rating_description: ratings[selectedRating].description,
        selectedFeatures: selectedFeatures,
        comment: comment.trim(),
      };

      console.log('Submitting feedback:', feedbackData);

      const { data, error } = await FeedbackManager.submitFeedback(feedbackData);

      if (error) {
        throw error;
      }

      console.log('Feedback submitted successfully:', data);
      setIsSubmitted(true);
      if (animationRef.current) {
        animationRef.current.play();
      }

      // Reset form after delay
      setTimeout(() => {
        setIsSubmitted(false);
        setSelectedRating(null);
        setSelectedFeatures([]);
        setComment('');
        navigation.goBack();
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <LottieView
          ref={animationRef}
          source={require('../assets/Animationsuccess.json')}
          style={styles.animation}
          autoPlay={true}
          loop={false}
        />
        <Text style={styles.successText}>Thank you for your feedback!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share your feedback</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerSubtitle}>Rate your experience using Konserve</Text>
        
        <View style={styles.ratingContainer}>
          {ratings.map((rating, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.ratingItem,
                selectedRating === index && styles.selectedRating
              ]}
              onPress={() => handleRatingSelect(index)}
            >
              <Text style={styles.emojiText}>{rating.emoji}</Text>
              <Text style={[
                styles.ratingText,
                selectedRating === index && styles.selectedRatingText
              ]}>
                {rating.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What did you like?</Text>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.featureItem,
                selectedFeatures.includes(feature.id) && styles.featureItemSelected
              ]}
              onPress={() => handleFeatureToggle(feature.id)}
            >
              <View style={[
                styles.checkbox,
                selectedFeatures.includes(feature.id) && styles.checkboxSelected
              ]}>
                {selectedFeatures.includes(feature.id) && (
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                )}
              </View>
              <Text style={[
                styles.featureText,
                selectedFeatures.includes(feature.id) && styles.featureTextSelected
              ]}>
                {feature.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Your comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Enter your experience here..."
            multiline
            value={comment}
            onChangeText={setComment}
            placeholderTextColor="#888"
          />
        </View>
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedRating === null) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={selectedRating === null || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Modal */}
      <Modal
        transparent={true}
        visible={isLoading}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Submitting your feedback...</Text>
            <Text style={styles.loadingSubtext}>Please wait</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  scrollContent: {
    padding: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  ratingItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: width / 5.5,
  },
  selectedRating: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  emojiText: {
    fontSize: 28,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#555',
  },
  selectedRatingText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  featureItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  featureTextSelected: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  animation: {
    width: 200,
    height: 200,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 24,
    textAlign: 'center',
  },
  // Loading overlay styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default FeedbackScreen;