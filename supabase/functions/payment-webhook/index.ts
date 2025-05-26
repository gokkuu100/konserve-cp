// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { IntaSend } from 'npm:intasend-node'

// Types
interface PaymentRequest {
  subscription_id: string;
  amount: number;
  payment_method: 'mpesa' | 'card';
  phone_number?: string;
  email: string;
  currency?: string;
}

interface Subscription {
  user_id: string;
  agencies: {
    name: string;
  };
  subscription_plans: {
    name: string;
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTASEND_SECRET_KEY = Deno.env.get('INTASEND_SECRET_KEY')!;

// Create a Supabase client with the Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Parse the webhook payload
    const payload = await req.json();
    
    console.log('Received webhook payload:', payload);
    
    // Validate the webhook payload
    if (!payload.invoice || !payload.state) {
      return new Response(JSON.stringify({ 
        error: 'Invalid webhook payload' 
      }), { headers: corsHeaders, status: 400 });
    }
    
    // Get the subscription ID from the metadata
    const subscriptionId = payload.metadata?.subscription_id;
    
    if (!subscriptionId) {
      console.error('No subscription_id found in metadata:', payload.metadata);
      return new Response(JSON.stringify({ 
        error: 'No subscription ID found in metadata' 
      }), { headers: corsHeaders, status: 400 });
    }
    
    // Get the payment transaction for this subscription
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();
      
    if (txError) {
      console.error('Error fetching transaction:', txError);
      return new Response(JSON.stringify({ 
        error: 'Payment transaction not found' 
      }), { headers: corsHeaders, status: 404 });
    }
    
    // Get the payment state from IntaSend
    const paymentState = payload.state.toLowerCase();
    
    // Determine the status based on IntaSend's state
    let status = 'pending';
    
    if (paymentState === 'complete' || paymentState === 'success' || paymentState === 'successful') {
      status = 'successful';
    } else if (paymentState === 'failed' || paymentState === 'cancelled') {
      status = 'failed';
    }
    
    // Update the payment transaction
    await supabase
      .from('payment_transactions')
      .update({
        status: status,
        provider_response: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);
    
    // If payment was successful, update the subscription status
    if (status === 'successful') {
      // Calculate subscription end date (30 days from now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Default to 30 days
      
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_details: {
            provider: 'intasend',
            reference: payload.invoice,
            amount: payload.value,
            currency: payload.currency,
            paid_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
    } else if (status === 'failed') {
      // Update subscription status to failed
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      message: `Payment ${status}`
    }), { headers: corsHeaders, status: 200 });
    
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message 
    }), { headers: corsHeaders, status: 500 });
  }
});


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/payment-webhook' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
