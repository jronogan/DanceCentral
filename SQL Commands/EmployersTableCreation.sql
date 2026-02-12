-- Create MEMBERS table first (referenced by EMPLOYER_MEMBERS)
CREATE TABLE members (
    member_type VARCHAR(50) PRIMARY KEY
);

-- Insert member types
INSERT INTO members (member_type) VALUES 
    ('owner'),
    ('admin'),
    ('member'),
    ('recruiter');

-- Create EMPLOYERS table
CREATE TABLE employers (
    employer_id BIGSERIAL PRIMARY KEY,
    employer_name VARCHAR(120) NOT NULL,
    description TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create EMPLOYER_MEMBERS table
CREATE TABLE employer_members (
    employer_id BIGINT NOT NULL REFERENCES employers(employer_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    member_role VARCHAR(30) NOT NULL REFERENCES members(member_type),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (employer_id, user_id)
);