import { supabase } from '../../config/supabaseConfig';

class MarketChatManager {
  /**
   * Get all conversations for a user
   * @param {string} userId - The current user's ID
   * @returns {Promise<Array>} Array of conversation objects
   */
  async getUserConversations(userId) {
    try {
      console.log('Fetching conversations for user:', userId);
      
      // Get all conversations where the user is involved
      const { data: chatData, error: chatError } = await supabase
        .from('marketplace_chats')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (chatError) {
        console.error('Error fetching chats:', chatError);
        throw chatError;
      }
      
      if (!chatData || chatData.length === 0) {
        console.log('No conversations found for user');
        return [];
      }
      
      console.log(`Found ${chatData.length} messages for user`);
      
      // Identify unique conversations by creating conversation_id
      const conversationMap = {};
      
      chatData.forEach(chat => {
        // Determine who the buyer is in this conversation
        const isSender = chat.sender_id === userId;
        const partnerId = isSender ? chat.receiver_id : chat.sender_id;
        const conversationId = `${userId}_${partnerId}`;
        
        // If we haven't seen this conversation or this message is newer
        if (!conversationMap[conversationId] || 
            new Date(chat.created_at) > new Date(conversationMap[conversationId].lastMessage.created_at)) {
          conversationMap[conversationId] = {
            id: conversationId,
            partnerId: partnerId,
            lastMessage: {
              id: chat.id,
              message: chat.message,
              is_image: chat.is_image,
              created_at: chat.created_at,
              sender_id: chat.sender_id
            }
          };
        }
      });
      
      // Get buyer details for each conversation
      const conversations = await Promise.all(
        Object.values(conversationMap).map(async (convo) => {
          // Get buyer details using correct column names
          const { data: buyerData, error: buyerError } = await supabase
            .from('buyers')
            .select(`
              id,
              name,
              logo_url
            `)
            .eq('id', convo.partnerId)
            .single();
          
          if (buyerError) {
            console.error('Error fetching buyer details:', buyerError, 'for buyer ID:', convo.partnerId);
            // Use placeholder if buyer not found
            return {
              ...convo,
              buyer: {
                id: convo.partnerId,
                name: 'Unknown Buyer',
                logo: 'https://via.placeholder.com/150',
              }
            };
          }
          
          // Get unread count
          const { data: unreadData, error: unreadError } = await supabase
            .from('marketplace_chats')
            .select('id')
            .eq('receiver_id', userId)
            .eq('sender_id', convo.partnerId)
            .eq('is_read', false);
          
          if (unreadError) {
            console.error('Error fetching unread count:', unreadError);
          }
          
          return {
            ...convo,
            buyer: {
              id: buyerData.id,  // Use the correct column names
              name: buyerData.name, // Use name instead of buyer_name
              logo: buyerData.logo_url || 'https://via.placeholder.com/150',
            },
            unreadCount: unreadData ? unreadData.length : 0
          };
        })
      );
      
      // Sort by last message time
      return conversations.sort((a, b) => 
        new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
      );
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  /**
   * Get all messages for a specific conversation
   * @param {string} userId - The current user's ID
   * @param {string} buyerId - The buyer's ID
   * @returns {Promise<Array>} Array of message objects
   */
  async getConversationMessages(userId, buyerId) {
    try {
      console.log(`Fetching messages between user ${userId} and buyer ${buyerId}`);
      
      // Add debug query to check if buyer exists
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('id, name, logo_url')
        .eq('id', buyerId)
        .single();
      
      if (buyerError) {
        console.error('Error fetching buyer:', buyerError);
        console.log('Buyer ID might be invalid, continuing with message fetch anyway');
      } else {
        console.log('Found buyer:', buyerData.name);
      }
      
      // Add improved logging for the query
      console.log(`Executing query: FROM marketplace_chats SELECT * WHERE (sender_id = '${userId}' AND receiver_id = '${buyerId}') OR (sender_id = '${buyerId}' AND receiver_id = '${userId}')`);
      
      const { data, error } = await supabase
        .from('marketplace_chats')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${buyerId}),and(sender_id.eq.${buyerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching conversation messages:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} messages`);
      return data || [];
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return [];
    }
  }

  /**
   * Send a new message
   * @param {Object} messageData - The message data
   * @returns {Promise<Object>} The created message
   */
  async sendMessage(messageData) {
    try {
      console.log('Sending message:', messageData);
      
      // First check if the conversation exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('marketplace_chats')
        .select('id')
        .or(`and(sender_id.eq.${messageData.sender_id},receiver_id.eq.${messageData.receiver_id}),and(sender_id.eq.${messageData.receiver_id},receiver_id.eq.${messageData.sender_id})`)
        .limit(1);
      
      if (checkError) {
        console.error('Error checking existing conversation:', checkError);
      }
      
      console.log('Existing conversation check:', existingConversation);
      
      // Insert the new message
      const { data, error } = await supabase
        .from('marketplace_chats')
        .insert([{
          sender_id: messageData.sender_id,
          receiver_id: messageData.receiver_id,
          message: messageData.message,
          is_image: messageData.is_image,
          conversation_id: messageData.conversation_id,
          is_read: false,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Message was sent but no data was returned');
      }
      
      console.log('Message sent successfully:', data[0]);
      return data[0]; // Return the created message
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   * @param {string} userId - The current user's ID
   * @param {string} buyerId - The buyer's ID
   * @returns {Promise<void>}
   */
  async markMessagesAsRead(userId, buyerId) {
    try {
      console.log(`Marking messages from ${buyerId} to ${userId} as read`);
      
      const { error } = await supabase
        .from('marketplace_chats')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', buyerId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error marking messages as read:', error);
        throw error;
      }
      
      console.log('Messages marked as read successfully');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Mark a single message as read
   * @param {string} messageId - The message ID
   * @returns {Promise<void>}
   */
  async markMessageAsRead(messageId) {
    try {
      console.log(`Marking message ${messageId} as read`);
      
      const { error } = await supabase
        .from('marketplace_chats')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }
      
      console.log('Message marked as read successfully');
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  /**
   * Get unread messages count for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<number>} The count of unread messages
   */
  async getUnreadMessagesCount(userId) {
    try {
      console.log(`Getting unread message count for user ${userId}`);
      
      const { count, error } = await supabase
        .from('marketplace_chats')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('Error getting unread count:', error);
        throw error;
      }
      
      console.log(`Found ${count || 0} unread messages`);
      return count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }
}

export default new MarketChatManager();