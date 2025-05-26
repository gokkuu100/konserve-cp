// File: supabase/functions/initialize-payment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTASEND_SECRET_KEY = Deno.env.get('INTASEND_SECRET_KEY')!;
const INTASEND_PUBLISHABLE_KEY = Deno.env.get('INTASEND_PUBLISHABLE_KEY')!;
const INTASEND_TEST_MODE = Deno.env.get('INTASEND_TEST_MODE') === 'true';
const APP_URL = Deno.env.get('APP_URL') || 'http://127.0.0.1:54321';

// Create a Supabase client with the Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// EXACTLY as per their documentation
const CHECKOUT_ENDPOINT = INTASEND_TEST_MODE 
  ? 'https://sandbox.intasend.com/api/v1/checkout/'
  : 'https://payment.intasend.com/api/v1/checkout/';

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Debug log environment setup
  console.log('Environment check:');
  console.log('- CHECKOUT_ENDPOINT:', CHECKOUT_ENDPOINT);
  
  // Show first few characters of keys (for debugging)
  if (INTASEND_SECRET_KEY) {
    console.log('- Secret key prefix:', INTASEND_SECRET_KEY.substring(0, 4) + '****');
  }
  if (INTASEND_PUBLISHABLE_KEY) {
    console.log('- Publishable key prefix:', INTASEND_PUBLISHABLE_KEY.substring(0, 4) + '****');
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
      payment_method = 'mpesa',
      customer,
      metadata = {},
    } = requestBody;

    // Validate required fields
    if (!subscription_id || !amount || !customer || !customer.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields'
      }), { headers, status: 400 });
    }

    // Set up callback URLs
    const successUrl = `${APP_URL}/payment/success?reference=${subscription_id}`;
    const callbackUrl = `${APP_URL}/api/payment-webhook`;

    // Generate a unique reference for this transaction
    const reference = `sub-${subscription_id}-${Date.now()}`;

    // Convert payment_method to IntaSend expected format
    // 'mpesa' -> 'M-PESA', 'card' -> 'CARD-PAYMENT'
    const intasendMethod = payment_method.toLowerCase() === 'mpesa' ? 'M-PESA' : 'CARD-PAYMENT';

    // Create payload EXACTLY as per their documentation example
    const payloadToSend = {
      first_name: customer.first_name || customer.name?.split(' ')[0] || '',
      last_name: customer.last_name || customer.name?.split(' ').slice(1).join(' ') || '',
      email: customer.email,
      method: intasendMethod,
      amount: parseFloat(amount),
      currency: currency,
      api_ref: reference,
      redirect_url: successUrl,
      callback_url: callbackUrl,
      metadata: {
        subscription_id: subscription_id,
        ...metadata,
      }
    };

    // If this is M-PESA, add phone_number
    if (intasendMethod === 'M-PESA') {
      let phoneNumber = customer?.phone_number || '';
      if (phoneNumber && phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1);
      }
      payloadToSend.phone_number = phoneNumber;
    }

    console.log('IntaSend payload:', JSON.stringify(payloadToSend));
    console.log(`Making API request to ${CHECKOUT_ENDPOINT}`);

    // Update the payment transaction record to show we're attempting payment
    try {
      await supabase
        .from('payment_transactions')
        .update({ 
          provider_response: { request: payloadToSend },
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscription_id);
    } catch (dbError) {
      console.error('Error updating payment transaction:', dbError);
    }

    // Make the API call to IntaSend - SIMPLE AUTHORIZATION FORMAT
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INTASEND_SECRET_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    console.log('IntaSend status code:', res.status);
    
    // Get the raw text response for better debugging
    const textResponse = await res.text();
    console.log('IntaSend raw response:', textResponse);
    
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Error parsing IntaSend response:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse payment provider response',
        raw_response: textResponse
      }), { headers, status: 500 });
    }

    if (!res.ok) {
      console.error('IntaSend error:', result);
      
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

    // Extract checkout URL from successful response
    const checkoutUrl = result.url || result.checkout_url;
    const invoiceId = result.invoice?.id || result.id || reference;
    
    if (!checkoutUrl) {
      console.error('No checkout URL in response:', result);
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
          provider_reference: invoiceId,
          checkout_url: checkoutUrl,
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
      checkout_url: checkoutUrl,
      reference: invoiceId,
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
