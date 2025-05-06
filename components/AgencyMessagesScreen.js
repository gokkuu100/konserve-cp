import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AgencyMessageManager from '../supabase/manager/messaging/AgencyMessageManager';
import { useTheme } from '../ThemeContext';

const AgencyMessagesScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'direct', or 'broadcast'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [subscribedAgencies, setSubscribedAgencies] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const { user, userId, isAuthenticated, loading } = useAuth();
  const [agencyDropdownVisible, setAgencyDropdownVisible] = useState(false);
  
  useEffect(() => {
    checkSubscriptionsAndLoadMessages();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    // Define a global refresh function that can be called from notification handlers
    global.refreshAgencyMessages = checkSubscriptionsAndLoadMessages;
    
    return () => {
      // Clean up
      global.refreshAgencyMessages = null;
    };
  }, [checkSubscriptionsAndLoadMessages]);

  // Load subscriptions and then messages - modified to start with a specific agency
  const checkSubscriptionsAndLoadMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First check if user has active subscriptions
      const { result: hasSubscriptions, agencies, error: subError } = 
        await AgencyMessageManager.getActiveSubscriptions(userId);
        
      if (subError) {
        setError('Failed to verify your subscription status');
        return;
      }
      
      if (!hasSubscriptions) {
        setError('You need an active subscription to view messages');
        return;
      }
      
      setSubscribedAgencies(agencies);
      
      // Always select the first agency by default instead of loading all messages
      if (agencies.length > 0) {
        setSelectedAgency(agencies[0].id);
        await loadAgencyMessages(agencies[0].id);
      } else {
        // Only load all messages if there are no agencies (shouldn't happen)
        await loadAllMessages();
      }
    } catch (err) {
      console.error('Error in checkSubscriptionsAndLoadMessages:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load all messages for the user
  const loadAllMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: messagesData, error: messagesError } = 
        await AgencyMessageManager.fetchAllMessages(userId);
      
      if (messagesError) {
        setError(messagesError.message || 'Failed to load messages');
        return;
      }
      
      setMessages(messagesData || []);
    } catch (err) {
      console.error('Error in loadAllMessages:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load messages for a specific agency
  const loadAgencyMessages = async (agencyId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: messagesData, error: messagesError } = 
        await AgencyMessageManager.fetchAgencyMessages(userId, agencyId);
      
      if (messagesError) {
        setError(messagesError.message || 'Failed to load messages');
        return;
      }
      
      setMessages(messagesData || []);
    } catch (err) {
      console.error('Error in loadAgencyMessages:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkSubscriptionsAndLoadMessages();
  }, [selectedAgency]);

  // Handle agency selection
  const handleAgencyChange = (agencyId) => {
    setSelectedAgency(agencyId);
    loadAgencyMessages(agencyId);
  };

  // Render agency selector - modified to make dropdown scrollable
  const renderAgencySelector = () => {
    if (!subscribedAgencies || subscribedAgencies.length <= 0) return null;
    
    // Find the selected agency object
    const selectedAgencyObj = subscribedAgencies.find(a => a.id === selectedAgency) || subscribedAgencies[0];
    
    return (
      <View style={[styles.agencySelector, isDarkMode && styles.agencySelectorDark]}>
        <TouchableOpacity 
          style={[styles.dropdownButton, isDarkMode && styles.dropdownButtonDark]}
          onPress={() => setAgencyDropdownVisible(true)}
        >
          <View style={styles.selectedAgencyContainer}>
            {selectedAgencyObj.logo_url ? (
              <Image source={{ uri: selectedAgencyObj.logo_url }} style={styles.agencyLogoSmall} />
            ) : (
              <View style={styles.agencyLogoPlaceholder}>
                <Text style={styles.agencyLogoInitial}>{selectedAgencyObj.name.charAt(0)}</Text>
              </View>
            )}
            <Text style={[styles.selectedAgencyText, isDarkMode && styles.textDark]} numberOfLines={1}>
              {selectedAgencyObj.name}
            </Text>
          </View>
          <AntDesign 
            name="caretdown" 
            size={12} 
            color={isDarkMode ? "#BDBDBD" : "#6B7280"} 
          />
        </TouchableOpacity>
        
        <Modal
          animationType="fade"
          transparent={true}
          visible={agencyDropdownVisible}
          onRequestClose={() => setAgencyDropdownVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setAgencyDropdownVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.dropdownContent, isDarkMode && styles.dropdownContentDark]}>
                <ScrollView>
                  <TouchableOpacity 
                    style={[styles.dropdownItem, isDarkMode && styles.dropdownItemDark]}
                    onPress={() => {
                      setSelectedAgency(null);
                      loadAllMessages();
                      setAgencyDropdownVisible(false);
                    }}
                  >
                    <View style={styles.allAgenciesIcon}>
                      <Ionicons name="layers-outline" size={24} color="#4CAF50" />
                    </View>
                    <Text style={[styles.dropdownItemText, !selectedAgency && styles.activeDropdownItemText, isDarkMode && styles.textDark]}>
                      All Agencies
                    </Text>
                    {!selectedAgency && (
                      <AntDesign name="check" size={16} color="#4CAF50" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                  
                  {subscribedAgencies.map(agency => (
                    <TouchableOpacity 
                      key={`agency-${agency.id}`}
                      style={[styles.dropdownItem, isDarkMode && styles.dropdownItemDark]}
                      onPress={() => {
                        setSelectedAgency(agency.id);
                        loadAgencyMessages(agency.id);
                        setAgencyDropdownVisible(false);
                      }}
                    >
                      {agency.logo_url ? (
                        <Image source={{ uri: agency.logo_url }} style={styles.agencyLogo} />
                      ) : (
                        <View style={styles.agencyLogoPlaceholder}>
                          <Text style={styles.agencyLogoInitial}>{agency.name.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={[
                        styles.dropdownItemText, 
                        selectedAgency === agency.id && styles.activeDropdownItemText,
                        isDarkMode && styles.textDark
                      ]}>
                        {agency.name}
                      </Text>
                      {selectedAgency === agency.id && (
                        <AntDesign name="check" size={16} color="#4CAF50" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week - show day name
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    } else {
      // Older - show date
      return date.toLocaleDateString();
    }
  };

  // Mark a message as read
  const markAsRead = async (messageId) => {
    try {
      const { success, error } = await AgencyMessageManager.markMessageAsRead(messageId);
      
      if (success) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      } else {
        console.error('Error marking message as read:', error);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Handle message tap
  const handleMessagePress = async (message) => {
    try {
      // Only mark direct messages as read if they're not already read
      if (message.message_source === 'direct' && !message.is_read) {
        const { success } = await AgencyMessageManager.markMessageAsRead(message.id);
        
        if (success) {
          // Update the message in the local state
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === message.id ? { ...msg, is_read: true } : msg
            )
          );
        }
    }
    
    // Navigate to message details
    navigation.navigate('AgencyMessageDetail', { message });
    } catch (error) {
      console.error('Error handling message press:', error);
    }
  };

  // Filter messages based on active tab and search query
  const filteredMessages = messages.filter(message => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'direct' && message.message_source === 'direct') ||
      (activeTab === 'broadcast' && message.message_source === 'broadcast');
    
    const matchesSearch = 
      !searchQuery || 
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.agency_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Render a message item
  const renderMessageItem = ({ item }) => {
    const isUnread = !item.is_read;
    
    return (
      <TouchableOpacity
        style={[
          styles.messageItem,
          isUnread && styles.unreadItem,
          isDarkMode && styles.messageItemDark
        ]}
        onPress={() => handleMessagePress(item)}
      >
        <View style={styles.avatarContainer}>
          {item.agency_logo ? (
            <Image source={{ uri: item.agency_logo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isDarkMode && styles.avatarPlaceholderDark]}>
              <Text style={styles.avatarInitial}>
                {item.agency_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isUnread && <View style={styles.unreadBadge} />}
        </View>
        
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text 
              style={[
                styles.agencyName, 
                isUnread && styles.unreadText,
                isDarkMode && styles.textDark
              ]}
              numberOfLines={1}
            >
              {item.agency_name}
            </Text>
            <Text style={[styles.timestamp, isDarkMode && styles.textDarkSecondary]}>
              {formatTimestamp(item.created_at)}
            </Text>
          </View>
          
          <Text 
            style={[
              styles.messageSubject, 
              isUnread && styles.unreadText,
              isDarkMode && styles.textDark
            ]}
            numberOfLines={1}
          >
            {item.subject}
          </Text>
          
          <Text 
            style={[
              styles.messagePreview,
              isDarkMode && styles.textDarkSecondary
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          
          <View style={styles.messageTags}>
          {item.message_source === 'broadcast' && (
            <View style={styles.broadcastBadge}>
              <Text style={styles.broadcastText}>Broadcast</Text>
            </View>
          )}
            
            {item.message_source === 'direct' && (
              <View style={styles.directBadge}>
                <Text style={styles.directText}>Direct</Text>
              </View>
            )}
            
            {item.message_type !== 'general' && (
              <View style={[
                styles.typeBadge,
                item.message_type === 'announcement' && styles.announcementBadge,
                item.message_type === 'alert' && styles.alertBadge,
                item.message_type === 'event' && styles.eventBadge,
              ]}>
                <Text style={styles.typeText}>
                  {item.message_type.charAt(0).toUpperCase() + item.message_type.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF5252" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={checkSubscriptionsAndLoadMessages}
          >
            <Text style={styles.refreshButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (!isLoading && messages.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={64} color="#BDBDBD" />
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            You don't have any messages yet
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? "#FFFFFF" : "#333333"} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>Agency Messages</Text>
      </View>
      
      {renderAgencySelector()}
      
      <View style={[styles.tabContainer, isDarkMode && styles.tabContainerDark]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'all' && styles.activeTab
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'all' && styles.activeTabText,
              isDarkMode && styles.textDark
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'direct' && styles.activeTab
          ]}
          onPress={() => setActiveTab('direct')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'direct' && styles.activeTabText,
              isDarkMode && styles.textDark
            ]}
          >
            Direct
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'broadcast' && styles.activeTab
          ]}
          onPress={() => setActiveTab('broadcast')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'broadcast' && styles.activeTabText,
              isDarkMode && styles.textDark
            ]}
          >
            Broadcast
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isDarkMode ? "#BDBDBD" : "#6B7280"} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
          placeholder="Search messages..."
          placeholderTextColor={isDarkMode ? "#BDBDBD" : "#6B7280"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={[styles.loadingText, isDarkMode && styles.textDark]}>
            Loading messages...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessageItem}
          keyExtractor={item => item._uniqueId || `message-${item.message_source}-${item.id}`}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4CAF50"]}
              tintColor={isDarkMode ? "#FFFFFF" : "#4CAF50"}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// Message Detail Screen
const MessageDetailScreen = ({ route, navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { message } = route.params;
  
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? "#FFFFFF" : "#333333"} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
          {message.agency_name}
        </Text>
      </View>
      
      <ScrollView style={[styles.messageDetailContainer, isDarkMode && styles.messageDetailContainerDark]}>
        <View style={styles.messageMetaContainer}>
          {message.agency_logo ? (
            <Image 
              source={{ uri: message.agency_logo }} 
              style={styles.detailAgencyLogo} 
            />
          ) : (
            <View style={[styles.detailAgencyLogoPlaceholder, isDarkMode && styles.detailAgencyLogoPlaceholderDark]}>
              <Text style={styles.detailAgencyLogoInitial}>
                {message.agency_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.messageMetaInfo}>
            <Text style={[styles.detailAgencyName, isDarkMode && styles.textDark]}>
              {message.agency_name}
            </Text>
            
        <View style={styles.messageTypeContainer}>
          <Text style={[styles.messageType, isDarkMode && styles.textDarkSecondary]}>
            {message.message_source === 'direct' ? 'Direct Message' : 'Broadcast Message'}
          </Text>
          <Text style={[styles.messageDate, isDarkMode && styles.textDarkSecondary]}>
                {new Date(message.created_at).toLocaleDateString()} at {
                  new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                }
          </Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.messageDetailSubject, isDarkMode && styles.textDark]}>
          {message.subject}
        </Text>
        
        <View style={[styles.messageBody, isDarkMode && styles.messageBodyDark]}>
          <Text style={[styles.messageBodyText, isDarkMode && styles.textDark]}>
            {message.message}
          </Text>
        </View>
        
        <View style={styles.messageTags}>
          <View style={[
            styles.typeBadgeLarge,
            message.message_type === 'announcement' && styles.announcementBadge,
            message.message_type === 'alert' && styles.alertBadge,
            message.message_type === 'event' && styles.eventBadge,
            message.message_type === 'general' && styles.generalBadge,
          ]}>
            <Text style={styles.typeBadgeText}>
            {message.message_type.charAt(0).toUpperCase() + message.message_type.slice(1)}
          </Text>
        </View>
          
          <View style={[
            styles.sourceBadge,
            message.message_source === 'direct' ? styles.directBadgeLarge : styles.broadcastBadgeLarge
          ]}>
            <Text style={[
              styles.sourceBadgeText,
              message.message_source === 'direct' ? styles.directText : styles.broadcastText
            ]}>
              {message.message_source.charAt(0).toUpperCase() + message.message_source.slice(1)}
            </Text>
      </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainerDark: {
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchContainerDark: {
    backgroundColor: '#333333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  searchInputDark: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  messagesList: {
    flexGrow: 1,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  messageItemDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333333',
  },
  unreadItem: {
    backgroundColor: '#F0F9F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderDark: {
    backgroundColor: '#2E7D32',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  broadcastBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  broadcastText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  messageDetailContainer: {
    flex: 1,
    padding: 16,
  },
  messageDetailContainerDark: {
    backgroundColor: '#121212',
  },
  messageMetaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  detailAgencyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  detailAgencyLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailAgencyLogoPlaceholderDark: {
    backgroundColor: '#2E7D32',
  },
  detailAgencyLogoInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  messageMetaInfo: {
    flex: 1,
  },
  detailAgencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  messageTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  messageDetailSubject: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  messageBody: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  messageBodyDark: {
    backgroundColor: '#2A2A2A',
  },
  messageBodyText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  messageTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: '#F5F5F5',
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  directBadgeLarge: {
    backgroundColor: '#E8F0FE',
  },
  broadcastBadgeLarge: {
    backgroundColor: '#E8F5E9',
  },
  generalBadge: {
    backgroundColor: '#F5F5F5',
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  sourceBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textDarkSecondary: {
    color: '#BDBDBD',
  },
  agencySelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  agencySelectorDark: {
    borderBottomColor: '#333333',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownButtonDark: {
    backgroundColor: '#333333',
    borderColor: '#4B5563',
  },
  selectedAgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedAgencyText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  agencyLogoSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdownContent: {
    width: '90%',
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownContentDark: {
    backgroundColor: '#1E1E1E',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemDark: {
    borderBottomColor: '#333333',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  activeDropdownItemText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  allAgenciesIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageTags: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  directBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  directText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  announcementBadge: {
    backgroundColor: '#E8F5E9',
  },
  alertBadge: {
    backgroundColor: '#FFEBEE',
  },
  eventBadge: {
    backgroundColor: '#E3F2FD',
  },
  typeText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500',
  },
});

export { MessageDetailScreen as MessageDetails, AgencyMessagesScreen as Messages };
