-- Groups functionality database schema
-- Add to existing schema

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    is_private BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for groups table
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- Create indexes for group members
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(group_id, role);

-- Group contests table (for linking contests to groups)
CREATE TABLE IF NOT EXISTS group_contests (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, contest_id)
);

-- Group problems table (for group-specific problems)
CREATE TABLE IF NOT EXISTS group_problems (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, problem_id)
);

-- Group discussions/forum table
CREATE TABLE IF NOT EXISTS group_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Group discussion replies
CREATE TABLE IF NOT EXISTS group_discussion_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES group_discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    parent_reply_id UUID REFERENCES group_discussion_replies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for group discussions
CREATE INDEX IF NOT EXISTS idx_group_discussions_group ON group_discussions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_discussions_author ON group_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_group_discussions_created ON group_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_discussion_replies_discussion ON group_discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_group_discussion_replies_author ON group_discussion_replies(author_id);

-- Group chat messages table (for real-time chat)
CREATE TABLE IF NOT EXISTS group_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for group chat
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group ON group_chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created ON group_chat_messages(created_at DESC);

-- Group announcements table
CREATE TABLE IF NOT EXISTS group_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_discussions_updated_at BEFORE UPDATE ON group_discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_discussion_replies_updated_at BEFORE UPDATE ON group_discussion_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_announcements_updated_at BEFORE UPDATE ON group_announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development
INSERT INTO groups (id, name, description, invite_code, is_private, owner_id) VALUES
(uuid_generate_v4(), 'Competitive Programming Club', 'A club for competitive programming enthusiasts to practice and improve their skills', 'CPC2024A', false, (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
(uuid_generate_v4(), 'Interview Preparation Group', 'Prepare for technical interviews with curated problems and mock contests', 'INTERVIEW2024', false, (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
(uuid_generate_v4(), 'Advanced Algorithms Study Group', 'Deep dive into advanced algorithmic concepts and problem-solving techniques', 'ALGO2024', true, (SELECT id FROM users WHERE username = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;