import { createClient } from '@supabase/supabase-js';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';
import Constants from 'expo-constants';


const supabaseUrl = Constants.expoConfig.extra.SUPABASE_URL;
const supabaseKey = Constants.expoConfig.extra.SUPABASE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);


const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseManager {
  constructor() {
    this.messageSubscription = null;
  }



  // ==================== REWARD POINTS RELATED METHODS ====================

  /**
   * Fetch user's total reward points
   * @param {string} userId - The user's ID
   * @returns {Promise} Result with total points or error
   */
  async fetchUserPoints(userId) {
    try {
      console.log('Fetching user points for user:', userId);
      
      // First check if user exists in the reward_points table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('reward_points')
        .select('total_points')
        .eq('user_id', userId)
        .single();
      
      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Error checking user points:', userCheckError);
        return { data: null, error: userCheckError };
      }
      
      // If user exists, return their points
      if (existingUser) {
        return { data: existingUser.total_points, error: null };
      }
      
      // If user doesn't exist, create a new entry with 0 points
      const { data: newUser, error: createError } = await supabase
        .from('reward_points')
        .insert([{ user_id: userId, total_points: 0 }])
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

  /**
   * Fetch user's redemption history
   * @param {string} userId - The user's ID
   * @returns {Promise} Result with redemption history or error
   */
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

  /**
   * Redeem a reward code
   * @param {string} userId - The user's ID
   * @param {string} rewardCode - The reward code to redeem
   * @returns {Promise} Result with redemption details or error
   */
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
      
      // Step 5: Update the user's total points
      const { data: currentPoints, error: pointsError } = await supabase
        .from('reward_points')
        .select('total_points')
        .eq('user_id', userId)
        .single();
      
      if (pointsError) {
        console.error('Error fetching current points:', pointsError);
        return { 
          success: false, 
          message: 'Failed to update points. Please try again.',
          error: pointsError 
        };
      }
      
      const newTotalPoints = currentPoints.total_points + codeData.points_value;
      
      const { error: updateError } = await supabase
        .from('reward_points')
        .update({ total_points: newTotalPoints })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating user points:', updateError);
        return { 
          success: false, 
          message: 'Failed to update points. Please try again.',
          error: updateError 
        };
      }
      
      // Step 6: Return success with the redemption details
      return {
        success: true,
        message: `Successfully redeemed ${codeData.points_value} points!`,
        data: {
          codeName: codeData.code,
          pointsEarned: codeData.points_value,
          totalPoints: newTotalPoints
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

  /**
   * Set up realtime subscription for user's reward points
   * @param {string} userId - The user's ID
   * @param {Function} onPointsUpdate - Callback function when points are updated
   * @returns {Object} Subscription object
   */
  subscribeToPointsUpdates(userId, onPointsUpdate) {
    const subscription = supabase
      .channel('reward_points_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reward_points',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Points updated:', payload);
          if (onPointsUpdate) {
            onPointsUpdate(payload.new.total_points);
          }
        }
      )
      .subscribe();
    
    return subscription;
  }

  /**
   * Set up realtime subscription for user's redemption history
   * @param {string} userId - The user's ID
   * @param {Function} onNewRedemption - Callback function when a new redemption is added
   * @returns {Object} Subscription object
   */
  subscribeToRedemptions(userId, onNewRedemption) {
    const subscription = supabase
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
    
    return subscription;
  }








 // Message-related methods
  
  /**
   * Fetch all messages from the messages table
   * @returns {Promise} Result with data and error properties
   */
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

  /**
   * Send a new message
   * @param {string} messageText - The message content
   * @returns {Promise} Result with data and error properties
   */
  async sendMessage(messageText) {
    try {
      console.log('Sending message to Supabase');
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting current user:', userError);
        return { error: { message: 'Failed to get current user: ' + userError.message } };
      }
      
      if (!user) {
        console.error('User not authenticated');
        return { error: { message: 'User not authenticated' } };
      }
      
      console.log('User authenticated, ID:', user.id);
      
      // Try to get user profile info - note fixed column selection
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('full_name, avatar_url')  // Remove 'username' if it doesn't exist
        .eq('user_id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - not a critical error, just means no profile yet
        console.warn('Error getting user profile:', profileError);
      }
      
      // Use displayName from metadata, full_name from profile, or fallback to email
      const displayName = user.user_metadata?.full_name || 
                        profile?.full_name || 
                        user.email.split('@')[0];
      
      // Use avatar from profile or metadata
      const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
      
      console.log('Sending message as:', displayName);
      
      // Insert the message
      const result = await supabase.from('messages').insert({
        user_id: user.id,
        text: messageText,
        sender_name: displayName,
        avatar_url: avatarUrl
      }).select(); // Add .select() to return the inserted row
      
      if (result.error) {
        console.error('Error inserting message:', result.error);
      } else {
        console.log('Message sent successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Exception while sending message:', error);
      return { error };
    }
  }

  /**
   * Subscribe to new messages in real-time
   * @param {Function} callback - Function to handle new messages
   */
  subscribeToMessages(callback) {
    try {
      // Unsubscribe from any existing subscription first
      this.unsubscribeFromMessages();

      console.log('Setting up Supabase real-time subscription');
      
      // Updated for Supabase v2 API
      this.messageSubscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' }, 
          async (payload) => {
            try {
              const newMessage = payload.new;
              console.log('New message from subscription:', newMessage);
              
              // Get current user asynchronously
              const user = await this.getCurrentUser();
              
              // Format the message for the UI
              const formattedMessage = {
                id: newMessage.id,
                text: newMessage.text,
                sender: newMessage.sender_name || 'Unknown',
                rawTimestamp: newMessage.created_at, // Store original timestamp
                timestamp: this.formatTimestamp(newMessage.created_at),
                isCurrentUser: user && newMessage.user_id === user.id,
                avatar: newMessage.avatar_url
              };
              
              callback(formattedMessage);
            } catch (error) {
              console.error('Error processing real-time message:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('Supabase subscription status:', status);
        });
        
      console.log('Subscription set up successfully');
      return true;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from real-time message updates
   */
  unsubscribeFromMessages() {
    if (this.messageSubscription) {
      supabase.removeChannel(this.messageSubscription);
      this.messageSubscription = null;
    }
  }

  /**
   * Get the current user object
   * @returns {Object} Current authenticated user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   * @returns {boolean} True if the user is authenticated, false otherwise
   */
  async isAuthenticated() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return !!session;
    } catch (error) {
      console.error('Error checking authentication:', error.message);
      return false;
    }
  }

  /**
   * Sign out the current user
   * @returns {boolean} True if the user signed out successfully, false otherwise
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing out:', error.message);
      return false;
    }
  }

  /**
   * Upload user avatar to storage
   * @param {Object} fileInfo - The image file information
   * @param {Object} fileUri - The uri of the image file
   * @returns {Promise} Result with data and error properties
   */
  async uploadAvatar(fileInfo, fileUri) {
    try {
      // Updated for Supabase v2 API
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };
      
      // Extract file extension from mime type or name
      const fileExt = fileInfo.type ? fileInfo.type.split('/')[1] : fileInfo.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Convert the file to base64 for Supabase storage
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileInfo.type || `image/${fileExt}`
      });
      
      // Upload file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('profileimages')
        .upload(filePath, formData);
        
      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return { error: uploadError };
      }
      
      // Get the public URL
      const { publicURL, error: urlError } = supabase.storage
        .from('profileimages')
        .getPublicUrl(filePath);
        
      if (urlError) {
        console.error("Getting avatar URL error:", urlError);
        return { error: urlError };
      }
      
      // Update user profile with avatar URL
      return await this.updateUserProfile({
        avatar_url: publicURL
      });
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { error };
    }
  }

  /**
   * Update user profile information
   * @param {Object} profileData - The profile data to update
   * @returns {Promise} Result with data and error properties
   */
  async updateUserProfile(profileData) {
    // Updated for Supabase v2 API
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };
    
    // Update the profiles table
    return await supabase
      .from('users')
      .update(profileData)
      .eq('user_id', user.id);
  }

  /**
   * Get the current user's profile
   * @returns {Promise} Result with data and error properties
   */
  async getUserProfile() {
    // Updated for Supabase v2 API
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };
    
    return await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();
  }











  // Register user with email and password
  async registerUser(email, password, fullName, onComplete) {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
  
      if (!this.isValidEmail(sanitizedEmail)) {
        onComplete(false, 'Invalid email format');
        return;
      }
  
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('email')
        .eq('email', sanitizedEmail)
        .maybeSingle();
  
      if (fetchError) throw fetchError;
  
      if (existingUser) {
        onComplete(false, 'Email is already registered. Try logging in.');
        return;
      }
  
      console.log("🚀 Registering user:", sanitizedEmail);
  
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: password,
      });
  
      if (signUpError) throw signUpError;
  
      const userId = signUpData?.user?.id;
  
      if (!userId) {
        throw new Error("Registration failed: User ID not returned");
      }
  
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          user_id: userId,
          full_name: fullName,
          email: sanitizedEmail,
          created_at: new Date().toISOString(),
          reward_points: 0
        }]);
  
      if (insertError) throw insertError;
  
      console.log("✅ User registration successful!");
    } catch (error) {
      // SAFELY extract message
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('❌ Registration error:', errorMsg);
      throw new Error(errorMsg); 
    }
  }
  

  // Login user with email and password
  async loginUser(email, password, onComplete) {
    console.log("🔐 Attempting login for", email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      console.log("Supabase login response:", data, error);
  
      if (error) {
        console.error("Login error:", error.message);
        onComplete(false, error.message);
        return;
      }
  
      if (data?.session && data?.user) {
        console.log("✅ Login successful", data.user);
        onComplete(true, null);
      } else {
        onComplete(false, 'Login failed: No session or user returned');
      }
    } catch (error) {
      console.error('Login exception:', error);
      onComplete(false, error.message || 'Unknown error');
    }
  }

  // Google Sign-In
  async signInWithGoogle(onComplete) {
    try {
      const { idToken } = await GoogleSignin.signIn();

      // Updated for Supabase v2 API
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw new Error(error.message);

      const user = data.user;

      // Check if user exists in the custom users table
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If user does not exist, create a new entry in the users table
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ 
            user_id: user.id, 
            full_name: user.user_metadata.full_name, 
            email: user.email, 
            created_at: new Date().toISOString(), 
            points: 0 
          }]);

        if (insertError) throw new Error(insertError.message);
      }

      onComplete(true, null);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      onComplete(false, error.message || 'Google Sign-In failed');
    }
  }

  // Helper function to validate email
  isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
  }

  // Helper method for timestamp formatting
  formatTimestamp(isoString) {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date in formatTimestamp:', isoString);
        return '00:00'; // Fallback
      }
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error in formatTimestamp:', error, isoString);
      return '00:00'; // Fallback
    }
  }
}

export default new SupabaseManager();
