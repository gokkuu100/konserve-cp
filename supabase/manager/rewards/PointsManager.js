import { supabase } from '../config/supabaseConfig';
import { POINTS_EVENTS } from '../config/constants';
import authManager from '../auth/AuthManager';

class PointsManager {
  async fetchUserPoints() {
    try {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return { error: { message: 'User not authenticated' } };
      }
      
      // First check if user exists in reward_points table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('reward_points')
        .select('total_points')
        .eq('user_id', currentUser.id)
        .single();
      
      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Error checking user points:', userCheckError);
        return { data: null, error: userCheckError };
      }
      
      if (existingUser) {
        return { data: existingUser.total_points, error: null };
      }
      
      // If user doesn't exist, create a new record
      const { data: newUser, error: createError } = await supabase
        .from('reward_points')
        .insert([{ user_id: currentUser.id, total_points: 0 }])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user points record:', createError);
        return { data: 0, error: createError };
      }
      
      return { data: 0, error: null };
    } catch (error) {
      console.error('Exception while fetching user points:', error);
      return { data: 0, error };
    }
  }

  async fetchRedemptionHistory(userId) {
    try {
      console.log('Fetching redemption history for user:', userId);
      
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select('*')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching redemption history:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception while fetching redemption history:', error);
      return { data: [], error };
    }
  }

  async redeemRewardCode(userId, rewardCode) {
    try {
      console.log('Attempting to redeem code:', rewardCode, 'for user:', userId);
      
      // Step 1: Check if the reward code exists and is valid
      const { data: codeData, error: codeError } = await supabase
        .from('reward_codes')
        .select('*')
        .eq('code', rewardCode.toUpperCase())
        .single();
      
      if (codeError) {
        console.error('Error checking reward code:', codeError);
        return { 
          success: false, 
          message: 'Invalid reward code. Please try again.',
          error: codeError 
        };
      }
      
      // Step 2: Check if the code is still valid (not expired)
      if (codeData.is_expired) {
        return { 
          success: false, 
          message: 'This reward code has expired.',
          error: null 
        };
      }
      
      // Step 3: Check if the user has already redeemed this code
      const { data: existingRedemption, error: redemptionCheckError } = await supabase
        .from('reward_redemptions')
        .select('*')
        .eq('user_id', userId)
        .eq('code_id', codeData.id)
        .single();
      
      if (existingRedemption) {
        return { 
          success: false, 
          message: 'You have already redeemed this code.',
          error: null 
        };
      }
      
      // Step 4: Create the redemption record
      const { data: redemptionData, error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert([{
          user_id: userId,
          code_id: codeData.id,
          code_name: codeData.code,
          points_earned: codeData.points_value,
          redeemed_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (redemptionError) {
        console.error('Error creating redemption record:', redemptionError);
        return { 
          success: false, 
          message: 'Failed to redeem code. Please try again.',
          error: redemptionError 
        };
      }

      // Step 5: Update the user's points in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('reward_points')
        .eq('user_id', userId)
        .single();
        
      if (!userError) {
        const currentPoints = userData?.reward_points || 0;
        const newPoints = currentPoints + codeData.points_value;
        
        await supabase
          .from('users')
          .update({ reward_points: newPoints })
          .eq('user_id', userId);
      }

      // Step 6: Get updated total points
      const { data: totalPoints, error: pointsError } = await this.fetchTotalUserPoints(userId);
      
      if (pointsError) {
        console.error('Error fetching updated points:', pointsError);
        return { 
          success: false, 
          message: 'Failed to update points. Please try again.',
          error: pointsError 
        };
      }
      
      // Step 7: Return success with the redemption details
      return {
        success: true,
        message: `Successfully redeemed ${codeData.points_value} points!`,
        data: {
          redemptionId: redemptionData.id,
          codeName: codeData.code,
          pointsEarned: codeData.points_value,
          totalPoints: totalPoints
        },
        error: null
      };
    } catch (error) {
      console.error('Exception while redeeming code:', error);
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.',
        error 
      };
    }
  }

  subscribeToPointsUpdates(userId, onPointsUpdate) {
    return supabase
      .channel('reward_points_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Points updated:', payload);
          if (onPointsUpdate) {
            onPointsUpdate(payload.new.reward_points);
          }
        }
      )
      .subscribe();
  }

  subscribeToRedemptions(userId, onNewRedemption) {
    return supabase
      .channel('redemption_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reward_redemptions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New redemption:', payload);
          if (onNewRedemption) {
            onNewRedemption(payload.new);
          }
        }
      )
      .subscribe();
  }

  async fetchTotalUserPoints(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // First get the user's points from the users table
      const { data, error } = await supabase
        .from('users')
        .select('reward_points')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching total user points:', error);
        return { data: 0, error };
      }
      
      return { data: data?.reward_points || 0, error: null };
    } catch (error) {
      console.error('Exception in fetchTotalUserPoints:', error);
      return { data: 0, error };
    }
  }
}

export default new PointsManager();