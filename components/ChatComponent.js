import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import ProfileManager from '../supabase/manager/auth/ProfileManager';
import MessageManager from '../supabase/manager/messaging/MessageManager';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentMessageIds, setSentMessageIds] = useState(new Set());
  const [userConstituency, setUserConstituency] = useState('');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);
  const navigation = useNavigation();
  const { user, userId, isAuthenticated, signOut } = useAuth();
  
  // Add a state for tracking unread messages
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Track when the component is focused
  useFocusEffect(
    React.useCallback(() => {
      // This runs when the screen comes into focus
      console.log('Chat screen focused');
      
      // Mark messages as read when the screen comes into focus
      if (isAuthenticated && user && userConstituency) {
        markMessagesAsRead();
      }
      
      return () => {
        // This runs when the screen goes out of focus
        console.log('Chat screen blurred');
      };
    }, [isAuthenticated, user, userConstituency])
  );
  
  // Initial setup - Check authentication status directly with Supabase
  useEffect(() => {
    const checkSession = async () => {
      console.log('Checking Supabase session directly...');
      try {
        // Get current session directly from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Session check result:', session ? 'Session exists' : 'No session');
        
        if (!session) {
          // Only redirect if not authenticated and initial check is done
          console.log('No active session, user needs to login');
          // Don't redirect immediately, allow AuthContext to potentially restore the session
          // This prevents unnecessary redirects if auth state is still loading
        }
        
        setInitialCheckDone(true);
      } catch (error) {
        console.error('Error checking session:', error);
        setInitialCheckDone(true);
      }
    };
    
    checkSession();
  }, []);
  
  // React to authentication state changes
  useEffect(() => {
    console.log('Auth state changed - authenticated:', isAuthenticated, 'user:', user ? 'exists' : 'null');
    
    // Only proceed with check after initial load
    if (!initialCheckDone) return;
    
    // If we confirm the user is not authenticated after initial check, redirect
    if (!isAuthenticated || !user) {
      console.log('User confirmed not authenticated, redirecting to login');
      navigation.replace('Login');
      return;
    }
    
    // User is authenticated, initialize chat
    console.log('User is authenticated, initializing chat...');
    initializeChat();
    
    return () => {
      cleanupChat();
    };
  }, [isAuthenticated, user, initialCheckDone]);
  
  // Function to initialize the chat
  const initializeChat = async () => {
    console.log('Initializing chat...');
    
    if (!user || !userId) {
      console.log('Cannot initialize chat - user or userId is missing');
      return;
    }
    
    try {
      // Load messages first
      await loadMessages();
      
      // Then set up subscription
      setupMessageSubscription();
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat. Please try again.');
    }
  };
  
  // Clean up subscription and other resources
  const cleanupChat = () => {
    console.log('Cleaning up chat resources...');
    if (subscriptionRef.current) {
      console.log('Unsubscribing from messages');
      MessageManager.unsubscribeFromMessages();
      subscriptionRef.current = null;
    }
  };
  
  // Setup message subscription with proper auth checks
  const setupMessageSubscription = async () => {
    // Double-check authentication before proceeding
    if (!user || !userId) {
      console.log('Cannot setup subscription - missing user or userId');
      return;
    }
    
    try {
      // Check authentication explicitly 
      const { data } = await supabase.auth.getSession();
      if (!data || !data.session) {
        console.log('No authenticated session found, cannot subscribe to messages');
        return;
      }

      console.log('Setting up message subscription for user:', userId);
      
      // Prevent duplicate subscriptions
      if (subscriptionRef.current) {
        console.log('Subscription already exists');
        return;
      }
      
      // Create subscription
      subscriptionRef.current = MessageManager.subscribeToMessages((newMessage) => {
        console.log('New message received from subscription:', newMessage);
        processNewMessage(newMessage);
      });
      
      console.log('Message subscription set up successfully');
    } catch (error) {
      console.error('Error setting up message subscription:', error);
    }
  };
  
  // Load messages with proper auth checks
  const loadMessages = async () => {
    console.log('Loading messages...');
    setIsLoading(true);
    
    // Double-check authentication before proceeding
    if (!user || !userId) {
      console.log('Cannot load messages - missing user or userId');
      setIsLoading(false);
      return;
    }
    
    try {
      // Get user profile to get constituency
      console.log('Fetching user profile for userId:', userId);
      const { data: userProfile, error: profileError } = await ProfileManager.getUserProfile(userId);
      
      if (profileError) {
        console.error("Error loading user profile:", profileError);
        Alert.alert('Error', `Failed to load user profile: ${profileError.message}`);
        setIsLoading(false);
        return;
      }
      
      if (!userProfile) {
        console.error("User profile not found");
        Alert.alert('Error', 'Your profile information could not be found.');
        setIsLoading(false);
        return;
      }
      
      const constituency = userProfile?.constituency;
      
      if (!constituency) {
        console.error("User constituency not found in profile");
        Alert.alert('Error', 'Your profile is incomplete. Please update your constituency information.');
        setIsLoading(false);
        return;
      }
      
      // Store the user's constituency for display in the header
      setUserConstituency(constituency);
      
      // Fetch messages for constituency using MessageManager
      console.log(`Fetching messages for constituency: ${constituency}`);
      const { data, error } = await MessageManager.fetchMessagesByConstituency(constituency);
      
      if (error) {
        console.error("Error loading messages:", error);
        Alert.alert('Error', `Failed to load messages: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log(`Loaded ${data?.length || 0} messages for constituency: ${constituency}`);
      
      // Process messages
      processLoadedMessages(data || []);
      
      // After successfully loading messages, mark them as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error in loadMessages:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process loaded messages
  const processLoadedMessages = (messagesData) => {
    // Reset sent message IDs set
    const newSentIds = new Set();
    
    if (messagesData.length > 0) {
      const formattedMessages = messagesData.map(msg => {
        // Add message ID to our set of known messages
        newSentIds.add(msg.id);
        
        return {
          id: msg.id,
          text: msg.text,
          sender: msg.sender_name || 'Unknown',
          rawTimestamp: msg.created_at, // Store original timestamp
          timestamp: formatTimestamp(msg.created_at),
          isCurrentUser: msg.user_id === userId,
          avatar: msg.avatar_url
        };
      });
      
      // Set the new sent IDs
      setSentMessageIds(newSentIds);
      
      // Sort messages by timestamp
      const sortedMessages = formattedMessages.sort((a, b) => {
        const dateA = new Date(a.rawTimestamp);
        const dateB = new Date(b.rawTimestamp);
        return dateA - dateB;
      });
      
      setMessages(sortedMessages);
      
      // Scroll to bottom when messages load
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 200);
    } else {
      console.log('No messages found or empty data array');
      setMessages([]);
    }
  };
  
  // Process new message from subscription
  const processNewMessage = (newMessage) => {
    // If the message has a temporary ID (from our optimistic updates)
    // or it's already in our sentMessageIds set, don't add it again
    if (
      (newMessage.id && newMessage.id.startsWith('temp-')) || 
      (newMessage.id && sentMessageIds.has(newMessage.id))
    ) {
      console.log(`Message already handled (temp id or in sent set): ${newMessage.id}`);
      return;
    }
    
    // Check if we already have this message in the messages array
    const messageExists = messages.some(msg => msg.id === newMessage.id);
    if (messageExists) {
      console.log(`Message ${newMessage.id} already exists in messages, skipping`);
      return;
    }
    
    // Format the message for display
    const formattedMessage = {
      id: newMessage.id,
      text: newMessage.text || newMessage.message, // Handle different property names
      sender: newMessage.sender_name || newMessage.sender || 'Unknown',
      rawTimestamp: newMessage.created_at || newMessage.timestamp,
      timestamp: formatTimestamp(newMessage.created_at || newMessage.timestamp),
      isCurrentUser: newMessage.user_id === userId,
      avatar: newMessage.avatar_url || newMessage.avatar
    };
    
    // Add new message and ensure sorted by timestamp
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, formattedMessage];
      
      // Sort messages by timestamp
      return updatedMessages.sort((a, b) => {
        const dateA = new Date(a.rawTimestamp || a.timestamp);
        const dateB = new Date(b.rawTimestamp || b.timestamp);
        return dateA - dateB;
      });
    });
    
    // Add this message ID to our set of known messages
    if (newMessage.id) {
      setSentMessageIds(prev => new Set([...prev, newMessage.id]));
    }
    
    // Scroll to bottom - with failsafes to ensure it works
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };
  
  // Format timestamp from ISO string
  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', isoString);
        return '00:00'; // Fallback
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error, isoString);
      return '00:00'; // Fallback
    }
  };
  
  // Handle sending a message with improved optimistic updates
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    console.log('Sending message:', inputMessage);
    
    // Store the message text before clearing input
    const messageToSend = inputMessage.trim();
    
    // Clear input immediately for better UX
    setInputMessage('');
    setIsSending(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Generate temp ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const currentTime = new Date().toISOString();
      
      // Add message optimistically to UI for immediate feedback
      const optimisticMessage = {
        id: tempId, // Temporary ID until server response
        text: messageToSend,
        sender: user?.user_metadata?.full_name || 'You',
        rawTimestamp: currentTime,
        timestamp: formatTimestamp(currentTime),
        isCurrentUser: true,
        avatar: user?.user_metadata?.avatar_url,
        _isOptimistic: true // Flag to identify optimistic messages
      };
      
      // Add to messages immediately
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, optimisticMessage];
        return updatedMessages.sort((a, b) => {
          const dateA = new Date(a.rawTimestamp);
          const dateB = new Date(b.rawTimestamp);
          return dateA - dateB;
        });
      });
      
      // Scroll to bottom immediately and reliably
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 50);
      });
      
      // Use MessageManager to send the message
      const { data, error } = await MessageManager.sendMessage(messageToSend);
      
      if (error) {
        console.error("Error sending message:", error);
        Alert.alert('Error', `Failed to send message: ${error.message}`);
        
        // Remove optimistic message on error
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== tempId)
        );
        
        // Restore the message in the input field
        setInputMessage(messageToSend);
        return;
      }
      
      console.log('Message sent successfully:', data);
      
      // If we have the returned message ID, add it to our set of known messages
      if (data && data.length > 0 && data[0].id) {
        // Add the real message ID to our set of sent messages
        const realMessageId = data[0].id;
        setSentMessageIds(prev => new Set([...prev, realMessageId]));
        
        // Replace the optimistic message with the real one
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => 
            msg.id === tempId ? {
              ...msg,
              id: realMessageId,
              _isOptimistic: false
            } : msg
          );
          return updatedMessages;
        });
      }
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
      
      // Restore input if error
      setInputMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { success, error } = await signOut();
      if (success) {
        navigation.replace('Login');
      } else {
        Alert.alert('Error', error || 'Failed to sign out');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', `Failed to sign out: ${error.message}`);
    }
  };
  
  // Add a header with sign out button and constituency information
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Chat</Text>
      {userConstituency ? (
        <View style={styles.constituencyContainer}>
          <Text style={styles.constituencyText}>
            {userConstituency} Residents
          </Text>
        </View>
      ) : null}
    </View>
  );
  
  const renderDateSeparator = (date) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateText}>{date}</Text>
    </View>
  );
  
  // Render message with optimistic UI state
  const renderMessage = ({ item, index }) => {
    // Determine if this is an optimistic message (still sending)
    const isOptimistic = item._isOptimistic === true;
    
    // Check if we need to show a date separator
    const showDateSeparator = index === 0 || 
      !isSameDay(
        new Date(messages[index - 1].rawTimestamp || messages[index - 1].timestamp), 
        new Date(item.rawTimestamp || item.timestamp)
      );
    
    // Determine if we should show the sender's info
    const shouldShowSenderInfo = index === 0 || 
      messages[index - 1].sender !== item.sender;
    
    return (
      <>
        {showDateSeparator && renderDateSeparator(formatDateForHeader(item.rawTimestamp || item.timestamp))}
        
        <View style={[
          styles.messageRow,
          item.isCurrentUser ? styles.userMessageRow : styles.otherMessageRow
        ]}>
          {/* Avatar for other users' first message in a sequence */}
          {!item.isCurrentUser && shouldShowSenderInfo && (
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.avatar} 
              />
            </View>
          )}
          
          {/* Spacer when not showing avatar */}
          {!item.isCurrentUser && !shouldShowSenderInfo && (
            <View style={styles.avatarSpacer} />
          )}
          
          <View style={styles.bubbleWrapper}>
            {/* Sender name for other users' first message in a sequence */}
            {!item.isCurrentUser && shouldShowSenderInfo && (
              <Text style={styles.senderName}>{item.sender}</Text>
            )}
            
            {/* Message bubble */}
            <View style={[
              styles.messageBubble,
              item.isCurrentUser ? styles.userBubble : styles.otherBubble,
              isOptimistic && styles.optimisticBubble // Add style for optimistic messages
            ]}>
              <Text style={[
                styles.messageText,
                item.isCurrentUser ? styles.userMessageText : styles.otherMessageText
              ]}>
                {item.text}
              </Text>
            </View>
            
            {/* Timestamp and sending indicator */}
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTimestamp,
                item.isCurrentUser ? styles.userTimestamp : styles.otherTimestamp
              ]}>
                {isOptimistic ? 'Sending...' : item.timestamp}
              </Text>
              
              {isOptimistic && (
                <ActivityIndicator 
                  size="small" 
                  color={item.isCurrentUser ? '#bbb' : '#4CAF50'} 
                  style={styles.sendingIndicator} 
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };
  
  // Helper function to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2 || isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return false;
    }
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Format date for the header
  const formatDateForHeader = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Unknown Date';
      }
      
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();
      const year = date.getFullYear();
      
      // Check if it's today
      const today = new Date();
      if (isSameDay(date, today)) {
        return 'Today';
      }
      
      // Check if it's yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (isSameDay(date, yesterday)) {
        return 'Yesterday';
      }
      
      // Otherwise return the full date
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error('Error formatting date header:', error, timestamp);
      return 'Unknown Date';
    }
  };
  
  // Add this function to mark messages as read
  const markMessagesAsRead = async () => {
    if (!user || !userId || !userConstituency) return;
    
    try {
      console.log('Marking messages as read for user:', userId, 'in constituency:', userConstituency);
      
      const { success, error } = await MessageManager.constructor.markMessagesAsRead(
        userId,
        userConstituency,
        new Date() // Mark all messages up to now as read
      );
      
      if (error) {
        console.error('Error marking messages as read:', error);
      } else if (success) {
        console.log('Successfully marked messages as read');
        setHasUnreadMessages(false);
        
        // Notify any listeners (like the tab bar) that messages have been read
        if (global.messageReadListeners) {
          global.messageReadListeners.forEach(listener => listener());
        }
      }
    } catch (error) {
      console.error('Exception marking messages as read:', error);
    }
  };
  
  // Handle scrolling to mark messages as read
  const handleMessageScroll = ({ nativeEvent }) => {
    // Only mark as read if the user has scrolled near the bottom of the list
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom) {
      // User has scrolled to the bottom - mark messages as read
      markMessagesAsRead();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!initialCheckDone || (!isAuthenticated && !user) ? (
        // Show authentication checking UI
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#357002" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      ) : !isAuthenticated || !user ? (
        // Show login prompt if not authenticated
        <View style={styles.loadingContainer}>
          <Text style={styles.authRequiredText}>Authentication required</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Show the chat UI when authenticated
        <>
          {renderHeader()}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#357002" />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No messages yet. Be the first to send one!</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.messagesList}
                onRefresh={loadMessages}
                refreshing={isLoading}
                onScroll={handleMessageScroll}
                scrollEventThrottle={400} // Only call scroll event every 400ms for performance
              />
            )}
            
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachButton}>
                <Text style={styles.attachIcon}>📎</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.textInput}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Your message"
                placeholderTextColor="#999"
                multiline
              />
              
              <TouchableOpacity 
                style={[styles.sendButton, isSending && styles.sendingButton]}
                onPress={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[
                    styles.sendButtonText,
                    !inputMessage.trim() && styles.sendButtonDisabled
                  ]}>
                    Send
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  dateHeader: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 13,
    color: '#8e8e93',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarSpacer: {
    width: 28,
    marginRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubbleWrapper: {
    maxWidth: '70%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 2,
    paddingLeft: 4,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 2,
  },
  userBubble: {
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  userTimestamp: {
    color: '#bbb',
    textAlign: 'right',
    marginRight: 4,
  },
  otherTimestamp: {
    color: '#bbb',
    textAlign: 'left',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1f1f1f',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  attachButton: {
    padding: 8,
  },
  attachIcon: {
    fontSize: 20,
    color: '#8e8e93',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    color: '#ffffff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendingButton: {
    backgroundColor: '#388E3C',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sendButtonDisabled: {
    color: '#666',
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#357002',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  constituencyContainer: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  constituencyText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  optimisticBubble: {
    opacity: 0.7,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  sendingIndicator: {
    marginLeft: 4,
    height: 10,
    width: 10,
  },
  authRequiredText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#357002',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatComponent;