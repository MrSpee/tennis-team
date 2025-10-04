-- Setup für Profilbilder Storage Bucket
-- Führen Sie diese Befehle in der Supabase SQL Konsole aus

-- 1. Erstelle Storage Bucket für Profilbilder
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true);

-- 2. RLS Policy für öffentlichen Zugriff auf Profilbilder
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'public');

-- 3. RLS Policy für Upload von Profilbildern (nur authentifizierte User)
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profile-images'
);

-- 4. RLS Policy für Update von eigenen Profilbildern
CREATE POLICY "Users can update own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profile-images'
  AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
);

-- 5. RLS Policy für Delete von eigenen Profilbildern
CREATE POLICY "Users can delete own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'profile-images'
  AND (storage.filename(name)) LIKE auth.uid()::text || '_%'
);

-- 6. Erweitere players Tabelle um neue Felder
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS favorite_shot TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tennis_motto TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS fun_fact TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS worst_tennis_memory TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS best_tennis_memory TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS superstition TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS pre_match_routine TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS favorite_opponent TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS dream_match TEXT;

-- 7. Kommentare für die neuen Spalten
COMMENT ON COLUMN players.profile_image IS 'URL zum Profilbild im Storage';
COMMENT ON COLUMN players.favorite_shot IS 'Lieblingsschlag des Spielers';
COMMENT ON COLUMN players.tennis_motto IS 'Tennis-Motto des Spielers';
COMMENT ON COLUMN players.fun_fact IS 'Lustiger Fakt über den Spieler';
COMMENT ON COLUMN players.worst_tennis_memory IS 'Peinlichster Tennis-Moment';
COMMENT ON COLUMN players.best_tennis_memory IS 'Bester Tennis-Moment';
COMMENT ON COLUMN players.superstition IS 'Tennis-Aberglaube';
COMMENT ON COLUMN players.pre_match_routine IS 'Pre-Match Routine';
COMMENT ON COLUMN players.favorite_opponent IS 'Lieblingsgegner';
COMMENT ON COLUMN players.dream_match IS 'Traum-Match';
