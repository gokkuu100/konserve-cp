import { supabase } from "../config/supabaseConfig";

class OrganizationMessagesManager {
  /**
   * Fetch broadcast messages from organization_generalreport table
   * @returns {Promise} Promise object with data and error
   */
  static async fetchBroadcastMessages() {
    try {
      const { data, error } = await supabase
        .from('organization_generalreport')
        .select('*')
        .order('timestamp', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch direct messages for a specific user from organization_directmessages table
   * @param {string} userId - The ID of the logged-in user
   * @returns {Promise} Promise object with data and error
   */
  static async fetchDirectMessages(userId) {
    try {
      if (!userId) {
        return { 
          data: null, 
          error: new Error('User ID is required to fetch direct messages') 
        };
      }

      const { data, error } = await supabase
        .from('organization_directmessages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark a direct message as read
   * @param {number} messageId - The ID of the message to mark as read
   * @returns {Promise} Promise object with success and error
   */
  static async markDirectMessageAsRead(messageId) {
    try {
      const { data, error } = await supabase
        .from('organization_directmessages')
        .update({ isRead: true })
        .eq('id', messageId);
      
      return { success: !error, error };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { success: false, error };
    }
  }

  /**
   * Fetch a single organization broadcast message by ID
   * @param {number} messageId - The ID of the message to fetch
   * @returns {Promise} Promise object with data and error
   */
  static async fetchBroadcastMessageById(messageId) {
    try {
      const { data, error } = await supabase
        .from('organization_generalreport')
        .select('*')
        .eq('id', messageId)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching broadcast message details:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch a single direct message by ID
   * @param {number} messageId - The ID of the message to fetch
   * @returns {Promise} Promise object with data and error
   */
  static async fetchDirectMessageById(messageId) {
    try {
      const { data, error } = await supabase
        .from('organization_directmessages')
        .select('*')
        .eq('id', messageId)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching direct message details:', error);
      return { data: null, error };
    }
  }
}

export default OrganizationMessagesManager;