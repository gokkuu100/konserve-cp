import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Messages = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'broadcast'
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    // Fetch conversations from your Supabase database
    // This would be replaced with actual API calls
    const fetchData = async () => {
      // Simulate API delay
      setTimeout(() => {
        setConversations([
          {
            id: '1',
            agencyId: '101',
            agencyName: 'EcoWaste Solutions',
            agencyAvatar: require('../assets/resized.jpg'),
            lastMessage: 'Your next collection is scheduled for tomorrow at 9 AM.',
            timestamp: '10:30 AM',
            unreadCount: 3,
            type: 'direct'
          },
          {
            id: '2',
            agencyId: '102',
            agencyName: 'Green Earth Recycling',
            agencyAvatar: require('../assets/resized.jpg'),
            lastMessage: 'Thank you for separating your recyclables!',
            timestamp: 'Yesterday',
            unreadCount: 0,
            type: 'direct'
          },
          {
            id: '3',
            agencyId: '103',
            agencyName: 'Nairobi Waste Management',
            agencyAvatar: require('../assets/resized.jpg'),
            lastMessage: 'Service update: We\'ve expanded our collection routes.',
            timestamp: 'Apr 12',
            unreadCount: 1,
            type: 'broadcast'
          },
          {
            id: '4',
            agencyId: '104',
            agencyName: 'EcoWaste Solutions',
            agencyAvatar: require('../assets/resized.jpg'),
            lastMessage: 'Holiday Schedule: No collections on April 20.',
            timestamp: 'Apr 10',
            unreadCount: 0,
            type: 'broadcast'
          }
        ]);
        setIsLoading(false);
      }, 1000);
    };

    fetchData();
  }, []);

  const filteredConversations = conversations
    .filter(conversation => conversation.type === activeTab)
    .filter(conversation => 
      conversation.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('MessageDetails', { conversationId: item.id, agencyName: item.agencyName })}
    >
      <View style={styles.avatarContainer}>
        <Image source={item.agencyAvatar} style={styles.avatar} />
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.agencyName}>{item.agencyName}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text 
          style={[
            styles.lastMessage, 
            item.unreadCount > 0 && styles.unreadMessage
          ]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.notificationIconContainer}>
          <Ionicons name="mail-outline" size={24} color="#2E7D32" />
          {conversations.some(c => c.unreadCount > 0) && (
            <View style={styles.notificationDot} />
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'direct' && styles.activeTab
          ]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'direct' && styles.activeTabText
          ]}>Direct Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'broadcast' && styles.activeTab
          ]}
          onPress={() => setActiveTab('broadcast')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'broadcast' && styles.activeTabText
          ]}>Broadcast Updates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages"
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../assets/empty-archive.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>No {activeTab === 'direct' ? 'direct messages' : 'broadcast updates'} yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Message Details Screen to display all messages in a conversation
const MessageDetails = ({ route, navigation }) => {
  const { conversationId, agencyName } = route.params;
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch messages for this conversation
    const fetchMessages = async () => {
      // Simulate API delay
      setTimeout(() => {
        setMessages([
          {
            id: '1',
            text: 'Hello! We\'ve scheduled your waste collection for tomorrow at 9 AM.',
            timestamp: '10:30 AM',
            isRead: true
          },
          {
            id: '2',
            text: 'Could you please ensure your waste is properly sorted and placed outside your premises by that time?',
            timestamp: '10:31 AM',
            isRead: true
          },
          {
            id: '3',
            text: 'Our collection team will arrive between 9 AM and 11 AM.',
            timestamp: '10:32 AM',
            isRead: true
          },
          {
            id: '4',
            text: 'Thank you for using our services! If you need to reschedule, please contact our customer service at 123-456-7890.',
            timestamp: '10:33 AM',
            isRead: false
          }
        ]);
        setIsLoading(false);
      }, 800);
    };

    fetchMessages();
    
    // Mark messages as read when opening the conversation
    // This would be an API call to update read status in the database
  }, [conversationId]);

  const renderMessageItem = ({ item }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{item.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTimestamp}>{item.timestamp}</Text>
        </View>
      </View>
      {!item.isRead && (
        <View style={styles.unreadDot} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.conversationHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.conversationTitle}>{agencyName}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  notificationIconContainer: {
    position: 'relative',
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D32',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2E7D32',
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Message Details Screen Styles
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  messageBubble: {
    backgroundColor: '#F0F9F0', // Light green background for messages
    borderRadius: 12,
    borderTopLeftRadius: 4,
    padding: 12,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
  },
  messageFooter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E7D32',
    marginLeft: 8,
  }
});

export { Messages, MessageDetails };