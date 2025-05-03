import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  Animated,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import FullScreenRouteMap from './FullScreenRouteMap';
import { useAuth } from '../contexts/AuthContext';
import AgencyManager from '../supabase/manager/agency/AgencyManager';
import FeedbackManager from '../supabase/manager/agency/FeedbackManager';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';

// Route Map Component
const RouteMap = ({ coordinates }) => {
  const [region, setRegion] = useState(null);
  
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      let minLat = Math.min(...coordinates.map(coord => coord.lat));
      let maxLat = Math.max(...coordinates.map(coord => coord.lat));
      let minLng = Math.min(...coordinates.map(coord => coord.lng));
      let maxLng = Math.max(...coordinates.map(coord => coord.lng));
  
      const padding = 0.005;
  
      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + padding * 2,
        longitudeDelta: (maxLng - minLng) + padding * 2,
      });
    }
  }, [coordinates]);

  if (!coordinates || coordinates.length === 0 || !region) return null;

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Polyline
          coordinates={coordinates.map(coord => ({
            latitude: coord.lat,
            longitude: coord.lng,
          }))}
          strokeWidth={3}
          strokeColor="#4CAF50"
        />
        
        <Marker
          coordinate={{
            latitude: coordinates[0].lat,
            longitude: coordinates[0].lng,
          }}
        >
          <MaterialIcons name="location-on" size={24} color="#4CAF50" />
        </Marker>
        
        <Marker
          coordinate={{
            latitude: coordinates[coordinates.length - 1].lat,
            longitude: coordinates[coordinates.length - 1].lng,
          }}
        >
          <MaterialIcons name="location-on" size={24} color="#FF4444" />
        </Marker>
      </MapView>
    </View>
  );
};

