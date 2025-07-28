-- Performance Optimization Indexes for TechFolks Platform
-- These indexes are critical for handling 10,000+ concurrent users

-- ===== SUBMISSIONS TABLE INDEXES (HIGHEST PRIORITY) =====
-- Most critical for performance as submissions table will be queried frequently

-- User's submissions (user profile page, submission history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_verdict 
ON submissions(user_id, verdict);

-- Problem submissions (problem statistics, success rates)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_problem_verdict 
ON submissions(problem_id, verdict);

-- Contest submissions (contest standings, leaderboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_contest_user_time 
ON submissions(contest_id, user_id, created_at);

-- Time-based queries (recent submissions, submission timeline)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_created_at 
ON submissions(created_at DESC);

-- Language-specific analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_language_verdict 
ON submissions(language, verdict);

-- Composite index for complex leaderboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_contest_verdict_time 
ON submissions(contest_id, verdict, created_at) 
WHERE contest_id IS NOT NULL;

-- ===== USERS TABLE INDEXES =====
-- Critical for leaderboards and user analytics

-- Leaderboard queries (rating-based ranking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_rating_active 
ON users(rating DESC) 
WHERE is_active = true AND is_banned = false;

-- User activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users(last_login DESC);

-- Registration analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Geographic analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_country 
ON users(country) 
WHERE country IS NOT NULL;

-- Role-based queries (admin operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role) 
WHERE is_active = true;

-- Problem solving statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_problems_solved 
ON users(problems_solved DESC) 
WHERE problems_solved > 0;

-- ===== PROBLEMS TABLE INDEXES =====
-- Important for problem discovery and filtering

-- Public problem listing (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_problems_public_difficulty 
ON problems(difficulty, is_public, created_at DESC) 
WHERE is_public = true;

-- Author's problems
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_problems_author_public 
ON problems(author_id, is_public);

-- Problem search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_problems_difficulty_public 
ON problems(difficulty) 
WHERE is_public = true;

-- Problem creation timeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_problems_created_at 
ON problems(created_at DESC);

-- Text search optimization (for title searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_problems_title_gin 
ON problems USING gin(to_tsvector('english', title)) 
WHERE is_public = true;

-- ===== CONTESTS TABLE INDEXES =====
-- Critical for contest discovery and management

-- Active contest queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_status_public 
ON contests(status, is_public, start_time);

-- Contest timeline queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_time_range 
ON contests(start_time, end_time) 
WHERE is_public = true;

-- Contest registration queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_registration_time 
ON contests(registration_open, start_time) 
WHERE is_public = true;

-- Contest creator queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_created_by 
ON contests(created_by);

-- Upcoming contests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_upcoming 
ON contests(start_time ASC) 
WHERE start_time > NOW() AND is_public = true;

-- ===== TEST_CASES TABLE INDEXES =====
-- Important for submission evaluation

-- Test cases by problem (most frequent query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_problem_sample 
ON test_cases(problem_id, is_sample, id);

-- Sample test cases (displayed to users)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_sample 
ON test_cases(problem_id) 
WHERE is_sample = true;

-- Points-based queries (for scoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_cases_points 
ON test_cases(problem_id, points DESC);

-- ===== ADDITIONAL COMPOSITE INDEXES =====
-- For complex queries that join multiple conditions

-- User problem solving status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_problem_latest 
ON submissions(user_id, problem_id, created_at DESC);

-- Contest leaderboard optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_contest_score 
ON submissions(contest_id, user_id, points, created_at) 
WHERE contest_id IS NOT NULL AND verdict = 'accepted';

-- Problem difficulty statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_problem_stats 
ON submissions(problem_id, verdict, created_at) 
WHERE created_at > (NOW() - INTERVAL '30 days');

-- ===== PARTIAL INDEXES FOR SPECIFIC USE CASES =====
-- These save space and improve performance for specific queries

-- Recent active users (for real-time features)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_recent_activity 
ON users(last_login) 
WHERE last_login > (NOW() - INTERVAL '7 days');

-- Failed submissions (for debugging and analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_failed 
ON submissions(problem_id, language, created_at) 
WHERE verdict IN ('compilation_error', 'runtime_error', 'time_limit_exceeded');

-- Accepted submissions only (for statistics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_accepted 
ON submissions(user_id, problem_id, created_at) 
WHERE verdict = 'accepted';

-- Public contests only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contests_public_active 
ON contests(start_time, end_time, status) 
WHERE is_public = true;

-- ===== INDEX USAGE MONITORING =====
-- Create a view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- ===== PERFORMANCE MONITORING QUERIES =====
-- Queries to monitor database performance

-- Check for slow queries
-- Use: SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- Monitor index effectiveness
-- Use: SELECT * FROM index_usage_stats WHERE usage_category = 'UNUSED';

-- Check table sizes
-- Use: SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
--      FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

ANALYZE; -- Update table statistics after creating indexes