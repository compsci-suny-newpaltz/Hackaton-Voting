-- Admins (manual whitelist only, faculty are auto-admins)
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  added_by TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_entity TEXT,
  details_json TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hackathons
CREATE TABLE IF NOT EXISTS hackathons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  vote_expiration DATETIME,
  banner_url TEXT,
  banner_position_x INTEGER DEFAULT 50,
  banner_position_y INTEGER DEFAULT 50,
  status TEXT DEFAULT 'upcoming',
  concluded_at DATETIME,
  concluded_by TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hackathon_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  team_emails TEXT NOT NULL,
  banner_url TEXT,
  banner_position_x INTEGER DEFAULT 50,
  banner_position_y INTEGER DEFAULT 50,
  image_url TEXT,
  image_position_x INTEGER DEFAULT 50,
  image_position_y INTEGER DEFAULT 50,
  description TEXT,
  github_link TEXT,
  current_file_url TEXT,
  current_file_name TEXT,
  current_file_size INTEGER,
  uploaded_by TEXT,
  uploaded_at DATETIME,
  deadline_override_enabled BOOLEAN DEFAULT 0,
  deadline_override_by TEXT,
  deadline_override_at DATETIME,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hackathon_id) REFERENCES hackathons(id)
);

-- Optional: File history metadata only (no actual files)
CREATE TABLE IF NOT EXISTS file_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  changelog TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Popular votes
CREATE TABLE IF NOT EXISTS popular_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_email),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Judge codes
CREATE TABLE IF NOT EXISTS judge_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  judge_name TEXT NOT NULL,
  hackathon_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  voted BOOLEAN DEFAULT 0,
  voted_at DATETIME,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (hackathon_id) REFERENCES hackathons(id)
);
CREATE INDEX IF NOT EXISTS idx_judge_codes_code ON judge_codes(code);
CREATE INDEX IF NOT EXISTS idx_judge_codes_hackathon ON judge_codes(hackathon_id);

-- Judge votes
CREATE TABLE IF NOT EXISTS judge_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judge_code_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
  comment TEXT,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (judge_code_id) REFERENCES judge_codes(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

