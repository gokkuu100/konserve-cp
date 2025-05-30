import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  ActivityIndicator, SafeAreaView, Dimensions, Image
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';

const { width, height } = Dimensions.get('window');

const BusinessProfilesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userProfiles = await BusinessProfileManager.getBusinessProfilesByUserId(user.id);
      setProfiles(userProfiles);
    } catch (error) {
      console.error('Error loading business profiles:', error);
      Alert.alert('Error', 'Failed to load your business profiles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    
    // Refresh profiles when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfiles();
    });
    
    return unsubscribe;
  }, [navigation, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfiles();
  };

  const handleCreateProfile = () => {
    navigation.navigate('BusinessProfileCreationScreen');
  };

  const handleViewProfile = (profile) => {
    // Navigate to BusinessProfileDetailScreen with the selected profile
    navigation.navigate('BusinessProfileDetailScreen', { profileId: profile.id });
  };

  const handleEditProfile = (profile) => {
    // Navigate to profile edit screen (to be implemented)
    navigation.navigate('BusinessProfileEditScreen', { profileId: profile.id });
  };

  const handleDeleteProfile = async (profileId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this business profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await BusinessProfileManager.deleteBusinessProfile(profileId);
              // Refresh the list after deletion
              loadProfiles();
              Alert.alert('Success', 'Business profile deleted successfully');
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete business profile. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderProfileItem = ({ item }) => {
    const wasteTypes = item.wasteDetails?.waste_types || [];
    const wasteTypesText = wasteTypes.length > 0 
      ? wasteTypes.slice(0, 2).join(', ') + (wasteTypes.length > 2 ? '...' : '')
      : 'No waste types specified';
    
    // Check if there's an active subscription (placeholder logic)
    const hasActiveSubscription = false;
    
    return (
      <TouchableOpacity
        style={[
          styles.profileCard,
          { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
          }
        ]}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileIconContainer}>
            <MaterialIcons name="business" size={24} color="#4CAF50" />
          </View>
          <View style={styles.profileTitleContainer}>
            <Text style={[styles.profileName, { color: isDarkMode ? theme.text : '#333' }]}>
              {item.business_name}
            </Text>
            <Text style={[styles.profileType, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.business_type}
            </Text>
          </View>
          {hasActiveSubscription && (
            <View style={styles.subscriptionBadge}>
              <MaterialIcons name="verified" size={16} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.profileInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#4CAF50" />
            <Text style={[styles.infoText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.business_constituency}, {item.business_county}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="delete" size={16} color="#4CAF50" />
            <Text style={[styles.infoText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {wasteTypesText}
            </Text>
          </View>
          
          {item.wasteDetails?.waste_generated_kg_per_week && (
            <View style={styles.infoRow}>
              <MaterialIcons name="scale" size={16} color="#4CAF50" />
              <Text style={[styles.infoText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
                {item.wasteDetails.waste_generated_kg_per_week} kg/week
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { 
              backgroundColor: hasActiveSubscription ? '#4CAF50' : '#FF9800' 
            }]} />
            <Text style={[styles.statusText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {hasActiveSubscription ? 'Active Subscription' : 'No Active Subscription'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => handleViewProfile(item)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialIcons name="chevron-right" size={16} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons 
        name="business" 
        size={64} 
        color={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
        You don't have any business profiles yet
      </Text>
      <Text style={[styles.emptyText, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
        Create a profile to find collection agencies for your business
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateProfile}
      >
        <MaterialIcons name="add" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Business Profile</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? theme.background : '#fff' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
          Loading your business profiles...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('CollectionTypeSelectionScreen')}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {
          color: isDarkMode ? theme.text : '#333'
        }]}>Your Business Profiles</Text>
        <TouchableOpacity
          style={styles.inboxButton}
          onPress={() => navigation.navigate('MarketInbox')}
        >
          <Ionicons name="mail-outline" size={24} color={isDarkMode ? theme.text : "#333"} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={handleCreateProfile}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
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
  inboxButton: {
    padding: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80
  },
  emptyIcon: {
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 8
  },
  profileCard: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileTitleContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  profileType: {
    fontSize: 14
  },
  subscriptionBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  profileInfo: {
    padding: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    marginBottom: 24
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});

export default BusinessProfilesScreen;
