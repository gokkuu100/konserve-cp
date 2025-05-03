import { createClient } from '@supabase/supabase-js';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import authManager from '../auth'; // Import the auth manager


const supabaseUrl = Constants.expoConfig.extra.SUPABASE_URL;
const supabaseKey = Constants.expoConfig.extra.SUPABASE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);


const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: true  // Make sure realtime is enabled
});

function formatTime(timeString) {
  if (!timeString) return '';
  
  // Parse the timeString which might be in format like "08:00:00"
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
  const formattedMinutes = m < 10 ? `0${m}` : m;
  
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

class SupabaseManager {
  constructor() {
    this.supabase = supabase;
    this.messageSubscription = null;
  }


  getSupabaseClient() {
    return supabase;
  }


  // Fetch all collection agencies with basic info
  async fetchAgencies() {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agencies:', error);
      throw error;
    }
  }

  // Fetch agencies with filtering by location
  async fetchAgenciesByLocation(location) {
    try {
      let query = supabase.from('agencies').select('*');
      
      if (location && location !== 'All Locations') {
        query = query.eq('location', location);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching agencies by location:', error);
      throw error;
    }
  }

  // Fetch complete agency details including services, areas, and routes
  async fetchAgencyDetails(agencyId) {
    try {
      // Fetch the agency
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single();
      
      if (agencyError) throw agencyError;
      
      // Fetch the agency's services
      const { data: services, error: servicesError } = await supabase
        .from('agency_services')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (servicesError) throw servicesError;
      
      // Fetch operational hours
      const { data: operationalHours, error: hoursError } = await supabase
        .from('operational_hours')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (hoursError) throw hoursError;
      
      // Fetch areas
      const { data: areas, error: areasError } = await supabase
        .from('operational_areas')
        .select('*')
        .eq('agency_id', agencyId);
      
      if (areasError) throw areasError;
      
      // Fetch routes for each area
      let routes = [];
      if (areas.length > 0) {
        const areaIds = areas.map(area => area.id);
        const { data: routesData, error: routesError } = await supabase
          .from('collection_routes')
          .select('*')
          .in('area_id', areaIds);
        
        if (routesError) throw routesError;
        routes = routesData;
        
        // Fetch collection days for each route
        for (let route of routes) {
          const { data: daysData, error: daysError } = await supabase
            .from('collection_days')
            .select('day_of_week')
            .eq('route_id', route.id);
          
          if (daysError) throw daysError;
          route.collection_days = daysData.map(day => day.day_of_week);
          
          // Fetch route coordinates
          const { data: coordinatesData, error: coordinatesError } = await supabase
            .from('route_coordinates')
            .select('*')
            .eq('route_id', route.id)
            .order('sequence_number', { ascending: true });
          
          if (coordinatesError) throw coordinatesError;
          
          if (coordinatesData && coordinatesData.length > 0) {
            route.route_coordinates = coordinatesData.map(coord => ({
              lat: parseFloat(coord.latitude),
              lng: parseFloat(coord.longitude)
            }));
          }
        }
      }
      
      // Format operational hours into an object
      const formattedHours = {};
      operationalHours.forEach(hour => {
        const timeString = hour.is_closed ? 
          'Closed' : 
          `${formatTime(hour.opening_time)} - ${formatTime(hour.closing_time)}`;
        
        formattedHours[hour.day_of_week] = timeString;
      });
      
      // Format services into an array of strings
      const formattedServices = services.map(service => service.service_description);
      
      // Combine all data
      const fullAgencyDetails = {
        ...agency,
        services: formattedServices,
        operational_hours: formattedHours,
        areas: areas,
        routes: routes
      };
      
      return fullAgencyDetails;
    } catch (error) {
      console.error('Error fetching agency details:', error);
      throw error;
    }
  }

  // Fetch all agencies with their complete details
  async fetchAllAgenciesWithDetails() {
    try {
      // Fetch all agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('*');
      
      if (agenciesError) throw agenciesError;
      
      // For each agency, fetch their complete details
      const agenciesWithDetails = await Promise.all(
        agencies.map(async (agency) => {
          try {
            return await this.fetchAgencyDetails(agency.id);
          } catch (error) {
            console.error(`Error fetching details for agency ${agency.id}:`, error);
            return agency; // Return basic agency data if details fetch fails
          }
        })
      );
      
      return agenciesWithDetails;
    } catch (error) {
      console.error('Error fetching all agencies with details:', error);
      throw error;
    }
  }
  
  // Helper function to format time from database format to AM/PM format
  formatTime(timeString) {
    if (!timeString) return '';
    
    // Parse the timeString which might be in format like "08:00:00"
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
    const formattedMinutes = m < 10 ? `0${m}` : m;
    
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }


  
/**
 * Submit user feedback to the database using the currently logged in user
 * @param {Object} feedbackData - The feedback data to submit
 * @param {number} feedbackData.rating - The user's rating (0-4 index)
 * @param {Array} feedbackData.selectedFeatures - Array of feature IDs the user liked
 * @param {string} feedbackData.comment - User's comment
 * @param {Array} feedbackData.featuresList - List of all ratings for reference
 * @param {Array} feedbackData.features - List of all features for reference
 * @returns {Promise} Result with data and error properties
 */
async submitFeedback(feedbackData) {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) {
      return { error: { message: 'User not authenticated' } };
    }
    
    const ratingValue = feedbackData.rating + 1;
    const ratingDescription = feedbackData.featuresList[feedbackData.rating].description;
    
    const selectedFeatureNames = feedbackData.selectedFeatures.map(id => {
      const feature = feedbackData.features.find(f => f.id === id);
      return feature ? feature.name : null;
    }).filter(Boolean);
    
    const { data, error } = await supabase
      .from('user_feedback')
      .insert([{
        user_id: currentUser.id,
        rating: ratingValue,
        rating_description: ratingDescription,
        liked_features: selectedFeatureNames,
        comment: feedbackData.comment || null,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('Error submitting feedback:', error);
      return { error };
    }
    
    return { data };
  } catch (err) {
    console.error('Exception submitting feedback:', err);
    return { error: err };
  }
}

/**
 * Upload environmental report image to storage
 * @param {Object} fileInfo - The image file information
 * @param {String} fileUri - The uri of the image file
 * @returns {Promise} Result with data and error properties
 */
async uploadEnvironmentalReportImage(fileUri) {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };
    
    const fileExt = fileUri.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `envreportimages/${fileName}`;
    
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: `image/${fileExt}`
    });
    
    const { error: uploadError, data } = await supabase.storage
      .from('reportcaseimages')
      .upload(filePath, formData);
      
    if (uploadError) {
      console.error("Environmental image upload error:", uploadError);
      return { error: uploadError };
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('reportcaseimages')
      .getPublicUrl(filePath);
      
    return { 
      data: { 
        path: filePath,
        url: publicUrl 
      }, 
      error: null 
    };
  } catch (error) {
    console.error("Upload process error:", error);
    return { error };
  }
}

