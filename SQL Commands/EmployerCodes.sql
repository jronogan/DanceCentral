BEGIN;

-- 1) Reference table for membership roles
CREATE TABLE members (
  member_type VARCHAR(30) PRIMARY KEY
);

-- Optional seed values
INSERT INTO members(member_type) VALUES
('owner'), ('admin'), ('recruiter'), ('member')
ON CONFLICT DO NOTHING;

-- 2) Employers org table
CREATE TABLE employers (
  employer_id   BIGSERIAL PRIMARY KEY,
  employer_name VARCHAR(120) NOT NULL UNIQUE,
  description   TEXT,
  website       TEXT,
  email         TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Employer membership linking users to org
CREATE TABLE employer_members (
  employer_id  BIGINT NOT NULL REFERENCES employers(employer_id),
  user_id      BIGINT NOT NULL REFERENCES users(user_id),
  member_role  VARCHAR(30) NOT NULL REFERENCES members(member_type),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employer_id, user_id)
);

-- 4) Add org + poster info to gigs
ALTER TABLE gigs
  ADD COLUMN employer_id BIGINT REFERENCES employers(employer_id),
  ADD COLUMN posted_by_user_id BIGINT REFERENCES users(user_id);

-- 5) Indexes
CREATE INDEX idx_gigs_employer_id ON gigs(employer_id);
CREATE INDEX idx_employer_members_user_id ON employer_members(user_id);

COMMIT;

SELECT * FROM gigs;
