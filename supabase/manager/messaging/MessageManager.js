import { supabase } from '../config/supabaseConfig';

class MessageManager {
  constructor() {
    this.messageSubscription = null;
  }

  async fetchMessages() {
    try {
      console.log('Fetching messages from Supabase');
      const result = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (result.error) {
        console.error('Error fetching messages:', result.error);
      } else {
        console.log(`Successfully fetched ${result.data?.length || 0} messages`);
      }
      
      return result;
    } catch (error) {
      console.error('Exception while fetching messages:', error);
      return { data: null, error };
    }
  }

  async sendMessage(messageText) {
    try {
      // Get current user from session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile, error: profileError } = await this.getUserProfile();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, error: profileError };
      }
      
      if (!profile) {
        console.error('User profile not found');
        return { success: false, error: { message: 'User profile not found' } };
      }
      
      const displayName = user.user_metadata?.full_name || 
                         profile?.full_name || 
                         user.email.split('@')[0];
      
      const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
      
      const constituency = profile?.constituency || '';
      
      if (!constituency) {
        console.warn('User sending message without constituency set in profile');
        return { success: false, error: { message: 'You must set your constituency in your profile before sending messages' } };
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            user_id: user.id,
            text: messageText,
            sender_name: displayName,
            avatar_url: avatarUrl,
            constituency: constituency,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error sending message:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Exception while sending message:', error);
      return { success: false, error };
    }
  }

