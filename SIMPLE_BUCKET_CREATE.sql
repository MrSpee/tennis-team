-- Einfache Bucket-Erstellung ohne Admin-Rechte
-- Führen Sie dies im Supabase Dashboard als Admin aus

-- Nur den Bucket erstellen
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Erfolg bestätigen
SELECT 'Bucket profile-images erstellt!' as status;
