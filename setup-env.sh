#!/bin/bash

# Tennis Team Organizer - Environment Setup
# Dieses Script hilft dir beim Einrichten der Environment-Variablen

echo "🎾 Tennis Team Organizer - Environment Setup"
echo "============================================="
echo ""

# Prüfe ob .env existiert
if [ -f .env ]; then
    echo "✅ .env Datei existiert bereits"
    echo ""
    read -p "Möchtest du sie überschreiben? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup abgebrochen."
        exit 0
    fi
fi

# OpenAI API Key
echo "📝 OpenAI API Key"
echo "Hole deinen API Key von: https://platform.openai.com/api-keys"
echo ""
read -p "Gib deinen OpenAI API Key ein: " OPENAI_KEY

# Schreibe .env
cat > .env << EOF
# OpenAI API Key für Match-Import
OPENAI_API_KEY=$OPENAI_KEY

# Supabase (bereits konfiguriert - bitte nicht ändern)
VITE_SUPABASE_URL=https://fyvmyyfuxuconhdbiwoa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF

echo ""
echo "✅ .env Datei erstellt!"
echo ""
echo "⚠️  WICHTIG:"
echo "1. Die .env Datei ist in .gitignore und wird NICHT committed"
echo "2. Für Vercel Production: Setze OPENAI_API_KEY als Environment Variable in den Vercel Settings"
echo "3. Teste lokal mit: vercel dev"
echo ""
echo "🚀 Du kannst jetzt starten!"

