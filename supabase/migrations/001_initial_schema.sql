-- ═══════════════════════════════════════════════════════
-- WeDecide — PostgreSQL Schema
-- Supabase / PostgreSQL 15+
-- Migration: 001_initial_schema
-- ═══════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── USERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           text        UNIQUE,
  username        text        UNIQUE NOT NULL,
  display_name    text,
  avatar_url      text,
  predict_score   integer     NOT NULL DEFAULT 0,
  tier            text        NOT NULL DEFAULT 'Rookie'
                              CHECK (tier IN ('Rookie','Analyst','Oracle','Visionary','Legend')),
  accuracy_pct    numeric(5,2) NOT NULL DEFAULT 0.00,
  total_preds     integer     NOT NULL DEFAULT 0,
  correct_preds   integer     NOT NULL DEFAULT 0,
  current_streak  integer     NOT NULL DEFAULT 0,
  longest_streak  integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── PREDICTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        text        NOT NULL,
  description     text,
  category        text        NOT NULL
                              CHECK (category IN ('Cricket','Bollywood','Politics','Startups','Technology','Sports','Economy','World')),
  subcategory     text,
  difficulty      text        NOT NULL DEFAULT 'medium'
                              CHECK (difficulty IN ('easy','medium','hard')),
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','closed','resolved')),
  outcome         boolean,
  resolves_at     timestamptz NOT NULL,
  resolved_at     timestamptz,
  yes_count       integer     NOT NULL DEFAULT 0,
  no_count        integer     NOT NULL DEFAULT 0,
  curated_by      uuid        REFERENCES users(id) ON DELETE SET NULL,
  source_url      text,
  tags            text[]      NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── VOTES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prediction_id   uuid        NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  choice          boolean     NOT NULL,         -- true = YES, false = NO
  is_correct      boolean,                      -- set after resolution
  score_delta     integer,                      -- points awarded/deducted
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prediction_id)               -- one vote per user per prediction
);

