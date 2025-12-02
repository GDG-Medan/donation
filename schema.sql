-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  amount INTEGER NOT NULL,
  message TEXT,
  anonymous INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  midtrans_order_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Disbursements table
CREATE TABLE IF NOT EXISTS disbursements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Disbursement activities table (timeline/activity log for each disbursement)
CREATE TABLE IF NOT EXISTS disbursement_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disbursement_id INTEGER NOT NULL,
  activity_time DATETIME NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (disbursement_id) REFERENCES disbursements(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_disbursement_activities_disbursement_id ON disbursement_activities(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_activities_activity_time ON disbursement_activities(activity_time);

