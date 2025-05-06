import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import OrganizationMessagesManager from '../supabase/manager/organizations/OrganizationMessagesManager';

// Helper function to format time
function formatTime(timeString) {
  if (!timeString) return '';
  
  // Parse the timeString which might be in format like "08:00:00"
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
  const formattedMinutes = m < 10 ? `0${m}` : m;
  
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Helper function to format date from ISO string
function formatDate(dateString) {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy • h:mm a');
  } catch (error) {
    console.log('Error formatting date:', error);
    return dateString;
  }
}

// Helper function to get message type icon
const getMessageTypeIcon = (type) => {
  switch(type) {
    case 'event':
      return <Ionicons name="calendar" size={20} color="#357002" />;
    case 'announcement':
      return <Ionicons name="megaphone" size={20} color="#357002" />;
    case 'alert':
      return <Ionicons name="warning" size={20} color="#FF9800" />;
    default:
      return <Ionicons name="mail" size={20} color="#357002" />;
  }
};

// Message Detail Component
const MessageDetailView = ({ message, visible, onClose, messageType }) => {
  if (!message) return null;
  
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.conversationHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color="#357002" />
          </TouchableOpacity>
          <Text style={styles.conversationTitle}>{message.org_shortname}</Text>
          <Text style={styles.messageTypeLabel}>
            {messageType === 'broadcast' ? 'Broadcast' : 'Direct'}
          </Text>
        </View>
        
        <View style={styles.messageDetailContainer}>
          <View style={styles.messageDetailHeader}>
            {message.orgLogo ? (
              <Image 
                source={{ uri: message.orgLogo }} 
                style={styles.detailOrgAvatar} 
                defaultSource={require('../assets/resized.jpg')}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {message.orgName?.charAt(0)?.toUpperCase() || 'O'}
                </Text>
              </View>
            )}
            <View style={styles.messageDetailHeaderText}>
              <Text style={styles.detailOrgName}>{message.orgName}</Text>
              <Text style={styles.detailTimestamp}>{formatDate(message.timestamp)}</Text>
            </View>
            <View style={styles.detailTypeIconContainer}>
              {getMessageTypeIcon(message.type)}
            </View>
          </View>
          
          <Text style={styles.detailMessageTitle}>{message.title}</Text>
          <View style={styles.messageBubble}>
            <Text style={styles.detailMessageContent}>{message.message}</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const OrgMessageScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageDetailVisible, setMessageDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'broadcast'
  const [selectedMessageType, setSelectedMessageType] = useState('direct');
  const { user, userId, isAuthenticated, loading } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication
    if (!loading && !isAuthenticated) {
      navigation.replace('Login');
      return;
    }
    
    // Load messages based on active tab
    fetchMessages();
  }, [isAuthenticated, loading, activeTab]);

  useEffect(() => {
    // Define a global refresh function that can be called from notification handlers
    global.refreshOrgMessages = fetchMessages;
    
    return () => {
      // Clean up
      global.refreshOrgMessages = null;
    };
  }, [fetchMessages]);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (activeTab === 'direct') {
        // Fetch direct messages for the current user
        result = await OrganizationMessagesManager.fetchDirectMessages(userId);
      } else {
        // Fetch broadcast messages
        result = await OrganizationMessagesManager.fetchBroadcastMessages();
      }
      
      const { data, error } = result;
      
      if (error) {
        console.error('Error fetching messages:', error);
        setError(error.message || 'Failed to load messages');
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const markAsRead = async (messageId) => {
    if (activeTab === 'direct') {
      try {
        const { success, error } = await OrganizationMessagesManager.markDirectMessageAsRead(messageId);
        
        if (success) {
          // Update the local message state to reflect the change
          setMessages(messages.map(msg => 
            msg.id === messageId ? {...msg, isRead: true} : msg
          ));
        } else {
          console.error('Error marking message as read:', error);
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
    // We don't need to mark broadcast messages as read
  };

  const handleMessagePress = (message) => {
    // Mark direct messages as read when opened
    if (activeTab === 'direct' && !message.isRead) {
      markAsRead(message.id);
    }
    
    setSelectedMessage(message);
    setSelectedMessageType(activeTab);
    setMessageDetailVisible(true);
  };

  const closeMessageDetail = () => {
    setMessageDetailVisible(false);
  };

  const renderMessage = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.messageItem, 
        activeTab === 'direct' && !item.isRead && styles.unreadMessage
      ]}
      onPress={() => handleMessagePress(item)}
    >
      <View style={styles.messageHeader}>
        {item.orgLogo ? (
          <Image 
            source={{ uri: item.orgLogo }} 
            style={styles.orgAvatar} 
            defaultSource={require('../assets/resized.jpg')}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.orgName?.charAt(0)?.toUpperCase() || 'O'}
            </Text>
          </View>
        )}
        <View style={styles.messageHeaderText}>
          <Text style={styles.orgName}>{item.orgName}</Text>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={styles.typeIconContainer}>
          {getMessageTypeIcon(item.type)}
        </View>
      </View>
      
      <Text style={styles.messageTitle}>{item.title}</Text>
      <Text style={styles.messageContent} numberOfLines={3}>
        {item.message}
      </Text>
      
      {activeTab === 'direct' && !item.isRead && <View style={styles.unreadIndicator} />}

      {activeTab === 'broadcast' && (
        <View style={styles.broadcastBadge}>
          <Text style={styles.broadcastText}>Broadcast</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Messages</Text>
      </View>

      {/* Message type tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>
            Direct
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'broadcast' && styles.activeTab]}
          onPress={() => setActiveTab('broadcast')}
        >
          <Text style={[styles.tabText, activeTab === 'broadcast' && styles.activeTabText]}>
            Broadcast
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#357002" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#357002"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                No {activeTab === 'direct' ? 'direct' : 'broadcast'} messages yet
              </Text>
            </View>
          }
        />
      )}

      {/* Message Detail Modal */}
      <MessageDetailView 
        message={selectedMessage}
        visible={messageDetailVisible}
        onClose={closeMessageDetail}
        messageType={selectedMessageType}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#357002',
  },
  tabText: {
    fontSize: 16,
    color: '#777',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#357002',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#357002',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  messageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  unreadMessage: {
    backgroundColor: '#f0f9f0',
    borderColor: '#e0e7e0',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#357002',
  },
  messageHeaderText: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  typeIconContainer: {
    padding: 8,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#357002',
  },
  broadcastBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  broadcastText: {
    fontSize: 12,
    color: '#357002',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  // Message Detail Styles
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  messageTypeLabel: {
    fontSize: 14,
    color: '#357002',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  messageDetailContainer: {
    padding: 16,
  },
  messageDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailOrgAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  messageDetailHeaderText: {
    flex: 1,
  },
  detailOrgName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailTimestamp: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  detailTypeIconContainer: {
    padding: 8,
  },
  detailMessageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  messageBubble: {
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  detailMessageContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  }
});

export default OrgMessageScreen;