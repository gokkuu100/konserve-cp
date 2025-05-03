-- Subscription History Tables for Supabase
-- This schema creates tables to track active and historical user subscriptions
-- Integrates with payment system and provides views for easier querying

-- =============================================
-- CREATE ACTIVE SUBSCRIPTION HISTORY TABLE
-- =============================================

-- This table tracks all currently active subscriptions
CREATE TABLE IF NOT EXISTS public.active_subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id BIGINT NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    subscription_id BIGINT NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    plan_id BIGINT REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    payment_id BIGINT REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    subscription_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    amount_paid NUMERIC(10, 2),
    payment_method TEXT,
    payment_status TEXT DEFAULT 'completed',
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each subscription can only appear once in the active history
    CONSTRAINT unique_active_subscription UNIQUE (subscription_id)
);

-- =============================================
-- CREATE PAST SUBSCRIPTION HISTORY TABLE
-- =============================================

-- This table tracks all past subscriptions that have been completed
CREATE TABLE IF NOT EXISTS public.past_subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id BIGINT NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    subscription_id BIGINT NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    plan_id BIGINT REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
    payment_id BIGINT REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    subscription_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount_paid NUMERIC(10, 2),
    payment_method TEXT,
    payment_status TEXT DEFAULT 'completed',
    renewal_count INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each subscription can only appear once in the past history
    CONSTRAINT unique_past_subscription UNIQUE (subscription_id)
);

-- =============================================
-- CREATE TRIGGERS FOR SUBSCRIPTION TRACKING
-- =============================================

-- Function to add subscription to active history when payment is completed
CREATE OR REPLACE FUNCTION public.add_to_active_subscription_history()
RETURNS TRIGGER AS $$
DECLARE
    v_subscription RECORD;
    v_payment RECORD;
    v_plan RECORD;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription 
    FROM public.user_subscriptions 
    WHERE id = NEW.subscription_id;
    
    -- Get payment details
    SELECT * INTO v_payment 
    FROM public.payment_transactions 
    WHERE id = NEW.id;
    
    -- Get plan details
    SELECT * INTO v_plan 
    FROM public.subscription_plans 
    WHERE id = v_subscription.plan_id;
    
    -- Only add to active history if payment is completed and subscription is active
    IF NEW.status = 'completed' AND v_subscription.status = 'active' THEN
        -- Insert into active subscription history
        INSERT INTO public.active_subscription_history (
            user_id,
            agency_id,
            subscription_id,
            plan_id,
            payment_id,
            subscription_start_date,
            subscription_end_date,
            amount_paid,
            payment_method,
            payment_status,
            auto_renew
        ) VALUES (
            v_subscription.user_id,
            v_subscription.agency_id,
            v_subscription.id,
            v_subscription.plan_id,
            NEW.id,
            v_subscription.start_date,
            v_subscription.end_date,
            NEW.amount,
            NEW.payment_method,
            NEW.status,
            v_subscription.auto_renew
        )
        ON CONFLICT (subscription_id) 
        DO UPDATE SET
            updated_at = NOW(),
            payment_id = NEW.id,
            payment_status = NEW.status,
            amount_paid = NEW.amount,
            payment_method = NEW.payment_method;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add subscription to active history when payment is completed
CREATE TRIGGER on_payment_completed
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.add_to_active_subscription_history();

-- Function to move subscription from active to past history when it expires
CREATE OR REPLACE FUNCTION public.move_to_past_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only move to past history if subscription status changes to expired or cancelled
    IF NEW.status IN ('expired', 'cancelled') AND OLD.status = 'active' THEN
        -- Get the active history record
        INSERT INTO public.past_subscription_history (
            user_id,
            agency_id,
            subscription_id,
            plan_id,
            payment_id,
            subscription_start_date,
            subscription_end_date,
            amount_paid,
            payment_method,
            payment_status,
            cancellation_reason
        )
        SELECT
            user_id,
            agency_id,
            subscription_id,
            plan_id,
            payment_id,
            subscription_start_date,
            COALESCE(subscription_end_date, NOW()),
            amount_paid,
            payment_method,
            payment_status,
            CASE 
                WHEN NEW.status = 'cancelled' THEN 'User cancelled'
                ELSE 'Subscription expired'
            END
        FROM
            public.active_subscription_history
        WHERE
            subscription_id = NEW.id;
            
        -- Delete from active history
        DELETE FROM public.active_subscription_history
        WHERE subscription_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to move subscription from active to past history when it expires
CREATE TRIGGER on_subscription_expired_or_cancelled
AFTER UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.move_to_past_subscription_history();

-- =============================================
-- CREATE VIEWS FOR EASIER QUERYING
-- =============================================

