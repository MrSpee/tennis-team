-- Erstelle die fehlende system_stats Tabelle

CREATE TABLE IF NOT EXISTS system_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    stat_type TEXT NOT NULL,
    stat_value INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stat_date, stat_type)
);

-- Erstelle Index für Performance
CREATE INDEX IF NOT EXISTS idx_system_stats_type_date ON system_stats(stat_type, stat_date);




