-- Update discussions table to support threaded discussions and voting
ALTER TABLE discussions DROP COLUMN discussion_type;
ALTER TABLE discussions DROP COLUMN title;
ALTER TABLE discussions DROP COLUMN author_id;
ALTER TABLE discussions ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE discussions ADD COLUMN parent_id UUID REFERENCES discussions(id);
ALTER TABLE discussions ADD COLUMN title VARCHAR(255);
ALTER TABLE discussions ADD COLUMN upvotes INTEGER DEFAULT 0;
ALTER TABLE discussions ADD COLUMN is_announcement BOOLEAN DEFAULT false;

-- Create discussion_votes table
CREATE TABLE IF NOT EXISTS discussion_votes (
    user_id UUID REFERENCES users(id),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    vote INTEGER CHECK (vote IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, discussion_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON discussions(parent_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_upvotes ON discussions(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion ON discussion_votes(discussion_id);

-- Drop the old discussion_comments table as we'll use parent_id for threading
DROP TABLE IF EXISTS discussion_comments CASCADE;
EOF < /dev/null