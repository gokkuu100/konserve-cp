// supabase/functions/organization-pushnotifications/index.ts
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

  console.log('Organization notification webhook triggered - processing request');
  
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
    
    console.log(`Processing organization record from table ${table || 'unknown'}:`, JSON.stringify(record));

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

    // Get organization name if not provided in the record
    let orgName = record.orgName || 'Organization';
    if (!record.orgName && record.orgId) {
      const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')  // Assuming you have an organizations table
        .select('name')
        .eq('id', record.orgId)
        .single();
        
      if (!orgError && orgData) {
        orgName = orgData.name;
      }
    }
    
    // Determine if this is a direct message or broadcast message based on the table or record structure
    const isDirectMessage = table === 'organization_directmessages' || record.user_id !== undefined;
    
    console.log(`Organization message type: ${isDirectMessage ? 'Direct' : 'Broadcast'}`);
    
    if (isDirectMessage) {
      // For direct messages, get the user's push token
      const { data: tokens, error: tokenError } = await supabaseAdmin
        .from('user_push_tokens')
        .select('push_token')
        .eq('user_id', record.user_id);
        
      if (tokenError) {
        console.error('Error fetching user tokens:', tokenError);
        return new Response(JSON.stringify({ error: 'Failed to fetch user tokens' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      console.log(`Found ${tokens?.length || 0} push tokens for user ${record.user_id}`);
      
      // Send push notification to each token
      for (const token of tokens || []) {
        console.log(`Sending direct organization message notification to token: ${token.push_token.substring(0, 10)}...`);
        
        await sendPushNotification(
          token.push_token,
          `New message from ${orgName}`,
          record.title || 'You have a new direct message',
          {
            screen: 'OrgMessages',
            messageId: record.id,
            messageType: 'direct',
            orgId: record.orgId
          }
        );
      }
    } else {
      // For broadcast messages, get all user tokens
      // You might want to filter this to only users who have subscribed to organization updates
      // For now, as per your original code, we're sending to all users
      const { data: tokens, error: tokenError } = await supabaseAdmin
        .from('user_push_tokens')
        .select('push_token, user_id');
        
      if (tokenError) {
        console.error('Error fetching user tokens:', tokenError);
        return new Response(JSON.stringify({ error: 'Failed to fetch user tokens' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      console.log(`Found ${tokens?.length || 0} push tokens for broadcast org notification`);
      
      // Send notifications to all tokens
      for (const token of tokens || []) {
        console.log(`Sending organization broadcast to user token: ${token.push_token.substring(0, 10)}...`);
        
        await sendPushNotification(
          token.push_token,
          `${orgName} ${record.type === 'announcement' ? 'Announcement' : 'Update'}`,
          record.title || 'New organization message',
          {
            screen: 'OrgMessages',
            messageId: record.id,
            messageType: 'broadcast',
            orgId: record.orgId
          }
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Error processing organization webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Helper function to send push notification
async function sendPushNotification(expoPushToken, title, body, data) {
  console.log(`Sending organization push notification: ${title} - ${body}`);
  
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
    console.log('Organization push notification response:', JSON.stringify(responseData));
    return responseData;
  } catch (error) {
    console.error('Error sending organization push notification:', error);
    throw error;
  }
}