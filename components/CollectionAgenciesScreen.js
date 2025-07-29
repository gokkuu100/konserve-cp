import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../contexts/AuthContext';
import AgencyManager from '../supabase/manager/agency/AgencyManager';
import FeedbackManager from '../supabase/manager/agency/FeedbackManager';
import SubscriptionManager from '../supabase/manager/agency/SubscriptionManager';
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import { useTheme } from '../ThemeContext';
import FullScreenRouteMap from './FullScreenRouteMap';

// Route Map Component
const RouteMap = ({ coordinates }) => {
  const [region, setRegion] = useState(null);
  const { isDarkMode } = useTheme();
  
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
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
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
  const { isDarkMode, theme } = useTheme();
  
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
    
    if (expanded) {
      checkReviewEligibility();
    }
  }, [expanded]);
  
  const checkReviewEligibility = async () => {
    try {
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
    
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
    const formattedMinutes = m < 10 ? `0${m}` : m;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  return (
    <Animated.View style={[
      styles.agencyCard, 
      { 
        height: cardHeight,
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderColor: isDarkMode ? '#444' : undefined,
        borderWidth: isDarkMode ? 1 : 0
      }
    ]}>
      <TouchableOpacity 
        style={[styles.cardHeader, {
          borderBottomColor: isDarkMode ? '#444' : '#f0f0f0'
        }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.agencyInfo}>
          {agency.logo_url ? (
            <Image source={{ uri: agency.logo_url }} style={styles.agencyLogo} />
          ) : (
            <View style={[styles.agencyLogoPlaceholder, {
              backgroundColor: isDarkMode ? '#333' : '#f0f0f0'
            }]}>
              <MaterialIcons name="business" size={24} color="#4CAF50" />
            </View>
          )}
          <View style={styles.agencyTextInfo}>
            <Text style={[styles.agencyName, {
              color: isDarkMode ? theme.text : '#333'
            }]}>{agency.name}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(agency.rating)}
              <Text style={[styles.reviewCount, {
                color: isDarkMode ? theme.textSecondary : '#666'
              }]}>
                ({agency.reviews_count || 0})
              </Text>
            </View>
            <Text style={[styles.agencyLocation, {
              color: isDarkMode ? theme.textSecondary : '#666'
            }]}>
              {agency.constituency || 'Location not specified'}
            </Text>
            {agency.price && (
              <View style={styles.pricingContainer}>
                <MaterialIcons name="attach-money" size={14} color="#4CAF50" />
                <Text style={[styles.pricingText, {
                  color: isDarkMode ? theme.textSecondary : '#666'
                }]}>
                  KES {agency.price} {agency.plan_type ? `(${agency.plan_type})` : '(standard)'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={isDarkMode ? theme.textSecondary : "#757575"} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.cardExpandedContent}>
          {agency.description && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>About</Text>
              <Text style={[styles.descriptionText, {
                color: isDarkMode ? theme.textSecondary : '#666'
              }]}>{agency.description}</Text>
            </View>
          )}
          
          {agency.services && agency.services.length > 0 && (
            <View style={styles.servicesContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Services</Text>
              <View style={styles.servicesList}>
                {agency.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                    <Text style={[styles.serviceText, {
                      color: isDarkMode ? theme.textSecondary : '#666'
                    }]}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {agency.operational_hours && Object.keys(agency.operational_hours).length > 0 && (
            <View style={styles.hoursContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Operational Hours</Text>
              <View style={styles.hoursList}>
                {Object.entries(agency.operational_hours).map(([day, hours], index) => (
                  <View key={index} style={[styles.hourItem, {
                    borderBottomColor: isDarkMode ? '#444' : '#f0f0f0'
                  }]}>
                    <Text style={[styles.dayText, {
                      color: isDarkMode ? theme.text : '#333'
                    }]}>{day}:</Text>
                    <Text style={[styles.hoursText, {
                      color: isDarkMode ? theme.textSecondary : '#666'
                    }]}>{hours}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {agency.routes && agency.routes.length > 0 && (
            <View style={styles.routesContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Collection Routes</Text>
              {agency.routes.map((route, index) => (
                <View key={index} style={[styles.routeItem, {
                  backgroundColor: isDarkMode ? '#222' : '#f9f9f9'
                }]}>
                  <View style={styles.routeHeader}>
                    <MaterialIcons name="route" size={16} color="#4CAF50" />
                    <Text style={[styles.routeName, {
                      color: isDarkMode ? theme.text : '#333'
                    }]}>{route.name || route.route_name || `Route ${index + 1}`}</Text>
                  </View>
                  
                  {route.route_description && (
                    <Text style={[styles.routeDescription, {
                      color: isDarkMode ? theme.textSecondary : '#666'
                    }]}>{route.route_description}</Text>
                  )}
                  
                  <View style={styles.routeScheduleContainer}>
                    <View style={styles.scheduleItem}>
                      <MaterialIcons name="event" size={14} color={isDarkMode ? theme.textSecondary : "#666"} />
                      <Text style={[styles.scheduleText, {
                        color: isDarkMode ? theme.textSecondary : '#666'
                      }]}>
                        {route.collection_days && route.collection_days.length > 0 ? 
                          route.collection_days.join(', ') : 'Not specified'}
                      </Text>
                    </View>
                    {route.collection_time_start && route.collection_time_end && (
                      <View style={styles.scheduleItem}>
                        <MaterialIcons name="access-time" size={14} color={isDarkMode ? theme.textSecondary : "#666"} />
                        <Text style={[styles.scheduleText, {
                          color: isDarkMode ? theme.textSecondary : '#666'
                        }]}>
                          {formatTime(route.collection_time_start)} - {formatTime(route.collection_time_end)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {route.route_coordinates && route.route_coordinates.length > 0 && (
                    <View style={styles.routeMapContainer}>
                      <RouteMap coordinates={route.route_coordinates} />
                      <TouchableOpacity 
                        style={[styles.viewFullMapButton, {
                          backgroundColor: isDarkMode ? 'rgba(34, 34, 34, 0.9)' : 'rgba(255, 255, 255, 0.9)'
                        }]}
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
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Operational Areas</Text>
              {agency.areas.map((area, index) => {
                const areaRoutes = agency.routes ? agency.routes.filter(route => route.area_id === area.id) : [];
                return (
                  <View key={index} style={[styles.areaItem, {
                    backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
                    borderColor: isDarkMode ? '#444' : undefined,
                    borderWidth: isDarkMode ? 1 : 0
                  }]}>
                    <View style={styles.areaHeader}>
                      <MaterialIcons name="location-on" size={16} color="#4CAF50" />
                      <Text style={[styles.areaName, {
                        color: isDarkMode ? theme.text : '#333'
                      }]}>{area.area_name || `Area ${index + 1}`}</Text>
                    </View>
                    
                    {area.area_description && (
                      <Text style={[styles.areaDescription, {
                        color: isDarkMode ? theme.textSecondary : '#666'
                      }]}>{area.area_description}</Text>
                    )}
                    
                    {areaRoutes.length > 0 && (
                      <View style={styles.routesContainer}>
                        {areaRoutes.map((route, idx) => (
                          <View key={idx} style={[styles.routeItem, {
                            backgroundColor: isDarkMode ? '#333' : '#f0f0f0'
                          }]}>
                            <View style={styles.routeHeader}>
                              <MaterialIcons name="route" size={16} color="#4CAF50" />
                              <Text style={[styles.routeName, {
                                color: isDarkMode ? theme.text : '#333'
                              }]}>{route.route_name || `Route ${idx + 1}`}</Text>
                            </View>
                            
                            {route.route_description && (
                              <Text style={[styles.routeDescription, {
                                color: isDarkMode ? theme.textSecondary : '#666'
                              }]}>{route.route_description}</Text>
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
        <SafeAreaView style={[styles.fullMapContainer, {
          backgroundColor: isDarkMode ? theme.background : '#fff'
        }]}>
          <View style={[styles.fullMapHeader, {
            borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
          }]}>
            <TouchableOpacity 
              style={styles.closeMapButton}
              onPress={() => setShowFullMap(false)}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? theme.text : "#333"} />
            </TouchableOpacity>
            <Text style={[styles.fullMapTitle, {
              color: isDarkMode ? theme.text : '#333'
            }]}>
              {selectedRouteForMap?.name || 'Collection Route'}
            </Text>
          </View>
          
          {selectedRouteForMap?.route_coordinates && (
            <FullScreenRouteMap 
              coordinates={selectedRouteForMap.route_coordinates}
              routeName={selectedRouteForMap.name}
              collectionDays={selectedRouteForMap.collection_days}
              isDarkMode={isDarkMode}
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
          <View style={[styles.reviewModalContent, {
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff'
          }]}>
            <View style={[styles.reviewModalHeader, {
              borderBottomColor: isDarkMode ? '#444' : '#f0f0f0'
            }]}>
              <Text style={[styles.reviewModalTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Rate {agency.name}</Text>
              <TouchableOpacity 
                style={styles.closeReviewButton}
                onPress={() => setShowReviewForm(false)}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? theme.text : "#333"} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={[styles.ratingSelectorLabel, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Your Rating:</Text>
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
              <Text style={[styles.satisfactionLabel, {
                color: isDarkMode ? theme.text : '#333'
              }]}>How satisfied are you?</Text>
              <View style={styles.satisfactionOptions}>
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
                    { borderColor: isDarkMode ? '#444' : '#e0e0e0' },
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
                    { color: isDarkMode && satisfaction !== 'positive' ? theme.text : undefined },
                    satisfaction === 'positive' && styles.selectedSatisfactionText
                  ]}>
                    Satisfied
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
                    { borderColor: isDarkMode ? '#444' : '#e0e0e0' },
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
                    { color: isDarkMode && satisfaction !== 'neutral' ? theme.text : undefined },
                    satisfaction === 'neutral' && styles.selectedSatisfactionText
                  ]}>
                    Neutral
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.satisfactionOption, 
                    { borderColor: isDarkMode ? '#444' : '#e0e0e0' },
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
                    { color: isDarkMode && satisfaction !== 'negative' ? theme.text : undefined },
                    satisfaction === 'negative' && styles.selectedSatisfactionText
                  ]}>
                    Dissatisfied
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.commentContainer}>
              <Text style={[styles.commentLabel, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Your Comments (Optional):</Text>
              <TextInput
                style={[styles.commentInput, {
                  borderColor: isDarkMode ? '#444' : '#e0e0e0',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                  color: isDarkMode ? theme.text : '#333'
                }]}
                placeholder="Share your experience with this agency..."
                placeholderTextColor={isDarkMode ? theme.textSecondary : '#999'}
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
  const { isDarkMode, theme } = useTheme();
  
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

  useEffect(() => {
    loadUserProfile();
    loadAgencies();
  }, []);
  
  useEffect(() => {
    if (agencies.length > 0) {
      filterAgenciesByConstituency(agencies, selectedConstituency);
    }
  }, [selectedConstituency, agencies]);

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
  
  const loadAgencies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: agenciesData, error } = await AgencyManager.fetchAllAgenciesWithDetails();
      
      if (error) {
        console.error('Error fetching agencies:', error);
        setError('Failed to load collection agencies. Please try again.');
        setAgencies([]);
        setFilteredAgencies([]);
        return;
      }
      
      const validAgencies = Array.isArray(agenciesData) ? agenciesData : [];
      console.log("Fetched agencies:", validAgencies.length);
      
      setAgencies(validAgencies);
      
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
      
      let canAddReview = false;
      
      if (user && user.id) {
        console.log(`Checking review eligibility for user: ${user.id} agency: ${agency.id}`);
        
        const { data: hasEverSubscribed, error: subscriptionError } = 
          await SubscriptionManager.checkEverSubscribedToAgency(user.id, agency.id);
        
        if (subscriptionError) {
          console.error('Error checking subscription history:', subscriptionError);
        } else {
          canAddReview = hasEverSubscribed;
          console.log(`User ${user.id} can add review: ${canAddReview}`);
        }
      }
      
      navigation.navigate('AgencyReviews', { 
        agencyId: agency.id,
        agencyName: agency.name,
        canAddReview: canAddReview
      });
      
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setReviewsError('Failed to check review eligibility. Please try again.');
      
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
      <SafeAreaView style={[styles.loadingContainer, {
        backgroundColor: isDarkMode ? theme.background : '#fff'
      }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, {
          color: isDarkMode ? theme.textSecondary : '#666'
        }]}>Loading collection agencies...</Text>
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, {
        backgroundColor: isDarkMode ? theme.background : '#fff'
      }]}>
        <MaterialIcons name="error-outline" size={48} color="#FF5252" />
        <Text style={[styles.errorText, {
          color: isDarkMode ? theme.textSecondary : '#666'
        }]}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
    }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#333'
        }]}>Collection Agencies</Text>
      </View>
      
      {/* Constituency Selector */}
      <View style={[styles.constituencySelector, {
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <Text style={[styles.constituencyLabel, {
          color: isDarkMode ? theme.text : '#333'
        }]}>Constituency:</Text>
        <TouchableOpacity 
          style={[styles.constituencyDropdown, {
            backgroundColor: isDarkMode ? '#333' : '#f0f0f0'
          }]}
          onPress={() => setConstituencyDropdownOpen(!constituencyDropdownOpen)}
        >
          <Text style={[styles.constituencyText, {
            color: isDarkMode ? theme.text : '#333'
          }]}>
            {selectedConstituency || 'All Constituencies'}
          </Text>
          <Ionicons 
            name={constituencyDropdownOpen ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={isDarkMode ? theme.text : "#333"} 
          />
        </TouchableOpacity>
      </View>
      
      {constituencyDropdownOpen && (
        <View style={[styles.dropdownMenuContainer]}>
          <TouchableOpacity 
            style={[styles.dropdownBackdrop, {
              backgroundColor: 'rgba(0, 0, 0, 0.9)'
            }]}
            activeOpacity={1}
            onPress={() => setConstituencyDropdownOpen(false)}
          />
          <View style={[styles.dropdownMenu, {
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            borderColor: isDarkMode ? '#444' : '#e0e0e0',
            borderWidth: 1,
            shadowColor: isDarkMode ? '#000' : '#000',
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            elevation: 5
          }]}>
            {constituencies.map((constituency, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  {
                    borderBottomColor: isDarkMode ? '#444' : '#f0f0f0',
                    backgroundColor: selectedConstituency === constituency ? 
                      (isDarkMode ? '#1a331a' : '#f0fff0') : 
                      (isDarkMode ? theme.cardBackground : '#fff')
                  }
                ]}
                onPress={() => handleConstituencySelect(constituency)}
              >
                <Text 
                  style={[
                    styles.dropdownItemText,
                    { color: isDarkMode ? theme.text : '#333' },
                    selectedConstituency === constituency && { color: '#4CAF50' },
                    constituency === userConstituency && { fontWeight: '500' }
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
          </View>
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
          contentContainerStyle={[styles.agenciesList, {
            backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
          }]}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isLoading}
        />
      ) : (
        <View style={[styles.noAgenciesContainer, {
          backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
        }]}>
          <MaterialIcons name="search-off" size={64} color={isDarkMode ? '#555' : "#BDBDBD"} />
          <Text style={[styles.noAgenciesText, {
            color: isDarkMode ? theme.text : '#333'
          }]}>No collection agencies found</Text>
          <Text style={[styles.noAgenciesSubText, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>
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
    bottom: 0,
    zIndex: 10,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownMenu: {
    marginHorizontal: 16,
    borderRadius: 8,
    maxHeight: 300,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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