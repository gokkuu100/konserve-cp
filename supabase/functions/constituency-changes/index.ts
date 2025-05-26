// Edge function to handle constituency change requests
// Deploy to your Supabase instance using the Supabase CLI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This is a background function that can be scheduled or triggered manually
Deno.serve(async (req) => {
  try {
    // Get API credentials from environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Supabase client with the service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      }
    });
    
    // Find all approved constituency change requests that haven't been processed
    const { data: approvedRequests, error: fetchError } = await supabase
      .from('constituency_change_requests')
      .select('id, user_id, requested_constituency')
      .eq('status', 'approved')
      .eq('processed', false);
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`Found ${approvedRequests?.length || 0} approved requests to process`);
    
    if (!approvedRequests || approvedRequests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No approved requests to process' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Process each approved request
    const results = [];
    
    for (const request of approvedRequests) {
      try {
        // Update user's constituency
        const { error: updateError } = await supabase
          .from('users')
          .update({ constituency: request.requested_constituency })
          .eq('id', request.user_id);
        
        if (updateError) {
          throw updateError;
        }
        
        // Mark the request as processed
        const { error: markError } = await supabase
          .from('constituency_change_requests')
          .update({ processed: true })
          .eq('id', request.id);
        
        if (markError) {
          throw markError;
        }
        
        results.push({
          requestId: request.id,
          userId: request.user_id,
          newConstituency: request.requested_constituency,
          success: true
        });
      } catch (processError) {
        console.error(`Error processing request ${request.id}:`, processError);
        
        results.push({
          requestId: request.id,
          userId: request.user_id,
          success: false,
          error: processError.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, processed: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});