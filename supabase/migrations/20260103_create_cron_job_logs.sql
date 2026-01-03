-- ============================================================
-- 🎯 CRON JOB LOGS TABLE
-- ============================================================
-- Speichert Ergebnisse von Cron-Job-Ausführungen
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  total_processed INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  duration_ms INTEGER,
  message TEXT,
  summary JSONB,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_start_time ON cron_job_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status);

-- Kommentare
COMMENT ON TABLE cron_job_logs IS 'Speichert Ergebnisse von Cron-Job-Ausführungen für Monitoring und Debugging';
COMMENT ON COLUMN cron_job_logs.job_name IS 'Name des Cron-Jobs (z.B. update-meeting-ids)';
COMMENT ON COLUMN cron_job_logs.status IS 'Status: success (erfolgreich), warning (Warnung), error (Fehler)';
COMMENT ON COLUMN cron_job_logs.summary IS 'Detaillierte Zusammenfassung als JSONB (z.B. resultsProcessed, resultsUpdated)';
COMMENT ON COLUMN cron_job_logs.errors IS 'Fehler-Liste als JSONB Array';

