-- Subscription Integration Schema for Supabase
-- This schema integrates agency subscriptions with messaging and feedback
-- Ensures users can only access agency messages and submit feedback to agencies they are subscribed to

-- Create extension for UUID generation if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MODIFY EXISTING AGENCY_MESSAGES TABLE
-- =============================================

-- Modify the agency_messages table to include subscription requirement flag
ALTER TABLE public.agency_messages 
ADD COLUMN IF NOT EXISTS requires_subscription BOOLEAN DEFAULT TRUE;

-- This flag determines if a message requires an active subscription to view
-- Set to TRUE by default (only subscribers can see messages)
-- Can be set to FALSE for public announcements that all users can see

-- =============================================
-- MODIFY USER_MESSAGE_STATUS TABLE
-- =============================================

-- Add subscription validation to user_message_status
-- This will store which subscription was used to access this message
ALTER TABLE public.user_message_status
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL;

-- =============================================
-- MODIFY AGENCY_FEEDBACK TABLE
-- =============================================

-- Add subscription reference to agency_feedback table
ALTER TABLE public.agency_feedback
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL;

-- =============================================
-- CREATE USER SUBSCRIPTION HISTORY TABLE
-- =============================================

-- This table tracks all agencies a user has ever subscribed to
-- Allows users to submit feedback to agencies they previously subscribed to
CREATE TABLE IF NOT EXISTS public.user_subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id BIGINT NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    first_subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_subscriptions INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each user can only have one history record per agency
    CONSTRAINT unique_user_agency_history UNIQUE (user_id, agency_id)
);

-- =============================================
-- CREATE TRIGGERS FOR SUBSCRIPTION TRACKING
-- =============================================

