-- Check for expiring subscriptions daily at 10:00 AM
SELECT cron.schedule(
  'check-expired-subscriptions',
  '0 10 * * *',
  $$SELECT net.http_post(
    'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/check-expired-subscriptions',
    '{}',
    '{"Content-Type": "application/json"}',
    10000
  )$$
);