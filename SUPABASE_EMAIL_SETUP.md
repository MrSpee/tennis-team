# 📧 Supabase Email-Bestätigung konfigurieren

## Problem
Bei der Registrierung werden Spielerdaten **NICHT** in die Datenbank geschrieben, wenn Email-Bestätigung aktiv ist.

---

## ✅ Lösung: Email-Bestätigung deaktivieren (Development)

### Für lokales Testing empfohlen!

1. **Öffnen Sie Ihr Supabase-Projekt:**
   → https://supabase.com/dashboard

2. **Gehen Sie zu:**
   - **Authentication** (👤 links im Menü)
   - **Providers**
   - **Email**

3. **Scrollen Sie runter zu "Email Configuration"**

4. **Deaktivieren Sie:**
   - ❌ **"Confirm email"** → ausschalten

5. **Klicken Sie:** **Save**

---

## 🎯 Was passiert jetzt?

### Vorher (mit Email-Bestätigung):
1. User registriert sich
2. ✅ Auth-Eintrag wird erstellt
3. ❌ Player-Eintrag wird NICHT erstellt (Permission Denied)
4. 📧 User muss Email bestätigen
5. Erst DANACH kann Player-Eintrag erstellt werden

### Nachher (ohne Email-Bestätigung):
1. User registriert sich
2. ✅ Auth-Eintrag wird erstellt
3. ✅ Player-Eintrag wird sofort erstellt
4. 🚀 User kann direkt loslegen!

---

## 🔐 Sicherheit in Produktion

**Für echte Produktion empfohlen:**
- ✅ Email-Bestätigung **aktiviert** lassen
- ✅ Stattdessen: "Email Templates" konfigurieren
- ✅ Eigene Domain verwenden

**Warum?**
- Verhindert Spam-Accounts
- Verifiziert echte Email-Adressen
- Professioneller Eindruck

---

## 🛠️ Alternative: Database Trigger

Falls Sie Email-Bestätigung aktiv lassen wollen, erstellen Sie einen **Database Trigger**:

### SQL-Code für automatischen Player-Eintrag:

```sql
-- Function: Erstelle Player-Eintrag nach Auth-User-Erstellung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (user_id, email, name, role, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Neuer Spieler'),
    'player',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Wenn neuer User in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**So funktioniert's:**
1. User wird in `auth.users` erstellt
2. Trigger feuert automatisch
3. Player-Eintrag wird in `public.players` erstellt
4. Funktioniert auch MIT Email-Bestätigung!

---

## 📋 Schritt-für-Schritt: Trigger einrichten

1. **SQL Editor** öffnen in Supabase
2. **Neues Query**
3. **Code oben einfügen**
4. **Run** ▶️ klicken
5. ✅ Fertig!

---

## 🧪 Testen

### Test 1: Registrierung
1. Neuen Account registrieren
2. **Supabase Dashboard** öffnen
3. **Table Editor** → `players`
4. ✅ Neuer Eintrag sollte sofort da sein!

### Test 2: Profil bearbeiten
1. Login mit neuem Account
2. **Profil** öffnen
3. Name, Ranking, Telefon eingeben
4. **Speichern**
5. **Supabase Dashboard** → `players` → Eintrag prüfen
6. ✅ Daten sollten aktualisiert sein!

---

## 🆘 Troubleshooting

### "new row violates row-level security policy"

**Problem:** RLS-Policies verhindern Insert

**Lösung 1:** Email-Bestätigung deaktivieren (siehe oben)

**Lösung 2:** Trigger verwenden (siehe oben)

**Lösung 3:** RLS-Policy anpassen:

```sql
-- Policy: Erlaube Insert auch für nicht-bestätigte User
CREATE POLICY "Allow insert for new users"
  ON public.players
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );
```

### "player is null" in Console

**Problem:** Player-Eintrag wurde nicht erstellt

**Lösung:**
1. Prüfen Sie `auth.users` (enthält den User?)
2. Prüfen Sie `players` (leer?)
3. Email-Bestätigung deaktivieren
4. Oder Trigger einrichten

### Spielerdaten werden nicht gespeichert

**Problem:** `updateProfile` findet keinen Player

**Lösung:**
1. Browser Console öffnen (F12)
2. Schauen Sie nach Logs:
   - `🔵 updateProfile called with: ...`
   - `🔵 Current player: ...`
3. Wenn `player: null` → Player-Eintrag fehlt!
4. Lösung: Siehe oben

---

## ✅ Empfehlung

### Für Development:
→ **Email-Bestätigung deaktivieren**
   (schnell, einfach, keine Probleme)

### Für Produktion:
→ **Database Trigger + Email-Bestätigung**
   (sicher, professionell)

---

## 🎉 Nach dem Fix

Wenn alles funktioniert:
- ✅ Registrierung erstellt sofort Player-Eintrag
- ✅ Profil-Seite zeigt Daten an
- ✅ Speichern aktualisiert Datenbank
- ✅ Rangliste zeigt echte Spieler
- ✅ Admin sieht alle Spieler

**Viel Erfolg! 🎾**

