# API Documentation: Match Import

## 📋 Overview

Diese Vercel Serverless Function parsed Tennis-Meldelisten (TVM-Format) mithilfe von OpenAI GPT-4o und extrahiert strukturierte Match-Daten.

---

## 🔌 Endpoint

**POST** `/api/import/parse-matches`

---

## 📥 Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "text": "Medenspiele Winter 2025/26\nHerren 40 - Kreisliga A\n\nSpieltag 1\nSa, 15.11.2025, 14:00 Uhr\nSV Rot-Gelb Sürth vs. TC Köln-Süd\nOrt: Marienburger SC, Köln",
  "url": null,
  "teamId": "uuid-of-team",
  "userEmail": "user@example.com"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ja* | Der zu parsende Text der Meldeliste |
| `url` | string | ja* | URL zur TVM-Meldeliste (noch nicht implementiert) |
| `teamId` | string | ja | UUID des Teams für das die Matches importiert werden |
| `userEmail` | string | nein | E-Mail des Users für Logging |

*Entweder `text` oder `url` muss angegeben werden.

---

## 📤 Response

### Success (200 OK)
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_date": "2025-11-15",
        "start_time": "14:00",
        "opponent": "TC Köln-Süd",
        "is_home_match": true,
        "venue": "Marienburger SC",
        "address": "Köln",
        "matchday": 1,
        "league": "Kreisliga A",
        "notes": null
      }
    ],
    "season": "2025/26",
    "category": "Herren 40",
    "metadata": {
      "parsed_at": "2025-10-10T12:34:56.789Z",
      "team_id": "uuid-of-team",
      "user_email": "user@example.com",
      "tokens_used": 450,
      "cost_estimate": "$0.0067"
    }
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Keine Matches im Text gefunden. Bitte überprüfe das Format.",
  "details": "Der Text scheint keine erkennbaren Match-Informationen zu enthalten."
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate Limit erreicht. Bitte warte einen Moment und versuche es erneut."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Interner Server-Fehler beim Parsen",
  "details": "OpenAI API error: ..."
}
```

---

## 🧪 Testing

### Lokales Testing

1. **Environment Setup:**
```bash
# Erstelle .env Datei
echo "OPENAI_API_KEY=sk-proj-..." > .env
```

2. **Vercel Dev Server starten:**
```bash
npm install -g vercel
vercel dev
```

3. **Test Request:**
```bash
curl -X POST http://localhost:3000/api/import/parse-matches \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Spieltag 1\nSa, 15.11.2025, 14:00 Uhr\nSV Sürth vs. TC Köln\nOrt: Köln",
    "teamId": "test-team-id"
  }'
```

### Production Testing

```bash
curl -X POST https://your-app.vercel.app/api/import/parse-matches \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## 💰 Kosten

**GPT-4o Pricing:**
- Input: $5.00 / 1M tokens
- Output: $15.00 / 1M tokens

**Durchschnittliche Kosten pro Import:**
- ~500 Input Tokens + ~200 Output Tokens
- = ~$0.006 pro Import
- Budget $10/Monat = ~1600 Imports

---

## 🔒 Security

- ✅ API-Key bleibt serverseitig
- ✅ CORS aktiviert für Frontend-Zugriff
- ⏳ Rate Limiting TODO
- ⏳ Authentication TODO

---

## 📝 TODO

- [ ] URL-Fetching implementieren
- [ ] Rate Limiting (max 20 Imports/Stunde)
- [ ] User Authentication
- [ ] Logging/Monitoring
- [ ] Duplikat-Erkennung
- [ ] Screenshot/Image Support (GPT-4 Vision)

