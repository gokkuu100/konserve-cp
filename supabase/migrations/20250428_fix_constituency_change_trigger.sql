-- Fix the approve_constituency_change trigger function
CREATE OR REPLACE FUNCTION public.approve_constituency_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- Update the user's constituency directly in the users table
        UPDATE public.users
        SET 
            constituency = NEW.requested_constituency,
            updated_at = now()
        WHERE id = NEW.user_id;
        
        -- Set the approval timestamp
        NEW.approved_at = now();
        NEW.admin_id = auth.uid();
    END IF;
    
    IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        -- Set the rejection timestamp
        NEW.rejected_at = now();
        NEW.admin_id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's properly registered
DROP TRIGGER IF EXISTS on_constituency_change_approved ON public.constituency_change_requests;

CREATE TRIGGER on_constituency_change_approved
BEFORE UPDATE ON public.constituency_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.approve_constituency_change();

-- Create a function to update user profile with gender and age
CREATE OR REPLACE FUNCTION public.update_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the values have changed
    IF (OLD.gender IS DISTINCT FROM NEW.gender) OR 
       (OLD.age IS DISTINCT FROM NEW.age) THEN
        
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{gender}',
                to_jsonb(NEW.gender)
            ),
            '{age}',
            to_jsonb(NEW.age)
        )
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile updates
DROP TRIGGER IF EXISTS on_user_profile_update ON public.users;

CREATE TRIGGER on_user_profile_update
AFTER UPDATE ON public.users
FOR EACH ROW
WHEN (OLD.gender IS DISTINCT FROM NEW.gender OR OLD.age IS DISTINCT FROM NEW.age)
EXECUTE FUNCTION public.update_user_profile();
