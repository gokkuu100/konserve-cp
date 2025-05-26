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
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get current time in HH:MM format
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const timeNow = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Get next hour time range (current time to current time + 1 hour)
    const nextHour = new Date(today);
    nextHour.setHours(nextHour.getHours() + 1);
    const nextHourStr = `${nextHour.getHours().toString().padStart(2, '0')}:${nextHour.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`Checking for waste calendar entries for today (${todayStr}) between ${timeNow} and ${nextHourStr}`);
    
    // Query the waste_calendar table for entries that are scheduled for today
    // and have a time within the next hour
    const { data: calendarEntries, error: calendarError } = await supabase
      .from('user_calenadar_memos')
      .select(`
        id, 
        user_id, 
        date, 
        title, 
        text, 
        time, 
        notification_id
      `)
      .eq('date', todayStr)
      .gte('time', timeNow)
      .lt('time', nextHourStr);
    
    if (calendarError) {
      console.error('Error fetching calendar entries:', calendarError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch calendar entries' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!calendarEntries || calendarEntries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No calendar entries to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    console.log(`Found ${calendarEntries.length} calendar entries to process`);
    
    // Process each calendar entry
    const results = await Promise.all(
      calendarEntries.map(async (entry) => {
        try {
          // Check if the user has notifications enabled
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('notifications')
            .eq('user_id', entry.user_id)
            .maybeSingle();
          
          // Skip if notifications are explicitly disabled
          if (settings && settings.notifications === false) {
            return { 
              success: false, 
              entry_id: entry.id, 
              message: 'User has disabled notifications' 
            };
          }
          
          // Get the user's push token
          const { data: tokens, error: tokenError } = await supabase
            .from('user_push_tokens')
            .select('push_token')
            .eq('user_id', entry.user_id);
          
          if (tokenError || !tokens || tokens.length === 0) {
            return { 
              success: false, 
              entry_id: entry.id, 
              message: 'No push token found for user' 
            };
          }
          
          // Send push notification
          const pushTokens = tokens.map(token => token.push_token);
          const notificationTitle = entry.title || 'Waste Collection Reminder';
          const notificationBody = entry.text || 'Time for waste collection';
          
          const notificationData = {
            screen: 'WasteCalendar',
            date: entry.date,
            memoId: entry.id
          };
          
          const result = await sendPushNotification(
            pushTokens,
            notificationTitle,
            notificationBody,
            notificationData
          );
          
          return { 
            success: true, 
            entry_id: entry.id, 
            result 
          };
        } catch (error) {
          console.error(`Error processing entry ${entry.id}:`, error);
          return { 
            success: false, 
            entry_id: entry.id, 
            error: error.message 
          };
        }
      })
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed: calendarEntries.length, 
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing calendar reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});