import { supabase } from '../config/supabaseConfig';

class ProfileManager {
  async getUserProfile(userId = null) {
    try {
      // If userId is provided, use it directly
      if (userId) {
        console.log('Getting profile for user ID:', userId);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching user profile by user_id:', error);
        } else {
          console.log('Successfully fetched user profile');
        }
        
        return { data, error };
      }
      
      // Otherwise, get the current user from the session
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      
      if (!user) {
        console.error('No user logged in');
        return { data: null, error: new Error('No user logged in') };
      }
      
      console.log('Getting profile for current user:', user.id);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching current user profile:', error);
      } else {
        console.log('Successfully fetched current user profile');
      }
      
      return { data, error };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { data: null, error };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      return user || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getCurrentUserId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  async getUserFullName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.full_name;
    } catch (error) {
      console.error('Error getting user full name:', error);
      return null;
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: profileData.fullName,
          membership_type: profileData.membershipType,
          avatar_url: profileData.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('Exception in updateUserProfile:', error);
      return { error };
    }
  }

  async uploadAvatar(userId, file) {
    try {
      if (!userId) {
        return { error: new Error('User ID is required') };
      }
      
      // Create file name with user ID and timestamp
      const fileExt = file.uri.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      
      // Create file object
      const fileObj = {
        uri: file.uri,
        name: fileName,
        type: file.type || `image/${fileExt}`
      };
      
      // Upload to storage - using profileimages bucket with avatars folder
      const { data, error } = await supabase.storage
        .from('profileimages')
        .upload(`avatars/${fileName}`, fileObj, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profileimages')
        .getPublicUrl(`avatars/${fileName}`);
      
      const publicUrl = urlData.publicUrl;
      
      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      
      if (updateError) {
        throw updateError;
      }
      
      return { publicUrl, error: null };
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      return { publicUrl: null, error };
    }
  }

  async createUserProfile(profileData) {
    try {
      if (!profileData.user_id) {
        throw new Error('User ID is required to create a profile');
      }
      
      console.log("Creating profile for user ID:", profileData.user_id);
      
      // First check if the user already has a profile
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', profileData.user_id)
        .maybeSingle();
        
      if (existingProfile) {
        console.log("Profile already exists for user:", profileData.user_id);
        return { data: existingProfile };
      }
      
      // Insert the profile with appropriate error handling
      const { data, error } = await supabase
        .from('users')
        .insert([{
          user_id: profileData.user_id,
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          created_at: new Date().toISOString(),
          county: profileData.county || 'Nairobi',
          constituency: profileData.constituency || '',
          reward_points: 0,
          membership_type: 'standard'
        }])
        .select();
      
      if (error) {
        // Specific error logging
        if (error.code === '42501') {
          console.error('Permission denied error - RLS policy preventing profile creation');
        } else {
          console.error('Error creating user profile:', error);
        }
        return { error };
      }
      
      console.log("✅ User profile created successfully!");
      return { data: data[0] };
    } catch (error) {
      console.error('Exception in createUserProfile:', error);
      return { error: { message: error.message } };
    }
  }

  async updateUserDashboardData(userId, userData) {
    try {
      // Make sure userId is provided
      if (!userId) {
        const currentUser = await this.getCurrentUser();
        userId = currentUser?.id;
        if (!userId) {
          throw new Error('User ID is required');
        }
      }
      
      // Prepare data with proper field names matching your database schema
      const updateData = {
        full_name: userData.fullName,
        phone_number: userData.phoneNumber,
        constituency: userData.constituency,
        county: userData.county,
        gender: userData.gender,
        age: userData.age,
        updated_at: new Date()
      };
      
      // Update the user in the users table
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId)  // This needs to match the auth.uid()
        .single();
      
      if (error) {
        console.error('Error updating user data:', error);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Error updating user dashboard data:', error);
      throw error;
    }
  }

  async getUserDashboardData(userId) {
    try {
      const [
        reportsCount,
        userPoints,
        subscriptions
      ] = await Promise.all([
        supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('users')
          .select('reward_points')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('subscriptions')
          .select('status, end_date')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      const activeSubscription = subscriptions.data?.length > 0 
        ? subscriptions.data[0] 
        : null;

      return {
        data: {
          reportsCount: reportsCount.count || 0,
          points: userPoints.data?.reward_points || 0,
          subscription: {
            active: activeSubscription?.status === 'active',
            expiryDate: activeSubscription?.end_date || null
          }
        }
      };
    } catch (error) {
      console.error('Exception in getUserDashboardData:', error);
      return { error };
    }
  }

  async getUserStats(userId) {
    try {
      const [reportsCount, pointsData, subscriptionsCount] = await Promise.all([
        supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('users')
          .select('reward_points')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_subscriptions')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('status', 'active')
      ]);

      return {
        reportsSubmitted: reportsCount.count || 0,
        totalPoints: pointsData.data?.reward_points || 0,
        activeSubscriptions: subscriptionsCount.count || 0
      };
    } catch (error) {
      console.error('Exception in getUserStats:', error);
      return { error };
    }
  }

  /**
   * Refresh user profile to check for any updates
   */
  async refreshUserProfile(userId) {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required' } };
      }
      
      // Get the latest user data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return { success: false, error };
    }
  }
}

export default new ProfileManager();