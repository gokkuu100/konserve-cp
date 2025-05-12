import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/config/supabaseConfig';
import MarketChatManager from '../supabase/manager/marketplace/MarketChatManager';
import { useTheme } from '../ThemeContext';
import { formatTimeAgo } from '../utils/timeUtils';

const MarketMessagesInbox = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch conversations for the current user
  const fetchConversations = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const conversationsData = await MarketChatManager.getUserConversations(user.id);
      console.log('Fetched conversations:', conversationsData.length);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages in marketplace_chats table
    const subscription = supabase
      .channel('marketplace_chats_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_chats',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        console.log('New message received, refreshing conversations');
        fetchConversations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Navigate to direct chat with a buyer
  const openDirectChat = (buyer) => {
    console.log('Opening direct chat with buyer:', buyer);
    
    navigation.navigate('MarketDirectChat', { 
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerLogo: buyer.logo
    });
  };

  // Render a conversation item
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.conversationItem,
        { 
          borderBottomColor: isDarkMode ? '#333' : '#f0f0f0',
          backgroundColor: isDarkMode ? theme.cardBackground : '#fff'
        }
      ]}
      onPress={() => openDirectChat(item.buyer)}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: item.buyer.logo }} 
          style={styles.avatar} 
        />
        {item.unreadCount > 0 && (
          <View style={[
            styles.badgeContainer,
            { backgroundColor: theme.primary || '#4CAF50' }
          ]}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[
            styles.buyerName,
            { color: isDarkMode ? theme.text : '#333' }
          ]}>{item.buyer.name}</Text>
          <Text style={[
            styles.timestamp,
            { color: isDarkMode ? '#888' : '#999' }
          ]}>
            {formatTimeAgo(item.lastMessage.created_at)}
          </Text>
        </View>
        <View style={styles.messagePreviewContainer}>
          {item.lastMessage.is_image ? (
            <View style={styles.imagePreview}>
              <Ionicons name="image-outline" size={16} color={theme.primary || '#4CAF50'} />
              <Text style={[
                styles.messagePreview,
                { color: isDarkMode ? theme.textSecondary : '#666' }
              ]}>Photo</Text>
            </View>
          ) : (
            <Text 
              style={[
                styles.messagePreview,
                { color: isDarkMode ? theme.textSecondary : '#666' }
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.lastMessage.message}
            </Text>
          )}
          {item.unreadCount > 0 && (
            <View style={[
              styles.dotIndicator,
              { backgroundColor: theme.primary || '#4CAF50' }
            ]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Enhanced header component
  const renderHeader = () => (
    <View style={[
      styles.header,
      { backgroundColor: isDarkMode ? theme.cardBackground : '#fff' }
    ]}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name="chevron-back" size={28} color={isDarkMode ? theme.text : '#333'} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? theme.text : '#333' }
          ]}>Inbox</Text>
          <Text style={[
            styles.headerSubtitle,
            { color: isDarkMode ? theme.textSecondary : '#666' }
          ]}>
            {loading ? 'Loading conversations...' : 
              conversations.length > 0 ? 
                `${conversations.length} conversations` : 'No conversations yet'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.searchButton}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name="search" size={24} color={theme.primary || '#4CAF50'} />
        </TouchableOpacity>
      </View>
      
      <View style={[
        styles.headerDivider,
        { backgroundColor: isDarkMode ? '#333' : '#f0f0f0' }
      ]} />
    </View>
  );

  // Main render
  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? theme.background : '#fff' }
    ]}>
      {renderHeader()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary || '#4CAF50'} />
          <Text style={[
            styles.loadingText,
            { color: isDarkMode ? theme.textSecondary : '#666' }
          ]}>Loading conversations...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color={isDarkMode ? '#444' : '#DDD'} />
          <Text style={[
            styles.emptyText,
            { color: isDarkMode ? theme.text : '#333' }
          ]}>No conversations yet</Text>
          <Text style={[
            styles.emptySubText,
            { color: isDarkMode ? theme.textSecondary : '#666' }
          ]}>
            Start chatting with waste buyers in the marketplace
          </Text>
          <TouchableOpacity 
            style={[
              styles.browseButton,
              { backgroundColor: theme.primary || '#4CAF50' }
            ]}
            onPress={() => navigation.navigate('WasteMarketplace')}
          >
            <Text style={styles.browseButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.conversationList,
            { backgroundColor: isDarkMode ? theme.background : '#fff' }
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    width: '100%',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  conversationList: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
});

export default MarketMessagesInbox;