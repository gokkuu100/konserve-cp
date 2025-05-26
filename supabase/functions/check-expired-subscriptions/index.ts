// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface Agency {
  name: string;
}

interface User {
  id: string;
  email: string;
  metadata: {
    expo_push_token?: string;
  };
}

interface Subscription {
  end_date: string;
  users: User;
  agencies: Agency;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send push notifications
async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to check expired subscriptions
    const { data, error } = await supabase.rpc('check_expired_subscriptions');
    
    if (error) throw error;

    // Get subscriptions expiring within 7 days
    const { data: expiringSubscriptions, error: queryError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        agencies (name),
        auth.users!inner (id, email, metadata)
      `)
      .eq('status', 'active')
      .lt('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .gt('end_date', new Date().toISOString());

    if (queryError) throw queryError;

    // Send notifications for expiring subscriptions
    const notifications = await Promise.all(
      (expiringSubscriptions as Subscription[]).map(async (subscription) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (subscription.users.metadata?.expo_push_token) {
          try {
            await sendPushNotification(
              subscription.users.metadata.expo_push_token,
              'Subscription Expiring Soon',
              `Your subscription with ${subscription.agencies.name} will expire in ${daysUntilExpiry} days.`
            );
            return { success: true, user: subscription.users.id };
          } catch (error) {
            console.error(`Failed to send notification to user ${subscription.users.id}:`, error);
            return { success: false, user: subscription.users.id, error: error.message };
          }
        }
        return { success: false, user: subscription.users.id, error: 'No push token available' };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiringSubscriptions?.length || 0,
        notifications
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check expired subscriptions',
        message: error.message,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-expired-subscriptions' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