-- ─── FOLLOWS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ─── CLUBS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clubs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text,
  avatar_url      text,
  invite_code     text        UNIQUE NOT NULL DEFAULT upper(left(replace(gen_random_uuid()::text, '-', ''), 8)),
  owner_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_count    integer     NOT NULL DEFAULT 1,
  is_public       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── CLUB MEMBERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_members (
  club_id         uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

-- ─── SCORE LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta           integer     NOT NULL,
  reason          text        NOT NULL,
  vote_id         uuid        REFERENCES votes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            text        NOT NULL CHECK (type IN ('prediction_resolved','tier_upgrade','streak_milestone','follow')),
  title           text        NOT NULL,
  body            text,
  payload         jsonb       NOT NULL DEFAULT '{}',
  read            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- INDEXES — Every production query is indexed
-- ═══════════════════════════════════════════════════════

-- Feed query: open predictions ordered by activity
CREATE INDEX idx_pred_status_created      ON predictions(status, created_at DESC);
CREATE INDEX idx_pred_category_status     ON predictions(category, status, resolves_at);
CREATE INDEX idx_pred_resolves_at         ON predictions(resolves_at) WHERE status = 'open';

-- Vote lookup: "has this user voted on this prediction?"
CREATE INDEX idx_votes_user_pred          ON votes(user_id, prediction_id);
CREATE INDEX idx_votes_prediction_id      ON votes(prediction_id);

-- Leaderboard: top users by score
CREATE INDEX idx_users_score              ON users(predict_score DESC);
CREATE INDEX idx_users_tier_score         ON users(tier, predict_score DESC);

-- Score log for profile history
CREATE INDEX idx_scorelog_user_created    ON score_log(user_id, created_at DESC);

-- Follow graph
CREATE INDEX idx_follows_follower         ON follows(follower_id);
CREATE INDEX idx_follows_following        ON follows(following_id);

-- Club members
CREATE INDEX idx_club_members_club        ON club_members(club_id);
CREATE INDEX idx_club_members_user        ON club_members(user_id);

-- Notifications
CREATE INDEX idx_notifs_user_unread       ON notifications(user_id, read, created_at DESC);

-- Full text search on predictions
CREATE INDEX idx_pred_fts                 ON predictions USING gin(to_tsvector('english', question));

-- Trigram search on usernames
CREATE INDEX idx_users_username_trgm      ON users USING gin(username gin_trgm_ops);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: public profiles readable by all, only self can update
CREATE POLICY "Public profiles are viewable" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"  ON users FOR UPDATE USING (auth.uid() = id);

-- Predictions: readable by all
CREATE POLICY "Predictions viewable by all"   ON predictions FOR SELECT USING (true);
CREATE POLICY "Service role manages predictions" ON predictions FOR ALL USING (auth.role() = 'service_role');

-- Votes: users can read their own votes, admins see all
CREATE POLICY "Users can read own votes"      ON votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can cast votes"          ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages votes"    ON votes FOR ALL USING (auth.role() = 'service_role');

-- Follows: readable by all
CREATE POLICY "Follows viewable by all"       ON follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows"      ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows"      ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Clubs: public clubs readable by all
CREATE POLICY "Public clubs viewable"         ON clubs FOR SELECT USING (is_public = true OR owner_id = auth.uid());
CREATE POLICY "Users create clubs"            ON clubs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update clubs"           ON clubs FOR UPDATE USING (auth.uid() = owner_id);

-- Club members
CREATE POLICY "Members viewable"              ON club_members FOR SELECT USING (true);
CREATE POLICY "Users join clubs"              ON club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave clubs"             ON club_members FOR DELETE USING (auth.uid() = user_id);

-- Score log: only own
CREATE POLICY "Users view own score log"      ON score_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages score_log" ON score_log FOR ALL USING (auth.role() = 'service_role');

-- Notifications: only own
CREATE POLICY "Users view own notifications"  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role sends notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════
-- FUNCTIONS + TRIGGERS
-- ═══════════════════════════════════════════════════════

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update yes_count/no_count on votes insert
CREATE OR REPLACE FUNCTION increment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.choice THEN
    UPDATE predictions SET yes_count = yes_count + 1 WHERE id = NEW.prediction_id;
  ELSE
    UPDATE predictions SET no_count = no_count + 1 WHERE id = NEW.prediction_id;
  END IF;

  -- Auto-update difficulty based on current split
  UPDATE predictions SET
    difficulty = CASE
      WHEN ABS(
        ROUND(yes_count * 100.0 / GREATEST(yes_count + no_count, 1)) - 50
      ) > 30 THEN 'easy'
      WHEN ABS(
        ROUND(yes_count * 100.0 / GREATEST(yes_count + no_count, 1)) - 50
      ) > 15 THEN 'medium'
      ELSE 'hard'
    END
  WHERE id = NEW.prediction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION increment_vote_counts();

-- Score recalculation function (called by BullMQ worker after resolution)
CREATE OR REPLACE FUNCTION recalculate_user_score(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_accuracy       numeric(5,2);
  v_total          integer;
  v_correct        integer;
  v_correct_hard   integer;
  v_correct_medium integer;
  v_correct_easy   integer;
  v_wrong          integer;
  v_streak         integer;
  v_streak_bonus   integer;
  v_new_score      integer;
  v_tier           text;
BEGIN
  -- Gather stats from resolved votes
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_correct = true),
    COUNT(*) FILTER (WHERE is_correct = true AND p.difficulty = 'hard'),
    COUNT(*) FILTER (WHERE is_correct = true AND p.difficulty = 'medium'),
    COUNT(*) FILTER (WHERE is_correct = true AND p.difficulty = 'easy'),
    COUNT(*) FILTER (WHERE is_correct = false)
  INTO v_total, v_correct, v_correct_hard, v_correct_medium, v_correct_easy, v_wrong
  FROM votes v
  JOIN predictions p ON p.id = v.prediction_id
  WHERE v.user_id = p_user_id AND v.is_correct IS NOT NULL;

  -- Accuracy percentage
  v_accuracy := CASE WHEN v_total > 0 THEN ROUND(v_correct * 100.0 / v_total, 2) ELSE 0 END;

  -- Get current streak
  SELECT current_streak INTO v_streak FROM users WHERE id = p_user_id;

  -- Streak bonus
  v_streak_bonus := CASE
    WHEN v_streak >= 30 THEN v_streak * 12
    WHEN v_streak >= 7  THEN v_streak * 8
    WHEN v_streak >= 3  THEN v_streak * 5
    ELSE 0
  END;

  -- PredictScore formula (from PRD section 05)
  v_new_score :=
    ROUND(v_accuracy * 4.0)
    + (v_correct_hard   * 15)
    + (v_correct_medium * 8)
    + (v_correct_easy   * 3)
    + v_streak_bonus
    - (v_wrong * 2);

  v_new_score := GREATEST(v_new_score, 0);

  -- Determine tier
  v_tier := CASE
    WHEN v_new_score >= 850 THEN 'Legend'
    WHEN v_new_score >= 600 THEN 'Visionary'
    WHEN v_new_score >= 300 THEN 'Oracle'
    WHEN v_new_score >= 100 THEN 'Analyst'
    ELSE 'Rookie'
  END;

  -- Update user
  UPDATE users SET
    predict_score  = v_new_score,
    tier           = v_tier,
    accuracy_pct   = v_accuracy,
    total_preds    = v_total,
    correct_preds  = v_correct
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: resolve prediction and update all voter results
CREATE OR REPLACE FUNCTION resolve_prediction(p_prediction_id uuid, p_outcome boolean)
RETURNS void AS $$
BEGIN
  -- Set outcome and resolution time
  UPDATE predictions SET
    outcome     = p_outcome,
    status      = 'resolved',
    resolved_at = now()
  WHERE id = p_prediction_id;

  -- Mark votes as correct/incorrect
  UPDATE votes SET
    is_correct  = (choice = p_outcome),
    score_delta = CASE
      WHEN choice = p_outcome THEN (
        SELECT CASE difficulty
          WHEN 'hard'   THEN 15
          WHEN 'medium' THEN 8
          ELSE               3
        END
        FROM predictions WHERE id = p_prediction_id
      )
      ELSE -2
    END
  WHERE prediction_id = p_prediction_id;

  -- Log score changes
  INSERT INTO score_log (user_id, delta, reason, vote_id)
  SELECT v.user_id, v.score_delta,
    CASE WHEN v.is_correct THEN 'Correct prediction' ELSE 'Incorrect prediction' END,
    v.id
  FROM votes v
  WHERE v.prediction_id = p_prediction_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