  async fetchMessagesByConstituency(constituency) {
    try {
      console.log(`Fetching messages for constituency: ${constituency}`);
      
      if (!constituency) {
        console.error('No constituency provided to fetch messages');
        return { data: [], error: new Error('Constituency is required') };
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          created_at,
          user_id,
          sender_name,
          avatar_url,
          constituency
        `)
        .eq('constituency', constituency)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching messages by constituency:', error);
        return { data: [], error };
      }
      
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        text: msg.text,
        created_at: msg.created_at,
        user_id: msg.user_id,
        sender_name: msg.sender_name || 'Unknown',
        avatar_url: msg.avatar_url || null,
        constituency: msg.constituency
      }));
      
      return { data: formattedMessages, error: null };
    } catch (err) {
      console.error('Exception in fetchMessagesByConstituency:', err);
      return { data: [], error: err };
    }
  }

  async getUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('No user logged in') };
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception while fetching user profile:', error);
      return { data: null, error };
    }
  }

  async fetchAgencyMessages(userId) {
    try {
      // This method fetches messages from agencies based on the database schema in the memory
      console.log('Fetching agency messages for user:', userId);
      
      if (!userId) {
        return { data: [], error: new Error('User ID is required') };
      }
      
      // Using the user_messages view as mentioned in the memory
      const { data, error } = await supabase
        .from('user_messages')
        .select(`
          id,
          agency_id,
          agency_name,
          message_type,
          title,
          content,
          created_at,
          is_read
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching agency messages:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in fetchAgencyMessages:', error);
      return { data: [], error };
    }
  }

  async markMessageAsRead(messageId, userId) {
    try {
      // Mark a message as read based on the database schema in the memory
      if (!messageId || !userId) {
        return { success: false, error: new Error('Message ID and User ID are required') };
      }
      
      // Using the stored procedure mentioned in the memory
      const { data, error } = await supabase.rpc('mark_message_as_read', {
        p_message_id: messageId,
        p_user_id: userId
      });
      
      if (error) {
        console.error('Error marking message as read:', error);
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Exception in markMessageAsRead:', error);
      return { success: false, error };
    }
  }

  subscribeToMessages(onMessageReceived) {
    try {
      // Unsubscribe from any existing subscription
      this.unsubscribeFromMessages();

      // Get the current user synchronously first to avoid delays
      const { data } = supabase.auth.getSession();
      const user = data?.session?.user;
      
      if (!user) {
        console.error('No authenticated user for message subscription');
        return false;
      }

      console.log('Setting up real-time subscription for user:', user.id);

      // Create a channel for all messages first, then filter in the callback
      // This ensures we don't miss any messages while waiting for constituency lookup
      this.messageSubscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            console.log('New message received from subscription (pre-filter):', payload);
            
            // We'll filter messages by constituency in the callback
            const newMessage = payload.new;
            
            // Get the user's constituency and check if the message matches
            supabase
              .from('users')
              .select('constituency')
              .eq('user_id', user.id)
              .single()
              .then(({ data: profile, error }) => {
                if (error) {
                  console.error('Error getting user constituency for message filtering:', error);
                  return;
                }
                
                const userConstituency = profile?.constituency;
                if (!userConstituency) {
                  console.error('User constituency not found for message filtering');
                  return;
                }
                
                // Check if the message is for this user's constituency
                if (newMessage.constituency === userConstituency) {
                  console.log('Message matches user constituency, delivering to UI:', newMessage);
                  
                  if (onMessageReceived) {
                    const formattedMessage = {
                      id: newMessage.id,
                      text: newMessage.text,
                      sender: newMessage.sender_name || 'Unknown',
                      rawTimestamp: newMessage.created_at,
                      timestamp: this.formatTimestamp(newMessage.created_at),
                      isCurrentUser: newMessage.user_id === user.id,
                      avatar: newMessage.avatar_url
                    };
                    onMessageReceived(formattedMessage);
                  }
                } else {
                  console.log('Message constituency does not match user, skipping:', 
                    newMessage.constituency, 'vs', userConstituency);
                }
              });
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status: ${status}`);
        });

      return true;
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      return false;
    }
  }

  unsubscribeFromMessages() {
    if (this.messageSubscription) {
      try {
        supabase.removeChannel(this.messageSubscription);
        this.messageSubscription = null;
        return true;
      } catch (error) {
        console.error('Error unsubscribing from messages:', error);
        return false;
      }
    }
    return true;
  }

  formatTimestamp(isoString) {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date in formatTimestamp:', isoString);
        return '00:00';
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error in formatTimestamp:', error, isoString);
      return '00:00';
    }
  }

  /**
   * Mark messages as read for a user
   * @param {string} userId - The user ID
   * @param {string} constituency - The constituency
   * @param {Date} beforeTimestamp - Mark messages as read before this timestamp
   * @returns {Promise<{success: boolean, error: Error}>}
   */
  static async markMessagesAsRead(userId, constituency, beforeTimestamp = new Date()) {
    try {
      // Convert Date to ISO string if needed
      const timestamp = beforeTimestamp instanceof Date 
        ? beforeTimestamp.toISOString() 
        : beforeTimestamp;
      
      console.log('Calling mark_messages_as_read RPC with params:', {
        p_user_id: userId,
        p_constituency: constituency,
        p_timestamp: timestamp
      });
      
      // Call RPC function to mark messages as read
      const { data, error } = await supabase.rpc('mark_messages_as_read', {
        p_user_id: userId,
        p_constituency: constituency,
        p_timestamp: timestamp
      });
      
      if (error) throw error;
      
      // Notify global listeners that messages were read
      if (global.messageReadListeners) {
        global.messageReadListeners.forEach(listener => listener());
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Get count of unread messages for a user in their constituency
   * @param {string} userId - The user ID
   * @param {string} constituency - The constituency
   * @returns {Promise<{count: number, error: Error}>}
   */
  async getUnreadMessageCount(userId, constituency) {
    try {
      if (!userId || !constituency) {
        return { count: 0, error: new Error('Missing userId or constituency') };
      }
      
      console.log(`Checking unread messages for user ${userId} in constituency ${constituency}`);
      
      // Query to count unread messages - use a safer approach
      const { data, error } = await supabase.rpc('count_unread_messages', {
        p_user_id: userId,
        p_constituency: constituency
      });
      
      if (error) {
        console.error('RPC error in count_unread_messages:', error);
        
        // Fallback to direct query if RPC fails
        console.log('Using fallback direct query for unread messages');
        const fallbackResult = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('constituency', constituency)
          .eq('is_read', false)
          .gt('created_at', 'NOW() - INTERVAL \'30 days\''); // Limit to recent messages
        
        if (fallbackResult.error) throw fallbackResult.error;
        
        console.log(`Found ${fallbackResult.data?.length || 0} unread messages using fallback query`);
        return { count: fallbackResult.data?.length || 0, error: null };
      }
      
      const count = data || 0;
      console.log(`Found ${count} unread messages using RPC`);
      
      return { count, error: null };
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return { count: 0, error };
    }
  }
}


export default new MessageManager();