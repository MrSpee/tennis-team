#!/bin/bash
# Cron-Job Test Script

echo "🧪 Cron-Job Test"
echo "=================="
echo ""

# Prüfe ob Server läuft
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Server läuft auf Port 3000"
    echo ""
    echo "📤 Teste Cron-Job..."
    echo ""
    curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
        -H "Content-Type: application/json" \
        -w "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHTTP Status: %{http_code}\nZeit: %{time_total}s\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" \
        -s | jq '.' 2>/dev/null || curl -X POST http://localhost:3000/api/cron/update-meeting-ids \
        -H "Content-Type: application/json" \
        -w "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nHTTP Status: %{http_code}\nZeit: %{time_total}s\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" \
        -s
else
    echo "❌ Server läuft nicht auf Port 3000"
    echo ""
    echo "💡 Starte Server mit:"
    echo "   npm run dev"
    echo ""
    echo "Dann führe dieses Script erneut aus."
    exit 1
fi