-- Function to update subscription history when a new subscription is created
CREATE OR REPLACE FUNCTION public.update_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a history record already exists
    IF EXISTS (
        SELECT 1 FROM public.user_subscription_history 
        WHERE user_id = NEW.user_id AND agency_id = NEW.agency_id
    ) THEN
        -- Update existing record
        UPDATE public.user_subscription_history
        SET last_subscribed_at = NOW(),
            total_subscriptions = total_subscriptions + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND agency_id = NEW.agency_id;
    ELSE
        -- Create new record
        INSERT INTO public.user_subscription_history (
            user_id, agency_id, first_subscribed_at, last_subscribed_at
        ) VALUES (
            NEW.user_id, NEW.agency_id, NOW(), NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update subscription history when a new subscription is created
CREATE TRIGGER on_subscription_created
AFTER INSERT ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_history();

-- =============================================
-- MODIFY AGENCY MESSAGES VIEW
-- =============================================

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.user_messages;

-- Create a new view that filters messages based on subscription status
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
    -- Show message if ANY of these conditions are true:
    (
        -- 1. It's a broadcast message that doesn't require subscription
        (am.is_broadcast = TRUE AND am.requires_subscription = FALSE)
        
        OR
        
        -- 2. It's a direct message to this user that doesn't require subscription
        (am.is_broadcast = FALSE AND am.recipient_user_id = auth.uid() AND am.requires_subscription = FALSE)
        
        OR
        
        -- 3. It's a broadcast message AND user has an active subscription to this agency
        (am.is_broadcast = TRUE AND am.requires_subscription = TRUE AND EXISTS (
            SELECT 1 FROM public.user_subscriptions us
            WHERE us.user_id = auth.uid()
            AND us.agency_id = am.agency_id
            AND us.status = 'active'
            AND (us.end_date IS NULL OR us.end_date > NOW())
        ))
        
        OR
        
        -- 4. It's a direct message to this user AND user has an active subscription to this agency
        (am.is_broadcast = FALSE AND am.recipient_user_id = auth.uid() AND am.requires_subscription = TRUE AND EXISTS (
            SELECT 1 FROM public.user_subscriptions us
            WHERE us.user_id = auth.uid()
            AND us.agency_id = am.agency_id
            AND us.status = 'active'
            AND (us.end_date IS NULL OR us.end_date > NOW())
        ))
    )
ORDER BY
    am.sent_at DESC;

-- =============================================
-- CREATE FUNCTION TO CHECK SUBSCRIPTION STATUS
-- =============================================

-- Function to check if a user is currently subscribed to an agency
CREATE OR REPLACE FUNCTION public.is_user_subscribed_to_agency(p_user_id UUID, p_agency_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_subscribed BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.user_subscriptions
        WHERE user_id = p_user_id
        AND agency_id = p_agency_id
        AND status = 'active'
        AND (end_date IS NULL OR end_date > NOW())
    ) INTO v_is_subscribed;
    
    RETURN v_is_subscribed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user was ever subscribed to an agency
CREATE OR REPLACE FUNCTION public.was_user_ever_subscribed_to_agency(p_user_id UUID, p_agency_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_was_subscribed BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.user_subscription_history
        WHERE user_id = p_user_id
        AND agency_id = p_agency_id
    ) INTO v_was_subscribed;
    
    RETURN v_was_subscribed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MODIFY FEEDBACK SUBMISSION FUNCTION
-- =============================================

-- Function to submit feedback with subscription validation
CREATE OR REPLACE FUNCTION public.submit_agency_feedback(
    p_agency_id BIGINT,
    p_rating NUMERIC,
    p_satisfaction TEXT,
    p_comment TEXT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_agency_name TEXT;
    v_is_currently_subscribed BOOLEAN;
    v_was_ever_subscribed BOOLEAN;
    v_active_subscription_id UUID;
    v_result JSON;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Get agency name
    SELECT name INTO v_agency_name FROM public.agencies WHERE id = p_agency_id;
    
    -- Check if user is currently subscribed
    v_is_currently_subscribed := public.is_user_subscribed_to_agency(v_user_id, p_agency_id);
    
    -- Check if user was ever subscribed
    v_was_ever_subscribed := public.was_user_ever_subscribed_to_agency(v_user_id, p_agency_id);
    
    -- If user is neither currently subscribed nor was ever subscribed, return error
    IF NOT (v_is_currently_subscribed OR v_was_ever_subscribed) THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'You can only submit feedback for agencies you are currently or were previously subscribed to'
        );
    END IF;
    
    -- Get active subscription ID if available
    IF v_is_currently_subscribed THEN
        SELECT id INTO v_active_subscription_id
        FROM public.user_subscriptions
        WHERE user_id = v_user_id
        AND agency_id = p_agency_id
        AND status = 'active'
        AND (end_date IS NULL OR end_date > NOW())
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    -- Insert feedback
    INSERT INTO public.agency_feedback (
        user_id,
        agency_id,
        agency_name,
        rating,
        satisfaction,
        comment,
        subscription_id
    ) VALUES (
        v_user_id,
        p_agency_id,
        v_agency_name,
        p_rating,
        p_satisfaction,
        p_comment,
        v_active_subscription_id
    )
    RETURNING id INTO v_result;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Feedback submitted successfully',
        'feedback_id', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CREATE VIEWS FOR EASIER QUERYING
-- =============================================

-- View to get all agencies a user is currently subscribed to
CREATE OR REPLACE VIEW public.user_subscribed_agencies AS
SELECT DISTINCT
    a.id as agency_id,
    a.name as agency_name,
    a.location as agency_location,
    a.description,
    a.contact_number,
    a.price,
    a.service_radius,
    MAX(us.end_date) as subscription_end_date
FROM
    public.agencies a
JOIN
    public.user_subscriptions us ON a.id = us.agency_id
WHERE
    us.user_id = auth.uid()
    AND us.status = 'active'
    AND (us.end_date IS NULL OR us.end_date > NOW())
GROUP BY
    a.id, a.name, a.location, a.description, a.contact_number, a.price, a.service_radius;

-- View to get all agencies a user was ever subscribed to
CREATE OR REPLACE VIEW public.user_historical_agencies AS
SELECT
    a.id as agency_id,
    a.name as agency_name,
    a.location as agency_location,
    a.description,
    a.contact_number,
    ush.first_subscribed_at,
    ush.last_subscribed_at,
    ush.total_subscriptions
FROM
    public.agencies a
JOIN
    public.user_subscription_history ush ON a.id = ush.agency_id
WHERE
    ush.user_id = auth.uid();

-- =============================================
-- UPDATE ROW LEVEL SECURITY POLICIES
-- =============================================

-- Update RLS policies for agency_messages
DROP POLICY IF EXISTS "Users can view messages sent to them or broadcasts" ON public.agency_messages;

CREATE POLICY "Users can view messages based on subscription status"
    ON public.agency_messages
    FOR SELECT
    USING (
        -- Non-subscription messages are visible to all
        requires_subscription = FALSE
        OR
        -- Subscription messages are only visible to subscribers
        (requires_subscription = TRUE AND (
            -- For broadcast messages
            (is_broadcast = TRUE AND EXISTS (
                SELECT 1 FROM public.user_subscriptions us
                WHERE us.user_id = auth.uid()
                AND us.agency_id = agency_id
                AND us.status = 'active'
                AND (us.end_date IS NULL OR us.end_date > NOW())
            ))
            OR
            -- For direct messages
            (is_broadcast = FALSE AND recipient_user_id = auth.uid() AND EXISTS (
                SELECT 1 FROM public.user_subscriptions us
                WHERE us.user_id = auth.uid()
                AND us.agency_id = agency_id
                AND us.status = 'active'
                AND (us.end_date IS NULL OR us.end_date > NOW())
            ))
        ))
    );

-- Update RLS policies for agency_feedback
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.agency_feedback;

CREATE POLICY "Users can insert feedback for subscribed agencies"
    ON public.agency_feedback
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND
        (
            -- User is currently subscribed
            EXISTS (
                SELECT 1 FROM public.user_subscriptions us
                WHERE us.user_id = auth.uid()
                AND us.agency_id = agency_id
                AND us.status = 'active'
                AND (us.end_date IS NULL OR us.end_date > NOW())
            )
            OR
            -- User was previously subscribed
            EXISTS (
                SELECT 1 FROM public.user_subscription_history ush
                WHERE ush.user_id = auth.uid()
                AND ush.agency_id = agency_id
            )
        )
    );

