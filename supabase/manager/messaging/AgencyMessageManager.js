import { supabase } from '../../config/supabaseConfig';

class AgencyMessageManager {
  /**
   * Check if a user has any active subscriptions
   * @param {string} userId - The user ID
   * @returns {Promise<{result: boolean, agencies: Array, error: Error}>}
   */
  static async getActiveSubscriptions(userId) {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select(`
          id,
          agency_id,
          agencies (
            id,
            name,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString());

      if (error) throw error;

      return {
        result: data && data.length > 0,
        agencies: data?.map(sub => sub.agencies) || [],
        error: null
      };
    } catch (error) {
      console.error('Error checking active subscriptions:', error);
      return { result: false, agencies: [], error };
    }
  }

  /**
   * Fetch all broadcast messages from agencies the user is subscribed to
   * @param {string} userId - The user ID
   * @param {Array} agencyIds - Array of agency IDs the user is subscribed to
   * @returns {Promise<{data: Array, error: Error}>}
   */
  static async fetchBroadcastMessages(userId, agencyIds) {
    try {
      if (!agencyIds || agencyIds.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('agency_messages_general')
        .select(`
          id,
          created_at,
          updated_at,
          agency_id,
          subject,
          message,
          message_type,
          agencies (
            name,
            logo_url
          )
        `)
        .in('agency_id', agencyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format data to include message_source and adjust for display
      const formattedData = data.map(message => ({
        id: message.id,
        created_at: message.created_at,
        updated_at: message.updated_at,
        agency_id: message.agency_id,
        subject: message.subject || 'No Subject',
        message: message.message || '',
        message_type: message.message_type || 'general',
        message_source: 'broadcast',
        is_read: true, // Broadcast messages are always considered read
        agency_name: message.agencies?.name || 'Unknown Agency',
        agency_logo: message.agencies?.logo_url || null,
        _uniqueId: `broadcast-${message.id}`
      }));

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
      return { data: [], error };
    }
  }

  /**
   * Fetch direct messages for a user
   * @param {string} userId - The user ID
   * @param {Array} agencyIds - Array of agency IDs the user is subscribed to
   * @returns {Promise<{data: Array, error: Error}>}
   */
  static async fetchDirectMessages(userId, agencyIds) {
    try {
      if (!agencyIds || agencyIds.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('agency_messages_direct')
        .select(`
          id,
          created_at,
          updated_at,
          agency_id,
          subject,
          message,
          is_read,
          agencies (
            name,
            logo_url
          )
        `)
        .eq('users_id', userId)
        .in('agency_id', agencyIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format data to include message_source and adjust for display
      const formattedData = data.map(message => ({
        id: message.id,
        created_at: message.created_at,
        updated_at: message.updated_at,
        agency_id: message.agency_id,
        subject: message.subject || 'No Subject',
        message: message.message || '',
        message_type: 'general', // Default to general for direct messages
        message_source: 'direct',
        is_read: message.is_read || false,
        agency_name: message.agencies?.name || 'Unknown Agency',
        agency_logo: message.agencies?.logo_url || null,
        _uniqueId: `direct-${message.id}`
      }));

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return { data: [], error };
    }
  }

  /**
   * Fetch all messages for a user (both broadcast and direct)
   * @param {string} userId - The user ID
   * @returns {Promise<{data: Array, error: Error}>}
   */
  static async fetchAllMessages(userId) {
    try {
      // First get all agencies the user is subscribed to
      const { result, agencies, error: subError } = await this.getActiveSubscriptions(userId);
      
      if (subError) throw subError;
      
      if (!result || agencies.length === 0) {
        return { data: [], error: null };
      }
      
      // Extract agency IDs
      const agencyIds = agencies.map(agency => agency.id);
      
      // Fetch both broadcast and direct messages
      const [broadcastResult, directResult] = await Promise.all([
        this.fetchBroadcastMessages(userId, agencyIds),
        this.fetchDirectMessages(userId, agencyIds)
      ]);
      
      if (broadcastResult.error) throw broadcastResult.error;
      if (directResult.error) throw directResult.error;
      
      // Combine and sort by created_at date (newest first)
      const allMessages = [
        ...(broadcastResult.data || []).map((msg, index) => ({
          ...msg,
          _uniqueId: `broadcast-${msg.id}-${index}`
        })), 
        ...(directResult.data || []).map((msg, index) => ({
          ...msg,
          _uniqueId: `direct-${msg.id}-${index}`
        }))
      ].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return { data: allMessages, error: null };
    } catch (error) {
      console.error('Error fetching all messages:', error);
      return { data: [], error };
    }
  }

  /**
   * Fetch messages for a specific agency
   * @param {string} userId - The user ID
   * @param {number} agencyId - The agency ID
   * @returns {Promise<{data: Array, error: Error}>}
   */
  static async fetchAgencyMessages(userId, agencyId) {
    try {
      // Fetch both broadcast and direct messages for the specific agency
      const [broadcastResult, directResult] = await Promise.all([
        this.fetchBroadcastMessages(userId, [agencyId]),
        this.fetchDirectMessages(userId, [agencyId])
      ]);
      
      if (broadcastResult.error) throw broadcastResult.error;
      if (directResult.error) throw directResult.error;
      
      // Combine and sort by created_at date (newest first)
      const allMessages = [
        ...(broadcastResult.data || []).map((msg, index) => ({
          ...msg,
          _uniqueId: `broadcast-${msg.id}-${index}`
        })), 
        ...(directResult.data || []).map((msg, index) => ({
          ...msg,
          _uniqueId: `direct-${msg.id}-${index}`
        }))
      ].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return { data: allMessages, error: null };
    } catch (error) {
      console.error('Error fetching agency messages:', error);
      return { data: [], error };
    }
  }

  /**
   * Mark a direct message as read
   * @param {string} messageId - The message ID
   * @returns {Promise<{success: boolean, error: Error}>}
   */
  static async markMessageAsRead(messageId) {
    try {
      const { error } = await supabase
        .from('agency_messages_direct')
        .update({ 
          is_read: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', messageId);
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { success: false, error };
    }
  }
}

export default AgencyMessageManager; 