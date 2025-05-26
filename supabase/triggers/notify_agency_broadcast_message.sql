-- Create a function to call the agency notifications endpoint for broadcasts
CREATE OR REPLACE FUNCTION notify_agency_broadcast_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/push-notifications',
      body := json_build_object(
        'record', json_build_object(
          'id', NEW.id,
          'agency_id', NEW.agency_id,
          'subject', NEW.subject,
          'message', NEW.message,
          'message_type', NEW.message_type
        )
      )::jsonb,
      headers := '{"Content-Type": "application/json"}',
      timeout_milliseconds := 10000
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS agency_broadcast_message_notification_trigger ON agency_messages_general;
CREATE TRIGGER agency_broadcast_message_notification_trigger
AFTER INSERT ON agency_messages_general
FOR EACH ROW
EXECUTE FUNCTION notify_agency_broadcast_message();