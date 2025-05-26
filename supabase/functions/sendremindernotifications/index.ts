// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface Feedback {
  id: string;
  agency_name: string;
  user_id: string;
  created_at: string;
}

interface UserNotification {
  push_token: string;
  notifications_enabled: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to send notifications via Expo's push notification service
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
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
async function sendFeedbackReminders() {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
  
  // Process each feedback and send notifications
  const results = await Promise.all(
    (feedbacks as Feedback[]).map(async (feedback) => {
      try {
        const { data: userNotif, error: userError } = await supabase
          .from('user_notifications')
          .select('push_token, notifications_enabled')
          .eq('user_id', feedback.user_id)
          .single();
        
        if (userError) {
          return { 
            success: false, 
            feedback_id: feedback.id, 
            error: 'User notification settings not found' 
          };
        }
        
        if (userNotif?.notifications_enabled && userNotif?.push_token) {
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
            
          return { success: true, feedback_id: feedback.id };
        }
        
        return { 
          success: false, 
          feedback_id: feedback.id, 
          error: 'Notifications disabled or no push token' 
        };
      } catch (error) {
        return { 
          success: false, 
          feedback_id: feedback.id, 
          error: error.message 
        };
      }
    })
  );
  
  return {
    success: true,
    total: feedbacks.length,
    results
  };
}

// HTTP handler for the Edge Function
serve(async (req: Request) => {
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
    console.error('Error sending notifications:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sendremindernotifications' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
