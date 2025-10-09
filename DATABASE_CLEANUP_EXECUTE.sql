-- ================================================================
-- DATABASE CLEANUP - VOLLSTÄNDIGE BEREINIGUNG
-- ================================================================
-- Ziel: Saubere, einfache Datenbank-Struktur
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧹 DATABASE CLEANUP STARTET';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 1: ANALYSE - Was ist da?
  -- =====================================================
  RAISE NOTICE '📊 SCHRITT 1: Analysiere aktuelle Struktur...';
  
  -- Zeige alle Tabellen/Views
  RAISE NOTICE 'Tabellen:';
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN 
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_type, table_name
    LOOP
      RAISE NOTICE '  %: %', rec.table_type, rec.table_name;
    END LOOP;
  END;
  
  -- Prüfe player_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_profiles') THEN
    DECLARE
      profile_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO profile_count FROM player_profiles;
      RAISE NOTICE 'player_profiles: % Einträge', profile_count;
    END;
  ELSE
    RAISE NOTICE 'player_profiles: Tabelle existiert nicht';
  END IF;
  
  -- Prüfe public_player_profiles
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_player_profiles') THEN
    DECLARE
      view_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO view_count FROM public_player_profiles;
      RAISE NOTICE 'public_player_profiles: % Einträge', view_count;
    END;
  ELSE
    RAISE NOTICE 'public_player_profiles: View existiert nicht';
  END IF;

  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 2: BACKUP (Sicherheit)
  -- =====================================================
  RAISE NOTICE '💾 SCHRITT 2: Erstelle Backups...';
  
  -- Backup player_profiles (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_profiles') THEN
    BEGIN
      EXECUTE 'CREATE TABLE IF NOT EXISTS player_profiles_backup AS SELECT * FROM player_profiles';
      RAISE NOTICE '✅ player_profiles_backup erstellt';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Backup player_profiles fehlgeschlagen: %', SQLERRM;
    END;
  END IF;
  
  -- Backup public_player_profiles (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_player_profiles') THEN
    BEGIN
      EXECUTE 'CREATE TABLE IF NOT EXISTS public_player_profiles_backup AS SELECT * FROM public_player_profiles';
      RAISE NOTICE '✅ public_player_profiles_backup erstellt';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Backup public_player_profiles fehlgeschlagen: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 3: LÖSCHE REDUNDANTE TABELLEN/VIEWS
  -- =====================================================
  RAISE NOTICE '🗑️ SCHRITT 3: Lösche redundante Tabellen/Views...';
  
  -- Lösche player_profiles (leer)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_profiles') THEN
    BEGIN
      EXECUTE 'DROP TABLE player_profiles CASCADE';
      RAISE NOTICE '✅ player_profiles gelöscht';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Löschen player_profiles fehlgeschlagen: %', SQLERRM;
    END;
  END IF;
  
  -- Lösche public_player_profiles (redundant)
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'public_player_profiles') THEN
    BEGIN
      EXECUTE 'DROP VIEW public_player_profiles CASCADE';
      RAISE NOTICE '✅ public_player_profiles gelöscht';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Löschen public_player_profiles fehlgeschlagen: %', SQLERRM;
    END;
  END IF;
  
  -- Lösche player_teams View (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'player_teams') THEN
    BEGIN
      EXECUTE 'DROP VIEW player_teams CASCADE';
      RAISE NOTICE '✅ player_teams View gelöscht';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Löschen player_teams View fehlgeschlagen: %', SQLERRM;
    END;
  END IF;
  
  -- Lösche player_teams_with_club View (falls vorhanden)
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'player_teams_with_club') THEN
    BEGIN
      EXECUTE 'DROP VIEW player_teams_with_club CASCADE';
      RAISE NOTICE '✅ player_teams_with_club View gelöscht';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Löschen player_teams_with_club View fehlgeschlagen: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 4: STELLE PLAYER_TEAMS TABELLE SICHER
  -- =====================================================
  RAISE NOTICE '🔧 SCHRITT 4: Stelle player_teams Tabelle sicher...';
  
  -- Prüfe ob player_teams als Tabelle existiert
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_teams' AND table_type = 'BASE TABLE') THEN
    BEGIN
      -- Erstelle player_teams Tabelle
      EXECUTE '
      CREATE TABLE player_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES players(id) ON DELETE CASCADE,
        team_id UUID REFERENCES team_info(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        role VARCHAR(50) DEFAULT ''player'',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(player_id, team_id)
      )';
      
      RAISE NOTICE '✅ player_teams Tabelle erstellt';
      
      -- Erstelle Index für Performance
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_player_teams_player_id ON player_teams(player_id)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_player_teams_team_id ON player_teams(team_id)';
      
      RAISE NOTICE '✅ Indizes für player_teams erstellt';
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Erstellen player_teams Tabelle fehlgeschlagen: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '✅ player_teams Tabelle existiert bereits';
  END IF;

  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 5: PRÜFE LK-DATEN
  -- =====================================================
  RAISE NOTICE '📊 SCHRITT 5: Analysiere LK-Daten...';
  
  -- Zeige LK-Status aller Spieler
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN 
      SELECT 
        name,
        current_lk,
        season_start_lk,
        ranking,
        CASE 
          WHEN current_lk IS NOT NULL THEN 'current_lk'
          WHEN season_start_lk IS NOT NULL THEN 'season_start_lk'  
          WHEN ranking IS NOT NULL THEN 'ranking (legacy)'
          ELSE 'KEINE LK'
        END as lk_quelle
      FROM players
      ORDER BY name
    LOOP
      RAISE NOTICE '  %: % (Quelle: %)', rec.name, COALESCE(rec.current_lk, rec.season_start_lk, rec.ranking, 'NULL'), rec.lk_quelle;
    END LOOP;
  END;

  RAISE NOTICE '';

  -- =====================================================
  -- SCHRITT 6: FINAL CHECK
  -- =====================================================
  RAISE NOTICE '✅ SCHRITT 6: Final Check...';
  
  -- Zeige verbleibende Tabellen
  RAISE NOTICE 'Verbleibende Tabellen:';
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN 
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    LOOP
      RAISE NOTICE '  ✅ %', rec.table_name;
    END LOOP;
    
    -- Zeige verbleibende Views
    RAISE NOTICE 'Verbleibende Views:';
    FOR rec IN 
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    LOOP
      RAISE NOTICE '  👁️ %', rec.table_name;
    END LOOP;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CLEANUP ABGESCHLOSSEN!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

END $$;

-- =====================================================
-- VERIFICATION: Zeige saubere Struktur
-- =====================================================

-- Alle Tabellen
SELECT 
  '📋 Tabellen' as typ,
  table_name as name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as spalten
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Alle Views
SELECT 
  '👁️ Views' as typ,
  table_name as name,
  'View' as spalten
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- LK-Status aller Spieler
SELECT 
  '🎾 Spieler LK-Status' as info,
  name,
  COALESCE(current_lk, season_start_lk, ranking, 'KEINE LK') as lk,
  CASE 
    WHEN current_lk IS NOT NULL THEN 'current_lk'
    WHEN season_start_lk IS NOT NULL THEN 'season_start_lk'  
    WHEN ranking IS NOT NULL THEN 'ranking (legacy)'
    ELSE '❌ KEINE LK'
  END as quelle
FROM players
ORDER BY name;
