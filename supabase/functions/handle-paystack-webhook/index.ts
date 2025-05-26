// Create a new edge function: handle-paystack-webhook.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;

// Create a Supabase client with the Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  try {
    // For Paystack webhooks, we should verify the signature
    // This is a basic implementation - you might want to add more security
    const body = await req.text();
    console.log('Received webhook:', body);
    
    // Parse the body
    const data = JSON.parse(body);
    
    // Process based on the event type
    if (data.event === 'charge.success') {
      const reference = data.data.reference;
      console.log(`Payment success for reference: ${reference}`);
      
      // Extract subscription_id from reference (assuming format: sub-{subscription_id}-{timestamp})
      let subscription_id = null;
      if (reference && reference.startsWith('sub-')) {
        const parts = reference.split('-');
        if (parts.length >= 2) {
          subscription_id = parts[1];
        }
      } else if (data.data?.metadata?.subscription_id) {
        // Alternative: get subscription_id from metadata
        subscription_id = data.data.metadata.subscription_id;
      }
      
      if (subscription_id) {
        console.log(`Updating subscription ${subscription_id} to completed`);
        
        // Update payment transaction
        try {
          await supabase
            .from('payment_transactions')
            .update({ 
              status: 'completed',
              provider_response: data,
              updated_at: new Date().toISOString()
            })
            .eq('subscription_id', subscription_id);
        } catch (dbError) {
          console.error('Error updating payment transaction:', dbError);
        }
        
        // Update user subscription
        try {
          await supabase
            .from('user_subscriptions')
            .update({ 
              status: 'active',
              payment_status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription_id);
        } catch (dbError) {
          console.error('Error updating user subscription:', dbError);
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      status: 'success',
      message: 'Webhook received'
    }), { headers, status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing error',
      details: err.message
    }), { headers, status: 500 });
  }
});