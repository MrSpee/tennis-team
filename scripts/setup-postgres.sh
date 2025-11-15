#!/bin/bash

# Setup Script für PostgreSQL Zugriff auf Supabase
# Dieses Script hilft dir, die Environment Variables zu setzen

echo "🔧 PostgreSQL Setup für Supabase"
echo "================================"
echo ""

# Prüfe ob .env.postgresql existiert
if [ -f .env.postgresql ]; then
  echo "✅ .env.postgresql gefunden"
  echo "📝 Lade Environment Variables..."
  export $(cat .env.postgresql | grep -v '^#' | xargs)
  echo "✅ Environment Variables geladen!"
else
  echo "❌ .env.postgresql nicht gefunden!"
  echo ""
  echo "Erstelle die Datei mit folgendem Inhalt:"
  echo ""
  echo "PGHOST=db.xxxxxxxxxxxxx.supabase.co"
  echo "PGPORT=5432"
  echo "PGDATABASE=postgres"
  echo "PGUSER=postgres"
  echo "PGPASSWORD=dein-passwort-hier"
  echo "PGSSLMODE=require"
  echo ""
  echo "Dann führe dieses Script erneut aus."
  exit 1
fi

# Teste die Verbindung
echo ""
echo "🔍 Teste Verbindung zu Supabase..."
psql -c "SELECT 'Verbindung erfolgreich!' as status, version();" 2>&1 | head -5

if [ $? -eq 0 ]; then
  echo ""
  echo "✅✅✅ Setup erfolgreich! ✅✅✅"
  echo ""
  echo "Du kannst jetzt SQL-Befehle ausführen:"
  echo "  psql -c \"SELECT * FROM team_info LIMIT 5;\""
  echo ""
  echo "Oder SQL-Files ausführen:"
  echo "  psql -f sql/dein-script.sql"
else
  echo ""
  echo "❌ Verbindung fehlgeschlagen!"
  echo "Prüfe deine Credentials in .env.postgresql"
fi