/**
 * Submit an environmental report to the database
 * @param {Object} reportData - The report data including images, description, location, etc.
 * @returns {Promise} Result with data and error properties
 */
async submitEnvironmentalReport(reportData) {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };
    
    const imagePaths = [];
    const imageUrls = [];
    
    for (const imageUri of reportData.images) {
      const { data, error } = await this.uploadEnvironmentalReportImage(imageUri);
      
      if (error) {
        console.error("Error uploading image:", error);
        continue;
      }
      
      if (data) {
        imagePaths.push(data.path);
        imageUrls.push(data.url);
      }
    }
    
    const reportEntry = {
      user_id: currentUser.id,
      incident_type: reportData.incidentType,
      description: reportData.description,
      location_lat: reportData.location?.latitude,
      location_lng: reportData.location?.longitude,
      address: reportData.address,
      image_paths: imagePaths,
      image_urls: imageUrls,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('environmental_reportcases')
      .insert([reportEntry])
      .select();
      
    if (error) {
      console.error("Report submission error:", error);
      return { error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Report submission error:", error);
    return { error };
  }
}

/**
 * Get all environmental reports for a user
 * @returns {Promise} Result with data and error properties
 */
async getUserEnvironmentalReports() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };
    
    const { data, error } = await supabase
      .from('environmental_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching user reports:", error);
      return { error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Get user reports error:", error);
    return { error };
  }
}

/**
 * Get an environmental report by ID
 * @param {String} reportId - The ID of the report to fetch
 * @returns {Promise} Result with data and error properties
 */
