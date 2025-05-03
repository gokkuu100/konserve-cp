// This would be a Supabase Edge Function
// Create a file called 'send-reminder-notifications.js'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to send notifications via Expo's push notification service
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// Main function to send feedback reminders
export async function sendFeedbackReminders() {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get feedback that's 30 days old with no updates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('agency_feedback')
      .select(`
        id, 
        agency_name, 
        user_id, 
        created_at
      `)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq('reminded', false);
    
    if (feedbackError) throw feedbackError;
    
    // For each feedback, get the user's push token and send a notification
    for (const feedback of feedbacks) {
      const { data: userNotif, error: userError } = await supabase
        .from('user_notifications')
        .select('push_token, notifications_enabled')
        .eq('user_id', feedback.user_id)
        .single();
      
      if (userError) continue; // Skip if we can't find user notification settings
      
      if (userNotif && userNotif.notifications_enabled && userNotif.push_token) {
        // Send push notification
        await sendPushNotification(
          userNotif.push_token,
          'Feedback Update',
          `Would you like to update your feedback for ${feedback.agency_name}?`,
          { screen: 'Feedback', params: { agencyName: feedback.agency_name } }
        );
        
        // Mark feedback as reminded
        await supabase
          .from('agency_feedback')
          .update({ reminded: true })
          .eq('id', feedback.id);
      }
    }
    
    return { success: true, count: feedbacks.length };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: false, error: error.message };
  }
}

// HTTP handler for manual triggering or testing
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const result = await sendFeedbackReminders();
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});