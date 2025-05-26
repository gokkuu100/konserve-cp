-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in correct order to respect dependencies
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;

-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    agency_id bigint REFERENCES agencies(id) NOT NULL,
    plan_id bigint REFERENCES subscription_plans(id) NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    start_date timestamptz,
    end_date timestamptz,
    auto_renew boolean DEFAULT false,
    custom_collection_dates jsonb DEFAULT '[]',
    payment_method text,
    amount numeric NOT NULL,
    currency text DEFAULT 'KES',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    payment_status text NOT NULL DEFAULT 'pending',
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'completed', 'failed'))
);

-- Create payment_transactions table with consistent status values
CREATE TABLE payment_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id bigint REFERENCES user_subscriptions(id),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'KES',
    payment_method text NOT NULL,
    payment_provider text DEFAULT 'paystack',
    provider_transaction_id text,
    provider_reference text,
    checkout_url text,
    provider_response jsonb DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending',
    payment_details jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    verified_at timestamptz,
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('mpesa', 'credit_card', 'online')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create subscription_history table
CREATE TABLE subscription_history (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    subscription_id bigint REFERENCES user_subscriptions(id),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    plan_id bigint REFERENCES subscription_plans(id),
    agency_id bigint REFERENCES agencies(id),
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    status text NOT NULL,
    payment_transaction_id uuid REFERENCES payment_transactions(id),
    custom_collection_dates jsonb DEFAULT '[]',
    payment_method text,
    amount numeric,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

-- Add indexes for better query performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_agency_id ON user_subscriptions(agency_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider_reference ON payment_transactions(provider_reference);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check subscription expiry
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if subscription has expired based on end_date
    IF NEW.end_date < now() AND NEW.status = 'active' THEN
        NEW.status = 'expired';
        
        -- Insert into subscription_history
        INSERT INTO subscription_history (
            subscription_id, user_id, plan_id, agency_id,
            start_date, end_date, status, payment_method,
            custom_collection_dates, amount, metadata
        )
        VALUES (
            NEW.id, NEW.user_id, NEW.plan_id, NEW.agency_id,
            NEW.start_date, NEW.end_date, 'expired', NEW.payment_method,
            NEW.custom_collection_dates, NEW.amount, NEW.metadata
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for subscription expiry check
CREATE TRIGGER check_subscription_expiry_trigger
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_expiry();

-- Function to update subscription when payment is verified (using consistent status terminology)
CREATE OR REPLACE FUNCTION update_subscription_on_payment_verification()
RETURNS TRIGGER AS $$
DECLARE
    sub_record user_subscriptions%ROWTYPE;
    plan_record subscription_plans%ROWTYPE;
BEGIN
    -- Only proceed if status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get the subscription record
        SELECT * INTO sub_record FROM user_subscriptions WHERE id = NEW.subscription_id;
        
        -- Get the plan details to calculate end date
        SELECT * INTO plan_record FROM subscription_plans WHERE id = sub_record.plan_id;
        
        -- Update the subscription
        UPDATE user_subscriptions
        SET 
            status = 'active',
            payment_status = 'completed',
            start_date = now(),
            end_date = now() + (plan_record.duration_days || ' days')::interval
        WHERE id = NEW.subscription_id;
        
        -- Add to subscription history
        INSERT INTO subscription_history (
            subscription_id, user_id, plan_id, agency_id,
            start_date, end_date, status, payment_transaction_id,
            custom_collection_dates, payment_method, amount, metadata
        )
        VALUES (
            sub_record.id, 
            sub_record.user_id, 
            sub_record.plan_id,
            sub_record.agency_id,
            now(), 
            now() + (plan_record.duration_days || ' days')::interval,
            'active', 
            NEW.id,
            sub_record.custom_collection_dates,
            sub_record.payment_method,
            sub_record.amount,
            sub_record.metadata
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for payment verification
CREATE TRIGGER update_subscription_on_payment_verification_trigger
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_on_payment_verification();

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans
CREATE POLICY "Anyone can view active plans"
    ON subscription_plans FOR SELECT
    USING (is_active = true);

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for payment_transactions
CREATE POLICY "Users can view their own transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
    ON payment_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON payment_transactions FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for subscription_history
CREATE POLICY "Users can view their subscription history"
    ON subscription_history FOR SELECT
    USING (auth.uid() = user_id);

-- Function to verify payment and update subscription (with consistent status terminology)
CREATE OR REPLACE FUNCTION verify_payment_and_update_subscription(
    transaction_id uuid,
    verification_status text
)
RETURNS void AS $$
DECLARE
    trans payment_transactions;
    sub user_subscriptions;
    plan subscription_plans;
BEGIN
    -- Get transaction
    SELECT * INTO trans
    FROM payment_transactions
    WHERE id = transaction_id;
    
    -- Update transaction status
    UPDATE payment_transactions
    SET status = verification_status,
        verified_at = CASE WHEN verification_status = 'completed' THEN now() ELSE NULL END
    WHERE id = transaction_id;
    
    -- If payment is completed, update subscription
    IF verification_status = 'completed' THEN
        -- Get subscription
        SELECT * INTO sub
        FROM user_subscriptions
        WHERE id = trans.subscription_id;
        
        -- Get plan details
        SELECT * INTO plan
        FROM subscription_plans
        WHERE id = sub.plan_id;
        
        -- Update subscription
        UPDATE user_subscriptions
        SET status = 'active',
            payment_status = 'completed',
            start_date = now(),
            end_date = now() + (plan.duration_days || ' days')::interval
        WHERE id = trans.subscription_id;
        
        -- Add to subscription history
        INSERT INTO subscription_history (
            subscription_id, user_id, plan_id, agency_id,
            start_date, end_date, status, payment_transaction_id,
            custom_collection_dates, payment_method, amount, metadata
        )
        VALUES (
            sub.id, 
            sub.user_id, 
            sub.plan_id,
            sub.agency_id,
            now(), 
            now() + (plan.duration_days || ' days')::interval,
            'active', 
            transaction_id,
            sub.custom_collection_dates,
            sub.payment_method,
            sub.amount,
            sub.metadata
        );
    END IF;
END;
$$ language 'plpgsql';

-- Function to find payment by provider reference
CREATE OR REPLACE FUNCTION find_payment_by_reference(
    provider_ref text
)
RETURNS TABLE (
    transaction_id uuid,
    subscription_id bigint,
    user_id uuid,
    status text,
    amount numeric,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id as transaction_id,
        pt.subscription_id,
        pt.user_id,
        pt.status,
        pt.amount,
        pt.created_at
    FROM 
        payment_transactions pt
    WHERE 
        pt.provider_reference = provider_ref
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create a view for active subscriptions with all details
CREATE OR REPLACE VIEW active_user_subscriptions AS
SELECT 
    us.id,
    us.user_id,
    us.agency_id,
    us.plan_id,
    us.status,
    us.payment_status,
    us.start_date,
    us.end_date,
    us.auto_renew,
    us.custom_collection_dates,
    us.payment_method,
    us.amount,
    us.currency,
    us.metadata,
    us.created_at,
    us.updated_at,
    sp.name as plan_name,
    sp.description as plan_description,
    sp.features as plan_features,
    sp.plan_type,
    a.name as agency_name,
    a.constituency as agency_location,
    pt.id as payment_transaction_id,
    pt.payment_provider,
    pt.provider_transaction_id,
    pt.provider_reference,
    pt.verified_at as payment_verified_at
FROM 
    user_subscriptions us
JOIN 
    subscription_plans sp ON us.plan_id = sp.id
JOIN 
    agencies a ON us.agency_id = a.id
LEFT JOIN 
    payment_transactions pt ON us.id = pt.subscription_id
WHERE 
    us.status = 'active';

-- Create a view for user subscription details
CREATE OR REPLACE VIEW user_subscription_details AS
SELECT 
    us.id as subscription_id,
    us.user_id,
    us.status,
    us.payment_status as subscription_payment_status,
    us.start_date,
    us.end_date,
    us.auto_renew,
    us.custom_collection_dates,
    us.payment_method,
    us.amount,
    us.currency,
    us.created_at,
    us.updated_at,
    sp.id as plan_id,
    sp.name as plan_name,
    sp.description as plan_description,
    sp.features as plan_features,
    sp.plan_type,
    sp.duration_days,
    a.id as agency_id,
    a.name as agency_name,
    a.constituency as agency_location,
    pt.id as payment_id,
    pt.status as transaction_payment_status, 
    pt.payment_provider,
    pt.provider_reference,
    pt.verified_at as payment_verified_at,
    CASE 
        WHEN us.end_date < now() THEN true
        ELSE false
    END as is_expired
FROM 
    user_subscriptions us
JOIN 
    subscription_plans sp ON us.plan_id = sp.id
JOIN 
    agencies a ON us.agency_id = a.id
LEFT JOIN 
    payment_transactions pt ON us.id = pt.subscription_id;

-- Create a function to get all subscription details for a user
CREATE OR REPLACE FUNCTION get_user_subscription_details(user_uuid uuid)
RETURNS TABLE (
    subscription_id bigint,
    status text,
    payment_status text,
    start_date timestamptz,
    end_date timestamptz,
    plan_name text,
    plan_type text,
    agency_name text,
    amount numeric,
    payment_method text,
    custom_collection_dates jsonb,
    payment_verified boolean,
    created_at timestamptz,
    is_expired boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id as subscription_id,
        us.status,
        us.payment_status,
        us.start_date,
        us.end_date,
        sp.name as plan_name,
        sp.plan_type,
        a.name as agency_name,
        us.amount,
        us.payment_method,
        us.custom_collection_dates,
        pt.verified_at IS NOT NULL as payment_verified,
        us.created_at,
        CASE 
            WHEN us.end_date < now() THEN true
            ELSE false
        END as is_expired
    FROM 
        user_subscriptions us
    JOIN 
        subscription_plans sp ON us.plan_id = sp.id
    JOIN 
        agencies a ON us.agency_id = a.id
    LEFT JOIN 
        payment_transactions pt ON us.id = pt.subscription_id
    WHERE 
        us.user_id = user_uuid
    ORDER BY 
        us.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION check_and_update_expired_subscriptions(user_id_param UUID DEFAULT NULL)
RETURNS TABLE(count BIGINT) AS $$
DECLARE
    affected_count BIGINT;
BEGIN
    -- Update all expired subscriptions to 'expired' status
    WITH updated_subscriptions AS (
        UPDATE user_subscriptions
        SET 
            status = 'expired',
            updated_at = NOW()
        WHERE 
            status = 'active' 
            AND end_date < NOW()
            AND (user_id_param IS NULL OR user_id = user_id_param)
        RETURNING id, user_id, agency_id, plan_id, start_date, end_date, payment_method, amount, custom_collection_dates, metadata
    ),
    -- Insert records into subscription_history for tracking
    history_insert AS (
        INSERT INTO subscription_history (
            subscription_id, user_id, agency_id, plan_id, 
            start_date, end_date, status, 
            custom_collection_dates, payment_method, amount, metadata
        )
        SELECT 
            id, user_id, agency_id, plan_id, 
            start_date, end_date, 'expired', 
            custom_collection_dates, payment_method, amount, metadata
        FROM updated_subscriptions
    )
    SELECT COUNT(*) INTO affected_count FROM updated_subscriptions;
    
    RETURN QUERY SELECT affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a notification table to track sent notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subscription_id BIGINT REFERENCES user_subscriptions(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Add indexes for the notification table
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_subscription_id ON user_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

-- Add RLS policies for the notification table
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own notifications
CREATE POLICY user_notifications_select_policy ON user_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy to allow users to update only their own notifications (e.g., marking as read)
CREATE POLICY user_notifications_update_policy ON user_notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to create a subscription expiry notification
CREATE OR REPLACE FUNCTION create_subscription_expiry_notification(
    subscription_id_param BIGINT,
    days_remaining_param INTEGER
)
RETURNS UUID AS $$
DECLARE
    subscription_record RECORD;
    notification_id UUID;
    notification_title TEXT;
    notification_body TEXT;
BEGIN
    -- Get subscription details
    SELECT 
        us.id, 
        us.user_id, 
        us.end_date,
        sp.name AS plan_name,
        a.name AS agency_name
    INTO subscription_record
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    JOIN agencies a ON us.agency_id = a.id
    WHERE us.id = subscription_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;
    
    -- Create notification message
    notification_title := 'Subscription Expiring Soon';
    notification_body := 'Your ' || subscription_record.plan_name || ' subscription with ' || 
                         subscription_record.agency_name || ' will expire in ' || 
                         days_remaining_param || ' days.';
    
    -- Insert notification
    INSERT INTO user_notifications (
        user_id,
        subscription_id,
        title,
        body,
        type,
        metadata
    ) VALUES (
        subscription_record.user_id,
        subscription_id_param,
        notification_title,
        notification_body,
        'subscription_expiry',
        jsonb_build_object(
            'days_remaining', days_remaining_param,
            'plan_name', subscription_record.plan_name,
            'agency_name', subscription_record.agency_name,
            'end_date', subscription_record.end_date
        )
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for subscriptions expiring soon and create notifications
CREATE OR REPLACE FUNCTION check_subscriptions_expiring_soon(
    days_threshold INTEGER DEFAULT 7,
    user_id_param UUID DEFAULT NULL
)
RETURNS TABLE(subscription_id BIGINT, notification_id UUID, days_remaining INTEGER) AS $$
DECLARE
    thresholds INTEGER[] := ARRAY[7, 3, 1];
    threshold INTEGER;
BEGIN
    -- For each threshold in our array
    FOREACH threshold IN ARRAY thresholds
    LOOP
        -- Only process if it's less than or equal to our max threshold
        IF threshold <= days_threshold THEN
            -- Find subscriptions expiring in exactly 'threshold' days
            RETURN QUERY
            WITH expiring_subscriptions AS (
                SELECT 
                    us.id,
                    us.user_id,
                    EXTRACT(DAY FROM (us.end_date - CURRENT_DATE))::INTEGER AS days_left
                FROM user_subscriptions us
                WHERE 
                    us.status = 'active'
                    AND EXTRACT(DAY FROM (us.end_date - CURRENT_DATE))::INTEGER = threshold
                    AND (user_id_param IS NULL OR us.user_id = user_id_param)
                    -- Ensure we haven't already sent a notification for this threshold
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM user_notifications un 
                        WHERE 
                            un.subscription_id = us.id 
                            AND un.type = 'subscription_expiry' 
                            AND (un.metadata->>'days_remaining')::INTEGER = threshold
                            AND un.created_at > CURRENT_DATE - INTERVAL '1 day'
                    )
            )
            SELECT 
                es.id,
                create_subscription_expiry_notification(es.id, es.days_left),
                es.days_left
            FROM expiring_subscriptions es;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;