// Agency Card Component
const AgencyCard = React.forwardRef(({ agency, expanded, onToggle, onSubscribe, onViewReviews }, ref) => {
  const [animation] = useState(new Animated.Value(0));
  const [showFullMap, setShowFullMap] = useState(false);
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [satisfaction, setSatisfaction] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const { user, isAuthenticated } = useAuth();
  
  // Expose the toggleReviewForm method to parent component
  useImperativeHandle(ref, () => ({
    toggleReviewForm: () => {
      setShowReviewForm(!showReviewForm);
    }
  }));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Check if user can review this agency when the card is expanded
    if (expanded) {
      checkReviewEligibility();
    }
  }, [expanded]);
  
  const checkReviewEligibility = async () => {
    try {
      // First check if user is authenticated
      if (!isAuthenticated || !user) {
        console.log('User is not authenticated');
        setCanReview(false);
        setReviewMessage('You must be logged in to write a review.');
        return;
      }
      
      // Get user ID
      let userId = user.id;
      
      if (!userId) {
        console.error('Failed to get user ID');
        setCanReview(false);
        setReviewMessage('Unable to verify your identity. Please log out and log in again.');
        return;
      }
      
      console.log('Checking review eligibility for user:', userId, 'agency:', agency.id);
      
      // Check if user was ever subscribed to this agency
      const { data: isEligible, error } = await SubscriptionManager.checkEverSubscribedToAgency(userId, agency.id);
      
      if (error) {
        console.error('Error checking subscription history:', error);
        setCanReview(false);
        setReviewMessage('Unable to verify your subscription status. Please try again.');
        return;
      }
      
      if (isEligible) {
        console.log('User was subscribed to this agency, can review');
        setCanReview(true);
        setReviewMessage('');
      } else {
        console.log('User was never subscribed to this agency');
        setCanReview(false);
        setReviewMessage('You need to have subscribed to this agency to submit a review.');
      }
    } catch (error) {
      console.error('Error in checkReviewEligibility:', error);
      setCanReview(false);
      setReviewMessage('An error occurred. Please try again.');
    }
  };
  
  const cardHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [120, expanded ? 'auto' : 120]
  });

  const renderStars = (rating) => {
    if (!rating) return Array(5).fill(0).map((_, i) => (
      <FontAwesome key={i} name="star-o" size={14} color="#FFD700" />
    ));

    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FontAwesome key={i} name="star" size={14} color="#FFD700" />);
      } else if (i === fullStars && halfStar) {
        stars.push(<FontAwesome key={i} name="star-half-o" size={14} color="#FFD700" />);
      } else {
        stars.push(<FontAwesome key={i} name="star-o" size={14} color="#FFD700" />);
      }
    }
    
    return stars;
  };

  const handleViewFullMap = (route) => {
    setSelectedRouteForMap(route);
    setShowFullMap(true);
  };

  const toggleReviewForm = () => {
    if (!canReview) {
      Alert.alert('Cannot Review', reviewMessage);
      return;
    }
    setShowReviewForm(!showReviewForm);
  };

  const handleSubmitReview = async () => {
    try {
      if (!rating) {
        Alert.alert('Error', 'Please select a rating');
        return;
      }
      
      if (!satisfaction) {
        Alert.alert('Error', 'Please select your satisfaction level');
        return;
      }
      
      setIsSubmitting(true);
      
      const feedbackData = {
        agency_id: agency.id,
        agency_name: agency.name,
        rating,
        satisfaction,
        comment
      };
      
      const { data, error } = await FeedbackManager.submitAgencyFeedback(feedbackData);
      
      if (error) {
        console.error('Error submitting review:', error);
        Alert.alert('Error', 'Failed to submit review. Please try again.');
        return;
      }
      
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
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleSubmitReview:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingPress = (selectedRating) => {
    setRating(selectedRating);
  };

  // Format time helper function
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Parse the timeString which might be in format like "08:00:00"
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
    const formattedMinutes = m < 10 ? `0${m}` : m;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  return (
    <Animated.View style={[styles.agencyCard, { height: cardHeight }]}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.agencyInfo}>
          {agency.logo_url ? (
            <Image source={{ uri: agency.logo_url }} style={styles.agencyLogo} />
          ) : (
            <View style={styles.agencyLogoPlaceholder}>
              <MaterialIcons name="business" size={24} color="#4CAF50" />
            </View>
          )}
          <View style={styles.agencyTextInfo}>
            <Text style={styles.agencyName}>{agency.name}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(agency.rating)}
              <Text style={styles.reviewCount}>
                ({agency.reviews_count || 0})
              </Text>
            </View>
            <Text style={styles.agencyLocation}>
              {agency.constituency || 'Location not specified'}
            </Text>
            {agency.price && (
              <View style={styles.pricingContainer}>
                <MaterialIcons name="attach-money" size={14} color="#4CAF50" />
                <Text style={styles.pricingText}>
                  KES {agency.price} {agency.plan_type ? `(${agency.plan_type})` : '(standard)'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#757575" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.cardExpandedContent}>
          {agency.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{agency.description}</Text>
            </View>
          )}
          
          {agency.services && agency.services.length > 0 && (
            <View style={styles.servicesContainer}>
              <Text style={styles.sectionTitle}>Services</Text>
              <View style={styles.servicesList}>
                {agency.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={styles.serviceText}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {agency.operational_hours && Object.keys(agency.operational_hours).length > 0 && (
            <View style={styles.hoursContainer}>
              <Text style={styles.sectionTitle}>Operational Hours</Text>
              <View style={styles.hoursList}>
                {Object.entries(agency.operational_hours).map(([day, hours], index) => (
                  <View key={index} style={styles.hourItem}>
                    <Text style={styles.dayText}>{day}:</Text>
                    <Text style={styles.hoursText}>{hours}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {agency.routes && agency.routes.length > 0 && (
            <View style={styles.routesContainer}>
              <Text style={styles.sectionTitle}>Collection Routes</Text>
              {agency.routes.map((route, index) => (
                <View key={index} style={styles.routeItem}>
                  <View style={styles.routeHeader}>
                    <MaterialIcons name="route" size={16} color="#4CAF50" />
                    <Text style={styles.routeName}>{route.name || route.route_name || `Route ${index + 1}`}</Text>
                  </View>
                  
                  {route.route_description && (
                    <Text style={styles.routeDescription}>{route.route_description}</Text>
                  )}
                  
                  <View style={styles.routeScheduleContainer}>
                    <View style={styles.scheduleItem}>
                      <MaterialIcons name="event" size={14} color="#666" />
                      <Text style={styles.scheduleText}>
                        {route.collection_days && route.collection_days.length > 0 ? 
                          route.collection_days.join(', ') : 'Not specified'}
                      </Text>
                    </View>
                    {route.collection_time_start && route.collection_time_end && (
                      <View style={styles.scheduleItem}>
                        <MaterialIcons name="access-time" size={14} color="#666" />
                        <Text style={styles.scheduleText}>
                          {formatTime(route.collection_time_start)} - {formatTime(route.collection_time_end)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {route.route_coordinates && route.route_coordinates.length > 0 && (
                    <View style={styles.routeMapContainer}>
                      <RouteMap coordinates={route.route_coordinates} />
                      <TouchableOpacity 
                        style={styles.viewFullMapButton}
                        onPress={() => handleViewFullMap(route)}
                      >
                        <Text style={styles.viewFullMapText}>View Full Map</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
          
          {agency.areas && agency.areas.length > 0 && (
            <View style={styles.areasContainer}>
              <Text style={styles.sectionTitle}>Operational Areas</Text>
              {agency.areas.map((area, index) => {
                const areaRoutes = agency.routes ? agency.routes.filter(route => route.area_id === area.id) : [];
                return (
                  <View key={index} style={styles.areaItem}>
                    <View style={styles.areaHeader}>
                      <MaterialIcons name="location-on" size={16} color="#4CAF50" />
                      <Text style={styles.areaName}>{area.area_name || `Area ${index + 1}`}</Text>
                    </View>
                    
                    {area.area_description && (
                      <Text style={styles.areaDescription}>{area.area_description}</Text>
                    )}
                    
                    {areaRoutes.length > 0 && (
                      <View style={styles.routesContainer}>
                        {areaRoutes.map((route, idx) => (
                          <View key={idx} style={styles.routeItem}>
                            <View style={styles.routeHeader}>
                              <MaterialIcons name="route" size={16} color="#4CAF50" />
                              <Text style={styles.routeName}>{route.route_name || `Route ${idx + 1}`}</Text>
                            </View>
                            
                            {route.route_description && (
                              <Text style={styles.routeDescription}>{route.route_description}</Text>
                            )}
                            
                            <View style={styles.routeScheduleContainer}>
                              <View style={styles.scheduleItem}>
                                <MaterialIcons name="event" size={14} color="#666" />
                                <Text style={styles.scheduleText}>
                                  {route.collection_days && route.collection_days.length > 0 ? 
                                    route.collection_days.join(', ') : 'Not specified'}
                                </Text>
                              </View>
                              {route.collection_time_start && route.collection_time_end && (
                                <View style={styles.scheduleItem}>
                                  <MaterialIcons name="access-time" size={14} color="#666" />
                                  <Text style={styles.scheduleText}>
                                    {formatTime(route.collection_time_start)} - {formatTime(route.collection_time_end)}
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {route.route_coordinates && route.route_coordinates.length > 0 && (
                              <View style={styles.routeMapContainer}>
                                <RouteMap coordinates={route.route_coordinates} />
                                <TouchableOpacity 
                                  style={styles.viewFullMapButton}
                                  onPress={() => handleViewFullMap(route)}
                                >
                                  <Text style={styles.viewFullMapText}>View Full Map</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => onSubscribe()}
            >
              <MaterialIcons name="payment" size={18} color="#FFF" />
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.reviewsButton}
              onPress={onViewReviews}
            >
              <MaterialIcons name="rate-review" size={18} color="#FFF" />
              <Text style={styles.reviewsButtonText}>Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Full Screen Map Modal */}
      <Modal
        visible={showFullMap}
        animationType="slide"
        onRequestClose={() => setShowFullMap(false)}
      >
        <SafeAreaView style={styles.fullMapContainer}>
          <View style={styles.fullMapHeader}>
            <TouchableOpacity 
              style={styles.closeMapButton}
              onPress={() => setShowFullMap(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.fullMapTitle}>
              {selectedRouteForMap?.name || 'Collection Route'}
            </Text>
          </View>
          
          {selectedRouteForMap?.route_coordinates && (
            <FullScreenRouteMap 
              coordinates={selectedRouteForMap.route_coordinates}
              routeName={selectedRouteForMap.name}
              collectionDays={selectedRouteForMap.collection_days}
            />
          )}
        </SafeAreaView>
      </Modal>
      
      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewForm(false)}
      >
        <View style={styles.reviewModalContainer}>
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Rate {agency.name}</Text>
              <TouchableOpacity 
                style={styles.closeReviewButton}
                onPress={() => setShowReviewForm(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingSelectorLabel}>Your Rating:</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity 
                    key={star}
                    onPress={() => handleRatingPress(star)}
                  >
                    <FontAwesome 
                      name={rating >= star ? "star" : "star-o"} 
                      size={32} 
                      color="#FFD700" 
                      style={styles.ratingStar}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.satisfactionSelector}>
              <Text style={styles.satisfactionLabel}>How satisfied are you?</Text>
              <View style={styles.satisfactionOptions}>
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
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
                    satisfaction === 'positive' && styles.selectedSatisfactionText
                  ]}>
                    Satisfied
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
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
                    satisfaction === 'neutral' && styles.selectedSatisfactionText
                  ]}>
                    Neutral
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
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
                    satisfaction === 'negative' && styles.selectedSatisfactionText
                  ]}>
                    Dissatisfied
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Your Comments (Optional):</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience with this agency..."
                multiline={true}
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
});

const CollectionAgenciesScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [userConstituency, setUserConstituency] = useState('');
  const [constituencyDropdownOpen, setConstituencyDropdownOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [filteredAgencies, setFilteredAgencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [constituencies, setConstituencies] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const agencyCardRefs = useRef({});

  // Load user profile and agencies on component mount
  useEffect(() => {
    loadUserProfile();
    loadAgencies();
  }, []);
  
  // Filter agencies when constituency changes or agencies list updates
  useEffect(() => {
    if (agencies.length > 0) {
      filterAgenciesByConstituency(agencies, selectedConstituency);
    }
  }, [selectedConstituency, agencies]);

  // Load user profile to get their constituency
  const loadUserProfile = async () => {
    try {
      const { data, error } = await ProfileManager.getUserProfile();
      
      if (error) throw error;
      
      if (data && data.constituency) {
        setUserConstituency(data.constituency);
        setSelectedConstituency(data.constituency);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  
  // Load all agencies with details
  const loadAgencies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all agencies with their complete details
      const { data: agenciesData, error } = await AgencyManager.fetchAllAgenciesWithDetails();
      
      if (error) {
        console.error('Error fetching agencies:', error);
        setError('Failed to load collection agencies. Please try again.');
        setAgencies([]);
        setFilteredAgencies([]);
        return;
      }
      
      // Ensure we have valid data
      const validAgencies = Array.isArray(agenciesData) ? agenciesData : [];
      console.log("Fetched agencies:", validAgencies.length);
      
      setAgencies(validAgencies);
      
      // Extract unique constituencies from agencies
      const uniqueConstituencies = [...new Set(
        validAgencies
          .map(agency => agency.constituency)
          .filter(Boolean)
      )];
      
      setConstituencies(['All Constituencies', ...uniqueConstituencies]);
      
      // Set filtered agencies based on selected constituency
      filterAgenciesByConstituency(validAgencies, selectedConstituency);
      
    } catch (error) {
      console.error('Error loading agencies:', error);
      setError('Failed to load collection agencies. Please try again.');
      setAgencies([]);
      setFilteredAgencies([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter agencies by selected constituency
  const filterAgenciesByConstituency = (agenciesArray = agencies, constituency = selectedConstituency) => {
    if (!constituency || constituency === 'All Constituencies') {
      setFilteredAgencies(agenciesArray);
    } else {
      setFilteredAgencies(agenciesArray.filter(agency => 
        agency.constituency === constituency
      ));
    }
  };
  
  // Refresh agencies data
  const handleRefresh = () => {
    loadAgencies();
  };
  
  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };
  
  const handleSubscribe = (agency) => {
    navigation.navigate('SubscriptionPlanScreen', { 
      agency: {
        id: agency.id,
        name: agency.name,
        constituency: agency.constituency,
        price: agency.price
      }
    });
  };

  // Handle constituency selection
  const handleConstituencySelect = (constituency) => {
    setSelectedConstituency(constituency);
    setConstituencyDropdownOpen(false);
  };

  // Check if user is eligible to view reviews for an agency
  const handleViewReviews = async (agency) => {
    try {
      setLoadingReviews(true);
      setReviewsError(null);
      
      // Anyone can view reviews, but we need to check if they can add reviews
      let canAddReview = false;
      
      if (user && user.id) {
        console.log(`Checking review eligibility for user: ${user.id} agency: ${agency.id}`);
        
        // Check if user has ever had a subscription (active or expired) to this agency
        const { data: hasEverSubscribed, error: subscriptionError } = 
          await SubscriptionManager.checkEverSubscribedToAgency(user.id, agency.id);
        
        if (subscriptionError) {
          console.error('Error checking subscription history:', subscriptionError);
        } else {
          canAddReview = hasEverSubscribed;
          console.log(`User ${user.id} can add review: ${canAddReview}`);
        }
      }
      
      // Navigate to the reviews screen with the agency ID and name
      navigation.navigate('AgencyReviews', { 
        agencyId: agency.id,
        agencyName: agency.name,
        canAddReview: canAddReview
      });
      
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setReviewsError('Failed to check review eligibility. Please try again.');
      
      // If there's an error, still allow viewing reviews but not adding them
      navigation.navigate('AgencyReviews', { 
        agencyId: agency.id,
        agencyName: agency.name,
        canAddReview: false
      });
    } finally {
      setLoadingReviews(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading collection agencies...</Text>
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Agencies</Text>
      </View>
      
      {/* Constituency Selector */}
      <View style={styles.constituencySelector}>
        <Text style={styles.constituencyLabel}>Constituency:</Text>
        <TouchableOpacity 
          style={styles.constituencyDropdown}
          onPress={() => setConstituencyDropdownOpen(!constituencyDropdownOpen)}
        >
          <Text style={styles.constituencyText}>
            {selectedConstituency || 'All Constituencies'}
          </Text>
          <Ionicons 
            name={constituencyDropdownOpen ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#333" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Constituency Dropdown Menu */}
      {constituencyDropdownOpen && (
        <View style={styles.dropdownMenuContainer}>
          <ScrollView style={styles.dropdownMenu}>
            {constituencies.map((constituency, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  selectedConstituency === constituency && styles.selectedDropdownItem
                ]}
                onPress={() => handleConstituencySelect(constituency)}
              >
                <Text 
                  style={[
                    styles.dropdownItemText,
                    selectedConstituency === constituency && styles.selectedDropdownItemText,
                    constituency === userConstituency && styles.userConstituencyText
                  ]}
                >
                  {constituency}
                  {constituency === userConstituency && ' (Your Constituency)'}
                </Text>
                {selectedConstituency === constituency && (
                  <Ionicons name="checkmark" size={18} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Agencies List */}
      {filteredAgencies.length > 0 ? (
        <FlatList
          data={filteredAgencies}
          renderItem={({ item }) => (
            <AgencyCard
              ref={ref => agencyCardRefs.current[item.id] = ref}
              agency={item}
              expanded={expandedCardId === item.id}
              onToggle={() => toggleCardExpansion(item.id)}
              onSubscribe={() => handleSubscribe(item)}
              onViewReviews={() => handleViewReviews(item)}
            />
          )}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.agenciesList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isLoading}
        />
      ) : (
        <View style={styles.noAgenciesContainer}>
          <MaterialIcons name="search-off" size={64} color="#BDBDBD" />
          <Text style={styles.noAgenciesText}>No collection agencies found</Text>
          <Text style={styles.noAgenciesSubText}>
            {selectedConstituency && selectedConstituency !== 'All Constituencies'
              ? `There are no collection agencies in ${selectedConstituency}.`
              : 'There are no collection agencies available at this time.'}
          </Text>
          {selectedConstituency && selectedConstituency !== 'All Constituencies' && (
            <TouchableOpacity
              style={styles.changeConstituencyButton}
              onPress={() => {
                setSelectedConstituency('All Constituencies');
              }}
            >
              <Text style={styles.changeConstituencyButtonText}>View All Constituencies</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  constituencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  constituencyLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  constituencyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  constituencyText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  dropdownMenuContainer: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownItem: {
    backgroundColor: '#f0fff0',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  selectedDropdownItemText: {
    fontWeight: '500',
    color: '#4CAF50',
  },
  userConstituencyText: {
    fontWeight: '500',
  },
  agenciesList: {
    padding: 16,
  },
  noAgenciesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAgenciesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noAgenciesSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  changeConstituencyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  changeConstituencyButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Agency Card Styles
  agencyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  agencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  agencyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  agencyLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agencyTextInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  agencyLocation: {
    fontSize: 12,
    color: '#666',
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pricingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  cardExpandedContent: {
    padding: 16,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  servicesContainer: {
    marginBottom: 16,
  },
  servicesList: {
    marginTop: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  hoursContainer: {
    marginBottom: 16,
  },
  hoursList: {
    marginTop: 4,
  },
  hourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
  },
  routesContainer: {
    marginBottom: 16,
  },
  routeItem: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  routeHeader: {
    marginBottom: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  routeScheduleContainer: {
    marginTop: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  routeMapContainer: {
    position: 'relative',
  },
  viewFullMapButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  viewFullMapText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  areasContainer: {
    marginBottom: 16,
  },
  areaItem: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  areaHeader: {
    marginBottom: 8,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  areaDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  subscribeButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  reviewsButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  reviewsButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Map styles
  mapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeMapButton: {
    marginRight: 16,
  },
  fullMapTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Review modal styles
  reviewModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reviewModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeReviewButton: {
    padding: 4,
  },
  ratingSelector: {
    marginBottom: 16,
  },
  ratingSelectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ratingStar: {
    marginHorizontal: 8,
  },
  satisfactionSelector: {
    marginBottom: 16,
  },
  satisfactionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  satisfactionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  satisfactionOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginHorizontal: 4,
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
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  selectedSatisfactionText: {
    color: '#fff',
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CollectionAgenciesScreen;