async getEnvironmentalReportById(reportId) {
  try {
    const { data, error } = await supabase
      .from('environmental_reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
      if (error) {
        console.error("Detailed Supabase error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      return { error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Get report error:", error);
    return { error };
  }
}




  // report methods
    /**
   * Get the current user's profile
   * @returns {Promise} Result with data and error properties
   */
    async getUserProfile() {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) return { error: { message: 'User not authenticated' } };
      
      return await supabase
        .from('users')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    }
  
    /**
     * Get the current logged in user
     * @returns {Promise} User object or null
     */
    async getCurrentUser() {
      try {
        // First try to get user from authManager
        const authUser = authManager.getCurrentUser();
        if (authUser) {
          return authUser;
        }
        
        // If not found in authManager, try to get from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return session.user;
        }
        
        return null;
      } catch (error) {
        console.error('Error getting current user:', error);
        return null;
      }
    }
  
    /**
     * Get the current user's full name
     * @returns {Promise<string>} User's full name or 'User'
     */
    async getUserFullName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return 'User';
        
        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        return data?.full_name || 'User';
      } catch (error) {
        console.error('Error fetching user full name:', error);
        return 'User';
      }
    }
  
    /**
     * Fetch all environmental reports
     * @param {number} limit - Maximum number of reports to fetch
     * @returns {Promise} Result with data and error properties
     */
    async getAllReports(limit = 20) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) throw error;
        
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching reports:', error);
        return { data: null, error };
      }
    }
  
    /**
     * Fetch a specific report by ID
     * @param {string} reportId - ID of the report to fetch
     * @returns {Promise} Result with data and error properties
     */
    async getReportById(reportId) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportId)
          .single();
          
        if (error) throw error;
        
        return { data, error: null };
      } catch (error) {
        console.error(`Error fetching report with ID ${reportId}:`, error);
        return { data: null, error };
      }
    }
  
    /**
     * Fetch reports by category
     * @param {string} category - Category to filter by
     * @param {number} limit - Maximum number of reports to fetch
     * @returns {Promise} Result with data and error properties
     */
    async getReportsByCategory(category, limit = 10) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('category', category)
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (error) throw error;
        
        return { data, error: null };
      } catch (error) {
        console.error(`Error fetching reports in category ${category}:`, error);
        return { data: null, error };
      }
    }

  



  // ==================== REWARD POINTS RELATED METHODS ====================

  /**
   * Fetch user's total reward points
   * @returns {Promise} Result with total points or error
   */
  async fetchUserPoints() {
    try {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) return { error: { message: 'User not authenticated' } };
      
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
   * Fetch total user points
   * @param {string} userId - The user's ID
   * @returns {Promise} Result with total points or error
   */
  async fetchTotalUserPoints(userId) {
    try {
      // First get the base points from reward_points table
      const { data: basePoints, error: baseError } = await supabase
        .from('reward_points')
        .select('total_points')
        .eq('user_id', userId)
        .single();

      if (baseError && baseError.code !== 'PGRST116') {
        console.error('Error fetching base points:', baseError);
        return { data: 0, error: baseError };
      }

      // Then get all redeemed points from reward_redemptions
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('points_earned')
        .eq('user_id', userId);

      if (redemptionsError) {
        console.error('Error fetching redemptions:', redemptionsError);
        return { data: basePoints?.total_points || 0, error: redemptionsError };
      }

      // Calculate total redeemed points
      const redeemedPoints = redemptions?.reduce((sum, redemption) => 
        sum + (redemption.points_earned || 0), 0) || 0;

      // Return the sum of base points and redeemed points
      const totalPoints = (basePoints?.total_points || 0) + redeemedPoints;

      return { data: totalPoints, error: null };
    } catch (error) {
      console.error('Exception while fetching total points:', error);
      return { data: 0, error };
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

      // Step 5: Get updated total points
      const { data: totalPoints, error: pointsError } = await this.fetchTotalUserPoints(userId);
      
      if (pointsError) {
        console.error('Error fetching updated points:', pointsError);
        return { 
          success: false, 
          message: 'Failed to update points. Please try again.',
          error: pointsError 
        };
      }
      
      // Step 6: Return success with the redemption details
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
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) {
        return { error: { message: 'User not authenticated' } };
      }
      
      const { data: profile } = await this.getUserProfile();
      
      const displayName = currentUser.user_metadata?.full_name || 
                         profile?.full_name || 
                         currentUser.email.split('@')[0];
      
      const avatarUrl = profile?.avatar_url || currentUser.user_metadata?.avatar_url;
      
      const result = await supabase
        .from('messages')
        .insert({
          user_id: currentUser.id,
          text: messageText,
          sender_name: displayName,
          avatar_url: avatarUrl
        })
        .select();
      
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
      this.unsubscribeFromMessages();
      
      this.messageSubscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' }, 
          async (payload) => {
            try {
              const newMessage = payload.new;
              const currentUser = authManager.getCurrentUser();
              
              const formattedMessage = {
                id: newMessage.id,
                text: newMessage.text,
                sender: newMessage.sender_name || 'Unknown',
                rawTimestamp: newMessage.created_at,
                timestamp: this.formatTimestamp(newMessage.created_at),
                isCurrentUser: currentUser && newMessage.user_id === currentUser.id,
                avatar: newMessage.avatar_url
              };
              
              callback(formattedMessage);
            } catch (error) {
              console.error('Error processing real-time message:', error);
            }
          }
        )
        .subscribe();
        
      return true;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      return false;
    }
  }

  unsubscribeFromMessages() {
    if (this.messageSubscription) {
      supabase.removeChannel(this.messageSubscription);
      this.messageSubscription = null;
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
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) return { error: { message: 'User not authenticated' } };
      
      const fileExt = fileInfo.type ? fileInfo.type.split('/')[1] : fileInfo.name?.split('.').pop() || 'jpg';
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Convert the image URI to a Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Upload the blob directly instead of FormData
      const { error: uploadError, data } = await supabase.storage
        .from('profileimages')
        .upload(filePath, blob, {
          contentType: fileInfo.type || `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return { error: uploadError };
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profileimages')
        .getPublicUrl(filePath);

      const publicURL = urlData.publicUrl;
      
      if (!publicURL) {
        return { error: { message: 'Failed to get avatar URL' } };
      }
      
      // Update the user profile with the new avatar URL
      const { error: updateError } = await this.updateUserProfile({
        avatar_url: publicURL
      });
      
      if (updateError) {
        return { error: updateError };
      }
      
      return { data: { avatar_url: publicURL } };
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
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };
    
    return await supabase
      .from('users')
      .update(profileData)
      .eq('user_id', currentUser.id);
  }

  /**
   * Register user with email and password
   * @param {string} email - The user's email
   * @param {string} password - The user's password
   * @param {string} fullName - The user's full name
   * @param {Function} onComplete - Callback function to handle completion
   */
  async registerUser(email, password, fullName, onComplete) {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
  
      if (!this.isValidEmail(sanitizedEmail)) {
        onComplete(false, 'Invalid email format');
        return;
      }
  
      const existingUser = await supabase
        .from('users')
        .select('email')
        .eq('email', sanitizedEmail)
        .maybeSingle();
  
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
      // Use authManager instead of direct Supabase calls
      const { success, data, error } = await authManager.signIn(email, password);
      
      if (!success) {
        console.error("Login error:", error);
        onComplete(false, error);
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

  // Fetch subscription plans for an agency
  async fetchAgencySubscriptionPlans(agencyId) {
    try {
      console.log('Fetching plans for agency:', agencyId);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      console.log('Fetched plans:', data);
      console.log('Error if any:', error);

      if (error) {
        throw error;
      }

      // No need to parse features as they're already in the correct format
      const plansWithFeatures = data.map(plan => ({
        ...plan,
        features: plan.features || [] // Just ensure features exists, but don't parse
      }));

      return { data: plansWithFeatures, error: null };
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      return { data: null, error };
    }
  }

// Create a new subscription
async createSubscription(subscriptionData) {
  try {
    // First, validate required fields
    if (!subscriptionData.user_id || !subscriptionData.agency_id || !subscriptionData.plan_id) {
      throw new Error('Missing required fields for subscription creation');
    }
    
    // Extract selected days from customDates or collection_days
    let customCollectionDates = [];
    if (subscriptionData.customDates && Array.isArray(subscriptionData.customDates)) {
      customCollectionDates = subscriptionData.customDates;
    } else if (subscriptionData.collection_days && Array.isArray(subscriptionData.collection_days)) {
      customCollectionDates = subscriptionData.collection_days;
    }
    
    // Prepare metadata for the subscription
    const metadata = {
      ...(subscriptionData.metadata || {}),
      plan_type: subscriptionData.plan_type || 'standard',
      custom_collection_dates: customCollectionDates || []
    };
    
    // Insert into user_subscriptions table
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .insert({
        user_id: subscriptionData.user_id,
        agency_id: subscriptionData.agency_id,
        plan_id: subscriptionData.plan_id,
        custom_collection_dates: customCollectionDates,
        payment_method: subscriptionData.payment_method,
        amount: subscriptionData.amount,
        status: 'pending',
        metadata: metadata
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Now create a payment transaction record for this subscription
    if (data && data.id) {
      const paymentData = {
        subscription_id: data.id,
        user_id: subscriptionData.user_id,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'KES',
        payment_method: subscriptionData.payment_method,
        status: 'pending',
        metadata: metadata
      };
      
      const { data: paymentTransactionData, error: paymentError } = await this.supabase
        .from('payment_transactions')
        .insert(paymentData)
        .select()
        .single();
        
      if (paymentError) {
        console.error('Error creating payment transaction:', paymentError);
        // Even if payment transaction fails, we return the subscription data
      }
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { data: null, error };
  }
}

// Initialize payment with Paystack
async initializePayment(paymentData) {
  try {
    // Validate payment data
    if (!paymentData.subscription_id || !paymentData.amount) {
      throw new Error('Missing required payment fields');
    }
    
    // Make sure we have valid customer information
    if (!paymentData.customer || !paymentData.customer.email) {
      throw new Error('Missing customer information');
    }
    
    // Prepare the simplified payload to match our edge function
    const payload = {
      subscription_id: paymentData.subscription_id,
      amount: paymentData.amount,
      currency: paymentData.currency || 'KES',
      customer: paymentData.customer,
      metadata: paymentData.metadata || {}
    };
    
    console.log('Sending payment request to Edge Function:', payload);
    
    // Call the edge function to initialize payment with Paystack
    const { data, error } = await this.supabase.functions.invoke('initialize-paystack-payment', {
      body: payload
    });
    
    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }
    
    // Process the response
    console.log('Payment initialized successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error initializing payment:', error);
    return { data: null, error };
  }
}

// Add a new method to verify payment status with Paystack
// Enhanced verifyPaystackPayment function
// Add this to your SupabaseManager class
async verifyPaystackPayment(reference, subscriptionId) {
  try {
    console.log(`Verifying payment for reference: ${reference}, subscription: ${subscriptionId}`);
    
    // First check if we have a valid session
    const session = await this.supabase.auth.getSession();
    if (!session || !session.data.session) {
      console.error('No active session found for verification');
      throw new Error('Authentication required');
    }
    
    // Call the edge function with proper authorization
    const payload = {
      reference,
      subscription_id: subscriptionId
    };
    
    const { data, error } = await this.supabase.functions.invoke('verify-paystack-payment', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`
      }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }
    
    console.log('Verification response:', data);
    
    // Return the result directly - the edge function should handle database updates
    return { data, error: null };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { data: null, error };
  }
}

