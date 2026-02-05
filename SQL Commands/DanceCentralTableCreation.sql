-- Recommended extensions (optional but useful)
-- CREATE EXTENSION IF NOT EXISTS citext;

BEGIN;

-- =========================
-- Lookup / reference tables
-- =========================

CREATE TABLE event_types (
  type_name   VARCHAR(50) NOT NULL PRIMARY KEY
);

CREATE TABLE application_status (
  status VARCHAR(50) PRIMARY KEY
);

CREATE TABLE roles (
  role_name  VARCHAR(50) NOT NULL PRIMARY KEY
);

CREATE TABLE skills (
  skill_name  VARCHAR(50) NOT NULL PRIMARY KEY
);

-- =========================
-- Core entities
-- =========================

CREATE TABLE users (
  user_id     BIGSERIAL PRIMARY KEY,
  user_name   VARCHAR(50) NOT NULL,
  dob         DATE,
  password    VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gigs (
  gig_id      BIGSERIAL PRIMARY KEY,
  gig_name    VARCHAR(50) NOT NULL,
  gig_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  type_name   VARCHAR(50) REFERENCES event_types(type_name)
);

-- =========================
-- Applications
-- =========================

CREATE TABLE applications (
  application_id  BIGSERIAL PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  gig_id          BIGINT      NOT NULL REFERENCES gigs(gig_id)  ON DELETE CASCADE,
  status          VARCHAR(50) NOT NULL REFERENCES application_status(status),
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at      TIMESTAMPTZ,
  UNIQUE (gig_id, user_id),
  CHECK (decided_at IS NULL OR decided_at >= applied_at)
);

-- =========================
-- Gig requirements
-- =========================

CREATE TABLE gigs_roles (
  gig_id        BIGINT      NOT NULL REFERENCES gigs(gig_id) ON DELETE CASCADE,
  role_name     VARCHAR(50) NOT NULL REFERENCES roles(role_name),
  needed_count  INT         NOT NULL DEFAULT 1 CHECK (needed_count >= 0),
  pay_amount    NUMERIC(10,2),
  pay_currency  CHAR(3)     NOT NULL DEFAULT 'SGD',
  pay_unit      TEXT        NOT NULL DEFAULT 'per_gig',
  PRIMARY KEY (gig_id, role_name)
);

CREATE TABLE applications_roles (
  application_id BIGINT      NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  role_name      VARCHAR(50) NOT NULL REFERENCES roles(role_name),
  PRIMARY KEY (application_id, role_name)
);

-- =========================
-- User attributes
-- =========================

CREATE TABLE users_skills (
  user_id     BIGINT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  skill_name  VARCHAR(50) NOT NULL REFERENCES skills(skill_name),
  PRIMARY KEY (user_id, skill_name)
);

CREATE TABLE users_roles (
  user_id     BIGINT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_name   VARCHAR(50) NOT NULL REFERENCES roles(role_name),
  PRIMARY KEY (user_id, role_name)
);

-- =========================
-- Gig skill requirements
-- =========================

CREATE TABLE gigs_skills (
  gig_id      BIGINT      NOT NULL REFERENCES gigs(gig_id) ON DELETE CASCADE,
  skill_name  VARCHAR(50) NOT NULL REFERENCES skills(skill_name),
  PRIMARY KEY (gig_id, skill_name)
);

-- =========================
-- Helpful indexes
-- =========================

CREATE INDEX idx_gigs_type_name            ON gigs(type_name);
CREATE INDEX idx_gigs_gig_date             ON gigs(gig_date);

CREATE INDEX idx_apps_user_id              ON applications(user_id);
CREATE INDEX idx_apps_gig_id               ON applications(gig_id);
CREATE INDEX idx_apps_status               ON applications(status);

CREATE INDEX idx_gigs_roles_role_name      ON gigs_roles(role_name);
CREATE INDEX idx_apps_roles_role_name      ON applications_roles(role_name);

CREATE INDEX idx_users_skills_skill_name   ON users_skills(skill_name);
CREATE INDEX idx_users_roles_role_name     ON users_roles(role_name);
CREATE INDEX idx_gigs_skills_skill_name    ON gigs_skills(skill_name);

COMMIT;

-- =========================
-- Seed statuses (optional)
-- =========================
INSERT INTO application_status(status)
VALUES ('applied'), ('shortlisted'), ('accepted'), ('rejected'), ('withdrawn');
