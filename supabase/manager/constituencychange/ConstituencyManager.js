import { supabase } from '../../config/supabaseConfig';

const ConstituencyManager = {
  /**
   * Submit a constituency change request
   */
  submitChangeRequest: async ({ userId, currentConstituency, requestedConstituency, reason }) => {
    try {
      if (!userId || !requestedConstituency || !reason) {
        return { success: false, error: { message: 'Missing required fields' } };
      }
      
      console.log(`Submitting constituency change request for user ${userId}`);
      console.log(`Current: ${currentConstituency}, Requested: ${requestedConstituency}`);
      
      // Check if user already has a pending request
      const { data: existingRequests, error: checkError } = await supabase
        .from('constituency_change_requests')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1);
      
      if (checkError) {
        console.error("Error checking existing requests:", checkError);
        throw checkError;
      }
      
      if (existingRequests && existingRequests.length > 0) {
        return {
          success: false,
          error: { message: 'You already have a pending constituency change request' }
        };
      }
      
      // Insert the new request
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .insert([
          {
            user_id: userId,
            current_constituency: currentConstituency,
            requested_constituency: requestedConstituency,
            reason,
            status: 'pending',
            processed: false
          }
        ]);
      
      if (error) {
        console.error("Error submitting request:", error);
        throw error;
      }
      
      console.log("Constituency change request submitted successfully");
      return { success: true };
    } catch (error) {
      console.error('Error submitting constituency change request:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Check user constituency change request status
   */
  checkRequestStatus: async (userId) => {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required' } };
      }
      
      // Get latest request (any status)
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        const request = data[0];
        return {
          success: true,
          hasRequest: true,
          isPending: request.status === 'pending',
          isApproved: request.status === 'approved',
          isDenied: request.status === 'denied',
          request
        };
      }
      
      return {
        success: true,
        hasRequest: false
      };
    } catch (error) {
      console.error('Error checking request status:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Trigger edge function to process approved constituency changes
   * This can be called periodically from your app
   */
  triggerConstituencyUpdates: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('update-constituency');
      
      if (error) {
        throw error;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error triggering constituency updates:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Check if user has any pending constituency change requests
   */
  checkPendingRequests: async (userId) => {
    try {
      if (!userId) {
        return { success: false, error: { message: 'User ID is required' } };
      }
      
      console.log(`Checking pending requests for user ${userId}`);
      
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error checking pending requests:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} pending requests`);
      
      if (data && data.length > 0) {
        return {
          success: true,
          hasPendingRequest: true,
          request: data[0]
        };
      }
      
      return {
        success: true,
        hasPendingRequest: false
      };
    } catch (error) {
      console.error('Error checking pending requests:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Cancel a constituency change request
   */
  cancelRequest: async (requestId) => {
    try {
      if (!requestId) {
        return { success: false, error: { message: 'Request ID is required' } };
      }
      
      console.log(`Cancelling request ${requestId}`);
      
      const { error } = await supabase
        .from('constituency_change_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) {
        console.error("Error cancelling request:", error);
        throw error;
      }
      
      console.log("Request cancelled successfully");
      return { success: true };
    } catch (error) {
      console.error('Error cancelling request:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Set up a listener for constituency change approvals
   */
  listenForApprovedRequests: (userId, onApproved) => {
    if (!userId) return null;
    
    // Subscribe to changes in the constituency_change_requests table
    const subscription = supabase
      .channel('constituency_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'constituency_change_requests',
          filter: `user_id=eq.${userId} AND status=eq.approved`
        },
        async (payload) => {
          console.log('Constituency change request approved:', payload);
          
          // Get the approved request
          const approvedRequest = payload.new;
          
          try {
            // Update the user's constituency
            const { error } = await supabase
              .from('users')
              .update({ constituency: approvedRequest.requested_constituency })
              .eq('user_id', userId);
            
            if (error) {
              console.error('Error updating user constituency:', error);
              return;
            }
            
            // Call the callback function if provided
            if (typeof onApproved === 'function') {
              onApproved(approvedRequest.requested_constituency);
            }
          } catch (error) {
            console.error('Error processing approved constituency change:', error);
          }
        }
      )
      .subscribe();
    
    return subscription;
  },
  
  /**
   * Process approved constituency changes
   */
  processApprovedChanges: async () => {
    try {
      console.log("Processing approved constituency changes");
      
      // Get approved but unprocessed requests
      const { data, error } = await supabase
        .from('constituency_change_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('processed', false);
      
      if (error) {
        console.error("Error fetching approved requests:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} approved requests to process`);
      
      if (!data || data.length === 0) {
        return { success: true, processed: 0 };
      }
      
      // Process each request
      let processed = 0;
      
      for (const request of data) {
        try {
          console.log(`Processing request ${request.id} for user ${request.user_id}`);
          console.log(`Updating constituency to: ${request.requested_constituency}`);
          
          // IMPORTANT: Update using user_id field instead of id
          const { error: updateError } = await supabase
            .from('users')
            .update({ constituency: request.requested_constituency })
            .eq('user_id', request.user_id);
          
          if (updateError) {
            console.error("Error updating user constituency:", updateError);
            // Try using stored procedure as fallback
            const { error: rpcError } = await supabase.rpc(
              'update_user_constituency_by_uuid',
              { 
                user_uuid: request.user_id,
                new_constituency: request.requested_constituency
              }
            );
            
            if (rpcError) {
              throw rpcError;
            }
          }
          
          // Mark as processed
          const { error: markError } = await supabase
            .from('constituency_change_requests')
            .update({ processed: true })
            .eq('id', request.id);
          
          if (markError) {
            console.error("Error marking request as processed:", markError);
            throw markError;
          }
          
          processed++;
          console.log(`Successfully processed request ${request.id}`);
        } catch (processError) {
          console.error(`Error processing request ${request.id}:`, processError);
        }
      }
      
      return { success: true, processed };
    } catch (error) {
      console.error('Error processing approved changes:', error);
      return { success: false, error };
    }
  }
};

export default ConstituencyManager;