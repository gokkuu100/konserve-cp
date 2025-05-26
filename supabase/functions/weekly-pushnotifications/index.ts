import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to send push notifications
async function sendPushNotification(expoPushTokens, title, body, data) {
  const messages = expoPushTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

// Helper to determine if we should send a notification based on user settings
async function shouldSendReminder(userId, supabase) {
  // Get user settings
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('notifications, reminderFrequency')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user settings:', error);
    return true; // Default to sending if we can't fetch settings
  }
  
  // No settings or notifications are turned on
  if (!settings || settings.notifications !== false) {
    // Check reminder frequency
    const frequency = settings?.reminderFrequency || 'weekly';
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // For weekly reminders, send on Mondays (dayOfWeek = 1)
    if (frequency === 'weekly' && dayOfWeek === 1) {
      return true;
    }
    
    // For daily reminders, always send
    if (frequency === 'daily') {
      return true;
    }
    
    // For monthly reminders, send on the 1st of the month
    if (frequency === 'monthly' && now.getDate() === 1) {
      return true;
    }
    
    // Otherwise don't send
    return false;
  }
  
  return false; // Don't send if notifications are turned off
}

serve(async (req) => {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Get all users with push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('push_token, user_id');
    
    if (tokenError) {
      console.error('Error fetching tokens:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch push tokens' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tokens to send notifications to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // For each user, check if we should send a reminder based on their settings
    const tokensToNotify = [];
    
    for (const token of tokens) {
      const shouldSend = await shouldSendReminder(token.user_id, supabase);
      if (shouldSend) {
        tokensToNotify.push(token.push_token);
      }
    }
    
    if (tokensToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users to send reminders to today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Prepare recycling tips
    const recyclingTips = [
      "Remember to rinse containers before recycling them!",
      "Don't forget to recycle your paper and cardboard items today.",
      "Plastic bottles can be recycled, but remember to remove the caps first!",
      "Glass bottles and jars are 100% recyclable and can be recycled endlessly.",
      "Metal cans are valuable recyclables. Make sure to rinse them first!",
      "Did you know? Recycling one aluminum can saves enough energy to run a TV for three hours.",
      "Keep up your recycling efforts - every item counts!",
      "Check for the recycling symbol on items before throwing them away."
    ];
    
    // Pick a random tip
    const randomTip = recyclingTips[Math.floor(Math.random() * recyclingTips.length)];
    
    // Send the notifications
    const result = await sendPushNotification(
      tokensToNotify,
      "Recycling Reminder",
      randomTip,
      { screen: 'Services' }
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        tokensNotified: tokensToNotify.length, 
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in sendWeeklyReminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});