// Update subscription status function
async updateSubscriptionStatus(subscriptionId, status) {
  try {
    const { error } = await this.supabase
      .from('user_subscriptions')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);
      
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return { error };
  }
}

// Check payment status (works with both IntaSend and Paystack)
async checkPaymentStatus(subscriptionId) {
  try {
    // First check the database for the current status
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        user_subscriptions (
          id,
          status,
          start_date,
          end_date
        )
      `)
      .eq('subscription_id', subscriptionId)
      .single();
      
    if (error) {
      console.error('Error checking payment status:', error);
      return { data: null, error };
    }
    
    // If transaction exists and provider is Paystack, verify with Paystack directly
    if (data && data.provider === 'paystack' && data.provider_reference) {
      const { data: verificationData } = await this.verifyPaystackPayment(
        data.provider_reference,
        subscriptionId
      );
      
      // If verification was successful, return the updated data
      if (verificationData && verificationData.is_successful) {
        return { 
          data: {
            ...data,
            status: 'successful',
            verified: true,
            verification_data: verificationData
          }, 
          error: null 
        };
      }
    }
    
    // Otherwise, return the database status
    return { data, error: null };
  } catch (error) {
    console.error('Error checking payment status:', error);
    return { data: null, error };
  }
}

// Add this method to your SupabaseManager class
async getSubscriptionDetails(subscriptionId) {
  try {
    // Get subscription details with plan information
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select(`
        id,
        status,
        payment_status,
        start_date,
        end_date,
        created_at,
        updated_at,
        subscription_plans (
          id,
          name,
          description,
          price,
          duration_days,
          features
        )
      `)
      .eq('id', subscriptionId)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return { data: null, error: new Error('Subscription not found') };
    }
    
    // Format the data for easier use in UI
    const formattedData = {
      id: data.id,
      status: data.status,
      payment_status: data.payment_status,
      start_date: data.start_date,
      end_date: data.end_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      plan_id: data.subscription_plans?.id,
      plan_name: data.subscription_plans?.name,
      description: data.subscription_plans?.description,
      price: data.subscription_plans?.price,
      duration_days: data.subscription_plans?.duration_days,
      features: data.subscription_plans?.features || []
    };
    
    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return { data: null, error };
  }
}

// Subscribe to payment status updates
subscribeToPaymentUpdates(subscriptionId, callback) {
  // Check if realtime is available
  if (!this.supabase.channel) {
    console.warn('Realtime subscriptions not available in this Supabase client version');
    // Return a dummy subscription that can be "unsubscribed" without errors
    return { unsubscribe: () => {} };
  }
  
  // Use the new channel-based API for realtime
  return this.supabase
    .channel(`subscription-${subscriptionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `id=eq.${subscriptionId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

// Add this method for realtime subscription updates
subscribeToPaymentUpdates(subscriptionId, callback) {
  return this.supabase
    .from('user_subscriptions')
    .on('UPDATE', (payload) => {
      if (payload.new.id === subscriptionId) {
        callback(payload.new);
      }
    })
    .subscribe();
}

// Get user subscriptions with agency and plan details
async getUserSubscriptions() {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        status,
        start_date,
        end_date,
        auto_renew,
        created_at,
        agencies(id, name),
        subscription_plans(id, name, price, plan_type, features, description)
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the data for easier consumption
    const formattedData = data.map(subscription => ({
      id: subscription.id,
      status: subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      auto_renew: subscription.auto_renew,
      created_at: subscription.created_at,
      agency_id: subscription.agencies?.id,
      agency_name: subscription.agencies?.name,
      plan_id: subscription.subscription_plans?.id,
      plan_name: subscription.subscription_plans?.name,
      plan_type: subscription.subscription_plans?.plan_type || 'standard',
      price: subscription.subscription_plans?.price,
      features: subscription.subscription_plans?.features,
      description: subscription.subscription_plans?.description
    }));

    return { data: formattedData, error: null };
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return { data: null, error };
  }
}

// Get user payment transactions
async getUserTransactions() {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        id,
        amount,
        currency,
        payment_provider,
        payment_method,
        status,
        created_at,
        subscription_id,
        provider_transaction_id
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return { data: null, error };
  }
}

// Get transaction details with subscription info
async getTransactionDetails(transactionId) {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        user_subscriptions (
          id,
          status,
          start_date,
          end_date,
          agencies(id, name),
          subscription_plans(id, name, price, plan_type)
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return { data: null, error };
  }
}

// Renew a subscription
async renewSubscription(subscriptionId, newEndDate) {
  try {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return { error: { message: 'User not authenticated' } };

    // First get the subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', currentUser.id)
      .single();

    if (fetchError) throw fetchError;
    if (!subscription) throw new Error('Subscription not found');

    // Update the subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: newEndDate || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return { data: null, error };
  }
}

  /**
   * Submit agency feedback to the database
   * @param {Object} feedbackData - The feedback data to submit
   * @param {number} feedbackData.agency_id - The agency ID
   * @param {string} feedbackData.agency_name - The agency name
   * @param {number} feedbackData.rating - The user's rating (1-5)
   * @param {string} feedbackData.satisfaction - The satisfaction level (positive, neutral, negative)
   * @param {string} feedbackData.comment - User's comment
   * @returns {Promise} Result with data and error properties
   */
  async submitAgencyFeedback(feedbackData) {
    try {
      // Get the current session instead of just checking for user
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      
      // If we have a userId passed directly, use that instead
      const userId = feedbackData.user_id || user?.id;
      
      if (!userId) {
        console.error('Authentication issue: No user ID available');
        return { error: { message: 'User not authenticated' } };
      }
      
      // Insert the feedback
      const { data, error } = await supabase
        .from('agency_feedback')
        .insert([{
          user_id: userId,
          agency_id: feedbackData.agency_id,
          agency_name: feedbackData.agency_name,
          rating: feedbackData.rating,
          satisfaction: feedbackData.satisfaction,
          comment: feedbackData.comment,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Error submitting agency feedback:', error);
        return { error };
      }
      
      // Update the agency's average rating and reviews count
      await this.updateAgencyRatings(feedbackData.agency_id);
      
      return { data };
    } catch (err) {
      console.error('Exception submitting agency feedback:', err);
      return { error: err };
    }
  }

  /**
   * Update agency ratings based on feedback
   * @param {number} agencyId - The agency ID to update ratings for
   * @returns {Promise} Result with data and error properties
   */
  async updateAgencyRatings(agencyId) {
    try {
      // Get all feedback for this agency
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('agency_feedback')
        .select('rating')
        .eq('agency_id', agencyId);
      
      if (feedbackError) {
        console.error('Error fetching agency feedbacks:', feedbackError);
        return { error: feedbackError };
      }
      
      // Calculate average rating
      const reviews_count = feedbacks.length;
      let rating = 0;
      
      if (reviews_count > 0) {
        const sum = feedbacks.reduce((total, feedback) => total + feedback.rating, 0);
        rating = parseFloat((sum / reviews_count).toFixed(1));
      }
      
      // Update the agency record
      const { data, error } = await supabase
        .from('agencies')
        .update({
          rating,
          reviews_count
        })
        .eq('id', agencyId)
        .select();
      
      if (error) {
        console.error('Error updating agency ratings:', error);
        return { error };
      }
      
      return { data };
    } catch (err) {
      console.error('Exception updating agency ratings:', err);
      return { error: err };
    }
  }

  /**
   * Fetch agency feedback by agency ID
   * @param {number} agencyId - The agency ID to fetch feedback for
   * @returns {Promise} Result with data and error properties
   */
  async getAgencyFeedback(agencyId) {
    try {
      const { data, error } = await supabase
        .from('agency_feedback')
        .select(`
          id,
          created_at,
          rating,
          satisfaction,
          comment,
          user_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching agency feedback:', error);
        return { error };
      }
      
      return { data };
    } catch (err) {
      console.error('Exception fetching agency feedback:', err);
      return { error: err };
    }
  }

  /**
   * Fetch and update user's total points for leaderboard
   * @param {string} userId - The user's ID
   * @returns {Promise} Result with updated points or error
   */
  async updateUserLeaderboardPoints(userId) {
    try {
      console.log('Updating leaderboard points for user:', userId);
      
      // First, get all redemptions for this user
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('points_earned')
        .eq('user_id', userId);
      
      if (redemptionsError) {
        console.error('Error fetching redemptions:', redemptionsError);
        return { success: false, error: redemptionsError };
      }
      
      // Calculate total points from redemptions
      const totalPoints = redemptions?.reduce((sum, redemption) => 
        sum + (redemption.points_earned || 0), 0) || 0;
      
      console.log('Calculated total points:', totalPoints);
      
      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, user_id, full_name, avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, error: profileError };
      }
      
      // Update the user's reward_points in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ reward_points: totalPoints })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating user points:', updateError);
        return { success: false, error: updateError };
      }
      
      return { 
        success: true, 
        data: { 
          userId,
          totalPoints,
          profile
        } 
      };
    } catch (error) {
      console.error('Exception in updateUserLeaderboardPoints:', error);
      return { success: false, error };
    }
  }

  /**
   * Update the leaderboard for all users
   * @returns {Promise} Result with success status or error
   */
  async refreshLeaderboard() {
    try {
      console.log('Refreshing leaderboard for all users');
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return { success: false, error: usersError };
      }
      
      // Update points for each user
      const updatePromises = users.map(user => 
        this.updateUserLeaderboardPoints(user.user_id)
      );
      
      await Promise.all(updatePromises);
      
      return { success: true };
    } catch (error) {
      console.error('Exception in refreshLeaderboard:', error);
      return { success: false, error };
    }
  }

  /**
   * Fetch leaderboard data directly from users and redemptions
   * @param {number} limit - Maximum number of users to fetch
   * @returns {Promise} Result with leaderboard data or error
   */
  async fetchLeaderboardData(limit = 10) {
    try {
      console.log('Fetching leaderboard data with limit:', limit);
      
      // Get all users with their profiles
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, user_id, full_name, avatar_url, reward_points')
        .order('reward_points', { ascending: false })
        .limit(limit);
      
      if (usersError) {
        console.error('Error fetching users for leaderboard:', usersError);
        return { data: [], error: usersError };
      }
      
      console.log('Fetched users for leaderboard:', users);
      
      // If no users found, return empty array
      if (!users || users.length === 0) {
        return { data: [], error: null };
      }
      
      // For each user, calculate their total points from redemptions
      const leaderboardData = await Promise.all(users.map(async (user, index) => {
        // Get all redemptions for this user
        const { data: redemptions, error: redemptionsError } = await supabase
          .from('reward_redemptions')
          .select('points_earned')
          .eq('user_id', user.user_id);
        
        if (redemptionsError) {
          console.error(`Error fetching redemptions for user ${user.user_id}:`, redemptionsError);
          return {
            rank: index + 1,
            user_id: user.user_id,
            full_name: user.full_name || 'User',
            avatar_url: user.avatar_url,
            total_points: user.reward_points || 0
          };
        }
        
        // Calculate total points from redemptions
        const totalPoints = redemptions?.reduce((sum, redemption) => 
          sum + (redemption.points_earned || 0), 0) || 0;
        
        // If points calculated from redemptions differ from stored points, update stored points
        if (totalPoints !== user.reward_points) {
          console.log(`Updating points for user ${user.user_id} from ${user.reward_points} to ${totalPoints}`);
          
          // Update the user's reward_points in the users table
          await supabase
            .from('users')
            .update({ reward_points: totalPoints })
            .eq('user_id', user.user_id);
        }
        
        return {
          rank: index + 1,
          user_id: user.user_id,
          full_name: user.full_name || 'User',
          avatar_url: user.avatar_url,
          total_points: totalPoints
        };
      }));
      
      // Sort by total points and assign ranks
      leaderboardData.sort((a, b) => b.total_points - a.total_points);
      leaderboardData.forEach((user, index) => {
        user.rank = index + 1;
      });
      
      console.log('Processed leaderboard data:', leaderboardData);
      
      return { data: leaderboardData, error: null };
    } catch (error) {
      console.error('Exception in fetchLeaderboardData:', error);
      return { data: [], error };
    }
  }

  /**
   * Fetch current user's rank and data for the leaderboard
   * @param {string} userId - The user's ID
   * @returns {Promise} Result with user rank data or error
   */
  async fetchUserRankData(userId) {
    try {
      console.log('Fetching rank data for user:', userId);
      
      if (!userId) {
        console.error('No user ID provided to fetchUserRankData');
        return { data: null, error: new Error('No user ID provided') };
      }
      
      // First, get the user's profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, user_id, full_name, avatar_url, reward_points')
        .eq('user_id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user profile for rank:', userError);
        return { data: null, error: userError };
      }
      
      console.log('Fetched user profile for rank:', user);
      
      // Get all redemptions for this user
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select('points_earned')
        .eq('user_id', userId);
      
      if (redemptionsError) {
        console.error('Error fetching redemptions for user rank:', redemptionsError);
        return { data: null, error: redemptionsError };
      }
      
      // Calculate total points from redemptions
      const totalPoints = redemptions?.reduce((sum, redemption) => 
        sum + (redemption.points_earned || 0), 0) || 0;
      
      console.log('Calculated total points for user rank:', totalPoints);
      
      // If points calculated from redemptions differ from stored points, update stored points
      if (totalPoints !== user.reward_points) {
        console.log(`Updating points for user ${userId} from ${user.reward_points} to ${totalPoints}`);
        
        // Update the user's reward_points in the users table
        await supabase
          .from('users')
          .update({ reward_points: totalPoints })
          .eq('user_id', userId);
      }
      
      // Get all users with more points than this user to determine rank
      const { data: higherRankedUsers, error: rankError } = await supabase
        .from('users')
        .select('user_id')
        .gte('reward_points', totalPoints)
        .neq('user_id', userId);

      if (rankError) {
        console.error('Error determining user rank:', rankError);
        return { data: null, error: rankError };
      }
      
      // Calculate rank (add 1 because ranks start at 1, not 0)
      const rank = (higherRankedUsers?.length || 0) + 1;
      
      console.log('Determined rank for user:', rank);
      
      const userData = {
        rank,
        user_id: user.user_id,
        full_name: user.full_name || 'User',
        avatar_url: user.avatar_url,
        total_points: totalPoints
      };
      
      return { data: userData, error: null };
    } catch (error) {
      console.error('Exception in fetchUserRankData:', error);
      return { data: null, error };
    }
  }

  /**
 * Get the current user ID (more reliable method)
 * @returns {Promise<string|null>} The current user ID or null
 */
