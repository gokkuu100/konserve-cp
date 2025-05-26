import { supabase } from '../../config/supabaseConfig';

class NotificationManager {
  /**
   * Update or store a user's push notification token
   * @param {string} userId - The user's ID
   * @param {string} token - The push notification token
   * @returns {Promise} Promise object with operation result
   */
  async updatePushToken(userId, token) {
    try {
      if (!userId || !token) {
        console.error('Missing required parameters for updatePushToken');
        return { error: 'Missing required parameters' };
      }

      // Check if a record already exists for this user and token
      const { data: existingTokens, error: fetchError } = await supabase
        .from('user_push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('push_token', token);

      if (fetchError) {
        console.error('Error checking existing token:', fetchError);
        return { error: fetchError };
      }

      let result;

      if (existingTokens && existingTokens.length > 0) {
        // Update existing record
        result = await supabase
          .from('user_push_tokens')
          .update({
            last_used: new Date().toISOString()
          })
          .eq('id', existingTokens[0].id);
      } else {
        // Insert new record
        result = await supabase
          .from('user_push_tokens')
          .insert({
            user_id: userId,
            push_token: token,
            device_type: 'app',
            last_used: new Date().toISOString()
          });
      }

      if (result.error) {
        console.error('Error updating push token:', result.error);
        return { error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception in updatePushToken:', error);
      return { error };
    }
  }

  async markAsRead(messageId, messageSource = 'org') {
    try {
      const { data, error } = await supabase
        .from(messageSource === 'org' ? 'org_messages' : 'messages')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select();

      if (error) {
        console.error('Error marking message as read:', error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('Exception in markAsRead:', error);
      return { error };
    }
  }

  async getUnreadCount(userId, messageSource = 'org') {
    try {
      const { count, error } = await supabase
        .from(messageSource === 'org' ? 'org_messages' : 'messages')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return { error };
      }

      return { count };
    } catch (error) {
      console.error('Exception in getUnreadCount:', error);
      return { error };
    }
  }
}

export default new NotificationManager(); 