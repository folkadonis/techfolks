-- TechFolks Database Schema
-- PostgreSQL database schema for competitive coding platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    bio TEXT,
    country VARCHAR(100),
    organization VARCHAR(255),
    rating INTEGER DEFAULT 1200,
    max_rating INTEGER DEFAULT 1200,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'problem_setter', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rating ON users(rating DESC);

-- Problems table
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    statement TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    time_limit INTEGER NOT NULL DEFAULT 1000, -- in milliseconds
    memory_limit INTEGER NOT NULL DEFAULT 256, -- in MB
    author_id UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for problems table
CREATE INDEX idx_problems_slug ON problems(slug);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_author ON problems(author_id);

-- Problem tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Problem-tag relationship
CREATE TABLE problem_tags (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, tag_id)
);

-- Test cases table
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT false,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for test cases
CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    problem_id UUID REFERENCES problems(id),
    contest_id UUID, -- Will reference contests table
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    verdict VARCHAR(50) CHECK (verdict IN ('pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'presentation_error')),
    score DECIMAL(5,2) DEFAULT 0,
    time_used INTEGER, -- in milliseconds
    memory_used INTEGER, -- in KB
    compilation_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for submissions
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_contest ON submissions(contest_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);

-- Submission test results table
CREATE TABLE submission_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id),
    verdict VARCHAR(50),
    time_used INTEGER,
    memory_used INTEGER,
    output TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contests table
CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    contest_type VARCHAR(50) CHECK (contest_type IN ('acm_icpc', 'ioi', 'atcoder')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    freeze_time TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT true,
    is_rated BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contests
CREATE INDEX idx_contests_slug ON contests(slug);
CREATE INDEX idx_contests_start_time ON contests(start_time);
CREATE INDEX idx_contests_end_time ON contests(end_time);

-- Contest problems relationship
CREATE TABLE contest_problems (
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id),
    problem_code VARCHAR(10) NOT NULL, -- A, B, C, etc.
    points INTEGER DEFAULT 100,
    PRIMARY KEY (contest_id, problem_id)
);

-- Contest participants
CREATE TABLE contest_participants (
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    registration_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_virtual BOOLEAN DEFAULT false,
    PRIMARY KEY (contest_id, user_id)
);

-- Contest standings
CREATE TABLE contest_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    rank INTEGER,
    score DECIMAL(10,2) DEFAULT 0,
    penalty_time INTEGER DEFAULT 0, -- for ACM-ICPC style
    problems_solved INTEGER DEFAULT 0,
    rating_change INTEGER DEFAULT 0,
    new_rating INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for standings
CREATE INDEX idx_standings_contest ON contest_standings(contest_id);
CREATE INDEX idx_standings_user ON contest_standings(user_id);
CREATE INDEX idx_standings_rank ON contest_standings(contest_id, rank);

-- User statistics table
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    problems_solved INTEGER DEFAULT 0,
    problems_attempted INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    accepted_submissions INTEGER DEFAULT 0,
    contests_participated INTEGER DEFAULT 0,
    best_rank INTEGER,
    contribution_points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_submission_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    category VARCHAR(100),
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id),
    achievement_id UUID REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

-- Announcements table
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) CHECK (announcement_type IN ('general', 'contest', 'maintenance', 'update')),
    contest_id UUID REFERENCES contests(id),
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User follows table (for social features)
CREATE TABLE user_follows (
    follower_id UUID REFERENCES users(id),
    following_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Discussion forums table
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    discussion_type VARCHAR(50) CHECK (discussion_type IN ('problem', 'contest', 'general', 'editorial')),
    problem_id UUID REFERENCES problems(id),
    contest_id UUID REFERENCES contests(id),
    author_id UUID REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discussion comments
CREATE TABLE discussion_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES discussion_comments(id),
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for discussions
CREATE INDEX idx_discussions_type ON discussions(discussion_type);
CREATE INDEX idx_discussions_problem ON discussions(problem_id);
CREATE INDEX idx_discussions_contest ON discussions(contest_id);
CREATE INDEX idx_discussion_comments_discussion ON discussion_comments(discussion_id);

-- Rating history table
CREATE TABLE rating_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    contest_id UUID REFERENCES contests(id),
    old_rating INTEGER NOT NULL,
    new_rating INTEGER NOT NULL,
    rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for rating history
CREATE INDEX idx_rating_history_user ON rating_history(user_id, created_at DESC);

-- Session/refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for refresh tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_comments_updated_at BEFORE UPDATE ON discussion_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contest_standings_updated_at BEFORE UPDATE ON contest_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();