async getCurrentUserId() {
    try {
      // First try to get the user from authManager (most reliable)
      const authUser = authManager.getCurrentUser();
      if (authUser && authUser.id) {
        console.log('Got user ID from authManager:', authUser.id);
        return authUser.id;
      }
      
      // Fallback to Supabase auth if authManager doesn't have the user
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user && user.id) {
        console.log('Got user ID from supabase.auth.getUser:', user.id);
        return user.id;
      }
      
      // Final fallback to session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session && session.user && session.user.id) {
        console.log('Got user ID from session:', session.user.id);
        return session.user.id;
      }
      
      console.warn('No user ID found in any auth source');
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
  

  /**
   * Check if a user has an active subscription to a specific agency
   * @param {number} agencyId - The agency ID to check
   * @param {string} userId - The user's ID
   * @returns {Promise<{result: boolean, error: Error}>} Result with boolean indicating if user has active subscription
   */
  async checkActiveAgencySubscription(agencyId, userId) {
    try {
      console.log(`Checking active subscription for user ${userId} to agency ${agencyId}`);
      
      if (!userId) {
        console.error('No user ID provided to checkActiveAgencySubscription');
        return { result: false, error: new Error('No user ID provided') };
      }
      
      if (!agencyId) {
        console.error('No agency ID provided to checkActiveAgencySubscription');
        return { result: false, error: new Error('No agency ID provided') };
      }
      
      // Get current date for comparison
      const now = new Date().toISOString();
      
      // Query subscription_history table directly
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .limit(1);
      
      if (error) {
        console.error('Error checking active agency subscription:', error);
        return { result: false, error };
      }
      
      const hasActiveSubscription = data && data.length > 0;
      console.log(`User ${userId} has active subscription to agency ${agencyId}: ${hasActiveSubscription}`);
      
      return { result: hasActiveSubscription, error: null };
    } catch (err) {
      console.error('Exception in checkActiveAgencySubscription:', err);
      return { result: false, error: err };
    }
  }

  /**
   * Check if a user was ever subscribed to a specific agency (active or past)
   * @param {number} agencyId - The agency ID to check
   * @param {string} userId - The user's ID
   * @returns {Promise<{result: boolean, error: Error}>} Result with boolean indicating if user was ever subscribed
   */
  async checkEverSubscribedToAgency(agencyId, userId) {
    try {
      console.log(`Checking if user ${userId} was ever subscribed to agency ${agencyId}`);
      
      if (!userId) {
        console.error('No user ID provided to checkEverSubscribedToAgency');
        return { result: false, error: new Error('No user ID provided') };
      }
      
      if (!agencyId) {
        console.error('No agency ID provided to checkEverSubscribedToAgency');
        return { result: false, error: new Error('No agency ID provided') };
      }
      
      // Query subscription_history table directly for any subscription record
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .limit(1);
      
      if (error) {
        console.error('Error checking ever subscribed to agency:', error);
        return { result: false, error };
      }
      
      const wasEverSubscribed = data && data.length > 0;
      console.log(`User ${userId} was ever subscribed to agency ${agencyId}: ${wasEverSubscribed}`);
      
      return { result: wasEverSubscribed, error: null };
    } catch (err) {
      console.error('Exception in checkEverSubscribedToAgency:', err);
      return { result: false, error: err };
    }
  }

  /**
   * Check if a user has any active subscriptions
   * @param {string} userId - The user's ID
   * @returns {Promise<{result: boolean, error: Error}>} Result with boolean indicating if user has any active subscription
   */
  async hasActiveSubscription(userId) {
    try {
      console.log(`Checking if user ${userId} has any active subscriptions`);
      
      if (!userId) {
        console.error('No user ID provided to hasActiveSubscription');
        return { result: false, error: new Error('No user ID provided') };
      }
      
      // Get current date for comparison
      const now = new Date().toISOString();
      
      // Query subscription_history table directly
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .limit(1);
      
      if (error) {
        console.error('Error checking active subscriptions:', error);
        return { result: false, error };
      }
      
      const hasActive = data && data.length > 0;
      console.log(`User ${userId} has active subscriptions: ${hasActive}`);
      
      return { result: hasActive, error: null };
    } catch (err) {
      console.error('Exception in hasActiveSubscription:', err);
      return { result: false, error: err };
    }
  }
  
  /**
   * Get messages for a user from agencies they are subscribed to
   * @param {string} userId - The user's ID
   * @returns {Promise<{data: Array, error: Error}>} Result with messages or error
   */
  async getUserMessages(userId) {
    try {
      console.log(`Getting messages for user ${userId}`);
      
      if (!userId) {
        console.error('No user ID provided to getUserMessages');
        return { data: null, error: new Error('No user ID provided') };
      }
      
      // Use the user_messages view that includes subscription filtering
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user messages:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception in getUserMessages:', err);
      return { data: null, error: err };
    }
  }
}

export default new SupabaseManager();