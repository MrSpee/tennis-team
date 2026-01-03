#!/bin/bash

# Test-Skript für Cron-Job (Production)
# 
# Nutzung:
#   chmod +x test-cron-job.sh
#   ./test-cron-job.sh

PROD_URL="https://tennis-team-gamma.vercel.app"
ENDPOINT="${PROD_URL}/api/cron/update-meeting-ids"

echo "🧪 Testing Cron-Job: ${ENDPOINT}"
echo ""

# Test mit curl
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "✅ Test abgeschlossen!"
echo ""
echo "📊 Tipp: Prüfe die Logs in Vercel Dashboard für Details:"
echo "   https://vercel.com/dashboard → Dein Projekt → Logs"

