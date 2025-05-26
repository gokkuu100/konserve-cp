import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import BusinessProfileManager from '../supabase/manager/business/BusinessProfileManager';

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
    // Navigate to profile details screen (to be implemented)
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
      ? wasteTypes.join(', ') 
      : 'No waste types specified';
    
    return (
      <TouchableOpacity
        style={[
          styles.profileCard,
          { 
            backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
            borderColor: isDarkMode ? '#444' : '#e0e0e0'
          }
        ]}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Text style={[styles.businessName, { color: isDarkMode ? theme.text : '#333' }]}>
              {item.business_name}
            </Text>
            <Text style={[styles.businessType, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.business_type}
            </Text>
            <Text style={[styles.location, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.business_constituency}, {item.business_county}
            </Text>
          </View>
          <View style={[
            styles.businessIcon, 
            { backgroundColor: isDarkMode ? '#333' : '#f5f5f5' }
          ]}>
            <MaterialIcons name="business" size={28} color="#4CAF50" />
          </View>
        </View>
        
        <View style={[
          styles.divider, 
          { backgroundColor: isDarkMode ? '#444' : '#f0f0f0' }
        ]} />
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <MaterialIcons name="people" size={16} color="#4CAF50" />
            <Text style={[styles.detailText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.number_of_employees} employees
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <MaterialIcons name="delete" size={16} color="#4CAF50" />
            <Text style={[styles.detailText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
              {item.wasteDetails?.waste_generated_kg_per_week || 'N/A'} kg/week
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <MaterialIcons name="category" size={16} color="#4CAF50" />
            <Text 
              style={[styles.detailText, { color: isDarkMode ? theme.textSecondary : '#666' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {wasteTypesText}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditProfile(item)}
          >
            <MaterialIcons name="edit" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProfile(item.id)}
          >
            <MaterialIcons name="delete" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.viewAgenciesButton]}
            onPress={() => navigation.navigate('CollectionAgenciesForBusinessScreen', { businessProfileId: item.id })}
          >
            <MaterialIcons name="local-shipping" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>View Agencies</Text>
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
      />
      <Text style={[styles.emptyText, { color: isDarkMode ? theme.textSecondary : '#666' }]}>
        You don't have any business profiles yet
      </Text>
      <Text style={[styles.emptySubtext, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
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
    <View style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#f5f7fa' }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: isDarkMode ? theme.cardBackground : '#fff',
        borderBottomColor: isDarkMode ? '#444' : '#e0e0e0'
      }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? theme.text : '#333' }]}>
            Your Business Profiles
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateProfile}
          >
            <MaterialIcons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333'
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  profileInfo: {
    flex: 1
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  businessType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  location: {
    fontSize: 14,
    color: '#666'
  },
  businessIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0'
  },
  detailsContainer: {
    padding: 16
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500'
  },
  editButton: {
    backgroundColor: '#2196F3'
  },
  deleteButton: {
    backgroundColor: '#F44336'
  },
  viewAgenciesButton: {
    backgroundColor: '#4CAF50'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
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