-- =============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================

-- Indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_agency_id ON public.user_subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON public.user_subscriptions(end_date);

-- Indexes for user_subscription_history
CREATE INDEX IF NOT EXISTS idx_user_subscription_history_user_id ON public.user_subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_history_agency_id ON public.user_subscription_history(agency_id);

-- Indexes for agency_messages with subscription requirements
CREATE INDEX IF NOT EXISTS idx_agency_messages_requires_subscription ON public.agency_messages(requires_subscription);

-- =============================================
-- CREATE FUNCTION TO PROCESS PAYMENT AND ACTIVATE SUBSCRIPTION
-- =============================================

-- Function to process payment and activate a subscription
CREATE OR REPLACE FUNCTION public.process_subscription_payment(
    p_subscription_id UUID,
    p_payment_reference TEXT,
    p_payment_status TEXT DEFAULT 'completed'
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_subscription RECORD;
    v_plan RECORD;
    v_duration_days INTEGER;
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Get subscription details
    SELECT * INTO v_subscription 
    FROM public.user_subscriptions 
    WHERE id = p_subscription_id AND user_id = v_user_id;
    
    IF v_subscription IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Subscription not found or does not belong to current user'
        );
    END IF;
    
    -- Get plan details
    SELECT * INTO v_plan 
    FROM public.subscription_plans 
    WHERE id = v_subscription.plan_id;
    
    IF v_plan IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'message', 'Subscription plan not found'
        );
    END IF;
    
    -- Set duration days from plan
    v_duration_days := v_plan.duration_days;
    
    -- Set start date to now
    v_start_date := NOW();
    
    -- Calculate end date based on duration
    IF v_duration_days IS NOT NULL AND v_duration_days > 0 THEN
        v_end_date := v_start_date + (v_duration_days || ' days')::INTERVAL;
    ELSE
        -- Default to 30 days if not specified
        v_end_date := v_start_date + '30 days'::INTERVAL;
    END IF;
    
    -- Update subscription status
    UPDATE public.user_subscriptions
    SET 
        status = 'active',
        start_date = v_start_date,
        end_date = v_end_date,
        updated_at = NOW()
    WHERE id = p_subscription_id;
    
    -- Update payment transaction
    UPDATE public.payment_transactions
    SET 
        status = p_payment_status,
        payment_reference = p_payment_reference,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE subscription_id = p_subscription_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Payment processed and subscription activated successfully',
        'subscription_id', p_subscription_id,
        'start_date', v_start_date,
        'end_date', v_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to the views and functions for authenticated users
GRANT SELECT ON public.user_messages TO authenticated;
GRANT SELECT ON public.user_subscribed_agencies TO authenticated;
GRANT SELECT ON public.user_historical_agencies TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_subscribed_to_agency TO authenticated;
GRANT EXECUTE ON FUNCTION public.was_user_ever_subscribed_to_agency TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_agency_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_subscription_payment TO authenticated;
