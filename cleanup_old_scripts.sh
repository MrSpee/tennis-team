#!/bin/bash

# ============================================
# CLEANUP: Lösche alte/überholte SQL-Skripte
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 CLEANUP: Alte SQL-Skripte löschen"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$(dirname "$0")"

# =====================================================
# BEHALTEN: Wichtige Skripte die wir noch brauchen
# =====================================================
echo "✅ BEHALTEN (wichtig):"
echo "   - MULTI_TENANCY_*.sql (Setup-Skripte)"
echo "   - DEBUG_*.sql (aktuelle Debug-Skripte)"
echo "   - DELETE_USER_BY_EMAIL.sql (generisches Tool)"
echo "   - CLEANUP_OLD_PLAYERS_POLICIES.sql (hat gefixt)"
echo "   - CLEANUP_OLD_TRAINING_POLICIES.sql (hat gefixt)"
echo ""

# =====================================================
# LÖSCHEN: Alte/überholte Fix-Skripte
# =====================================================
echo "🗑️  LÖSCHEN (überholt):"

# Alte Fix-Versuche (überholt durch CLEANUP_OLD_*_POLICIES.sql)
rm -f FIX_INFINITE_RECURSION_PLAYERS.sql
rm -f FIX_INFINITE_RECURSION_PLAYERS_FINAL.sql
rm -f FIX_TRAINING_RLS_PUBLIC.sql
rm -f COMPLETE_FIX_ONBOARDING_AND_TRAINING.sql
rm -f SIMPLE_FIX_RLS.sql
echo "   ✅ Alte Fix-Skripte gelöscht"

# Alte Test-Skripte
rm -f TEST_INFINITE_RECURSION_FIX.sql
rm -f CHECK_PLAYERS_POLICIES.sql
echo "   ✅ Alte Test-Skripte gelöscht"

# Alte Check-Skripte (nicht mehr nötig)
rm -f CHECK_CLUB_INFO_STRUCTURE.sql
rm -f CHECK_LEAGUE_STANDINGS_STRUCTURE.sql
echo "   ✅ Alte Check-Skripte gelöscht"

# Spezifische Cleanup-Skripte (einmalig ausgeführt)
rm -f CLEANUP_DUPLICATE_RODENKIRCHEN_TEAMS.sql
rm -f DELETE_DUPLICATE_RODENKIRCHEN_MATCHES.sql
rm -f DELETE_DUPLICATE_RODENKIRCHEN_TEAM.sql
rm -f DELETE_USER_JORZIG.sql
rm -f DELETE_USER_JORZIG_COMPLETE.sql
echo "   ✅ Einmalige Cleanup-Skripte gelöscht"

# Alte Fix-Skripte für spezifische Probleme
rm -f FIX_ACTIVITY_LOGGER.sql
rm -f FIX_FIND_SIMILAR_CLUBS.sql
rm -f FIX_HERREN_40_SEASONS.sql
echo "   ✅ Alte spezifische Fix-Skripte gelöscht"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CLEANUP ABGESCHLOSSEN!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Verbleibende wichtige Skripte:"
ls -1 *.sql | grep -E "(MULTI_TENANCY|DEBUG_|CLEANUP_OLD|DELETE_USER_BY_EMAIL|CHECK_ONBOARDING_STATUS)" | sort
echo ""


