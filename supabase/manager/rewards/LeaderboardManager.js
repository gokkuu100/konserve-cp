import { supabase } from '../../config/supabaseConfig';

class LeaderboardManager {
  /**
   * Fetch the leaderboard data with pagination
   * @param {number} limit - Maximum number of records to return
   * @param {number} offset - Number of records to skip
   * @returns {Promise<{data: Array, error: Error}>}
   */
  static async fetchLeaderboardData(limit = 10, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1);
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch a specific user's rank data
   * @param {string} userId - The user ID
   * @returns {Promise<{data: Object, error: Error}>}
   */
  static async fetchUserRankData(userId) {
    try {
      // CRITICAL: Don't use .single() which is causing the error
      const { data, error } = await supabase
        .from('leaderboard_rankings')
        .select('*')
        .eq('user_id', userId);
      
      // Log what we actually got back for debugging
      console.log(`Rank query for ${userId} returned:`, data);
      
      if (error) {
        console.error('Database error in fetchUserRankData:', error);
        return { data: null, error };
      }
      
      // If no data or empty array, user is not ranked
      if (!data || data.length === 0) {
        console.log(`User ${userId} not found in leaderboard_rankings`);
        return { data: null, error: { code: 'NOT_RANKED', message: 'User not in rankings' } };
      }
      
      // Return the first matching user (there should only be one anyway)
      return { data: data[0], error: null };
    } catch (error) {
      console.error('Exception in fetchUserRankData:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch users above and below a specific user
   * @param {string} userId - The user ID
   * @param {number} count - Number of users to fetch above and below
   * @returns {Promise<{data: {user: Object, above: Array, below: Array}, error: Error}>}
   */
  static async fetchUsersAroundRank(userId, count = 1) {
    try {
      // First, get the user's rank
      const { data: userData, error: userError } = await this.fetchUserRankData(userId);
      
      if (userError) throw userError;
      if (!userData) throw new Error('User not found in leaderboard');
      
      // Get users above current user's rank
      const { data: aboveUsers, error: aboveError } = await supabase
        .from('leaderboard')
        .select('*')
        .lt('rank', userData.rank)
        .order('rank', { ascending: false })
        .limit(count);
        
      if (aboveError) throw aboveError;
      
      // Get users below current user's rank
      const { data: belowUsers, error: belowError } = await supabase
        .from('leaderboard')
        .select('*')
        .gt('rank', userData.rank)
        .order('rank', { ascending: true })
        .limit(count);
        
      if (belowError) throw belowError;
      
      return { 
        data: {
          user: userData,
          above: aboveUsers || [],
          below: belowUsers || []
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error fetching users around rank:', error);
      return { data: null, error };
    }
  }


  /**
   * Force a sync of all users to the leaderboard
   * @returns {Promise<{success: boolean, error: Error}>}
   */
  static async syncAllUsersToLeaderboard() {
    try {
      // Use an RPC function instead of direct table access
      const { data, error } = await supabase.rpc('sync_users_to_leaderboard_rpc');
      
      if (error) throw error;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error syncing users to leaderboard:', error);
      return { success: false, error };
    }
  }

  /**
   * Refresh the leaderboard data
   * @returns {Promise<{success: boolean, error: Error}>}
   */
  static async refreshLeaderboard() {
    try {
      // Call the database function to sync all users
      const { success, error } = await this.syncAllUsersToLeaderboard();
      if (error) throw error;
      
      return { success, error: null };
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Update user leaderboard points
   * @param {string} userId - The user ID
   * @param {number} points - New points value
   * @returns {Promise<{success: boolean, error: Error}>}
   */
  static async updateUserLeaderboardPoints(userId, points) {
    try {
      // Update user points in the database
      const { error } = await supabase
        .from('users')
        .update({ reward_points: points })
        .eq('user_id', userId);
        
      if (error) throw error;
      
      // Trigger a leaderboard refresh
      return await this.syncAllUsersToLeaderboard();
    } catch (error) {
      console.error('Error updating user leaderboard points:', error);
      return { success: false, error };
    }
  }

  /**
   * Get total users in leaderboard and other stats
   * @returns {Promise<{data: Object, error: Error}>}
   */
  static async getLeaderboardStats() {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_stats');
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error getting leaderboard stats:', error);
      return { data: null, error };
    }
  }
}

export default LeaderboardManager;