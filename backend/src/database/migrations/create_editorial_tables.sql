-- Create editorials table
CREATE TABLE IF NOT EXISTS editorials (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    solution_approach TEXT NOT NULL,
    time_complexity VARCHAR(100) NOT NULL,
    space_complexity VARCHAR(100) NOT NULL,
    code_snippets JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(problem_id)
);

-- Create editorial solutions table
CREATE TABLE IF NOT EXISTS editorial_solutions (
    id SERIAL PRIMARY KEY,
    editorial_id INTEGER REFERENCES editorials(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    explanation TEXT,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(editorial_id, user_id)
);

-- Create editorial solution votes table
CREATE TABLE IF NOT EXISTS editorial_solution_votes (
    user_id INTEGER REFERENCES users(id),
    solution_id INTEGER REFERENCES editorial_solutions(id) ON DELETE CASCADE,
    vote INTEGER CHECK (vote IN (-1, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, solution_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_editorials_problem ON editorials(problem_id);
CREATE INDEX IF NOT EXISTS idx_editorials_author ON editorials(author_id);
CREATE INDEX IF NOT EXISTS idx_editorial_solutions_editorial ON editorial_solutions(editorial_id);
CREATE INDEX IF NOT EXISTS idx_editorial_solutions_user ON editorial_solutions(user_id);
CREATE INDEX IF NOT EXISTS idx_editorial_solutions_approved ON editorial_solutions(is_approved);
CREATE INDEX IF NOT EXISTS idx_editorial_solution_votes_solution ON editorial_solution_votes(solution_id);

-- Add updated_at triggers
CREATE TRIGGER update_editorials_updated_at BEFORE UPDATE ON editorials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editorial_solutions_updated_at BEFORE UPDATE ON editorial_solutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();