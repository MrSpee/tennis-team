# 🔐 SUPABASE AUTHENTICATION - TROUBLESHOOTING CHECKLIST

## ❌ **PROBLEM:** Email-Bestätigung funktioniert nicht

---

## ✅ **SCHRITT 1: URL CONFIGURATION PRÜFEN**

### **A) Site URL**
```
Supabase Dashboard
→ Authentication
→ URL Configuration
→ Site URL
```

**Sollte sein:**
```
https://tennis-team-gamma.vercel.app
```

⚠️ **KEIN Slash am Ende!**

---

### **B) Redirect URLs**
```
Supabase Dashboard
→ Authentication
→ URL Configuration
→ Redirect URLs
```

**Füge hinzu:**
```
https://tennis-team-gamma.vercel.app/**
http://localhost:3006/**
http://localhost:3005/**
```

Das `**` ist wichtig für Wildcards!

---

## ✅ **SCHRITT 2: EMAIL TEMPLATE PRÜFEN**

### **Confirm Signup Template:**

```
Supabase Dashboard
→ Authentication
→ Email Templates
→ Confirm signup
```

**WICHTIG: Prüfe die Confirmation URL!**

### **Option A: Supabase v2 (EMPFOHLEN)**
```html
<a href="{{ .ConfirmationURL }}" 
   style="...">
  ✅ E-Mail bestätigen
</a>
```

### **Option B: Custom URL (falls .ConfirmationURL nicht funktioniert)**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" 
   style="...">
  ✅ E-Mail bestätigen
</a>
```

### **Option C: Mit Redirect (nach Bestätigung)**
```html
<a href="{{ .ConfirmationURL }}?redirect_to=/dashboard" 
   style="...">
  ✅ E-Mail bestätigen
</a>
```

---

## ✅ **SCHRITT 3: AUTH SETTINGS PRÜFEN**

### **A) Email Confirmations aktiviert?**

```
Supabase Dashboard
→ Authentication
→ Providers
→ Email
→ Settings
```

**Check:**
- ✅ **Enable email confirmations** = ON
- ✅ **Secure email change** = ON (optional)
- ✅ **Double confirm email changes** = OFF (optional)

---

### **B) Email Provider konfiguriert?**

```
Supabase Dashboard
→ Project Settings
→ Auth
→ SMTP Settings
```

**Falls Custom SMTP:**
- Prüfe SMTP-Server Einstellungen
- Teste mit "Send Test Email"

**Falls Supabase Default:**
- Sollte automatisch funktionieren
- Rate Limit: 3-4 Emails pro Stunde (Development)

---

## ✅ **SCHRITT 4: RATE LIMITS PRÜFEN**

### **Zu viele Registrierungen?**

Supabase hat **Rate Limits** für Emails:

**Development:**
- 3-4 Emails pro Stunde
- 30 Emails pro Tag

**Production (Paid Plan):**
- Höhere Limits

**Prüfe:**
```
Supabase Dashboard
→ Logs
→ Auth Logs
```

Suche nach Fehlern wie:
- `rate_limit_exceeded`
- `email_send_failed`

---

## ✅ **SCHRITT 5: EMAIL DEBUGGING**

### **A) Prüfe Inbox & Spam**

- **Inbox** checken
- **Spam-Ordner** checken
- **Promotions/Social-Tab** checken (Gmail)

### **B) Email-Logs prüfen**

```
Supabase Dashboard
→ Logs
→ Auth Logs
→ Filter: "signup"
```

Suche nach:
- `user_created` ✅
- `email_sent` ✅
- `email_failed` ❌

---

## ✅ **SCHRITT 6: TEST MIT ANDEREM EMAIL-PROVIDER**

**Teste mit:**
- Gmail
- Outlook
- iCloud
- Temp-Mail (https://temp-mail.org)

**Manchmal blockieren Provider Confirmation-Links!**

---

## 🔧 **QUICK FIX: EMAIL TEMPLATE AKTUALISIEREN**

### **Dein aktuelles Template:**
```html
<a href="{{ .ConfirmationURL }}">
  ✅ E-Mail bestätigen
</a>
```

### **Verbessertes Template (mit Debugging):**
```html
<a href="{{ .ConfirmationURL }}" 
   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
  ✅ E-Mail bestätigen
</a>

<!-- Debug Info (entfernen in Production) -->
<p style="color: #999; font-size: 11px; margin-top: 20px;">
  Debug: {{ .ConfirmationURL }}
</p>
```

**Dann siehst du in der Email, ob die URL korrekt ist!**

---

## 🚨 **HÄUFIGSTE FEHLER:**

### **❌ Site URL hat Slash am Ende**
```
❌ https://tennis-team-gamma.vercel.app/
✅ https://tennis-team-gamma.vercel.app
```

### **❌ Redirect URL fehlt**
```
✅ Füge hinzu: https://tennis-team-gamma.vercel.app/**
```

### **❌ Email Template verwendet alte Variable**
```
❌ {{ .ConfirmURL }}
✅ {{ .ConfirmationURL }}
```

### **❌ Rate Limit erreicht**
```
Lösung: Warte 1 Stunde oder upgrade zu Paid Plan
```

---

## 🎯 **EMPFOHLENE REIHENFOLGE:**

1. **Prüfe Site URL** (kein Slash am Ende!)
2. **Füge Redirect URLs hinzu** (mit `**`)
3. **Teste mit neuem User** (andere Email!)
4. **Check Email-Logs** in Supabase
5. **Falls immer noch nicht:** Email Template mit Debug-Info aktualisieren

---

## 📧 **ALTERNATIVE: MAGIC LINK**

Falls Email-Confirmation nicht funktioniert, nutze **Magic Link**:

**Supabase Dashboard:**
```
Authentication
→ Providers
→ Email
→ Enable Magic Link
```

**Vorteil:**
- Kein Passwort nötig
- Direkter Login via Email-Link
- Oft zuverlässiger als Confirmation

---

## 🔍 **DEBUG-TIPPS:**

### **Console prüfen (Browser):**
```javascript
// Nach Klick auf Confirmation-Link:
console.log('URL:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Query:', window.location.search);
```

### **Supabase Auth Logs:**
```sql
-- Zeige letzte Auth-Aktivitäten
SELECT 
  created_at,
  event_type,
  email,
  error_code,
  error_message
FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 20;
```

---

**Gehe jetzt die Checklist durch und sag mir, was du siehst!** 🔍

Welcher Schritt schlägt fehl? 🤔


