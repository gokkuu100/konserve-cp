import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SupabaseManager from './SupabaseManager';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sentMessageIds, setSentMessageIds] = useState(new Set()); // Track sent message IDs
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  
  // Debug information
  useEffect(() => {
    console.log('ChatComponent mounted');
    return () => console.log('ChatComponent unmounted');
  }, []);
  
  // Check if user is authenticated when component mounts
  useEffect(() => {
    checkAuthentication();
    loadMessages();
    setupMessageSubscription();
    
    return () => {
      console.log('Unsubscribing from messages');
      SupabaseManager.unsubscribeFromMessages();
    };
  }, []);
  
  // Function to check if user is authenticated
  const checkAuthentication = async () => {
    console.log('Checking authentication...');
    try {
      const isAuth = await SupabaseManager.isAuthenticated();
      console.log('Is authenticated:', isAuth);
      
      if (!isAuth) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
        return;
      }
      
      // Get current user details
      const user = await SupabaseManager.getCurrentUser();
      console.log('Current user:', user);
      setCurrentUser(user);
      
    } catch (error) {
      console.error('Authentication check error:', error);
      Alert.alert('Error', 'Failed to verify authentication. Please try logging in again.');
      navigation.replace('Login');
    }
  };
  
  // Setup message subscription
  const setupMessageSubscription = () => {
    console.log('Setting up message subscription...');
    try {
      SupabaseManager.subscribeToMessages((newMessage) => {
        console.log('New message received:', newMessage);
        
        // Check if this is a message we've already added to the UI optimistically
        if (sentMessageIds.has(newMessage.id)) {
          console.log(`Message ${newMessage.id} already in the UI, skipping`);
          return;
        }
        
        // Add new message and sort by timestamp
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages, newMessage];
          // Sort messages by timestamp (created_at)
          return updatedMessages.sort((a, b) => {
            const dateA = new Date(a.rawTimestamp || a.timestamp);
            const dateB = new Date(b.rawTimestamp || b.timestamp);
            return dateA - dateB;
          });
        });
        
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      Alert.alert('Error', 'Failed to subscribe to new messages');
    }
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
  
  // Load existing messages
  const loadMessages = async () => {
    console.log('Loading messages...');
    setIsLoading(true);
    
    try {
      const { data, error } = await SupabaseManager.fetchMessages();
      
      if (error) {
        console.error("Error loading messages:", error);
        Alert.alert('Error', `Failed to load messages: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log(`Loaded ${data?.length || 0} messages`);
      
      if (data && data.length > 0) {
        // Get current user for comparison
        const user = await SupabaseManager.getCurrentUser();
        
        // Format the messages for the UI
        const formattedMessages = data.map(msg => {
          // Store raw message IDs in our set of known messages
          setSentMessageIds(prev => new Set([...prev, msg.id]));
          
          return {
            id: msg.id,
            text: msg.text,
            sender: msg.sender_name || 'Unknown',
            rawTimestamp: msg.created_at, // Store original timestamp
            timestamp: formatTimestamp(msg.created_at),
            isCurrentUser: user && msg.user_id === user.id,
            avatar: msg.avatar_url
          };
        });
        
        // Sort messages by timestamp
        const sortedMessages = formattedMessages.sort((a, b) => {
          const dateA = new Date(a.rawTimestamp);
          const dateB = new Date(b.rawTimestamp);
          return dateA - dateB;
        });
        
        setMessages(sortedMessages);
        
        // Scroll to bottom when messages load
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        console.log('No messages found or empty data array');
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
      Alert.alert('Error', `An unexpected error occurred while loading messages: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    console.log('Sending message:', inputMessage);
    setIsSending(true);
    
    try {
      // Check if user is authenticated
      if (!currentUser) {
        const user = await SupabaseManager.getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        setCurrentUser(user);
      }
      
      // Store the message text before clearing input
      const messageToSend = inputMessage.trim();
      setInputMessage('');
      
      // Send to server instead of adding optimistically
      console.log('Sending message to Supabase...');
      const { data, error } = await SupabaseManager.sendMessage(messageToSend);
      
      if (error) {
        console.error("Error sending message:", error);
        Alert.alert('Error', `Failed to send message: ${error.message}`);
        
        // Restore the message in the input field
        setInputMessage(messageToSend);
        return;
      }
      
      console.log('Message sent successfully:', data);
      
      // If we have the returned message ID, add it to our set of known messages
      if (data && data.length > 0 && data[0].id) {
        setSentMessageIds(prev => new Set([...prev, data[0].id]));
      }
      
      // The real message will come through the subscription
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
      
      // Restore input if error
      setInputMessage(inputMessage);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      const success = await SupabaseManager.signOut();
      if (success) {
        console.log('User signed out successfully');
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'Failed to sign out');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', `Failed to sign out: ${error.message}`);
    }
  };
  
  // Add a header with sign out button
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Chat</Text>
      <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderDateSeparator = (date) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateText}>{date}</Text>
    </View>
  );
  
  const renderMessage = ({ item, index }) => {
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
                source={{ uri: item.avatar || 'https://via.placeholder.com/40' }} 
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
              item.isCurrentUser ? styles.userBubble : styles.otherBubble
            ]}>
              <Text style={[
                styles.messageText,
                item.isCurrentUser ? styles.userMessageText : styles.otherMessageText
              ]}>
                {item.text}
              </Text>
            </View>
            
            {/* Timestamp */}
            <Text style={[
              styles.messageTimestamp,
              item.isCurrentUser ? styles.userTimestamp : styles.otherTimestamp
            ]}>
              {item.timestamp}
            </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7b68ee" />
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
    color: '#ff69b4',
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
    backgroundColor: '#7b68ee',
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
    backgroundColor: '#5a4eb0',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#7b68ee',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sendButtonDisabled: {
    color: '#666',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1f1f1f',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default ChatComponent;