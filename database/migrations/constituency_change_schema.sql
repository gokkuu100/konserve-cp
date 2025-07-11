-- Create enum for request status
CREATE TYPE constituency_request_status AS ENUM ('pending', 'approved', 'denied');

-- Create constituency change requests table
CREATE TABLE constituency_change_requests (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    current_constituency TEXT NOT NULL,
    requested_constituency TEXT NOT NULL,
    reason TEXT,
    status constituency_request_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT
);

-- Create RLS policies
ALTER TABLE constituency_change_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own requests
CREATE POLICY "Users can view their own requests"
    ON constituency_change_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to create their own requests
CREATE POLICY "Users can create their own requests"
    ON constituency_change_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create function to update user constituency when request is approved
CREATE OR REPLACE FUNCTION handle_constituency_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        UPDATE auth.users
        SET raw_user_meta_data = 
            jsonb_set(
                raw_user_meta_data,
                '{constituency}',
                to_jsonb(NEW.requested_constituency)
            )
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for constituency updates
CREATE TRIGGER on_constituency_change_approved
    AFTER UPDATE ON constituency_change_requests
    FOR EACH ROW
    WHEN (OLD.status != 'approved' AND NEW.status = 'approved')
    EXECUTE FUNCTION handle_constituency_change();