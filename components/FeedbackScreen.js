import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SupabaseManager from './SupabaseManager';

const FeedbackScreen = ({ navigation }) => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const animationRef = useRef(null);

  const ratings = [
    { emoji: '😡', description: 'Very Dissatisfied' },
    { emoji: '😕', description: 'Dissatisfied' },
    { emoji: '😐', description: 'Neutral' },
    { emoji: '🙂', description: 'Satisfied' },
    { emoji: '😄', description: 'Very Satisfied' }
  ];

  const features = [
    { id: 1, name: 'Quality Speed' },
    { id: 2, name: 'Design & visuals' },
    { id: 3, name: 'Usefulness and convenience of stuff' },
    { id: 4, name: 'Customer support' },
    { id: 5, name: 'Overall service' }
  ];

  const handleRatingSelect = (index) => {
    setSelectedRating(index);
  };

  const handleFeatureToggle = (id) => {
    if (selectedFeatures.includes(id)) {
      setSelectedFeatures(selectedFeatures.filter(featureId => featureId !== id));
    } else {
      setSelectedFeatures([...selectedFeatures, id]);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const feedbackData = {
        rating: selectedRating,
        selectedFeatures: selectedFeatures,
        comment: comment,
        featuresList: ratings, // Pass the ratings list for reference
        features: features // Pass the features list for reference
      };
      
      const { data, error } = await SupabaseManager.submitFeedback(feedbackData);
      
      if (error) {
        Alert.alert("Error", "Failed to submit feedback: " + error.message);
        setIsLoading(false);
        return;
      }
      
      // Success
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
        navigation.goBack(); // Optional: navigate back to previous screen
      }, 3000);
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = selectedRating !== null;

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share your feedback</Text>
          <Text style={styles.headerSubtitle}>Rate your experience</Text>
        </View>
        
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
              <Text style={styles.ratingText}>{rating.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What did you like?</Text>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureItem}
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
              <Text style={styles.featureText}>{feature.name}</Text>
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
            (!isFormValid || isLoading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? "Submitting..." : "Send Feedback"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  ratingItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  selectedRating: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  emojiText: {
    fontSize: 28,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
  commentSection: {
    marginBottom: 32,
  },
  commentInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  animation: {
    width: 200,
    height: 200,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#2196F3',
  },
});

export default FeedbackScreen;