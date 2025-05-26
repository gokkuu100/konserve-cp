import { supabase } from '../config/supabaseConfig';

class CalendarManager {
  async getUserMemos(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching user memos:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getUserMemos:', error);
      return { data: [], error };
    }
  }

  async getMemosByDate(userId, date) {
    try {
      if (!userId || !date) {
        throw new Error('User ID and date are required');
      }
      
      const formattedDate = typeof date === 'string' 
        ? date 
        : date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .select('*')
        .eq('user_id', userId)
        .eq('date', formattedDate);
      
      if (error) {
        console.error('Error fetching memos for date:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getMemosByDate:', error);
      return { data: [], error };
    }
  }

  async getUpcomingMemos(userId, limit = 5) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .select('*')
        .eq('user_id', userId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching upcoming memos:', error);
        return { data: [], error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in getUpcomingMemos:', error);
      return { data: [], error };
    }
  }

  async createMemo(memoData) {
    try {
      if (!memoData.user_id || !memoData.date || !memoData.text) {
        throw new Error('User ID, date, and text are required');
      }
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .insert([{
          user_id: memoData.user_id,
          date: memoData.date,
          title: memoData.title || 'Reminder',
          text: memoData.text,
          time: memoData.time || '',
          notification_id: memoData.notification_id || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating memo:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in createMemo:', error);
      return { data: null, error };
    }
  }

  async updateMemo(memoId, memoData) {
    try {
      if (!memoId) {
        throw new Error('Memo ID is required');
      }
      
      const updateData = {};
      if (memoData.title !== undefined) updateData.title = memoData.title;
      if (memoData.text !== undefined) updateData.text = memoData.text;
      if (memoData.time !== undefined) updateData.time = memoData.time;
      if (memoData.date !== undefined) updateData.date = memoData.date;
      if (memoData.notification_id !== undefined) updateData.notification_id = memoData.notification_id;
      
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .update(updateData)
        .eq('id', memoId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating memo:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in updateMemo:', error);
      return { data: null, error };
    }
  }

  async deleteMemo(memoId) {
    try {
      if (!memoId) {
        throw new Error('Memo ID is required');
      }
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .delete()
        .eq('id', memoId)
        .select()
        .single();
      
      if (error) {
        console.error('Error deleting memo:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Exception in deleteMemo:', error);
      return { data: null, error };
    }
  }

  async getMemoDates(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const { data, error } = await supabase
        .from('user_calendar_memos')
        .select('date')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching memo dates:', error);
        return { data: [], error };
      }
      
      // Extract unique dates
      const uniqueDates = [...new Set(data.map(item => item.date))];
      
      return { data: uniqueDates, error: null };
    } catch (error) {
      console.error('Exception in getMemoDates:', error);
      return { data: [], error };
    }
  }
}

export default new CalendarManager();