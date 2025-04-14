import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

// Sample data for collection agencies
const SAMPLE_AGENCIES = [
  {
    id: '1',
    name: 'GreenWaste Solutions',
    location: 'Nairobi',
    services: ['3 free plastic bags weekly', 'Twice weekly collection', 'Recyclables sorting'],
    rating: 4.8,
    reviews: 124,
    price: 1200,
    description: 'Leading waste management service specializing in eco-friendly disposal and recycling solutions. We help reduce your carbon footprint while keeping your area clean.',
    images: ['green-waste-image.jpg'],
    contactNumber: '+254 712 345 678',
  },
  {
    id: '2',
    name: 'EcoCollect Kenya',
    location: 'Nairobi',
    services: ['Food waste composting', 'Once weekly collection', 'Monthly reports'],
    rating: 4.5,
    reviews: 87,
    price: 900,
    description: 'Focused on sustainable waste disposal with specialized food waste composting programs. We turn your organic waste into valuable compost.',
    images: ['eco-collect-image.jpg'],
    contactNumber: '+254 723 456 789',
  },
  {
    id: '3',
    name: 'CleanCity Services',
    location: 'Nairobi',
    services: ['Daily commercial collection', '5 waste bins provided', 'E-waste collection'],
    rating: 4.9,
    reviews: 156,
    price: 1500,
    description: 'Premium waste management for businesses and households with special attention to e-waste and hazardous materials disposal.',
    images: ['clean-city-image.jpg'],
    contactNumber: '+254 734 567 890',
  },
  {
    id: '4',
    name: 'RecyclePro',
    location: 'Mombasa',
    services: ['Plastic & glass recycling', 'Bi-weekly collection', '2 sorting bins included'],
    rating: 4.6,
    reviews: 93,
    price: 1100,
    description: 'Specialized in recycling services with focus on plastic, glass, and paper waste. Our mission is to maximize recycling efficiency.',
    images: ['recycle-pro-image.jpg'],
    contactNumber: '+254 745 678 901',
  },
  {
    id: '5',
    name: 'Mombasa Waste Solutions',
    location: 'Mombasa',
    services: ['Weekly collection', 'Beach clean-up program', 'Bulk waste removal'],
    rating: 4.4,
    reviews: 72,
    price: 950,
    description: 'Coastal waste management specialists with additional beach clean-up initiatives. We keep our beaches and neighborhoods clean.',
    images: ['mombasa-waste-image.jpg'],
    contactNumber: '+254 756 789 012',
  },
  {
    id: '6',
    name: 'Kisumu EcoServices',
    location: 'Kisumu',
    services: ['Lakeside cleanup', 'Commercial waste', 'Weekly collection'],
    rating: 4.3,
    reviews: 65,
    price: 850,
    description: 'Waste management with focus on lake environment protection. We ensure your waste doesn\'t end up in Lake Victoria',
    images: ['kisumu-eco-image.jpg'],
    contactNumber: '+254 767 890 123',
  },
];

// Location dropdown options
const LOCATIONS = ['All Locations', 'Nairobi', 'Mombasa', 'Kisumu'];

const AgencyCard = ({ agency, expanded, onToggle, onSubscribe }) => {
  const [animation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);
  
  const cardHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 320]
  });

  const renderStars = (rating) => {
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

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
      <Animated.View style={[styles.card, { height: cardHeight }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.agencyIconContainer}>
              <MaterialCommunityIcons name="recycle" size={22} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.agencyName}>{agency.name}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(agency.rating)}
                <Text style={styles.reviewCount}> ({agency.reviews})</Text>
              </View>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Ksh</Text>
            <Text style={styles.price}>{agency.price}</Text>
            <Text style={styles.priceUnit}>/mo</Text>
          </View>
        </View>
        
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>About:</Text>
            <Text style={styles.description}>{agency.description}</Text>
            
            <Text style={styles.sectionTitle}>Services:</Text>
            <View style={styles.servicesList}>
              {agency.services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.contactContainer}>
              <Text style={styles.contactNumber}>{agency.contactNumber}</Text>
              <TouchableOpacity 
                style={styles.subscribeButton}
                onPress={() => onSubscribe(agency)}
              >
                <Text style={styles.subscribeButtonText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {!expanded && (
          <View style={styles.servicePreview}>
            <MaterialCommunityIcons name="package-variant" size={14} color="#666" />
            <Text style={styles.servicePreviewText} numberOfLines={1}>
              {agency.services.join(' • ')}
            </Text>
          </View>
        )}
        
        <View style={styles.cardFooter}>
          <MaterialIcons 
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#666" 
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const CollectionAgenciesScreen = ({ navigation, route }) => {
  const [selectedLocation, setSelectedLocation] = useState('Nairobi');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [filteredAgencies, setFilteredAgencies] = useState([]);
  
  useEffect(() => {
    filterAgencies();
  }, [selectedLocation]);
  
  const filterAgencies = () => {
    if (selectedLocation === 'All Locations') {
      setFilteredAgencies(SAMPLE_AGENCIES);
    } else {
      setFilteredAgencies(SAMPLE_AGENCIES.filter(agency => agency.location === selectedLocation));
    }
  };
  
  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };
  
  const handleSubscribe = (agency) => {
    // Here you would implement subscription logic
    navigation.navigate('SubscriptionPlan', { agency }); // pass agency as param
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {}} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Agencies</Text>
      </View>
      
      <View style={styles.locationSelector}>
        <Text style={styles.locationLabel}>Location:</Text>
        <TouchableOpacity 
          style={styles.locationDropdown}
          onPress={() => setLocationDropdownOpen(!locationDropdownOpen)}
        >
          <Text style={styles.locationText}>{selectedLocation}</Text>
          <MaterialIcons 
            name={locationDropdownOpen ? "arrow-drop-up" : "arrow-drop-down"} 
            size={24} 
            color="#000" 
          />
        </TouchableOpacity>
      </View>
      
      {locationDropdownOpen && (
        <View style={styles.dropdownMenu}>
          {LOCATIONS.map((location) => (
            <TouchableOpacity
              key={location}
              style={[
                styles.dropdownItem,
                selectedLocation === location && styles.selectedDropdownItem
              ]}
              onPress={() => {
                setSelectedLocation(location);
                setLocationDropdownOpen(false);
              }}
            >
              <Text 
                style={[
                  styles.dropdownItemText,
                  selectedLocation === location && styles.selectedDropdownItemText
                ]}
              >
                {location}
              </Text>
              {selectedLocation === location && (
                <MaterialIcons name="check" size={18} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <FlatList
        data={filteredAgencies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AgencyCard
            agency={item}
            expanded={expandedCardId === item.id}
            onToggle={() => toggleCardExpansion(item.id)}
            onSubscribe={handleSubscribe}
          />
        )}
        contentContainerStyle={styles.agenciesList}
        showsVerticalScrollIndicator={false}
      />
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
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
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
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    zIndex: 10,
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
  agenciesList: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  priceUnit: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  servicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  servicePreviewText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  expandedContent: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    marginBottom: 8,
  },
  servicesList: {
    marginTop: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  contactNumber: {
    fontSize: 13,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CollectionAgenciesScreen;