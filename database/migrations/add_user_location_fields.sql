-- Add county, constituency, and phone_number fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS constituency TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for faster constituency-based queries
CREATE INDEX IF NOT EXISTS idx_users_constituency ON users(constituency);

-- Update messages table to include constituency field for filtering
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS constituency TEXT;

-- Create index for faster constituency-based message queries
CREATE INDEX IF NOT EXISTS idx_messages_constituency ON messages(constituency);

-- Create a function to filter messages by constituency
CREATE OR REPLACE FUNCTION get_messages_by_constituency(user_constituency TEXT)
RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE constituency = user_constituency OR constituency IS NULL
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies to ensure users can only see messages for their constituency
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_constituency_policy ON messages;
CREATE POLICY messages_constituency_policy ON messages
  USING (
    constituency IS NULL OR 
    constituency IN (
      SELECT constituency FROM users WHERE user_id = auth.uid()
    )
  );
