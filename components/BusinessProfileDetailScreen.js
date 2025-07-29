import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';
import ContractNegotiationManager from '../supabase/manager/business/ContractNegotiationManager';

const { width } = Dimensions.get('window');

const BusinessProfileDetailScreen = ({ route, navigation }) => {
  const { profileId } = route.params;
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  
  // Collapsible sections state
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [contactExpanded, setContactExpanded] = useState(true);
  const [wasteExpanded, setWasteExpanded] = useState(true);
  const [contractsExpanded, setContractsExpanded] = useState(true);
  
  // Animation values
  const detailsAnimation = new Animated.Value(1);
  const contactAnimation = new Animated.Value(1);
  const wasteAnimation = new Animated.Value(1);
  const contractsAnimation = new Animated.Value(1);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      try {
        setLoading(true);
        const profileData = await BusinessProfileManager.getBusinessProfileById(profileId);
        if (profileData) {
          setProfile(profileData);
          
          // Check if active subscription
          setSubscriptionStatus({
            isActive: false,
            plan: null,
            expiryDate: null
          });
          
          // Fetch contracts for this business profile
          try {
            setLoadingContracts(true);
            const contractsData = await ContractNegotiationManager.getBusinessContracts(profileId);
            setContracts(contractsData || []);
          } catch (contractErr) {
            console.error('Error fetching contracts:', contractErr);
          } finally {
            setLoadingContracts(false);
          }
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load business profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [profileId]);

  const handleEditProfile = () => {
    navigation.navigate('BusinessProfileEditScreen', { profileId });
  };

  const handleViewAgencies = () => {
    navigation.navigate('CollectionAgenciesForBusinessScreen', { businessProfileId: profileId });
  };

  const handleViewSubscriptions = () => {
    navigation.navigate('BusinessSubscriptionPlanScreen', { businessProfileId: profileId });
  };
  
  const handleViewContract = (contractId) => {
    navigation.navigate('ContractNegotiationScreen', { 
      contractId, 
      businessProfileId: profileId,
      status: 'existing'
    });
  };
  
  const toggleSection = (section, expanded, setExpanded, animation) => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false
    }).start();
    setExpanded(!expanded);
  };
  
  const toggleDetails = () => toggleSection('details', detailsExpanded, setDetailsExpanded, detailsAnimation);
  const toggleContact = () => toggleSection('contact', contactExpanded, setContactExpanded, contactAnimation);
  const toggleWaste = () => toggleSection('waste', wasteExpanded, setWasteExpanded, wasteAnimation);
  const toggleContracts = () => toggleSection('contracts', contractsExpanded, setContractsExpanded, contractsAnimation);
  
  // Helper function to format contract status for display
  const formatContractStatus = (status) => {
    switch (status) {
      case 'negotiation':
        return 'In Negotiation';
      case 'pending':
        return 'Pending';
      case 'signed':
        return 'Signed';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };
  
  // Helper function to get color based on contract status
  const getStatusColor = (status) => {
    switch (status) {
      case 'negotiation':
        return { bgColor: '#FFF9C4', textColor: '#F57F17' }; // Yellow
      case 'pending':
        return { bgColor: '#E1F5FE', textColor: '#0288D1' }; // Light Blue
      case 'signed':
        return { bgColor: '#E8F5E9', textColor: '#388E3C' }; // Light Green
      case 'active':
        return { bgColor: '#4CAF50', textColor: '#FFFFFF' }; // Green
      case 'completed':
        return { bgColor: '#E0E0E0', textColor: '#616161' }; // Grey
      case 'cancelled':
        return { bgColor: '#FFEBEE', textColor: '#D32F2F' }; // Light Red
      default:
        return { bgColor: '#E0E0E0', textColor: '#616161' }; // Grey
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: isDarkMode ? theme.text : '#333' }]}>
          Loading business profile...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={[styles.errorText, { color: isDarkMode ? theme.text : '#333' }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>

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
        }]}>Business Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <MaterialIcons name="edit" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Business Profile Card */}
        <View style={[styles.profileCard, { 
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
        }]}>
          <View style={styles.profileHeader}>
            <View style={styles.businessIconContainer}>
              <MaterialIcons name="business" size={32} color="#4CAF50" />
            </View>
            <View style={styles.businessInfo}>
              <Text style={[styles.businessName, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.business_name}
              </Text>
              <Text style={[styles.businessType, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                {profile.business_type}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Business Details - Collapsible */}
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleDetails}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Business Details
            </Text>
            <MaterialIcons 
              name={detailsExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={isDarkMode ? theme.text : '#333'} 
            />
          </TouchableOpacity>
          
          <Animated.View style={[styles.collapsibleContent, {
            maxHeight: detailsAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500]
            }),
            opacity: detailsAnimation
          }]}>
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={20} color="#4CAF50" />
              <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.business_address}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="map" size={20} color="#4CAF50" />
              <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.business_constituency}, {profile.business_county}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="people" size={20} color="#4CAF50" />
              <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.number_of_employees} employees
              </Text>
            </View>
            
            {profile.business_description && (
              <View style={styles.detailRow}>
                <MaterialIcons name="description" size={20} color="#4CAF50" />
                <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                  {profile.business_description}
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.divider} />

          {/* Contact Information - Collapsible */}
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleContact}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Contact Information
            </Text>
            <MaterialIcons 
              name={contactExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={isDarkMode ? theme.text : '#333'} 
            />
          </TouchableOpacity>
          
          <Animated.View style={[styles.collapsibleContent, {
            maxHeight: contactAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 300]
            }),
            opacity: contactAnimation
          }]}>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#4CAF50" />
              <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.contact_person}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={20} color="#4CAF50" />
              <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                {profile.contact_phone}
              </Text>
            </View>
            
            {profile.contact_email && (
              <View style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color="#4CAF50" />
                <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                  {profile.contact_email}
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.divider} />

          {/* Waste Management Details - Collapsible */}
          {profile.wasteDetails && (
            <>
              <TouchableOpacity style={styles.sectionHeader} onPress={toggleWaste}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                  Waste Management
                </Text>
                <MaterialIcons 
                  name={wasteExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={isDarkMode ? theme.text : '#333'} 
                />
              </TouchableOpacity>
              
              <Animated.View style={[styles.collapsibleContent, {
                maxHeight: wasteAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400]
                }),
                opacity: wasteAnimation
              }]}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="delete" size={20} color="#4CAF50" />
                  <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                    {profile.wasteDetails.waste_generated_kg_per_week} kg/week
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="category" size={20} color="#4CAF50" />
                  <View style={styles.wasteTypesContainer}>
                    {profile.wasteDetails.waste_types.map((type, index) => (
                      <View key={index} style={styles.wasteTypeTag}>
                        <Text style={styles.wasteTypeText}>{type}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="schedule" size={20} color="#4CAF50" />
                  <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                    Preferred Collection: {profile.wasteDetails.collection_frequency_preference || 'Not specified'}
                  </Text>
                </View>
                
                {profile.wasteDetails.current_disposal_method && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="eco" size={20} color="#4CAF50" />
                    <Text style={[styles.detailText, { color: isDarkMode ? theme.text : '#333' }]}>
                      Current Disposal: {profile.wasteDetails.current_disposal_method}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </>
          )}
        </View>

        {/* Contracts Card */}
        <View style={[styles.profileCard, { 
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
          marginTop: 16
        }]}>
          <TouchableOpacity style={styles.sectionHeader} onPress={toggleContracts}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? theme.text : '#333' }]}>
              Ongoing Contracts
            </Text>
            <MaterialIcons 
              name={contractsExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color={isDarkMode ? theme.text : '#333'} 
            />
          </TouchableOpacity>
          
          <Animated.View style={[styles.collapsibleContent, {
            maxHeight: contractsAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500]
            }),
            opacity: contractsAnimation
          }]}>
            {loadingContracts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={[styles.loadingText, { color: isDarkMode ? theme.text : '#333' }]}>
                  Loading contracts...
                </Text>
              </View>
            ) : contracts.length > 0 ? (
              contracts.map((contract, index) => (
                <TouchableOpacity 
                  key={contract.id} 
                  style={[styles.contractItem, index < contracts.length - 1 && styles.contractItemBorder]}
                  onPress={() => handleViewContract(contract.id)}
                >
                  <View style={styles.contractHeader}>
                    <View style={styles.contractAgencyInfo}>
                      <MaterialCommunityIcons name="truck-delivery" size={20} color="#4CAF50" />
                      <Text style={[styles.contractAgencyName, { color: isDarkMode ? theme.text : '#333' }]}>
                        {contract.agency?.name || 'Unknown Agency'}
                      </Text>
                    </View>
                    <View style={[styles.contractStatusBadge, { 
                      backgroundColor: getStatusColor(contract.status).bgColor 
                    }]}>
                      <Text style={styles.contractStatusText}>
                        {formatContractStatus(contract.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.contractDetails}>
                    <Text style={[styles.contractTitle, { color: isDarkMode ? theme.text : '#333' }]}>
                      {contract.title || 'Waste Collection Contract'}
                    </Text>
                    <Text style={[styles.contractDate, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                      Created: {new Date(contract.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="description" size={48} color="#E0E0E0" />
                <Text style={[styles.emptyStateText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                  No active contracts found
                </Text>
                <TouchableOpacity 
                  style={styles.findAgencyButton}
                  onPress={handleViewAgencies}
                >
                  <Text style={styles.findAgencyButtonText}>Find Collection Agencies</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
        
        {/* Subscription Status Card */}
        <View style={[styles.subscriptionCard, { 
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
          borderColor: subscriptionStatus?.isActive ? '#4CAF50' : '#f44336'
        }]}>
          <View style={styles.subscriptionHeader}>
            <MaterialIcons 
              name={subscriptionStatus?.isActive ? "verified" : "error-outline"} 
              size={24} 
              color={subscriptionStatus?.isActive ? "#4CAF50" : "#f44336"} 
            />
            <Text style={[styles.subscriptionTitle, { 
              color: isDarkMode ? theme.text : '#333'
            }]}>
              {subscriptionStatus?.isActive ? 'Active Subscription' : 'No Active Subscription'}
            </Text>
          </View>
          
          {subscriptionStatus?.isActive ? (
            <View style={styles.subscriptionDetails}>
              <Text style={[styles.subscriptionPlan, { color: isDarkMode ? theme.text : '#333' }]}>
                Plan: {subscriptionStatus.plan}
              </Text>
              <Text style={[styles.subscriptionExpiry, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                Expires: {subscriptionStatus.expiryDate}
              </Text>
            </View>
          ) : (
            <Text style={[styles.subscriptionMessage, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              Subscribe to a collection service to manage your waste efficiently.
            </Text>
          )}
          
          <TouchableOpacity 
            style={[styles.subscriptionButton, { 
              backgroundColor: subscriptionStatus?.isActive ? '#4CAF50' : '#f44336'
            }]}
            onPress={subscriptionStatus?.isActive ? handleViewSubscriptions : handleViewAgencies}
          >
            <Text style={styles.subscriptionButtonText}>
              {subscriptionStatus?.isActive ? 'Manage Subscription' : 'Find Collection Agency'}
            </Text>
            <MaterialIcons 
              name={subscriptionStatus?.isActive ? "settings" : "search"} 
              size={18} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleEditProfile}
          >
            <MaterialIcons name="edit" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={handleViewAgencies}
          >
            <MaterialIcons name="local-shipping" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>View Agencies</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  businessIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  detailsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  wasteTypesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 12,
  },
  wasteTypeTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  wasteTypeText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  subscriptionCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  subscriptionDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subscriptionPlan: {
    fontSize: 14,
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionMessage: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 14,
    color: '#666',
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  subscriptionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BusinessProfileDetailScreen;
