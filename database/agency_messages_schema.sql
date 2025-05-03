-- Agency Messages Schema for Supabase
-- This schema supports both direct messages to individual users and broadcast messages to all users
-- Compatible with OrgMessageScreen.js

-- Create extension for UUID generation if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agencies table if it doesn't exist yet
-- This table stores information about waste management agencies
CREATE TABLE IF NOT EXISTS public.agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agency_messages table
-- This table stores all messages from agencies, supporting both direct and broadcast messages
CREATE TABLE public.agency_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'announcement' CHECK (message_type IN ('announcement', 'event', 'alert', 'general')),
    is_broadcast BOOLEAN DEFAULT FALSE,
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Either it's a broadcast message OR it has a recipient
    CONSTRAINT valid_message_target CHECK (
        (is_broadcast = TRUE AND recipient_user_id IS NULL) OR
        (is_broadcast = FALSE AND recipient_user_id IS NOT NULL)
    )
);

-- Create user_message_status table to track read status
-- This allows tracking which users have read which messages
CREATE TABLE public.user_message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.agency_messages(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each user can have only one status per message
    CONSTRAINT unique_user_message UNIQUE (user_id, message_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agency_messages_agency_id ON public.agency_messages(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_messages_recipient ON public.agency_messages(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_messages_broadcast ON public.agency_messages(is_broadcast);
CREATE INDEX IF NOT EXISTS idx_user_message_status_user ON public.user_message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_message_status_message ON public.user_message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_user_message_status_read ON public.user_message_status(is_read);

-- Enable Row Level Security on all tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_message_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies table
-- Only authenticated users can view agencies
CREATE POLICY "Authenticated users can view agencies"
    ON public.agencies
    FOR SELECT
    TO authenticated
    USING (true);

-- Only agency users can update their own agency
CREATE POLICY "Agencies can update their own information"
    ON public.agencies
    FOR UPDATE
    USING (id = auth.uid());

-- RLS Policies for agency_messages table
-- Agencies can create messages
CREATE POLICY "Agencies can create messages"
    ON public.agency_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (agency_id = auth.uid());

-- Agencies can view and update their own messages
CREATE POLICY "Agencies can view and update their own messages"
    ON public.agency_messages
    FOR ALL
    TO authenticated
    USING (agency_id = auth.uid());

-- Users can view messages sent to them or broadcast messages
CREATE POLICY "Users can view messages sent to them or broadcasts"
    ON public.agency_messages
    FOR SELECT
    TO authenticated
    USING (
        is_broadcast = TRUE OR recipient_user_id = auth.uid()
    );

-- RLS Policies for user_message_status table
-- Users can only manage their own message status
CREATE POLICY "Users can manage their own message status"
    ON public.user_message_status
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Function to automatically create message status entries for broadcast messages
CREATE OR REPLACE FUNCTION public.handle_new_broadcast_message()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a broadcast message, create status entries for all users
    IF NEW.is_broadcast THEN
        INSERT INTO public.user_message_status (user_id, message_id, is_read)
        SELECT id, NEW.id, FALSE
        FROM auth.users;
    ELSE
        -- For direct messages, create a single status entry for the recipient
        INSERT INTO public.user_message_status (user_id, message_id, is_read)
        VALUES (NEW.recipient_user_id, NEW.id, FALSE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create message status entries when a new message is created
CREATE TRIGGER on_new_message_create_status
AFTER INSERT ON public.agency_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_broadcast_message();

-- Function to mark a message as read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_status_exists BOOLEAN;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if a status entry exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_message_status
        WHERE user_id = v_user_id AND message_id = p_message_id
    ) INTO v_status_exists;
    
    IF v_status_exists THEN
        -- Update existing status
        UPDATE public.user_message_status
        SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
        WHERE user_id = v_user_id AND message_id = p_message_id;
    ELSE
        -- Create new status entry
        INSERT INTO public.user_message_status (user_id, message_id, is_read, read_at)
        VALUES (v_user_id, p_message_id, TRUE, NOW());
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to get all messages for a user with read status
CREATE OR REPLACE VIEW public.user_messages AS
SELECT
    am.id,
    am.agency_id,
    a.name AS agency_name,
    a.logo_url AS agency_logo,
    am.title,
    am.message,
    am.message_type,
    am.is_broadcast,
    am.sent_at,
    COALESCE(ums.is_read, FALSE) AS is_read,
    ums.read_at
FROM
    public.agency_messages am
JOIN
    public.agencies a ON am.agency_id = a.id
LEFT JOIN
    public.user_message_status ums ON am.id = ums.message_id AND ums.user_id = auth.uid()
WHERE
    am.is_broadcast = TRUE OR am.recipient_user_id = auth.uid()
ORDER BY
    am.sent_at DESC;

-- Enable RLS on the view
ALTER VIEW public.user_messages SET RLS_ENABLED = TRUE;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.user_messages TO authenticated;
