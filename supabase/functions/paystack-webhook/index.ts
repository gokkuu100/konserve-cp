import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const PAYSTACK_WEBHOOK_SECRET = Deno.env.get('PAYSTACK_WEBHOOK_SECRET')!;
const MOBILE_APP_SCHEME = Deno.env.get('MOBILE_APP_SCHEME') || 'myapp://';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    // 🚀 Handle GET redirect from Paystack after payment
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
      const paymentSuccess = !url.searchParams.get('cancelled');

      const redirectUrl = paymentSuccess
        ? `${MOBILE_APP_SCHEME}payment/success?reference=${reference}`
        : `${MOBILE_APP_SCHEME}payment/cancel?reference=${reference}`;

      return new Response(
        `<html><head><meta http-equiv="refresh" content="0;url=${redirectUrl}"></head><body>Redirecting...</body></html>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Location': redirectUrl
          },
          status: 302
        }
      );
    }

    // 🔐 Handle Paystack webhook (POST with signature)
    if (req.method === 'POST') {
      const paystackSignature = req.headers.get('x-paystack-signature');
      const rawBody = await req.text();

      if (!paystackSignature && PAYSTACK_WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Missing Paystack signature' }), {
          headers,
          status: 401
        });
      }

      if (PAYSTACK_WEBHOOK_SECRET && paystackSignature) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(PAYSTACK_WEBHOOK_SECRET),
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
          );

          const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(rawBody)
          );

          // Convert signature to hex
          const hash = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        if (hash !== paystackSignature) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            headers,
            status: 401
          });
        }
      }

      const payload = JSON.parse(rawBody);
      const subscriptionId = payload.data?.metadata?.subscription_id;

      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: 'No subscription ID in metadata' }), {
          headers,
          status: 400
        });
      }

      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single();

      if (txError) {
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          headers,
          status: 404
        });
      }

      let status = 'pending';
      switch (payload.event) {
        case 'charge.success':
          status = 'successful';
          break;
        case 'charge.failed':
        case 'transfer.failed':
          status = 'failed';
          break;
      }

      await supabase
        .from('payment_transactions')
        .update({
          status: status,
          provider_response: { ...transaction.provider_response, webhook: payload },
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (status === 'successful') {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            payment_details: {
              provider: 'paystack',
              reference: payload.data.reference,
              amount: payload.data.amount / 100,
              currency: payload.data.currency,
              paid_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId);
      } else if (status === 'failed') {
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId);
      }

      return new Response(JSON.stringify({ status: 'success', message: `Payment ${status}` }), {
        headers,
        status: 200
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported request method' }), {
      headers,
      status: 405
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Server error', message: err.message }), {
      headers,
      status: 500
    });
  }
});
