import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed for your auth context
import MarketChatManager from '../supabase/manager/marketplace/MarketChatManager';
import MarketListingManager from '../supabase/manager/marketplace/MarketListing';
import { useTheme } from '../ThemeContext';

// Main Marketplace Component
const WasteMarketplace = () => {
  const navigation = useNavigation();
  const { user } = useAuth(); // Get the current user from your auth context
  const { isDarkMode, theme } = useTheme();
  const [buyers, setBuyers] = useState([]);
  const [filteredBuyers, setFilteredBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    constituency: null,
    wasteType: null,
    buyerType: null,
  });
  const [constituencies, setConstituencies] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [buyerTypes, setBuyerTypes] = useState(['All', 'Individual', 'Organization']);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Add these new state variables for the dropdown modals
  const [wasteTypeModalVisible, setWasteTypeModalVisible] = useState(false);
  const [buyerTypeModalVisible, setBuyerTypeModalVisible] = useState(false);
  
  // Extract waste types from the buyers that are already loaded
  useEffect(() => {
    if (buyers.length > 0) {
      console.log('Extracting waste types from loaded buyers data...');
      
      // Collect all waste types from all buyers
      const allWasteTypes = [];
      buyers.forEach(buyer => {
        if (buyer.wasteTypes && Array.isArray(buyer.wasteTypes)) {
          buyer.wasteTypes.forEach(type => {
            if (type) allWasteTypes.push(type);
          });
        }
      });
      
      // Get unique waste types
      const uniqueWasteTypes = [...new Set(allWasteTypes)];
      console.log('Extracted waste types from buyers:', uniqueWasteTypes);
      
      // Only update if we found some types and our current list is empty
      if (uniqueWasteTypes.length > 0 && wasteTypes.length === 0) {
        setWasteTypes(uniqueWasteTypes);
      }
    }
  }, [buyers]);
  
  // Update your existing useEffect for initial data load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Get buyers first - we'll extract waste types from here if needed
        console.log('Fetching buyers...');
        const buyersData = await MarketListingManager.getBuyers();
        console.log(`Fetched ${buyersData.length} buyers`);
        setBuyers(buyersData);
        setFilteredBuyers(buyersData);
        
        // Try waste types - this doesn't seem to be working
        const wasteTypesData = await MarketListingManager.getWasteTypes();
        if (wasteTypesData && wasteTypesData.length > 0) {
          console.log('Waste types from manager:', wasteTypesData);
          setWasteTypes(wasteTypesData);
        } else {
          console.log('No waste types from manager, will extract from buyers');
        }
        
        // Get constituencies
        const constituenciesData = await MarketListingManager.getConstituencies();
        setConstituencies(constituenciesData);
        
        // Get unread messages count
        if (user) {
          const unreadCount = await MarketChatManager.getUnreadMessagesCount(user.id);
          setUnreadMessages(unreadCount);
        }
      } catch (error) {
        console.error('Error fetching marketplace data:', error);
        alert('Failed to load marketplace data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [user]);
  
  // Apply filters
  useEffect(() => {
    const applyFilters = async () => {
      try {
        setLoading(true);
        const filters = {
          constituency: activeFilters.constituency,
          wasteType: activeFilters.wasteType,
          buyerType: activeFilters.buyerType === 'All' ? null : activeFilters.buyerType,
        };
        
        const filteredData = await MarketListingManager.getBuyers(filters);
        setFilteredBuyers(filteredData);
      } catch (error) {
        console.error('Error applying filters:', error);
      } finally {
        setLoading(false);
      }
    };
    
    applyFilters();
  }, [activeFilters]);
  
  // Count buyers per constituency
  const getBuyerCountByConstituency = (constituency) => {
    return buyers.filter(buyer => buyer.constituency === constituency).length;
  };

  // Open buyer details modal
  const openDetailsModal = (buyer) => {
    setSelectedBuyer(buyer);
    setDetailsModalVisible(true);
  };

  // Open contact modal
  const openContactModal = () => {
    setDetailsModalVisible(false);
    setContactModalVisible(true);
  };

  // Navigate to chat with buyer
  const navigateToChat = () => {
    setDetailsModalVisible(false);
    if (user && selectedBuyer) {
      navigation.navigate('MarketDirectChat', { 
        buyerId: selectedBuyer.id,
        buyerName: selectedBuyer.name,
        buyerLogo: selectedBuyer.logo 
      });
    } else {
      alert('You need to be logged in to chat with buyers');
    }
  };

  // Navigate to inbox
  const navigateToInbox = () => {
    if (user) {
      navigation.navigate('MarketInbox');
    } else {
      alert('You need to be logged in to view your inbox');
    }
  };

  // Handler functions for filter selections
  const handleWasteTypeChange = (wasteType) => {
    setActiveFilters({...activeFilters, wasteType});
    setWasteTypeModalVisible(false);
  };

  const handleBuyerTypeChange = (buyerType) => {
    setActiveFilters({...activeFilters, buyerType});
    setBuyerTypeModalVisible(false);
  };

  // Updated waste type modal with debugging
  const renderWasteTypeModal = () => {
    console.log('Rendering waste type modal, available types:', wasteTypes);
    
    // Add a function to extract waste types from buyers if still empty
    const extractWasteTypesFromBuyers = () => {
      console.log('Manually extracting waste types from buyers...');
      
      const allWasteTypes = [];
      buyers.forEach(buyer => {
        if (buyer.wasteTypes && Array.isArray(buyer.wasteTypes)) {
          buyer.wasteTypes.forEach(type => {
            if (type) allWasteTypes.push(type);
          });
        }
      });
      
      const uniqueWasteTypes = [...new Set(allWasteTypes)];
      console.log('Manually extracted waste types:', uniqueWasteTypes);
      
      if (uniqueWasteTypes.length > 0) {
        setWasteTypes(uniqueWasteTypes);
      } else {
        alert('Could not find any waste types in the loaded buyers data.');
      }
    };
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={wasteTypeModalVisible}
        onRequestClose={() => setWasteTypeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.filterModalContent, { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff' 
          }]}>
            <View style={[styles.modalHeader, { 
              borderBottomColor: isDarkMode ? '#444' : '#f0f0f0',
              borderBottomWidth: 1,
              paddingBottom: 16
            }]}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Select Waste Type
              </Text>
              <TouchableOpacity onPress={() => setWasteTypeModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? theme.text : '#333'} />
              </TouchableOpacity>
            </View>
            
            {wasteTypes.length === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={[styles.noDataText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  No waste types found. Tap below to extract from loaded buyers.
                </Text>
                <TouchableOpacity 
                  style={[styles.refreshButton, { backgroundColor: theme.primary || '#4CAF50' }]}
                  onPress={extractWasteTypesFromBuyers}
                >
                  <Text style={styles.refreshButtonText}>Extract Waste Types</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.filterOptionsList}>
                <TouchableOpacity 
                  style={[styles.filterOption, { 
                    borderBottomColor: isDarkMode ? '#444' : '#f0f0f0' 
                  }]}
                  onPress={() => handleWasteTypeChange(null)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: isDarkMode ? theme.text : '#333' },
                    activeFilters.wasteType === null && { color: theme.primary || '#4CAF50', fontWeight: 'bold' }
                  ]}>All Types</Text>
                  {activeFilters.wasteType === null && (
                    <Ionicons name="checkmark" size={20} color={theme.primary || '#4CAF50'} />
                  )}
                </TouchableOpacity>
                
                {wasteTypes.map((type, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={[styles.filterOption, { 
                      borderBottomColor: isDarkMode ? '#444' : '#f0f0f0' 
                    }]}
                    onPress={() => handleWasteTypeChange(type)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: isDarkMode ? theme.text : '#333' },
                      activeFilters.wasteType === type && { color: theme.primary || '#4CAF50', fontWeight: 'bold' }
                    ]}>{type}</Text>
                    {activeFilters.wasteType === type && (
                      <Ionicons name="checkmark" size={20} color={theme.primary || '#4CAF50'} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Render buyer type selection modal
  const renderBuyerTypeModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={buyerTypeModalVisible}
      onRequestClose={() => setBuyerTypeModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.filterModalContent, { 
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff' 
        }]}>
          <View style={[styles.modalHeader, { 
            borderBottomColor: isDarkMode ? '#444' : '#f0f0f0',
            borderBottomWidth: 1,
            paddingBottom: 16
          }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Select Buyer Type
            </Text>
            <TouchableOpacity onPress={() => setBuyerTypeModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDarkMode ? theme.text : '#333'} />
            </TouchableOpacity>
          </View>
            
          <ScrollView style={styles.filterOptionsList}>
            {buyerTypes.map((type, index) => (
              <TouchableOpacity 
                key={index}
                style={[styles.filterOption, { 
                  borderBottomColor: isDarkMode ? '#444' : '#f0f0f0' 
                }]}
                onPress={() => handleBuyerTypeChange(type)}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: isDarkMode ? theme.text : '#333' },
                  activeFilters.buyerType === type && { color: theme.primary || '#4CAF50', fontWeight: 'bold' }
                ]}>{type}</Text>
                {activeFilters.buyerType === type && (
                  <Ionicons name="checkmark" size={20} color={theme.primary || '#4CAF50'} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render individual buyer card
  const renderBuyerCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.buyerCard, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderColor: isDarkMode ? '#444' : '#e0e0e0'
      }]} 
      onPress={() => openDetailsModal(item)}
    >
      <View style={styles.buyerCardHeader}>
        <Image 
          source={{ uri: item.logo }} 
          style={styles.buyerLogo} 
        />
        <View style={styles.buyerCardHeaderText}>
          <Text style={[styles.buyerName, { color: isDarkMode ? theme.text : '#333' }]}>
            {item.name}
          </Text>
          <View style={[styles.buyerTypeContainer, { 
            backgroundColor: isDarkMode ? '#1a331a' : '#E8F5E9' 
          }]}>
            <Text style={styles.buyerType}>{item.type}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buyerCardDetails}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={16} color={theme.primary || "#4CAF50"} />
          <Text style={[styles.buyerLocation, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            {item.location}
          </Text>
        </View>
      </View>
      
      <View style={styles.wasteTypesContainer}>
        {item.wasteTypes.map((type, index) => (
          <View key={index} style={[styles.wasteTypeChip, { 
            backgroundColor: isDarkMode ? '#333' : '#ECEFF1' 
          }]}>
            <Text style={[styles.wasteTypeText, { color: isDarkMode ? '#ccc' : '#546E7A' }]}>
              {type}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.pricingContainer}>
        {Object.entries(item.pricing).slice(0, 2).map(([type, price], index) => (
          <Text key={index} style={[styles.pricingText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            {type}: <Text style={[styles.priceValue, { color: theme.primary || '#4CAF50' }]}>{price}</Text>
          </Text>
        ))}
        {Object.keys(item.pricing).length > 2 && (
          <Text style={[styles.pricingText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            +{Object.keys(item.pricing).length - 2} more
          </Text>
        )}
      </View>
      
      <View style={styles.serviceOptionsContainer}>
        {item.serviceOptions.includes('Pickup') && (
          <View style={styles.serviceOption}>
            <FontAwesome5 name="truck-pickup" size={14} color={theme.primary || "#4CAF50"} />
            <Text style={[styles.serviceOptionText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Pickup
            </Text>
          </View>
        )}
        {item.serviceOptions.includes('Drop-off') && (
          <View style={styles.serviceOption}>
            <FontAwesome5 name="hand-holding" size={14} color={theme.primary || "#4CAF50"} />
            <Text style={[styles.serviceOptionText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Drop-off
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render buyer details modal
  const renderDetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={detailsModalVisible}
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      {selectedBuyer && (
        <View style={[styles.modalContainer, {
          backgroundColor: 'rgba(0, 0, 0, 0.9)'
        }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            opacity: 1,
            borderTopWidth: isDarkMode ? 1 : 0,
            borderTopColor: isDarkMode ? '#444' : 'transparent',
          }]}>
            <View style={[styles.modalHeader, { 
              borderBottomColor: isDarkMode ? '#444' : '#f0f0f0',
              borderBottomWidth: 1,
              paddingBottom: 16,
              backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            }]}>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : '#333'} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Buyer Details
              </Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{
                backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
              }}
            >
              <View style={styles.buyerDetailsHeader}>
                <Image source={{ uri: selectedBuyer.logo }} style={styles.detailsLogo} />
                <View style={styles.buyerHeaderInfo}>
                  <Text style={[styles.detailsName, { color: isDarkMode ? theme.text : '#333' }]}>
                    {selectedBuyer.name}
                  </Text>
                  <View style={[styles.detailsTypeContainer, { 
                    backgroundColor: isDarkMode ? '#1a331a' : '#E8F5E9' 
                  }]}>
                    <Text style={styles.detailsType}>{selectedBuyer.type}</Text>
                  </View>
                  <View style={styles.detailsRatingContainer}>
                    <Ionicons name="star" size={16} color="#FFC107" />
                    <Text style={[styles.detailsRating, { color: isDarkMode ? theme.text : '#333' }]}>
                      {selectedBuyer.rating}
                    </Text>
                    <Text style={[styles.detailsReviews, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                      ({selectedBuyer.reviews} reviews)
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <View style={styles.detailsLocationContainer}>
                  <Ionicons name="location-sharp" size={18} color={theme.primary || "#4CAF50"} />
                  <Text style={[styles.detailsLocation, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                    {selectedBuyer.location}
                  </Text>
                </View>
                
                <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>About</Text>
                <Text style={[styles.detailsDescription, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  {selectedBuyer.description}
                </Text>
                
                <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Waste Types & Pricing
                </Text>
                <View style={styles.detailsPricingContainer}>
                  {Object.entries(selectedBuyer.pricing).map(([type, price], index) => (
                    <View key={index} style={[styles.detailsPricingItem, { 
                      borderBottomColor: isDarkMode ? '#444' : '#f0f0f0' 
                    }]}>
                      <Text style={[styles.detailsWasteType, { color: isDarkMode ? theme.text : '#333' }]}>
                        {type}
                      </Text>
                      <Text style={[styles.detailsPrice, { color: theme.primary || '#4CAF50' }]}>
                        {price}
                      </Text>
                    </View>
                  ))}
                </View>
                
                <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Service Options
                </Text>
                <View style={styles.detailsServiceContainer}>
                  {selectedBuyer.serviceOptions.map((option, index) => (
                    <View key={index} style={[styles.detailsServiceItem, { 
                      backgroundColor: isDarkMode ? '#1a331a' : '#E8F5E9' 
                    }]}>
                      <FontAwesome5 
                        name={option === 'Pickup' ? 'truck-pickup' : 'hand-holding'} 
                        size={16} 
                        color={theme.primary || "#4CAF50"} 
                      />
                      <Text style={styles.detailsServiceText}>{option}</Text>
                    </View>
                  ))}
                </View>
                
                {selectedBuyer.serviceOptions.includes('Pickup') && (
                  <>
                    <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                      Pickup Details
                    </Text>
                    <Text style={[styles.detailsPickup, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                      {selectedBuyer.pickupDetails}
                    </Text>
                  </>
                )}
                
                <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Working Hours
                </Text>
                <Text style={[styles.detailsHours, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  {selectedBuyer.workingHours}
                </Text>
              </View>
              
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.messageButton]} 
                  onPress={navigateToChat}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.contactButton]} 
                  onPress={openContactModal}
                >
                  <Ionicons name="call-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );

  // Render contact modal
  const renderContactModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={contactModalVisible}
      onRequestClose={() => setContactModalVisible(false)}
    >
      {selectedBuyer && (
        <View style={[styles.modalContainer, {
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }]}>
          <View style={[styles.contactModalContent, { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            opacity: 1,
            borderTopWidth: isDarkMode ? 1 : 0,
            borderTopColor: isDarkMode ? '#444' : 'transparent',
          }]}>
            <View style={[styles.modalHeader, { 
              borderBottomColor: isDarkMode ? '#444' : '#f0f0f0',
              borderBottomWidth: 1,
              paddingBottom: 16,
              backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            }]}>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : '#333'} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                Contact Details
              </Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.contactDetailsContainer}>
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Ionicons name="call" size={24} color="#fff" />
                </View>
                <View style={styles.contactInfoContainer}>
                  <Text style={[styles.contactLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                    Phone
                  </Text>
                  <Text style={[styles.contactValue, { color: isDarkMode ? theme.text : '#333' }]}>
                    {selectedBuyer.contactInfo.phone}
                  </Text>
                  <TouchableOpacity style={[styles.contactAction, { 
                    backgroundColor: isDarkMode ? '#333' : '#f0f0f0' 
                  }]}>
                    <Text style={[styles.contactActionText, { color: theme.primary || '#4CAF50' }]}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.contactItem}>
                <View style={[styles.contactIconContainer, { backgroundColor: theme.primary || '#4CAF50' }]}>
                  <Ionicons name="mail" size={24} color="#fff" />
                </View>
                <View style={styles.contactInfoContainer}>
                  <Text style={[styles.contactLabel, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                    Email
                  </Text>
                  <Text style={[styles.contactValue, { color: isDarkMode ? theme.text : '#333' }]}>
                    {selectedBuyer.contactInfo.email}
                  </Text>
                  <TouchableOpacity style={[styles.contactAction, { 
                    backgroundColor: isDarkMode ? '#333' : '#f0f0f0' 
                  }]}>
                    <Text style={[styles.contactActionText, { color: theme.primary || '#4CAF50' }]}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.chatButton, { backgroundColor: theme.primary || '#4CAF50' }]}
                onPress={() => {
                  setContactModalVisible(false);
                  navigateToChat();
                }}
              >
                <Text style={styles.chatButtonText}>Start Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { 
      backgroundColor: isDarkMode ? theme.background : '#f5f5f5' 
    }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header Section */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#333' : undefined
      }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : '#333'} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Marketplace
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.primary || '#4CAF50' }]}>
              Turn your waste into earnings
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.inboxButton} onPress={navigateToInbox}>
          <Ionicons name="mail" size={24} color={theme.primary || '#4CAF50'} />
          {unreadMessages > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>{unreadMessages}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Filter Section */}
      <View style={[styles.filterContainer, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff'
      }]}>
        <Text style={[styles.filterTitle, { color: isDarkMode ? theme.text : '#333' }]}>
          Filter by Location
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <TouchableOpacity 
            style={[
              styles.filterChip, 
              { 
                backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
                borderColor: isDarkMode ? '#555' : '#e0e0e0'
              },
              activeFilters.constituency === null && {
                backgroundColor: theme.primary || '#4CAF50',
                borderColor: theme.primary || '#4CAF50'
              }
            ]}
            onPress={() => setActiveFilters({...activeFilters, constituency: null})}
          >
            <Text style={[
              styles.filterChipText, 
              { color: isDarkMode ? '#ccc' : '#666' },
              activeFilters.constituency === null && { color: '#fff', fontWeight: '500' }
            ]}>
              All ({buyers.length})
            </Text>
          </TouchableOpacity>
          
          {constituencies.map((constituency, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.filterChip,
                { 
                  backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
                  borderColor: isDarkMode ? '#555' : '#e0e0e0'
                },
                activeFilters.constituency === constituency && {
                  backgroundColor: theme.primary || '#4CAF50',
                  borderColor: theme.primary || '#4CAF50'
                }
              ]}
              onPress={() => setActiveFilters({...activeFilters, constituency})}
            >
              <Text style={[
                styles.filterChipText,
                { color: isDarkMode ? '#ccc' : '#666' },
                activeFilters.constituency === constituency && { color: '#fff', fontWeight: '500' }
              ]}>
                {constituency} ({getBuyerCountByConstituency(constituency)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterGroupTitle, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Waste Type
            </Text>
            <TouchableOpacity 
              style={[styles.filterDropdown, { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                borderColor: isDarkMode ? '#555' : '#e0e0e0'
              }]}
              onPress={() => {
                console.log('Opening waste type modal with types:', wasteTypes);
                setWasteTypeModalVisible(true);
              }}
            >
              <Text style={[styles.filterDropdownText, { color: isDarkMode ? theme.text : '#333' }]}>
                {activeFilters.wasteType || 'All Types'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={isDarkMode ? theme.textSecondary : '#666'} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={[styles.filterGroupTitle, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Buyer Type
            </Text>
            <TouchableOpacity 
              style={[styles.filterDropdown, { 
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                borderColor: isDarkMode ? '#555' : '#e0e0e0'
              }]}
              onPress={() => setBuyerTypeModalVisible(true)}
            >
              <Text style={[styles.filterDropdownText, { color: isDarkMode ? theme.text : '#333' }]}>
                {activeFilters.buyerType || 'All'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={isDarkMode ? theme.textSecondary : '#666'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Buyer List */}
      <View style={[styles.buyerListContainer, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff' 
      }]}>
        <View style={[styles.buyerListHeader, { 
          borderBottomColor: isDarkMode ? '#444' : '#f0f0f0' 
        }]}>
          <Text style={[styles.buyerListTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Available Buyers
          </Text>
          <Text style={[styles.buyerListCount, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
            {filteredBuyers.length} found
          </Text>
        </View>
        
        <FlatList
          data={filteredBuyers}
          renderItem={renderBuyerCard}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.buyerList, { 
            backgroundColor: isDarkMode ? theme.background : '#fff' 
          }]}
        />
      </View>
      
      {/* Modals */}
      {renderDetailsModal()}
      {renderContactModal()}
      
      {/* Add loading indicator */}
      {loading && (
        <View style={[styles.loadingContainer, { 
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)' 
        }]}>
          <ActivityIndicator size="large" color={theme.primary || '#4CAF50'} />
          <Text style={[styles.loadingText, { color: theme.primary || '#4CAF50' }]}>
            Loading marketplace data...
          </Text>
        </View>
      )}
      
      {/* Add the filter modals to your render method */}
      {renderWasteTypeModal()}
      {renderBuyerTypeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  inboxButton: {
    padding: 8,
    position: 'relative',
  },
  inboxBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inboxBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Filter Styles
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  filterScrollView: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterChip: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterGroup: {
    width: '48%',
  },
  filterGroupTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  filterDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#333',
  },
  // Buyer List Styles
  buyerListContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  buyerListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  buyerListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  buyerListCount: {
    fontSize: 14,
    color: '#666',
  },
  buyerList: {
    padding: 16,
  },
  buyerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buyerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  buyerLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  buyerCardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  buyerTypeContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  buyerType: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  buyerCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerRating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  wasteTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  wasteTypeChip: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  wasteTypeText: {
    fontSize: 12,
    color: '#546E7A',
  },
  pricingContainer: {
    marginBottom: 12,
  },
  pricingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  serviceOptionsContainer: {
    flexDirection: 'row',
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    padding: 16,
    opacity: 1
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  // Buyer Details Styles
  buyerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  buyerHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  detailsName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  detailsTypeContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  detailsType: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  detailsRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
    marginRight: 4,
  },
  detailsReviews: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsLocation: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailsDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsPricingContainer: {
    marginBottom: 20,
  },
  detailsPricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsWasteType: {
    fontSize: 16,
    color: '#333',
  },
  detailsPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  detailsServiceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailsServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
  },
  detailsServiceText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailsPickup: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsHours: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  messageButton: {
    backgroundColor: '#4CAF50',
  },
  contactButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Contact Modal Styles
  contactModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '60%',
    opacity: 1
  },
  contactDetailsContainer: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfoContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  contactAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  contactActionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
  },
  // Additional styles for the filter modals
  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
    position: 'absolute',
    bottom: 0,
  },
  filterOptionsList: {
    marginTop: 10,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  activeFilterOptionText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default WasteMarketplace;