-- View to get all active subscriptions for a user with agency and plan details
CREATE OR REPLACE VIEW public.user_active_subscriptions AS
SELECT
    ash.id,
    ash.user_id,
    ash.agency_id,
    a.name AS agency_name,
    a.location AS agency_location,
    a.logo_url AS agency_logo,
    ash.subscription_id,
    ash.plan_id,
    sp.name AS plan_name,
    sp.description AS plan_description,
    sp.features AS plan_features,
    sp.plan_type,
    ash.subscription_start_date,
    ash.subscription_end_date,
    ash.amount_paid,
    ash.payment_method,
    ash.payment_status,
    ash.auto_renew,
    ash.created_at,
    ash.updated_at
FROM
    public.active_subscription_history ash
JOIN
    public.agencies a ON ash.agency_id = a.id
LEFT JOIN
    public.subscription_plans sp ON ash.plan_id = sp.id
WHERE
    ash.user_id = auth.uid();

-- View to get all past subscriptions for a user with agency and plan details
CREATE OR REPLACE VIEW public.user_past_subscriptions AS
SELECT
    psh.id,
    psh.user_id,
    psh.agency_id,
    a.name AS agency_name,
    a.location AS agency_location,
    a.logo_url AS agency_logo,
    psh.subscription_id,
    psh.plan_id,
    sp.name AS plan_name,
    sp.description AS plan_description,
    sp.features AS plan_features,
    sp.plan_type,
    psh.subscription_start_date,
    psh.subscription_end_date,
    psh.amount_paid,
    psh.payment_method,
    psh.payment_status,
    psh.renewal_count,
    psh.cancellation_reason,
    psh.created_at,
    psh.updated_at
FROM
    public.past_subscription_history psh
JOIN
    public.agencies a ON psh.agency_id = a.id
LEFT JOIN
    public.subscription_plans sp ON psh.plan_id = sp.id
WHERE
    psh.user_id = auth.uid();

-- View to get all subscriptions (active and past) for a user
CREATE OR REPLACE VIEW public.user_all_subscriptions AS
SELECT
    'active' AS subscription_type,
    id,
    user_id,
    agency_id,
    agency_name,
    agency_location,
    agency_logo,
    subscription_id,
    plan_id,
    plan_name,
    plan_description,
    plan_features,
    plan_type,
    subscription_start_date,
    subscription_end_date,
    amount_paid,
    payment_method,
    payment_status,
    created_at,
    updated_at
FROM
    public.user_active_subscriptions
UNION ALL
SELECT
    'past' AS subscription_type,
    id,
    user_id,
    agency_id,
    agency_name,
    agency_location,
    agency_logo,
    subscription_id,
    plan_id,
    plan_name,
    plan_description,
    plan_features,
    plan_type,
    subscription_start_date,
    subscription_end_date,
    amount_paid,
    payment_method,
    payment_status,
    created_at,
    updated_at
FROM
    public.user_past_subscriptions;

-- =============================================
-- CREATE FUNCTIONS FOR SUBSCRIPTION QUERIES
-- =============================================

-- Function to check if user has any active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_subscription BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.active_subscription_history
        WHERE user_id = p_user_id
    ) INTO v_has_subscription;
    
    RETURN v_has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active subscription to specific agency
CREATE OR REPLACE FUNCTION public.has_active_agency_subscription(p_user_id UUID, p_agency_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_subscription BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.active_subscription_history
        WHERE user_id = p_user_id AND agency_id = p_agency_id
    ) INTO v_has_subscription;
    
    RETURN v_has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all agencies user has active subscriptions to
CREATE OR REPLACE FUNCTION public.get_user_active_subscription_agencies(p_user_id UUID)
RETURNS TABLE (
    agency_id BIGINT,
    agency_name TEXT,
    agency_location TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        a.id,
        a.name,
        a.location,
        ash.subscription_end_date
    FROM
        public.active_subscription_history ash
    JOIN
        public.agencies a ON ash.agency_id = a.id
    WHERE
        ash.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UPDATE ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on the new tables
ALTER TABLE public.active_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS for active_subscription_history
CREATE POLICY "Users can view their own active subscriptions"
    ON public.active_subscription_history
    FOR SELECT
    USING (user_id = auth.uid());

-- RLS for past_subscription_history
CREATE POLICY "Users can view their own past subscriptions"
    ON public.past_subscription_history
    FOR SELECT
    USING (user_id = auth.uid());

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to the views and functions for authenticated users
GRANT SELECT ON public.user_active_subscriptions TO authenticated;
GRANT SELECT ON public.user_past_subscriptions TO authenticated;
GRANT SELECT ON public.user_all_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_agency_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_subscription_agencies TO authenticated;