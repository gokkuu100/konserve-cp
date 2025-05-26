import { supabase } from '../config/supabaseConfig';
import { REQUEST_STATUS } from '../config/constants';

class ConstituencyManager {
  async submitConstituencyChangeRequest(requestData) {
    try {
      if (!this.validateRequestData(requestData)) {
        return { 
          success: false, 
          error: new Error('Missing required fields') 
        };
      }
      
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .insert([{
          user_id: requestData.userId,
          current_constituency: requestData.currentConstituency,
          requested_constituency: requestData.requestedConstituency,
          reason: requestData.reason,
          status: REQUEST_STATUS.PENDING,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Error submitting constituency change request:', error);
        return { success: false, error };
      }
      
      return { success: true, data, error: null };
    } catch (err) {
      console.error('Exception in submitConstituencyChangeRequest:', err);
      return { success: false, error: err };
    }
  }

  validateRequestData(requestData) {
    return !!(
      requestData.userId &&
      requestData.currentConstituency &&
      requestData.requestedConstituency &&
      requestData.reason
    );
  }

  async checkPendingConstituencyRequests(userId) {
    try {
      if (!userId) {
        return { 
          success: false, 
          hasPendingRequest: false, 
          request: null, 
          error: new Error('User ID is required') 
        };
      }
      
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', REQUEST_STATUS.PENDING)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error checking pending constituency requests:', error);
        return { 
          success: false, 
          hasPendingRequest: false, 
          request: null, 
          error 
        };
      }
      
      const hasPendingRequest = data && data.length > 0;
      
      return { 
        success: true, 
        hasPendingRequest, 
        request: hasPendingRequest ? data[0] : null, 
        error: null 
      };
    } catch (err) {
      console.error('Exception in checkPendingConstituencyRequests:', err);
      return { 
        success: false, 
        hasPendingRequest: false, 
        request: null, 
        error: err 
      };
    }
  }

  async cancelConstituencyChangeRequest(requestId) {
    try {
      if (!requestId) {
        return { success: false, error: new Error('Request ID is required') };
      }
      
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .update({ 
          status: REQUEST_STATUS.CANCELLED,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select();
      
      if (error) {
        console.error('Error cancelling constituency change request:', error);
        return { success: false, error };
      }
      
      return { success: true, data, error: null };
    } catch (err) {
      console.error('Exception in cancelConstituencyChangeRequest:', err);
      return { success: false, error: err };
    }
  }

  async updateUserConstituencyAfterApproval(userId, newConstituency, requestId) {
    try {
      if (!userId || !newConstituency) {
        return { 
          success: false, 
          error: new Error('User ID and new constituency are required') 
        };
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({ 
          constituency: newConstituency,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (profileError) {
        console.error('Error updating user constituency:', profileError);
        return { success: false, error: profileError };
      }
      
      if (requestId) {
        const { error: requestError } = await supabase
          .from('constituency_change_requests')
          .update({ 
            status: REQUEST_STATUS.APPROVED,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        if (requestError) {
          return { 
            success: true, 
            warning: 'Profile updated but request status update failed',
            error: requestError 
          };
        }
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Exception in updateUserConstituencyAfterApproval:', error);
      return { success: false, error };
    }
  }

  async getConstituencyHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching constituency history:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception in getConstituencyHistory:', error);
      return { data: null, error };
    }
  }
}

export default new ConstituencyManager();