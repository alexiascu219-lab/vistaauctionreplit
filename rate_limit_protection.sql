-- Rate Limit Protection Trigger
-- Blocks rapid-fire submissions from the same email (Max 1 per hour)

CREATE OR REPLACE FUNCTION check_submission_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INT;
BEGIN
    -- Count applications from this email in the last 60 minutes
    SELECT COUNT(*) INTO recent_count
    FROM vista_applications
    WHERE email = NEW.email
    AND applied_at > (NOW() - INTERVAL '1 hour');

    IF recent_count > 0 THEN
        RAISE EXCEPTION 'Rate Limit Exceeded: You have already submitted an application recently. Please wait 1 hour before trying again.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists to allow clean re-run
DROP TRIGGER IF EXISTS tr_rate_limit_check ON vista_applications;

-- Attach Trigger
CREATE TRIGGER tr_rate_limit_check
BEFORE INSERT ON vista_applications
FOR EACH ROW
EXECUTE FUNCTION check_submission_rate_limit();
