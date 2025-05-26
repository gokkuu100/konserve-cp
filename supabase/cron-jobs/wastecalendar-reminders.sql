-- Run every hour to check for upcoming waste calendar reminders
SELECT cron.schedule(
  'waste-calendar-reminders',
  '0 * * * *',  -- Run at the start of every hour
  $$SELECT net.http_post(
    'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/calendar-reminder-notifications',
    '{}',
    '{"Content-Type": "application/json"}',
    10000
  )$$
);