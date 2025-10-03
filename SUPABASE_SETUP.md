# 🚀 Supabase Setup-Anleitung

## Schritt 1: Supabase-Projekt erstellen (5 Minuten)

### 1.1 Account erstellen
1. Gehen Sie zu: https://supabase.com
2. Klicken Sie auf **"Start your project"**
3. Melden Sie sich an mit:
   - GitHub (empfohlen)
   - oder Email

### 1.2 Neues Projekt erstellen
1. Klicken Sie auf **"New Project"**
2. Füllen Sie aus:
   - **Name:** `tennis-team-organizer`
   - **Database Password:** Wählen Sie ein sicheres Passwort (wird automatisch generiert)
   - **Region:** `Frankfurt (eu-central-1)` (nächstgelegener Server)
   - **Pricing Plan:** `Free` (ausreichend für Ihren Verein)
3. Klicken Sie **"Create new project"**
4. ⏳ Warten Sie ~2 Minuten (Projekt wird eingerichtet)

### 1.3 API-Keys kopieren
1. Gehen Sie zu **Settings** (⚙️ links unten)
2. Klicken Sie auf **API**
3. Kopieren Sie:
   - ✅ **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - ✅ **anon/public key** (beginnt mit `eyJ...`)

**⚠️ WICHTIG:** Diese Keys sind für die nächsten Schritte erforderlich!

---

## Schritt 2: Datenbank-Schema einrichten (5 Minuten)

### 2.1 SQL Editor öffnen
1. In Ihrem Supabase-Projekt: Klicken Sie auf **SQL Editor** (links im Menü)
2. Klicken Sie auf **"New Query"**

### 2.2 Schema erstellen
Kopieren Sie das komplette SQL-Schema aus der Datei `SUPABASE_SCHEMA.sql` und führen Sie es aus:
1. SQL-Code einfügen
2. Klicken Sie auf **"Run"** (▶️)
3. ✅ Sie sollten "Success" sehen

### 2.3 Row Level Security (RLS) aktivieren
Das Schema aktiviert automatisch:
- ✅ Jeder Spieler sieht nur seine eigenen Profildaten
- ✅ Admins (Team Captains) sehen alle Daten
- ✅ Alle können öffentliche Match-Daten sehen

---

## Schritt 3: App mit Supabase verbinden (wird automatisch gemacht)

Nach Schritt 1 und 2 führen Sie folgende Befehle im Terminal aus:

```bash
cd tennis-team

# Supabase Client installieren
npm install @supabase/supabase-js

# App starten
npm run dev
```

### 3.1 Umgebungsvariablen konfigurieren
Erstellen Sie eine `.env` Datei im `tennis-team` Ordner:

```env
VITE_SUPABASE_URL=ihre_project_url_hier
VITE_SUPABASE_ANON_KEY=ihr_anon_key_hier
```

**Ersetzen Sie die Platzhalter mit Ihren Werten aus Schritt 1.3!**

---

## ✅ Fertig!

Nach diesen Schritten:
- ✅ Zentrale Datenbank läuft
- ✅ Mehrere Nutzer können gleichzeitig arbeiten
- ✅ Daten sind dauerhaft gespeichert
- ✅ Echtzeit-Updates funktionieren
- ✅ Authentifizierung ist sicher

---

## 📊 Was Sie jetzt haben:

### Kostenloser Plan beinhaltet:
- ✅ 500 MB Datenbank-Speicher
- ✅ 2 GB Daten-Traffic pro Monat
- ✅ 50.000 monatliche aktive Benutzer
- ✅ Unbegrenzte API-Anfragen
- ✅ Automatische Backups (7 Tage)

**Für einen Tennisverein mehr als ausreichend! 🎾**

---

## 🆘 Hilfe benötigt?

### Häufige Probleme:

**Problem:** "Invalid API key"
- ✅ **Lösung:** Überprüfen Sie `.env` Datei - Keys korrekt kopiert?

**Problem:** "No rows returned"
- ✅ **Lösung:** Haben Sie das SQL-Schema ausgeführt? (Schritt 2)

**Problem:** "Connection error"
- ✅ **Lösung:** Ist Ihr Supabase-Projekt aktiv? (grüner Status)

---

## 📚 Weitere Ressourcen

- [Supabase Dokumentation](https://supabase.com/docs)
- [React Integration Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Authentication Guide](https://supabase.com/docs/guides/auth)

---

**Nächste Schritte:** Sehen Sie `SUPABASE_SCHEMA.sql` für Details zum Datenbank-Schema.

