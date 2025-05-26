-- Create a function to call the organization notifications endpoint
CREATE OR REPLACE FUNCTION notify_org_direct_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/organization-pushnotifications',
      body := json_build_object(
        'record', json_build_object(
          'id', NEW.id,
          'user_id', NEW.user_id,
          'orgName', NEW.orgName,
          'title', NEW.title,
          'message', NEW.message,
          'type', NEW.type
        )
      )::jsonb,
      headers := '{"Content-Type": "application/json"}',
      timeout_milliseconds := 10000
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS org_direct_message_notification_trigger ON organization_directmessages;
CREATE TRIGGER org_direct_message_notification_trigger
AFTER INSERT ON organization_directmessages
FOR EACH ROW
EXECUTE FUNCTION notify_org_direct_message();