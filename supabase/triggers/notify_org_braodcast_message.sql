-- Create a function to call the organization notifications endpoint for broadcasts
CREATE OR REPLACE FUNCTION notify_org_broadcast_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/organization-pushnotifications',
      body := json_build_object(
        'record', json_build_object(
          'id', NEW.id,
          'orgName', NEW.orgName,
          'title', NEW.title,
          'message', NEW.message,
          'type', NEW.type,
          'timestamp', NEW.timestamp
        )
      )::jsonb,
      headers := '{"Content-Type": "application/json"}',
      timeout_milliseconds := 10000
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS org_broadcast_message_notification_trigger ON organization_generalreport;
CREATE TRIGGER org_broadcast_message_notification_trigger
AFTER INSERT ON organization_generalreport
FOR EACH ROW
EXECUTE FUNCTION notify_org_broadcast_message();