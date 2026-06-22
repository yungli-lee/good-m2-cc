CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line_id TEXT,
  email TEXT,
  service_type TEXT NOT NULL,
  area TEXT,
  budget TEXT,
  contact_time TEXT,
  message TEXT,
  source TEXT DEFAULT 'good.m2.cc',
  status TEXT DEFAULT 'new',
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status_created
ON service_requests (status, created_at);
