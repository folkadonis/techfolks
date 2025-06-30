-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('leader', 'co-leader', 'member')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(team_id, user_id)
);

-- Create team contests table
CREATE TABLE IF NOT EXISTS team_contests (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    contest_id INTEGER REFERENCES contests(id),
    registered_by INTEGER REFERENCES users(id),
    registration_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, contest_id)
);

-- Create team contest standings table
CREATE TABLE IF NOT EXISTS team_contest_standings (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER REFERENCES contests(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    rank INTEGER,
    score DECIMAL(10,2) DEFAULT 0,
    penalty_time INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    last_submission_time TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contest_id, team_id)
);

-- Create team submissions table (tracks which team member made each submission)
CREATE TABLE IF NOT EXISTS team_submissions (
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    team_contest_id INTEGER REFERENCES team_contests(id),
    submitted_by INTEGER REFERENCES users(id),
    PRIMARY KEY (submission_id)
);

-- Add team support columns to contests table
ALTER TABLE contests ADD COLUMN IF NOT EXISTS allow_teams BOOLEAN DEFAULT false;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS team_size_min INTEGER DEFAULT 2;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS team_size_max INTEGER DEFAULT 5;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_contests_team ON team_contests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_contests_contest ON team_contests(contest_id);
CREATE INDEX IF NOT EXISTS idx_team_standings_contest ON team_contest_standings(contest_id);
CREATE INDEX IF NOT EXISTS idx_team_standings_team ON team_contest_standings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_standings_rank ON team_contest_standings(contest_id, rank);

-- Add updated_at triggers
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_standings_updated_at BEFORE UPDATE ON team_contest_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();