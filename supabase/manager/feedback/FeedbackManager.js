import { supabase } from '../config/supabaseConfig';

class FeedbackManager {
  async submitFeedback(feedbackData) {
    try {
      console.log('Submitting feedback to database:', feedbackData);
      
      const { data, error } = await supabase
        .from('user_app_feedback')
        .insert([{
          user_id: feedbackData.userId,
          rating: feedbackData.rating,
          rating_description: feedbackData.rating_description,
          selected_features: feedbackData.selectedFeatures, // Don't stringify, Supabase handles arrays
          comment: feedbackData.comment,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        return { error };
      }

      console.log('Feedback submitted successfully:', data);
      return { data };
    } catch (error) {
      console.error('Exception in submitFeedback:', error);
      return { error };
    }
  }

  async getUserFeedbackHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('user_app_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user feedback history:', error);
        return { error };
      }

      // Parse selected_features from JSON string to array
      data.forEach(item => {
        item.selected_features = JSON.parse(item.selected_features);
      });

      return { data };
    } catch (error) {
      console.error('Exception in getUserFeedbackHistory:', error);
      return { error };
    }
  }

  async getAppFeedbackStats() {
    try {
      const { data, error } = await supabase
        .from('user_app_feedback')
        .select('rating')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching app feedback stats:', error);
        return { error };
      }

      // Calculate average rating
      const totalRatings = data.length;
      if (totalRatings === 0) {
        return { 
          data: { 
            averageRating: 0, 
            totalRatings: 0,
            ratingDistribution: {
              1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            }
          } 
        };
      }

      const sum = data.reduce((acc, item) => acc + parseFloat(item.rating), 0);
      const averageRating = sum / totalRatings;

      // Calculate rating distribution
      const ratingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };

      data.forEach(item => {
        const rating = Math.floor(parseFloat(item.rating));
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating]++;
        }
      });

      return { 
        data: { 
          averageRating, 
          totalRatings,
          ratingDistribution
        } 
      };
    } catch (error) {
      console.error('Exception in getAppFeedbackStats:', error);
      return { error };
    }
  }
}

export default new FeedbackManager();