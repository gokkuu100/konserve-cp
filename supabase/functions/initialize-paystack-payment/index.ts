import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'http://127.0.0.1:54321';
const MOBILE_APP_SCHEME = Deno.env.get('MOBILE_APP_SCHEME') || 'myapp://';

// Create a Supabase client with the Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Paystack API base URL
const PAYSTACK_API_URL = 'https://api.paystack.co';

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Debug log environment setup
  console.log('Environment check:');
  console.log('- PAYSTACK_API_URL:', PAYSTACK_API_URL);
  console.log('- MOBILE_APP_SCHEME:', MOBILE_APP_SCHEME);
  
  // Show first few characters of key (for debugging)
  if (PAYSTACK_SECRET_KEY) {
    console.log('- Paystack Secret key prefix:', PAYSTACK_SECRET_KEY.substring(0, 4) + '****');
  }

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { 
      headers, 
      status: 405 
    });
  }

  try {
    const requestBody = await req.json();
    console.log('Request payload:', JSON.stringify(requestBody));
    
    const {
      subscription_id,
      amount,
      currency = 'KES',
      customer,
      metadata = {},
      useWebhook = false,
    } = requestBody;

    // Validate required fields
    if (!subscription_id || !amount || !customer || !customer.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields'
      }), { headers, status: 400 });
    }

    // Set up callback URLs for Paystack
    // Use either web URL or mobile deep link depending on platform
    // The key difference is we're using the mobile app scheme for callbacks
    const successUrl = `${MOBILE_APP_SCHEME}payment/success?reference=${subscription_id}`;
    const cancelUrl = `${MOBILE_APP_SCHEME}payment/cancel?reference=${subscription_id}`;
    
    // Generate a unique reference for this transaction
    const reference = `sub-${subscription_id}-${Date.now()}`;

    // Format the amount according to Paystack requirements (in kobo/cents)
    // Paystack expects amount in the smallest currency unit (kobo for NGN, cents for USD)
    // For KES, multiply by 100 to convert to cents
    const paystackAmount = Math.round(parseFloat(amount) * 100);

    // Create Paystack payload
    const payloadToSend = {
      email: customer.email,
      amount: paystackAmount,
      currency: currency,
      reference: reference,
      callback_url: successUrl,
      metadata: {
        cancel_action: cancelUrl,
        subscription_id: subscription_id,
        customer_name: customer.first_name ? `${customer.first_name} ${customer.last_name || ''}` : customer.name,
        ...metadata,
      }
    };

    console.log('Paystack payload:', JSON.stringify(payloadToSend));
    console.log(`Making API request to ${PAYSTACK_API_URL}/transaction/initialize`);

    // Update the payment transaction record to show we're attempting payment
    try {
      await supabase
        .from('payment_transactions')
        .update({ 
          provider: 'paystack',
          provider_response: { request: payloadToSend },
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription_id);
    } catch (dbError) {
      console.error('Error updating payment transaction:', dbError);
    }

    // Make the API call to Paystack
    const res = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    console.log('Paystack status code:', res.status);
    
    // Get the raw text response for better debugging
    const textResponse = await res.text();
    console.log('Paystack raw response:', textResponse);
    
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Error parsing Paystack response:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse payment provider response',
        raw_response: textResponse
      }), { headers, status: 500 });
    }

    if (!result.status || result.status === false) {
      console.error('Paystack error:', result);
      
      // Update the payment transaction status to failed
      try {
        await supabase
          .from('payment_transactions')
          .update({ 
            status: 'failed',
            provider_response: result,
            updated_at: new Date().toISOString()
          })
          .eq('subscription_id', subscription_id);
      } catch (dbError) {
        console.error('Error updating payment transaction after failure:', dbError);
      }
      
      return new Response(JSON.stringify({ 
        error: 'Payment initialization failed', 
        details: result
      }), { headers, status: 500 });
    }

    // Extract checkout URL and reference from successful response
    const authorizationUrl = result.data?.authorization_url;
    const transactionReference = result.data?.reference || reference;
    const accessCode = result.data?.access_code;
    
    if (!authorizationUrl) {
      console.error('No authorization URL in response:', result);
      return new Response(JSON.stringify({
        error: 'No checkout URL in response',
        response: result
      }), { headers, status: 500 });
    }
    
    // Update the payment transaction with the provider's reference
    try {
      await supabase
        .from('payment_transactions')
        .update({ 
          provider_reference: transactionReference,
          checkout_url: authorizationUrl,
          provider_response: result,
          updated_at: new Date().toISOString(),
          status: 'processing'
        })
        .eq('subscription_id', subscription_id);
    } catch (dbError) {
      console.error('Error updating payment transaction after success:', dbError);
    }
    
    // Return the checkout information to the client
    return new Response(JSON.stringify({
      checkout_url: authorizationUrl,
      reference: transactionReference,
      access_code: accessCode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      status: 'success',
      response: result
    }), { headers, status: 200 });

  } catch (err) {
    console.error('Unexpected error:', err);
    console.error('Stack trace:', err.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message
    }), { headers, status: 500 });
  }
});