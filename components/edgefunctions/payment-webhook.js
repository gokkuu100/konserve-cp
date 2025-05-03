import { createClient } from '@supabase/supabase-js';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload
    const payload = await req.json();
    
    // Log webhook payload
    console.log('Received payment webhook:', payload);

    // Validate webhook signature if IntaSend provides this capability
    // This is a security best practice for webhooks
    
    // Store webhook payload for audit and debugging
    const { data: webhook, error: webhookError } = await supabase
      .from('payment_webhooks')
      .insert({
        provider: 'IntaSend',
        event_type: payload.event,
        payload,
        received_at: new Date().toISOString()
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Error storing webhook:', webhookError);
      // Continue processing even if storing the webhook fails
    }

    // Find associated transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('provider_transaction_id', payload.invoice.invoice_id)
      .single();

    if (transactionError) {
      console.error('Error finding transaction:', transactionError);
      return new Response(
        JSON.stringify({
          error: 'Transaction not found',
          message: transactionError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Update transaction status based on webhook event
    let newStatus;
    switch (payload.event) {
      case 'payment.success':
        newStatus = 'completed';
        break;
      case 'payment.failed':
        newStatus = 'failed';
        break;
      case 'payment.pending':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'processing';
    }

    // Update transaction
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        webhook_received: true,
        updated_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          webhook_payload: payload,
        },
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({
          error: 'Failed to update transaction',
          message: updateError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // If payment is successful, activate the subscription
    if (newStatus === 'completed') {
      const { data: subscription, error: subscriptionFetchError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('id', transaction.subscription_id)
        .single();

      if (subscriptionFetchError) {
        console.error('Error fetching subscription:', subscriptionFetchError);
      } else {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (subscription.subscription_plans.duration_days || 30));

        const { error: subscriptionUpdateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.subscription_id);

        if (subscriptionUpdateError) {
          console.error('Error updating subscription:', subscriptionUpdateError);
        }
        
        // Optionally send a push notification to the user about successful payment
        try {
          await fetch(`${Deno.env.get('SUPABASE_FUNCTIONS_URL')}/functions/v1/sendremindernotifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              type: 'payment_success',
              user_id: subscription.user_id,
              agency_name: subscription.agencies?.name || 'waste collection service',
              subscription_id: subscription.id
            })
          });
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        received: true,
        status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process webhook',
        message: error.message,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});