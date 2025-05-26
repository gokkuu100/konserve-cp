import { supabase } from "../config/supabaseConfig";

/**
 * Service to handle all news-related operations with Supabase
 */
class NewsService {
    /**
     * Fetch all news articles
     * @returns {Promise} Promise object with news articles data
     */
    async getAllNews() {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .order('created_at', { ascending: false })
          .eq('is_active', true);
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching news:', error);
        return { data: null, error };
      }
    }
  
    /**
     * Fetch featured/pinned news articles
     * @returns {Promise} Promise object with featured news data
     */
    async getFeaturedNews() {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('pinned', true)
          .eq('is_active', true)
          .order('pinned_order', { ascending: true });
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching featured news:', error);
        return { data: null, error };
      }
    }
  
    /**
     * Fetch news articles by category
     * @param {string} category - The category to filter by
     * @returns {Promise} Promise object with filtered news data
     */
    async getNewsByCategory(category) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('category', category)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching news by category:', error);
        return { data: null, error };
      }
    }
  
    /**
     * Fetch a single news article by ID
     * @param {string} id - The UUID of the news article
     * @returns {Promise} Promise object with news article data
     */
    async getNewsById(id) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching news article:', error);
        return { data: null, error };
      }
    }
  
    /**
     * Check if a user has read a specific news article
     * @param {string} articleId - The UUID of the news article
     * @returns {Promise} Promise object with read status data
     */
    async checkReadStatus(articleId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
          .from('user_news_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('article_id', articleId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
        
        return { 
          read: data?.read || false, 
          error: null 
        };
      } catch (error) {
        console.error('Error checking read status:', error);
        return { read: false, error };
      }
    }
  
    /**
     * Mark a news article as read for the current user
     * @param {string} articleId - The UUID of the news article
     * @returns {Promise} Promise object with operation result
     */
    async markAsRead(articleId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not authenticated');
        
        // Check if a record already exists
        const { data: existingRecord } = await supabase
          .from('user_news_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('article_id', articleId)
          .single();
        
        if (existingRecord) {
          // Update existing record
          const { error } = await supabase
            .from('user_news_status')
            .update({ 
              read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id);
          
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('user_news_status')
            .insert({
              user_id: user.id,
              article_id: articleId,
              read: true,
              read_at: new Date().toISOString()
            });
          
          if (error) throw error;
        }
        
        return { success: true, error: null };
      } catch (error) {
        console.error('Error marking news as read:', error);
        return { success: false, error };
      }
    }
  
    /**
     * Get all read articles for the current user
     * @returns {Promise} Promise object with read articles data
     */
    async getReadArticles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
          .from('user_news_status')
          .select('article_id')
          .eq('user_id', user.id)
          .eq('read', true);
        
        if (error) throw error;
        
        return { 
          data: data.map(item => item.article_id), 
          error: null 
        };
      } catch (error) {
        console.error('Error fetching read articles:', error);
        return { data: [], error };
      }
    }
  }
  
  export const newsService = new NewsService();
  