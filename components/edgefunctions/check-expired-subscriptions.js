import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler = async (event, context) => {
  try {
    // Call the database function to check expired subscriptions
    const { data, error } = await supabase.rpc('check_expired_subscriptions');
    
    if (error) throw error;

    // Send notifications to users with expiring subscriptions
    const { data: expiringSubscriptions, error: queryError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        agencies (name),
        auth.users!inner (id, email, metadata)
      `)
      .eq('status', 'active')
      .lt('end_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Within 7 days
      .gt('end_date', new Date().toISOString()); // Not expired yet

    if (queryError) throw queryError;

    // Send notifications
    for (const subscription of expiringSubscriptions) {
      const daysUntilExpiry = Math.ceil(
        (new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Send push notification if token exists
      if (subscription.users.metadata?.expo_push_token) {
        await sendPushNotification(
          subscription.users.metadata.expo_push_token,
          'Subscription Expiring Soon',
          `Your subscription with ${subscription.agencies.name} will expire in ${daysUntilExpiry} days.`
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check expired subscriptions',
        message: error.message,
      }),
    };
  }
}; 