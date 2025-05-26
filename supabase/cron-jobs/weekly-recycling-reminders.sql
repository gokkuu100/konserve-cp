-- Schedule weekly recycling reminders every Monday at 9:00 AM
SELECT cron.schedule(
  'weekly-recycling-reminders',
  '0 9 * * 1',
  $$SELECT net.http_post(
    'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/weekly-pushnotifications',
    '{}',
    '{"Content-Type": "application/json"}',
    10000
  )$$
);