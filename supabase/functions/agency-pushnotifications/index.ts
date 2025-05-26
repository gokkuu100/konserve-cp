// supabase/functions/agency-pushnotifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Webhook triggered - processing request');
  
  try {
    // Log the raw request for debugging
    const requestBody = await req.json();
    console.log('Received webhook payload:', JSON.stringify(requestBody));
    
    const { record, table } = requestBody;
    
    if (!record) {
      console.error('No record found in webhook payload');
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    console.log(`Processing record from table ${table || 'unknown'}:`, JSON.stringify(record));

    // Create a Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') }
        }
      }
    );

    // Get the agency name for the notification
    let agencyName = 'Agency';
    if (record.agency_id) {
      const { data: agencyData, error: agencyError } = await supabaseAdmin
        .from('agencies')
        .select('name')
        .eq('id', record.agency_id)
        .single();
        
      if (!agencyError && agencyData) {
        agencyName = agencyData.name;
      }
    }
    
    // Determine if this is a direct message or broadcast message based on the table or record structure
    const isDirectMessage = table === 'agency_messages_direct' || record.users_id !== undefined;
    
    console.log(`Message type: ${isDirectMessage ? 'Direct' : 'Broadcast'}`);
    
    if (isDirectMessage) {
      // For direct messages, get the user's push token
      const { data: tokens, error: tokenError } = await supabaseAdmin
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', record.users_id);
        
      if (tokenError) {
        console.error('Error fetching user tokens:', tokenError);
        return new Response(JSON.stringify({ error: 'Failed to fetch user tokens' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      console.log(`Found ${tokens?.length || 0} push tokens for user ${record.users_id}`);
      
      // Send push notification to each token
      for (const token of tokens || []) {
        console.log(`Sending direct message notification to token: ${token.push_token.substring(0, 10)}...`);
        
        await sendPushNotification(
          token.push_token,
          `New message from ${agencyName}`,
          record.subject || 'You have a new direct message',
          {
            screen: 'Messages',
            messageId: record.id,
            messageType: 'direct',
            agencyId: record.agency_id
          }
        );
      }
    } else {
      // For broadcast messages, get tokens of users subscribed to the agency
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('agency_subscriptions')
        .select('user_id')
        .eq('agency_id', record.agency_id)
        .eq('status', 'active');
        
      if (subError) {
        console.error('Error fetching subscriptions:', subError);
        return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      console.log(`Found ${subscriptions?.length || 0} active subscriptions for agency ${record.agency_id}`);
      
      // Get all user IDs
      const userIds = subscriptions?.map((sub) => sub.user_id) || [];
      
      if (userIds.length > 0) {
        // Get push tokens for these users
        const { data: tokens, error: tokenError } = await supabaseAdmin
          .from('user_push_tokens')
          .select('push_token, user_id')
          .in('user_id', userIds);
          
        if (tokenError) {
          console.error('Error fetching user tokens:', tokenError);
          return new Response(JSON.stringify({ error: 'Failed to fetch user tokens' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
        
        console.log(`Found ${tokens?.length || 0} push tokens to notify for broadcast`);
        
        // Send notifications to all tokens
        for (const token of tokens || []) {
          console.log(`Sending broadcast notification to user ${token.user_id}`);
          
          await sendPushNotification(
            token.push_token,
            `${agencyName} Announcement`,
            record.subject || 'New broadcast message',
            {
              screen: 'Messages',
              messageId: record.id,
              messageType: 'broadcast',
              agencyId: record.agency_id
            }
          );
        }
      } else {
        console.log('No active subscribers found for this agency');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Helper function to send push notification
async function sendPushNotification(expoPushToken, title, body, data) {
  console.log(`Sending push notification: ${title} - ${body}`);
  
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data
  };
  
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    const responseData = await response.json();
    console.log('Push notification response:', JSON.stringify(responseData));
    return responseData;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}