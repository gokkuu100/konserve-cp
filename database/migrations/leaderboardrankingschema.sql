-- Create leaderboard table
CREATE TABLE leaderboardranking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  rank INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_leaderboard UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_leaderboard_rank ON leaderboardranking(rank);
CREATE INDEX idx_leaderboard_points ON leaderboardranking(total_points DESC);

-- Callable function to recalculate ranks (not a trigger)
CREATE OR REPLACE FUNCTION recalculate_leaderboard_ranks()
RETURNS void AS $$
BEGIN
  UPDATE leaderboardranking
  SET rank = ranks.new_rank
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY total_points DESC) AS new_rank
    FROM leaderboardranking
  ) ranks
  WHERE leaderboardranking.id = ranks.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger-compatible wrapper that just calls the above
CREATE OR REPLACE FUNCTION update_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_leaderboard_ranks();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Sync user points to leaderboard
CREATE OR REPLACE FUNCTION sync_user_points_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    INSERT INTO leaderboardranking (user_id, full_name, total_points, avatar_url)
    VALUES (
      NEW.user_id,
      COALESCE(NEW.full_name, 'User'),
      COALESCE(NEW.reward_points, 0),
      NEW.avatar_url
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_points = COALESCE(NEW.reward_points, 0),
      full_name = COALESCE(NEW.full_name, leaderboardranking.full_name),
      avatar_url = COALESCE(NEW.avatar_url, leaderboardranking.avatar_url),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync newly created users
CREATE OR REPLACE FUNCTION sync_new_user_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leaderboardranking (user_id, full_name, total_points, avatar_url)
  VALUES (
    NEW.user_id,
    COALESCE(NEW.full_name, 'User'),
    COALESCE(NEW.reward_points, 0),
    NEW.avatar_url
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new auth user creation
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, avatar_url, reward_points)
  VALUES (
    NEW.user_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Manual sync function for all users
CREATE OR REPLACE FUNCTION sync_all_users_to_leaderboard()
RETURNS void AS $$
BEGIN
  INSERT INTO leaderboardranking (user_id, full_name, total_points, avatar_url)
  SELECT 
    u.user_id, 
    COALESCE(u.full_name, 'User'), 
    COALESCE(u.reward_points, 0), 
    u.avatar_url
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM leaderboardranking l WHERE l.user_id = u.user_id
  )
  AND EXISTS (
    SELECT 1 FROM auth.users a WHERE a.id = u.user_id
  );

  UPDATE leaderboardranking l
  SET 
    full_name = COALESCE(u.full_name, l.full_name),
    total_points = COALESCE(u.reward_points, 0),
    avatar_url = COALESCE(u.avatar_url, l.avatar_url),
    updated_at = NOW()
  FROM users u
  WHERE l.user_id = u.user_id
  AND (
    (l.full_name IS DISTINCT FROM COALESCE(u.full_name, l.full_name)) OR
    (l.total_points IS DISTINCT FROM COALESCE(u.reward_points, 0)) OR
    (l.avatar_url IS DISTINCT FROM COALESCE(u.avatar_url, l.avatar_url))
  );

  -- Correct function call here
  PERFORM recalculate_leaderboard_ranks();
END;
$$ LANGUAGE plpgsql;

-- Leaderboard stats function
CREATE OR REPLACE FUNCTION get_leaderboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM leaderboardranking),
    'top_score', (SELECT MAX(total_points) FROM leaderboardranking),
    'average_score', (SELECT AVG(total_points) FROM leaderboardranking),
    'last_updated', (SELECT MAX(updated_at) FROM leaderboardranking)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS

-- Update leaderboard on user update
CREATE TRIGGER update_user_leaderboard_trigger
AFTER INSERT OR UPDATE OF reward_points, full_name, avatar_url
ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_points_to_leaderboard();

-- Add new user to leaderboard
CREATE TRIGGER add_new_user_to_leaderboard_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION sync_new_user_to_leaderboard();

-- Create user in `users` table on auth.users insert
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_auth_user();

-- Recalculate leaderboard ranks on score change
CREATE TRIGGER update_leaderboard_ranks_trigger
AFTER INSERT OR UPDATE OF total_points
ON leaderboardranking
FOR EACH STATEMENT
EXECUTE FUNCTION update_leaderboard_ranks();

-- Initial sync (manual run)
SELECT sync_all_users_to_leaderboard();
