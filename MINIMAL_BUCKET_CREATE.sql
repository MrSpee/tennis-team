-- ================================================
-- MINIMAL: NUR BUCKET ERSTELLEN (OHNE POLICIES)
-- ================================================

-- Erstelle nur den Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;
