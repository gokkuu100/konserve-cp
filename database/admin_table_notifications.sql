-- Create admin_users table to track which users have admin privileges
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT admin_users_unique_id UNIQUE (id)
);

-- Enable RLS on admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage admin users
CREATE POLICY "Super admins can manage admin users"
    ON admin_users
    USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin')
    );
    
-- All admins can view admin users
CREATE POLICY "Admins can view admin users"
    ON admin_users FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM admin_users)
    );

-- Create admin_notifications table for alerting admins
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can only see their own notifications
CREATE POLICY "Admins can view their own notifications"
    ON admin_notifications FOR SELECT
    USING (auth.uid() = admin_id);

-- Admins can mark their notifications as read
CREATE POLICY "Admins can update their own notifications"
    ON admin_notifications FOR UPDATE
    USING (auth.uid() = admin_id);

-- Create a function to automatically create notifications for constituency change requests
CREATE OR REPLACE FUNCTION create_constituency_change_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a notification for each admin
    INSERT INTO admin_notifications (admin_id, type, content)
    SELECT 
        id, 
        'constituency_change_request',
        json_build_object(
            'request_id', NEW.id,
            'user_id', NEW.user_id,
            'previous_constituency', NEW.previous_constituency,
            'new_constituency', NEW.new_constituency,
            'created_at', NEW.created_at
        )
    FROM admin_users;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new constituency change request is created
CREATE TRIGGER constituency_change_notification_trigger
AFTER INSERT ON constituency_change_request
FOR EACH ROW
EXECUTE FUNCTION create_constituency_change_notification();

-- Fix the policy that was referencing the non-existent admin_users table
DROP POLICY IF EXISTS "Only admins can update requests" ON constituency_change_request;

-- Create the corrected policy now that admin_users exists
CREATE POLICY "Only admins can update requests"
    ON constituency_change_request FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM admin_users));

-- Create a view that shows all admin users with their profile information
CREATE VIEW admin_profiles AS
SELECT 
    a.id,
    a.role,
    p.full_name,
    p.email,
    p.avatar_url,
    a.created_at
FROM 
    admin_users a
JOIN 
    profiles p ON a.id = p.id;

-- Create a view for admin dashboard showing pending constituency changes with user details
CREATE OR REPLACE VIEW admin_constituency_changes AS
SELECT 
    ccr.id,
    ccr.user_id,
    p.full_name,
    p.email,
    p.phone_number,
    ccr.previous_constituency,
    ccr.new_constituency,
    ccr.reason,
    ccr.status,
    ccr.created_at
FROM 
    constituency_change_request ccr
JOIN
    profiles p ON ccr.user_id = p.id
ORDER BY 
    CASE WHEN ccr.status = 'pending' THEN 0 ELSE 1 END,
    ccr.created_at DESC;