import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import AgencyBusinessManager from '../supabase/manager/agency/AgencyBusinessManager';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import FullScreenRouteMap from './FullScreenRouteMap';

// Sample business agency mock data
const MOCK_BUSINESS_AGENCIES = [
  {
    id: 1,
    name: "EcoWaste Solutions Ltd",
    logo_url: "https://example.com/ecowaste.png",
    rating: 4.8,
    reviews_count: 124,
    constituency: "Westlands",
    price: "15000",
    plan_type: "Monthly",
    description: "We specialize in high-volume waste collection for businesses, shopping malls, and large apartment complexes. Our services are designed to handle waste volumes of 50kg and above with industrial-grade equipment.",
    capacity: {
      min_capacity: "50kg",
      max_capacity: "500kg",
      specialization: "Mixed waste, recyclables, organic waste"
    },
    business_types: ["Shopping Malls", "Office Complexes", "Restaurants", "Hotels", "Apartments"],
    services: [
      "Industrial waste collection",
      "Recyclable sorting & processing",
      "Hazardous waste management",
      "Organic waste composting",
      "On-site waste audits",
      "Custom waste solution planning"
    ],
    operational_hours: {
      "Monday": "7:00 AM - 6:00 PM",
      "Tuesday": "7:00 AM - 6:00 PM",
      "Wednesday": "7:00 AM - 6:00 PM",
      "Thursday": "7:00 AM - 6:00 PM",
      "Friday": "7:00 AM - 6:00 PM",
      "Saturday": "8:00 AM - 2:00 PM",
      "Sunday": "Closed"
    },
    routes: [
      {
        name: "Westlands Business District Route",
        route_name: "Westlands Business District Route",
        route_description: "Collection for all businesses in Westlands business district including Sarit Centre, The Oval, and surrounding office complexes.",
        collection_days: ["Monday", "Wednesday", "Friday"],
        collection_time_start: "09:00:00",
        collection_time_end: "14:00:00",
        route_coordinates: [
          { lat: -1.2573, lng: 36.8021 },
          { lat: -1.2589, lng: 36.8035 },
          { lat: -1.2622, lng: 36.8042 },
          { lat: -1.2645, lng: 36.8039 }
        ]
      },
      {
        name: "Industrial Area Route",
        route_name: "Industrial Area Route",
        route_description: "Collection route covering major industrial companies and manufacturing plants in Industrial Area",
        collection_days: ["Tuesday", "Thursday"],
        collection_time_start: "07:00:00",
        collection_time_end: "12:00:00",
        route_coordinates: [
          { lat: -1.3073, lng: 36.8521 },
          { lat: -1.3089, lng: 36.8535 },
          { lat: -1.3122, lng: 36.8542 },
          { lat: -1.3145, lng: 36.8539 }
        ]
      }
    ],
    areas: [
      {
        id: 1,
        area_name: "Westlands",
        area_description: "Coverage of entire Westlands commercial district including office complexes and malls."
      },
      {
        id: 2,
        area_name: "Industrial Area",
        area_description: "Coverage of Industrial Area factories and warehouses."
      }
    ],
    equipment: [
      "Rear-loading compactor trucks (10-ton capacity)",
      "Roll-off containers (20-40 cubic yards)",
      "Industrial balers for recyclables",
      "Front-loading dumpster trucks"
    ],
    certifications: ["NEMA Licensed", "ISO 14001 Certified", "Green Business Certified"],
    contract_terms: [
      "Minimum contract: 3 months",
      "Payment terms: Monthly billing, 14-day payment window",
      "Cancellation policy: 30-day written notice required"
    ]
  },
  {
    id: 2,
    name: "BizWaste Management",
    logo_url: "https://example.com/bizwaste.png",
    rating: 4.5,
    reviews_count: 87,
    constituency: "Kasarani",
    price: "12000",
    plan_type: "Monthly",
    description: "Business waste specialists serving major commercial zones in Nairobi. We provide comprehensive waste collection solutions tailored to medium and large businesses with structured collection schedules.",
    capacity: {
      min_capacity: "40kg",
      max_capacity: "400kg",
      specialization: "Commercial waste, e-waste, construction debris"
    },
    business_types: ["Retail Centers", "Restaurants", "Construction Sites", "Electronics Stores", "Office Buildings"],
    services: [
      "Commercial waste collection",
      "E-waste disposal",
      "Construction debris removal",
      "Dumpster rental",
      "Scheduled collection service",
      "Waste management consulting"
    ],
    operational_hours: {
      "Monday": "6:00 AM - 5:00 PM",
      "Tuesday": "6:00 AM - 5:00 PM",
      "Wednesday": "6:00 AM - 5:00 PM",
      "Thursday": "6:00 AM - 5:00 PM",
      "Friday": "6:00 AM - 5:00 PM",
      "Saturday": "7:00 AM - 1:00 PM",
      "Sunday": "Closed"
    },
    routes: [
      {
        name: "CBD Business Route",
        route_name: "CBD Business Route",
        route_description: "Collection for all businesses in Central Business District including Kenya Archives, Hilton, and surrounding office buildings.",
        collection_days: ["Monday", "Thursday"],
        collection_time_start: "06:00:00",
        collection_time_end: "10:00:00",
        route_coordinates: [
          { lat: -1.2843, lng: 36.8226 },
          { lat: -1.2856, lng: 36.8234 },
          { lat: -1.2862, lng: 36.8245 },
          { lat: -1.2875, lng: 36.8251 }
        ]
      },
      {
        name: "Eastlands Commercial Route",
        route_name: "Eastlands Commercial Route",
        route_description: "Covering Eastlands shopping centers, markets, and business hubs",
        collection_days: ["Tuesday", "Friday"],
        collection_time_start: "07:30:00",
        collection_time_end: "12:30:00",
        route_coordinates: [
          { lat: -1.2788, lng: 36.8684 },
          { lat: -1.2801, lng: 36.8694 },
          { lat: -1.2815, lng: 36.8710 },
          { lat: -1.2828, lng: 36.8722 }
        ]
      }
    ],
    areas: [
      {
        id: 1,
        area_name: "CBD",
        area_description: "Central Business District commercial buildings and retail centers."
      },
      {
        id: 2,
        area_name: "Eastlands",
        area_description: "Coverage of Eastlands commercial centers and business areas."
      }
    ],
    equipment: [
      "Commercial compactor trucks (8-ton capacity)",
      "Waste container systems (2-6 cubic yards)",
      "Specialized e-waste collection vehicles",
      "Construction debris dumpsters"
    ],
    certifications: ["NEMA Certified", "Commercial Waste Handling License"],
    contract_terms: [
      "Minimum contract: 1 month",
      "Payment terms: Monthly advance payment",
      "Cancellation policy: 2-week notice required"
    ]
  },
  {
    id: 3,
    name: "GreenCorp Business Recyclers",
    logo_url: "https://example.com/greencorp.png",
    rating: 4.9,
    reviews_count: 152,
    constituency: "Karen",
    price: "18000",
    plan_type: "Monthly",
    description: "Eco-friendly waste management company specializing in waste recycling solutions for businesses committed to sustainability. We offer carbon footprint reduction and environmental impact reporting with our services.",
    capacity: {
      min_capacity: "60kg",
      max_capacity: "600kg",
      specialization: "Recyclable materials, paper waste, plastic, glass, metals"
    },
    business_types: ["Corporate Offices", "Hotels", "Shopping Centers", "Universities", "Business Parks"],
    services: [
      "Commercial recycling programs",
      "Zero waste consulting",
      "Carbon footprint reporting",
      "Sustainability audits",
      "Material recovery",
      "Staff environmental training"
    ],
    operational_hours: {
      "Monday": "7:30 AM - 5:30 PM",
      "Tuesday": "7:30 AM - 5:30 PM",
      "Wednesday": "7:30 AM - 5:30 PM",
      "Thursday": "7:30 AM - 5:30 PM",
      "Friday": "7:30 AM - 5:30 PM",
      "Saturday": "8:00 AM - 12:00 PM",
      "Sunday": "Closed"
    },
    routes: [
      {
        name: "Karen & Langata Business Route",
        route_name: "Karen & Langata Business Route",
        route_description: "Eco-friendly collection service for businesses in Karen and Langata areas including shopping centers and office parks.",
        collection_days: ["Monday", "Wednesday", "Friday"],
        collection_time_start: "08:00:00",
        collection_time_end: "15:00:00",
        route_coordinates: [
          { lat: -1.3203, lng: 36.7285 },
          { lat: -1.3225, lng: 36.7312 },
          { lat: -1.3242, lng: 36.7328 },
          { lat: -1.3269, lng: 36.7341 }
        ]
      },
      {
        name: "Upperhill Corporate Route",
        route_name: "Upperhill Corporate Route",
        route_description: "Servicing all major corporate offices and institutions in Upperhill area",
        collection_days: ["Tuesday", "Thursday"],
        collection_time_start: "09:00:00",
        collection_time_end: "16:00:00",
        route_coordinates: [
          { lat: -1.2975, lng: 36.8126 },
          { lat: -1.2986, lng: 36.8145 },
          { lat: -1.3002, lng: 36.8162 },
          { lat: -1.3018, lng: 36.8174 }
        ]
      }
    ],
    areas: [
      {
        id: 1,
        area_name: "Karen & Langata",
        area_description: "Coverage of Karen and Langata shopping centers, hotels, and business facilities."
      },
      {
        id: 2,
        area_name: "Upperhill",
        area_description: "Coverage of Upperhill's corporate offices, hospitals, and institutions."
      }
    ],
    equipment: [
      "Recycling collection trucks with sorted compartments",
      "Industrial balers and compactors",
      "Material recovery facility",
      "Zero-emission electric collection vehicles for certain routes"
    ],
    certifications: ["Green Business Certification", "NEMA Licensed", "ISO 14001 Environmental Management"],
    contract_terms: [
      "Minimum contract: 6 months",
      "Payment terms: Monthly billing with sustainability reports",
      "Cancellation policy: 45-day notice with transition support"
    ]
  }
];

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

