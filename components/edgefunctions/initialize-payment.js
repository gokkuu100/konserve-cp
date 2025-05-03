// Modified edge function (initialize-payment.js)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const INTASEND_API_KEY = Deno.env.get('INTASEND_API_KEY')
const INTASEND_PUBLISHABLE_KEY = Deno.env.get('INTASEND_PUBLISHABLE_KEY')
const INTASEND_TEST_MODE = Deno.env.get('INTASEND_TEST_MODE') === 'true'
const INTASEND_API_URL = INTASEND_TEST_MODE
  ? 'https://sandbox.intasend.com/api/v1'
  : 'https://payment.intasend.com/api/v1'

// Respond with CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Add debug logging
    console.log('Starting payment initialization...');
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Get and validate request body
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const {
      subscription_id,
      amount,
      currency,
      payment_method,
      customer,
      metadata
    } = requestBody;
    
    if (!subscription_id) {
      throw new Error('Missing subscription_id in request');
    }
    
    if (!amount) {
      throw new Error('Missing amount in request');
    }
    
    // Validate InTaSend configuration
    if (!INTASEND_API_KEY) {
      throw new Error('Missing InTaSend API key');
    }
    
    if (!INTASEND_PUBLISHABLE_KEY) {
      throw new Error('Missing InTaSend publishable key');
    }
    
    // Check subscription
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single();
      
    if (subscriptionError || !subscription) {
      console.error('Subscription fetch error:', subscriptionError);
      throw new Error(`Subscription not found: ${subscriptionError?.message || 'No subscription with that ID'}`);
    }
    
    // Format phone number
    let phoneNumber = customer?.phone_number || '';
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.startsWith('0') 
        ? `+254${phoneNumber.substring(1)}` 
        : `+${phoneNumber}`;
    }
    
    // Find existing payment transaction
    const { data: existingTransaction, error: existingTxError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('subscription_id', subscription_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    // Use existing transaction or create a new one
    let paymentTransaction = existingTransaction;
    
    if (!paymentTransaction) {
      // Create payment transaction record only if one doesn't already exist
      const { data: newTransaction, error: txError } = await supabaseClient
        .from('payment_transactions')
        .insert({
          subscription_id: subscription_id,
          user_id: subscription.user_id,
          amount: amount,
          currency: currency || 'KES',
          payment_method: payment_method,
          status: 'pending',
          metadata: metadata || {}
        })
        .select()
        .single();
        
      if (txError || !newTransaction) {
        console.error('Transaction creation error:', txError);
        throw new Error(`Failed to create payment transaction: ${txError?.message || 'Unknown error'}`);
      }
      
      paymentTransaction = newTransaction;
    }

    // Prepare InTaSend payload
    const paymentPayload = {
      amount: parseFloat(amount),
      currency: currency || 'KES',
      customer: {
        email: customer?.email || '',
        phone_number: phoneNumber || '',
        name: customer?.name || ''
      },
      payment_method: payment_method === 'mpesa' ? 'M-PESA' : 'CARD',
      redirect_url: `${Deno.env.get('APP_URL') || 'http://127.0.0.1:54321'}/payment/callback`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      metadata: {
        subscription_id,
        payment_transaction_id: paymentTransaction.id,
        ...(metadata || {})
      }
    };
    
    console.log('InTaSend payload:', JSON.stringify(paymentPayload, null, 2));
    console.log('InTaSend API URL:', INTASEND_API_URL);
    
    // Make request to InTaSend API
    const response = await fetch(`${INTASEND_API_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INTASEND_API_KEY}`,
        'Content-Type': 'application/json',
        'X-IntaSend-Public-API-Key': INTASEND_PUBLISHABLE_KEY
      },
      body: JSON.stringify(paymentPayload)
    });
    
    const responseText = await response.text();
    console.log('InTaSend raw response:', responseText);
    console.log('InTaSend status code:', response.status);
    
    let paymentResponse;
    try {
      paymentResponse = JSON.parse(responseText);
    } catch (error) {
      console.error('Invalid JSON in InTaSend response:', responseText);
      throw new Error('Invalid response from payment provider');
    }
    
    if (!response.ok) {
      console.error('InTaSend error response:', paymentResponse);
      throw new Error(paymentResponse.message || 'Payment initialization failed');
    }
    
    // Update payment transaction with provider details
    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update({
        provider_transaction_id: paymentResponse.invoice?.id,
        checkout_url: paymentResponse.checkout_url,
        status: 'processing',
        metadata: { 
          ...paymentTransaction.metadata, 
          intasend_response: paymentResponse 
        }
      })
      .eq('id', paymentTransaction.id);
      
    if (updateError) {
      console.error('Transaction update error:', updateError);
    }
    
    console.log('Sending request to IntaSend:', {
      url: `${INTASEND_API_URL}/payments/initiate`,
      headers: {
        Authorization: `Bearer ${INTASEND_API_KEY}`,
        'X-IntaSend-Public-API-Key': INTASEND_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: paymentPayload,
    });


    return new Response(
      JSON.stringify({
        transaction_id: paymentResponse.invoice?.id,
        checkout_url: paymentResponse.checkout_url,
        payment_status: 'processing',
        payment_transaction_id: paymentTransaction.id,
        ...paymentResponse
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
    
  } catch (error) {
    console.error('Payment initialization error:', error.message);
    console.log('IntaSend response:', textResponse);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});