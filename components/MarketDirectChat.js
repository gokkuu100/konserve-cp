import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/config/supabaseConfig';
import MarketChatManager from '../supabase/manager/marketplace/MarketChatManager';
import { formatTimeAgo } from '../utils/timeUtils';

const MarketDirectChat = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { buyerId, buyerName, buyerLogo } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef(null);

  // Add a debug log to verify the buyer info being passed
  useEffect(() => {
    console.log('MarketDirectChat - Buyer info:', { buyerId, buyerName, buyerLogo });
  }, [buyerId, buyerName, buyerLogo]);

  // Fetch conversation history
  const fetchMessages = async () => {
    try {
      if (!user || !buyerId) return;

      const messagesData = await MarketChatManager.getConversationMessages(user.id, buyerId);
      console.log(`Fetched ${messagesData.length} messages`);
      setMessages(messagesData);
      
      // Mark messages as read
      await MarketChatManager.markMessagesAsRead(user.id, buyerId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription
    setupRealtimeSubscription();
    
    return () => {
      // Cleanup subscription on component unmount
      cleanupRealtimeSubscription();
    };
  }, [user, buyerId]);

  // Extract subscription logic to a separate function for better organization
  const setupRealtimeSubscription = () => {
    if (!user || !buyerId) return;

    console.log('Setting up real-time subscription for chat messages');
    
    // Subscribe to ALL changes in marketplace_chats table relating to this conversation
    const subscription = supabase
      .channel('direct_chat_messages')
      .on('postgres_changes', {
        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'marketplace_chats',
        filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${buyerId}),and(sender_id.eq.${buyerId},receiver_id.eq.${user.id}))`
      }, (payload) => {
        console.log('Real-time message event:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          
          // Add the message to state if it doesn't exist already
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) return prev;
            
            console.log('Adding new message to state:', newMessage);
            const updatedMessages = [...prev, newMessage];
            
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            return updatedMessages;
          });
          
          // Mark message as read if it's from the buyer
          if (newMessage.sender_id === buyerId) {
            MarketChatManager.markMessageAsRead(newMessage.id);
          }
        }
      })
      .subscribe();
    
    // Store subscription reference for cleanup
    window.chatSubscription = subscription;
  };
  
  // Cleanup function for the subscription
  const cleanupRealtimeSubscription = () => {
    if (window.chatSubscription) {
      console.log('Cleaning up real-time subscription');
      window.chatSubscription.unsubscribe();
      window.chatSubscription = null;
    }
  };

  // Send a text message with optimistic update
  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || !buyerId) return;
    
    const trimmedMessage = inputMessage.trim();
    setInputMessage(''); // Clear input immediately for better UX
    
    try {
      setSending(true);
      
      // Create message object
      const messageData = {
        sender_id: user.id,
        receiver_id: buyerId,
        message: trimmedMessage,
        is_image: false,
        conversation_id: `${user.id}_${buyerId}`,
      };
      
      // Create optimistic message to show immediately
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: buyerId,
        message: trimmedMessage,
        is_image: false,
        conversation_id: `${user.id}_${buyerId}`,
        created_at: new Date().toISOString(),
        is_read: false,
        _isOptimistic: true // Flag to identify optimistic messages
      };
      
      // Add optimistic message to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Scroll to bottom after adding optimistic message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      
      // Send the actual message to the server
      const sentMessage = await MarketChatManager.sendMessage(messageData);
      console.log('Message sent successfully:', sentMessage);
      
      // Replace optimistic message with actual message
      setMessages(prev => 
        prev.map(msg => 
          msg._isOptimistic && msg.id === optimisticMessage.id ? sentMessage : msg
        )
      );
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Restore the input message if sending failed
      setInputMessage(trimmedMessage);
      
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => !msg._isOptimistic));
    } finally {
      setSending(false);
    }
  };

  // Pick and send an image
  const pickAndSendImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to allow access to your photos to send images.');
        return;
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const selectedImage = result.assets[0];
      await uploadAndSendImage(selectedImage);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload image to Supabase Storage and send message
  const uploadAndSendImage = async (imageFile) => {
    if (!user || !buyerId) return;

    try {
      setUploading(true);

      // Prepare the file
      const fileExt = imageFile.uri.split('.').pop();
      // Generate a unique filename without using the uuid package
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 10000);
      const fileName = `${timestamp}_${random}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Convert uri to blob
      const response = await fetch(imageFile.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('marketchatimages')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('marketchatimages')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Send the message with image URL
      const messageData = {
        sender_id: user.id,
        receiver_id: buyerId,
        message: imageUrl,
        is_image: true,
        conversation_id: `${user.id}_${buyerId}`,
      };

      await MarketChatManager.sendMessage(messageData);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload and send image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Improved message rendering with better bubble UI
  const renderMessageItem = ({ item }) => {
    const isMyMessage = item.sender_id === user?.id;
    const isOptimistic = item._isOptimistic === true;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        {!isMyMessage && (
          <Image
            source={{ uri: buyerLogo }}
            style={styles.messageBubbleAvatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
          item.is_image && styles.imageBubble,
          isOptimistic && styles.optimisticBubble // Add style for optimistic messages
        ]}>
          {item.is_image ? (
            <TouchableOpacity
              onPress={() => {
                // You could add a full-screen image viewer here
                Alert.alert('Image', 'View full image');
              }}
            >
              <Image
                source={{ uri: item.message }}
                style={styles.messageImage}
                resizeMode="cover"
                loadingIndicatorSource={<ActivityIndicator color="#4CAF50" />}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText
            ]}>
              {item.message}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {isOptimistic ? 'Sending...' : formatTimeAgo(item.created_at)}
            </Text>
            {isMyMessage && isOptimistic && (
              <ActivityIndicator 
                size="small" 
                color="#fff" 
                style={styles.sendingIndicator} 
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render the enhanced header with better UI
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
          >
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: buyerLogo || 'https://via.placeholder.com/150' }} 
            style={styles.headerAvatar} 
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {buyerName || 'Chat'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {loading ? 'Loading...' : 
                (messages.length > 0 ? 
                  `${messages.length} messages` : 'Start a conversation')}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.moreButton}
            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.headerProgress}>
        <View style={styles.headerProgressBar}></View>
      </View>
    </View>
  );

  // Add this at the top level of the component
  useEffect(() => {
    // Define a global refresh function that can be called from notification handlers
    global.refreshMarketMessages = fetchMessages;
    
    return () => {
      // Clean up
      global.refreshMarketMessages = null;
    };
  }, [fetchMessages]);

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubText}>
              Start a conversation with {buyerName}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
        
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={pickAndSendImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Ionicons name="image-outline" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  headerProgress: {
    height: 2,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  headerProgressBar: {
    height: '100%',
    width: '0%', // Can be animated based on chat progress or other metrics
    backgroundColor: '#4CAF50',
  },
  chatContainer: {
    flex: 1,
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
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  imageBubble: {
    padding: 6,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
  },
  theirMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  optimisticBubble: {
    opacity: 0.7,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  sendingIndicator: {
    marginLeft: 4,
    height: 10,
    width: 10,
  },
});

export default MarketDirectChat;