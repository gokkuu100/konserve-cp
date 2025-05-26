import { supabase } from '../config/supabaseConfig';

class FeedbackManager {
  async submitAgencyFeedback(feedbackData) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      
      const userId = feedbackData.user_id || user?.id;
      
      if (!userId) {
        console.error('Authentication issue: No user ID available');
        return { error: { message: 'User not authenticated' } };
      }
      
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
      
      await this.updateAgencyRatings(feedbackData.agency_id);
      
      return { data };
    } catch (err) {
      console.error('Exception submitting agency feedback:', err);
      return { error: err };
    }
  }

  async updateAgencyRatings(agencyId) {
    try {
      const { data: feedbacks, error: feedbackError } = await supabase
        .from('agency_feedback')
        .select('rating')
        .eq('agency_id', agencyId);
      
      if (feedbackError) {
        console.error('Error fetching agency feedbacks:', feedbackError);
        return { error: feedbackError };
      }
      
      const reviews_count = feedbacks.length;
      let rating = 0;
      
      if (reviews_count > 0) {
        const sum = feedbacks.reduce((total, feedback) => total + feedback.rating, 0);
        rating = parseFloat((sum / reviews_count).toFixed(1));
      }
      
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

  async getAgencyFeedback(agencyId) {
    try {
      if (!agencyId) {
        return { data: null, error: new Error('No agency ID provided') };
      }
      
      // Convert agencyId to a number if it's a string
      const numericAgencyId = typeof agencyId === 'string' ? parseInt(agencyId, 10) : agencyId;
      
      if (isNaN(numericAgencyId)) {
        throw new Error(`Invalid agency ID: ${agencyId}`);
      }
      
      // First get all feedback for the agency
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('agency_feedback')
        .select('*')
        .eq('agency_id', numericAgencyId)
        .order('created_at', { ascending: false });
      
      if (feedbackError) {
        console.error('Error fetching agency reviews:', feedbackError);
        return { data: null, error: feedbackError };
      }
      
      if (!feedbackData || feedbackData.length === 0) {
        return { data: [], error: null };
      }
      
      // Extract all user IDs from feedback - these are UUIDs
      const userIds = [...new Set(feedbackData.map(item => item.user_id))].filter(Boolean);
      
      // If there are user IDs, get their profiles from the correct users table
      let userProfiles = {};
      if (userIds.length > 0) {
        try {
          // Query the users table using the user_id column (UUID)
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('user_id, full_name, avatar_url')
            .in('user_id', userIds);
          
          if (!profileError && profileData) {
            userProfiles = profileData.reduce((acc, profile) => {
              acc[profile.user_id] = {
                id: profile.user_id,
                full_name: profile.full_name || 'Anonymous User',
                avatar_url: profile.avatar_url
              };
              return acc;
            }, {});
          } else {
            console.error('Error fetching profiles:', profileError);
          }
        } catch (error) {
          console.error('Error fetching user information:', error);
        }
      }
      
      // Combine feedback with user information
      const formattedReviews = feedbackData.map(review => {
        const userProfile = userProfiles[review.user_id] || {};
        return {
          id: review.id,
          agency_id: review.agency_id,
          user_id: review.user_id,
          agency_name: review.agency_name,
          rating: review.rating,
          satisfaction: review.satisfaction,
          comment: review.comment,
          created_at: review.created_at,
          user_name: userProfile.full_name || 'Anonymous User',
          avatar_url: userProfile.avatar_url || null
        };
      });
      
      return { data: formattedReviews, error: null };
    } catch (error) {
      console.error('Error in getAgencyFeedback:', error);
      return { data: null, error };
    }
  }

  async getAllAgencyReviews() {
    try {
      // First, get all the reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('agency_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reviewsError) {
        console.error('Error fetching all agency reviews:', reviewsError);
        return { error: reviewsError };
      }
      
      if (!reviewsData || reviewsData.length === 0) {
        return { data: [] };
      }
      
      // Get all unique user IDs and agency IDs
      const userIds = [...new Set(reviewsData.map(review => review.user_id))].filter(Boolean);
      const agencyIds = [...new Set(reviewsData.map(review => review.agency_id))].filter(Boolean);
      
      // Fetch user information
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        
        if (!usersError && usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
          }, {});
        } else {
          console.error('Error fetching users:', usersError);
        }
      }
      
      // Fetch agency information (assuming you have an agencies table)
      let agenciesMap = {};
      if (agencyIds.length > 0) {
        const { data: agenciesData, error: agenciesError } = await supabase
          .from('agencies')
          .select('id, name, logo_url')
          .in('id', agencyIds);
        
        if (!agenciesError && agenciesData) {
          agenciesMap = agenciesData.reduce((acc, agency) => {
            acc[agency.id] = agency;
            return acc;
          }, {});
        } else {
          console.error('Error fetching agencies:', agenciesError);
        }
      }
      
      // Combine all the data
      const formattedData = reviewsData.map(review => {
        const user = usersMap[review.user_id] || {};
        const agency = agenciesMap[review.agency_id] || {};
        
        return {
          id: review.id,
          agency_id: review.agency_id,
          agency_name: agency.name || review.agency_name || 'Unknown Agency',
          agency_logo: agency.logo_url || null,
          user_id: review.user_id,
          user_full_name: user.full_name || 'Anonymous',
          user_avatar_url: user.avatar_url || null,
          rating: review.rating,
          satisfaction: review.satisfaction,
          comment: review.comment,
          created_at: review.created_at
        };
      });
      
      return { data: formattedData };
    } catch (error) {
      console.error('Error in getAllAgencyReviews:', error);
      return { error };
    }
  } 
}

export default new FeedbackManager();