// Business Agency Card Component
const BusinessAgencyCard = React.forwardRef(({ agency, expanded, onToggle, onSubscribe, onViewReviews }, ref) => {
  const [animation] = useState(new Animated.Value(0));
  const [showFullMap, setShowFullMap] = useState(false);
  const [selectedRouteForMap, setSelectedRouteForMap] = useState(null);
  const { isDarkMode, theme } = useTheme();
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);
  
  const cardHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [140, expanded ? 'auto' : 140]
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
    // Make sure the route object has the expected properties
    const formattedRoute = {
      ...route,
      route_name: route.name || route.route_name || 'Collection Route',
      route_coordinates: route.route_coordinates || []
    };
    
    setSelectedRouteForMap(formattedRoute);
    setShowFullMap(true);
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
            {agency.capacity && (
              <View style={styles.capacityContainer}>
                <MaterialIcons name="local-shipping" size={14} color="#4CAF50" />
                <Text style={[styles.capacityText, {
                  color: isDarkMode ? theme.textSecondary : '#666'
                }]}>
                  Capacity: {agency.capacity.min_capacity} - {agency.capacity.max_capacity}
                </Text>
              </View>
            )}
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
          
          {agency.capacity && (
            <View style={styles.capacityDetailContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Waste Capacity</Text>
              <View style={[styles.detailCard, {
                backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
                borderColor: isDarkMode ? '#444' : undefined,
                borderWidth: isDarkMode ? 1 : 0
              }]}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="arrow-downward" size={16} color="#4CAF50" />
                  <Text style={[styles.detailLabel, {
                    color: isDarkMode ? theme.text : '#333'
                  }]}>Minimum Capacity:</Text>
                  <Text style={[styles.detailValue, {
                    color: isDarkMode ? theme.textSecondary : '#666'
                  }]}>{agency.capacity.min_capacity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="arrow-upward" size={16} color="#4CAF50" />
                  <Text style={[styles.detailLabel, {
                    color: isDarkMode ? theme.text : '#333'
                  }]}>Maximum Capacity:</Text>
                  <Text style={[styles.detailValue, {
                    color: isDarkMode ? theme.textSecondary : '#666'
                  }]}>{agency.capacity.max_capacity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="category" size={16} color="#4CAF50" />
                  <Text style={[styles.detailLabel, {
                    color: isDarkMode ? theme.text : '#333'
                  }]}>Specialization:</Text>
                  <Text style={[styles.detailValue, {
                    color: isDarkMode ? theme.textSecondary : '#666',
                    flex: 1
                  }]}>{agency.capacity.specialization}</Text>
                </View>
              </View>
            </View>
          )}
          
          {agency.business_types && agency.business_types.length > 0 && (
            <View style={styles.businessTypesContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Suitable For</Text>
              <View style={styles.tagsContainer}>
                {agency.business_types.map((type, index) => (
                  <View key={index} style={[styles.tagItem, {
                    backgroundColor: isDarkMode ? '#333' : '#e8f5e9',
                    borderColor: isDarkMode ? '#444' : '#81c784'
                  }]}>
                    <Text style={[styles.tagText, {
                      color: isDarkMode ? '#81c784' : '#2e7d32'
                    }]}>{type}</Text>
                  </View>
                ))}
              </View>
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
          
          {agency.equipment && agency.equipment.length > 0 && (
            <View style={styles.equipmentContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Collection Equipment</Text>
              <View style={styles.equipmentList}>
                {agency.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <MaterialIcons name="construction" size={16} color="#4CAF50" />
                    <Text style={[styles.equipmentText, {
                      color: isDarkMode ? theme.textSecondary : '#666'
                    }]}>{item}</Text>
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
          
          {agency.certifications && agency.certifications.length > 0 && (
            <View style={styles.certificationsContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Certifications & Licenses</Text>
              <View style={styles.certificationsList}>
                {agency.certifications.map((cert, index) => (
                  <View key={index} style={[styles.certificationItem, {
                    backgroundColor: isDarkMode ? '#333' : '#e3f2fd',
                    borderColor: isDarkMode ? '#444' : '#90caf9'
                  }]}>
                    <MaterialIcons name="verified" size={16} color="#2196F3" />
                    <Text style={[styles.certificationText, {
                      color: isDarkMode ? '#90caf9' : '#0d47a1'
                    }]}>{cert}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {agency.contract_terms && agency.contract_terms.length > 0 && (
            <View style={styles.contractTermsContainer}>
              <Text style={[styles.sectionTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Contract Terms</Text>
              <View style={[styles.contractTermsCard, {
                backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
                borderColor: isDarkMode ? '#444' : '#e0e0e0'
              }]}>
                {agency.contract_terms.map((term, index) => (
                  <View key={index} style={[styles.contractTermItem, 
                    index < agency.contract_terms.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
                    }
                  ]}>
                    <MaterialIcons name="description" size={16} color="#4CAF50" />
                    <Text style={[styles.contractTermText, {
                      color: isDarkMode ? theme.textSecondary : '#666'
                    }]}>{term}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => onSubscribe()}
            >
              <MaterialIcons name="payment" size={18} color="#FFF" />
              <Text style={styles.subscribeButtonText}>Request Subscription</Text>
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
          {selectedRouteForMap && (
            <FullScreenRouteMap 
              route={selectedRouteForMap}
              onClose={() => setShowFullMap(false)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </Animated.View>
  );
});

// Main Screen Component
const CollectionAgenciesForBusinessScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [userConstituency, setUserConstituency] = useState('');
  const [constituencyDropdownOpen, setConstituencyDropdownOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [filteredAgencies, setFilteredAgencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [error, setError] = useState(null);
  const [constituencies, setConstituencies] = useState([]);
  const [minCapacity, setMinCapacity] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    minCapacity: null,
    businessType: null,
    certifications: []
  });
  const [availableBusinessTypes, setAvailableBusinessTypes] = useState([]);
  const [availableCertifications, setAvailableCertifications] = useState([]);
  const agencyCardRefs = useRef({});

  // Load user profile and agencies on component mount
  useEffect(() => {
    const fetchAgencies = async () => {
      setIsLoading(true);
      try {
        // Fetch agencies from Supabase using AgencyBusinessManager
        const fetchedAgencies = await AgencyBusinessManager.getBusinessAgenciesDetails();
        
        if (fetchedAgencies && fetchedAgencies.length > 0) {
          setAgencies(fetchedAgencies);
          
          // Extract unique constituencies from agencies
          const uniqueConstituencies = [...new Set(
            fetchedAgencies
              .map(agency => agency.constituency)
              .filter(Boolean)
          )];
          
          setConstituencies(['All Constituencies', ...uniqueConstituencies]);
          
          // Extract all available business types
          const allBusinessTypes = new Set();
          fetchedAgencies.forEach(agency => {
            if (agency.business_types && Array.isArray(agency.business_types)) {
              agency.business_types.forEach(type => allBusinessTypes.add(type));
            }
          });
          setAvailableBusinessTypes(Array.from(allBusinessTypes));
          
          // Extract all available certifications
          const allCertifications = new Set();
          fetchedAgencies.forEach(agency => {
            if (agency.certifications && Array.isArray(agency.certifications)) {
              agency.certifications.forEach(cert => allCertifications.add(cert));
            }
          });
          setAvailableCertifications(Array.from(allCertifications));
          
          // Set filtered agencies based on selected constituency
          setFilteredAgencies(fetchedAgencies);
        } else {
          console.warn('No business agencies found');
          setAgencies([]);
          setFilteredAgencies([]);
        }
      } catch (error) {
        console.error('Error fetching business agencies:', error);
        setError('Failed to load business collection agencies. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgencies();
  }, []);
  
  // Filter agencies when filters change
  useEffect(() => {
    filterAgencies();
  }, [selectedConstituency, filterOptions]);

  // Filter agencies based on selected filters
  const filterAgencies = () => {
    let filtered = [...agencies];
    
    // Filter by constituency if selected
    if (selectedConstituency && selectedConstituency !== 'All Constituencies') {
      filtered = filtered.filter(agency => agency.constituency === selectedConstituency);
    }
    
    // Filter by minimum capacity
    if (filterOptions.minCapacity) {
      filtered = filtered.filter(agency => {
        if (!agency.capacity || !agency.capacity.min_capacity) return false;
        // Extract the numeric part of the capacity (e.g., "50kg" -> 50)
        const capacityValue = parseInt(agency.capacity.min_capacity);
        return !isNaN(capacityValue) && capacityValue >= filterOptions.minCapacity;
      });
    }
    
    // Filter by business type
    if (filterOptions.businessType) {
      filtered = filtered.filter(agency => 
        agency.business_types && 
        agency.business_types.includes(filterOptions.businessType)
      );
    }
    
    // Filter by certifications
    if (filterOptions.certifications && filterOptions.certifications.length > 0) {
      filtered = filtered.filter(agency => {
        if (!agency.certifications) return false;
        return filterOptions.certifications.every(cert => 
          agency.certifications.includes(cert)
        );
      });
    }
    
    setFilteredAgencies(filtered);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilterOptions({
      minCapacity: null,
      businessType: null,
      certifications: []
    });
    setShowFilterModal(false);
  };
  
  // Apply new filters
  const applyFilters = () => {
    filterAgencies();
    setShowFilterModal(false);
  };
  
  // Toggle certification selection in filters
  const toggleCertification = (cert) => {
    setFilterOptions(prevState => {
      const certifications = [...prevState.certifications];
      const index = certifications.indexOf(cert);
      
      if (index > -1) {
        certifications.splice(index, 1);
      } else {
        certifications.push(cert);
      }
      
      return { ...prevState, certifications };
    });
  };
  
  // Toggle card expansion
  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };
  
  // Handle subscription request
  const handleSubscribe = (agency) => {
    navigation.navigate('BusinessSubscriptionPlanScreen', { 
      agency: {
        id: agency.id,
        name: agency.name,
        constituency: agency.constituency,
        price: agency.price,
        capacity: agency.capacity
      }
    });
  };

  // Handle constituency selection
  const handleConstituencySelect = (constituency) => {
    setSelectedConstituency(constituency);
    setConstituencyDropdownOpen(false);
  };

  // View agency reviews
  const handleViewReviews = (agency) => {
    navigation.navigate('AgencyReviews', { 
      agencyId: agency.id,
      agencyName: agency.name,
      isBusinessAgency: true
    });
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
        }]}>Loading business collection agencies...</Text>
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
        <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
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
        }]}>Business Waste Collection</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcons name="filter-list" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
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
      
      {/* Active Filters Display */}
      {(filterOptions.minCapacity || filterOptions.businessType || filterOptions.certifications.length > 0) && (
        <View style={[styles.activeFiltersContainer, {
          backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
          borderColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'
        }]}>
          <Text style={[styles.activeFiltersTitle, {
            color: isDarkMode ? theme.text : '#333'
          }]}>Active Filters:</Text>
          <View style={styles.activeFiltersList}>
            {filterOptions.minCapacity && (
              <View style={[styles.activeFilterItem, {
                backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'
              }]}>
                <Text style={[styles.activeFilterText, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Min. Capacity: {filterOptions.minCapacity}kg</Text>
              </View>
            )}
            {filterOptions.businessType && (
              <View style={[styles.activeFilterItem, {
                backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'
              }]}>
                <Text style={[styles.activeFilterText, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Type: {filterOptions.businessType}</Text>
              </View>
            )}
            {filterOptions.certifications.map((cert, index) => (
              <View key={index} style={[styles.activeFilterItem, {
                backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'
              }]}>
                <Text style={[styles.activeFilterText, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>{cert}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={resetFilters}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Constituency Dropdown Menu */}
      {constituencyDropdownOpen && (
        <View style={[styles.dropdownMenuContainer]}>
          <TouchableOpacity 
            style={[styles.dropdownBackdrop, {
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
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
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContainer}>
          <View style={[styles.filterModalContent, {
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            borderColor: isDarkMode ? '#444' : undefined,
            borderWidth: isDarkMode ? 1 : 0
          }]}>
            <View style={[styles.filterModalHeader, {
              borderBottomColor: isDarkMode ? '#444' : '#f0f0f0'
            }]}>
              <Text style={[styles.filterModalTitle, {
                color: isDarkMode ? theme.text : '#333'
              }]}>Filter Agencies</Text>
              <TouchableOpacity 
                style={styles.closeFilterButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={24} color={isDarkMode ? theme.text : "#333"} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterScroll}>
              {/* Minimum Capacity Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Minimum Waste Capacity</Text>
                <View style={styles.capacityOptions}>
                  {[40, 50, 100, 200, 300].map((capacity) => (
                    <TouchableOpacity 
                      key={capacity} 
                      style={[styles.capacityOption, {
                        backgroundColor: filterOptions.minCapacity === capacity 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#333' : '#f0f0f0'),
                        borderColor: filterOptions.minCapacity === capacity 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#444' : '#e0e0e0')
                      }]}
                      onPress={() => setFilterOptions(prev => ({ 
                        ...prev, 
                        minCapacity: prev.minCapacity === capacity ? null : capacity 
                      }))}
                    >
                      <Text style={[styles.capacityOptionText, {
                        color: filterOptions.minCapacity === capacity 
                          ? '#FFF' 
                          : (isDarkMode ? theme.text : '#333')
                      }]}>{capacity}kg+</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Business Type Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Business Type</Text>
                <View style={styles.businessTypeOptions}>
                  {availableBusinessTypes.map((type, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.businessTypeOption, {
                        backgroundColor: filterOptions.businessType === type 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#333' : '#f0f0f0'),
                        borderColor: filterOptions.businessType === type 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#444' : '#e0e0e0')
                      }]}
                      onPress={() => setFilterOptions(prev => ({ 
                        ...prev, 
                        businessType: prev.businessType === type ? null : type 
                      }))}
                    >
                      <Text style={[styles.businessTypeText, {
                        color: filterOptions.businessType === type 
                          ? '#FFF' 
                          : (isDarkMode ? theme.text : '#333')
                      }]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Certifications Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, {
                  color: isDarkMode ? theme.text : '#333'
                }]}>Certifications</Text>
                <View style={styles.certificationOptions}>
                  {availableCertifications.map((cert, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.certificationOption, {
                        backgroundColor: filterOptions.certifications.includes(cert) 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#333' : '#f0f0f0'),
                        borderColor: filterOptions.certifications.includes(cert) 
                          ? '#4CAF50' 
                          : (isDarkMode ? '#444' : '#e0e0e0')
                      }]}
                      onPress={() => toggleCertification(cert)}
                    >
                      {filterOptions.certifications.includes(cert) && (
                        <MaterialIcons name="check" size={16} color="#FFF" style={styles.certCheckIcon} />
                      )}
                      <Text style={[styles.certificationText, {
                        color: filterOptions.certifications.includes(cert) 
                          ? '#FFF' 
                          : (isDarkMode ? theme.text : '#333')
                      }]}>{cert}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={[styles.filterActions, {
              borderTopColor: isDarkMode ? '#444' : '#f0f0f0'
            }]}>
              <TouchableOpacity 
                style={[styles.resetButton, {
                  backgroundColor: isDarkMode ? '#333' : '#f5f5f5'
                }]}
                onPress={resetFilters}
              >
                <Text style={[styles.resetButtonText, {
                  color: isDarkMode ? theme.text : '#666'
                }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Agencies List */}
      {filteredAgencies.length > 0 ? (
        <FlatList
          data={filteredAgencies}
          renderItem={({ item }) => (
            <BusinessAgencyCard
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
          refreshing={isLoading}
        />
      ) : (
        <View style={[styles.noAgenciesContainer, {
          backgroundColor: isDarkMode ? theme.background : '#f5f7fa'
        }]}>
          <MaterialIcons name="search-off" size={64} color={isDarkMode ? '#555' : "#BDBDBD"} />
          <Text style={[styles.noAgenciesText, {
            color: isDarkMode ? theme.text : '#333'
          }]}>No business collection agencies found</Text>
          <Text style={[styles.noAgenciesSubText, {
            color: isDarkMode ? theme.textSecondary : '#666'
          }]}>
            {selectedConstituency && selectedConstituency !== 'All Constituencies'
              ? `There are no business collection agencies in ${selectedConstituency} matching your filters.`
              : 'There are no business collection agencies matching your filters.'}
          </Text>
          <TouchableOpacity
            style={styles.changeFiltersButton}
            onPress={resetFilters}
          >
            <Text style={styles.changeFiltersButtonText}>Reset Filters</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    alignItems: 'flex-end',
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
  // Active filters styles
  activeFiltersContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  // Filter modal styles
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeFilterButton: {
    padding: 4,
  },
  filterScroll: {
    maxHeight: '70%',
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  capacityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  capacityOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  capacityOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  businessTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  businessTypeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  businessTypeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  certificationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  certificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  certCheckIcon: {
    marginRight: 4,
  },
  certificationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0d47a1',
    marginLeft: 4,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
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
  changeFiltersButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  changeFiltersButtonText: {
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
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  agencyLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: 4,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  capacityDetailContainer: {
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
  },
  businessTypesContainer: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#81c784',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2e7d32',
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
  equipmentContainer: {
    marginBottom: 16,
  },
  equipmentList: {
    marginTop: 4,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipmentText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
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
  mapContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  certificationsContainer: {
    marginBottom: 16,
  },
  certificationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  contractTermsContainer: {
    marginBottom: 16,
  },
  contractTermsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contractTermItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  contractTermText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
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
  }
});

export default CollectionAgenciesForBusinessScreen;