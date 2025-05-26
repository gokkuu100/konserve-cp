import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;

// Paystack API base URL
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Create a Supabase client with the Service Role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  console.log('Verify payment function called');
  
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

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Method not allowed' 
    }), { headers, status: 405 });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    console.log('Verification request received:', JSON.stringify(requestBody));
    
    const { reference, subscription_id } = requestBody;
    
    if (!reference) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Reference is required'
      }), { headers, status: 400 });
    }
    
    console.log(`Verifying payment for reference: ${reference}`);
    
    // Make request to Paystack API
    const verifyUrl = `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`;
    console.log(`Calling Paystack API: ${verifyUrl}`);
    
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
        'Content-Type': 'application/json',
      }
    });
    
    // Parse the response
    const textResponse = await response.text();
    console.log('Paystack API response:', textResponse);
    
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Error parsing Paystack response:', parseError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Could not parse provider response',
        raw_response: textResponse
      }), { headers, status: 500 });
    }
    
    // Check if verification was successful
    if (!result.status) {
      console.error('Paystack verification error:', result);
      return new Response(JSON.stringify({
        success: false,
        message: 'Payment verification failed',
        data: result
      }), { headers, status: 200 });
    }
    
    // Extract payment status
    const paymentData = result.data;
    const paymentStatus = paymentData.status;
    const isSuccessful = paymentStatus === 'success';
    
    console.log(`Payment status: ${paymentStatus}, isSuccessful: ${isSuccessful}`);
    
    // If subscription_id provided, update our database
    if (subscription_id && isSuccessful) {
      try {
        // First, check if payment transaction exists
        const { data: existingTransaction } = await supabase
          .from('payment_transactions')
          .select('id, status')
          .eq('subscription_id', subscription_id)
          .maybeSingle();
          
        // Update payment transaction or create if it doesn't exist
        if (existingTransaction) {
          await supabase
            .from('payment_transactions')
            .update({
              status: 'completed',
              provider_transaction_id: paymentData.id.toString(),
              provider_reference: reference,
              provider_response: result,
              payment_details: {
                amount: paymentData.amount / 100,
                currency: paymentData.currency,
                payment_method: paymentData.channel || 'online',
                customer: paymentData.customer,
                transaction_date: paymentData.transaction_date
              },
              verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('subscription_id', subscription_id);
            
          console.log(`Updated payment transaction for subscription ${subscription_id}`);
        } else {
          // Create new transaction record if it doesn't exist
          await supabase
            .from('payment_transactions')
            .insert({
              subscription_id,
              user_id: paymentData.metadata?.user_id,
              amount: paymentData.amount / 100,
              currency: paymentData.currency,
              payment_method: paymentData.channel || 'online',
              payment_provider: 'paystack',
              provider_transaction_id: paymentData.id.toString(),
              provider_reference: reference,
              status: 'completed',
              provider_response: result,
              payment_details: {
                amount: paymentData.amount / 100,
                currency: paymentData.currency,
                payment_method: paymentData.channel || 'online',
                customer: paymentData.customer,
                transaction_date: paymentData.transaction_date
              },
              verified_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          console.log(`Created new payment transaction for subscription ${subscription_id}`);
        }
        
        // Get subscription details
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans (
              duration_days
            )
          `)
          .eq('id', subscription_id)
          .single();
          
        if (!subscription) {
          throw new Error(`Subscription ${subscription_id} not found`);
        }
        
        // Calculate subscription duration
        const startDate = new Date();
        const endDate = new Date();
        const durationDays = subscription?.subscription_plans?.duration_days || 30;
        endDate.setDate(startDate.getDate() + durationDays);
        
        // Update the subscription
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            payment_status: 'completed',
            payment_method: paymentData.channel || (paymentData.channel === 'mobile_money' ? 'mpesa' : 'bank'),
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription_id);
          
        console.log(`Updated subscription ${subscription_id} to active`);
      } catch (dbError) {
        console.error('Error updating database:', dbError);
        return new Response(JSON.stringify({
          success: false,
          message: 'Database update failed',
          error: dbError.message
        }), { headers, status: 500 });
      }
    }
    
    // Return the verification result
    return new Response(JSON.stringify({
      success: true,
      is_successful: isSuccessful,
      reference,
      data: result.data,
      message: isSuccessful ? 'Payment confirmed' : 'Payment not successful',
      subscription_id
    }), { headers, status: 200 });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    }), { headers, status: 500 });
  }
});