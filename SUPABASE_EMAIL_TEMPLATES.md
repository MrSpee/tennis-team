# 📧 Supabase E-Mail Templates anpassen

## Schritt 1: Supabase Dashboard öffnen
1. Gehe zu: https://app.supabase.com
2. Wähle dein Projekt: **fyvmyyfuxuconhdbiwoa**
3. Klicke auf **Authentication** (👤)
4. Klicke auf **Email Templates**

---

## Schritt 2: Templates bearbeiten

### A) Bestätigungs-E-Mail (Confirm signup)

**Template auswählen:**
- Klicke auf **"Confirm signup"**

**Subject (Betreff):**
```
Willkommen beim Platzhirsch - Account bestätigen
```

**Body (Inhalt):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    
    <!-- Header mit Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 60px; margin-bottom: 10px;">🎾</div>
      <h1 style="color: #1e40af; font-size: 32px; margin: 0;">Platzhirsch</h1>
      <p style="color: #666; font-size: 18px; font-style: italic; margin: 10px 0 0 0;">
        Spiel, Satz und Übersicht
      </p>
    </div>

    <!-- Willkommenstext -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
      <h2 style="margin: 0 0 10px 0; font-size: 24px;">🎉 Willkommen im Team!</h2>
      <p style="margin: 0; font-size: 16px; opacity: 0.95;">
        Schön, dass du dabei bist!
      </p>
    </div>

    <!-- Haupttext -->
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Hallo! 👋<br><br>
      Vielen Dank für deine Registrierung beim <strong>Platzhirsch</strong> - deiner Tennis-Team-App!<br><br>
      Bitte bestätige deine E-Mail-Adresse, um dich anzumelden und folgende Features zu nutzen:
    </p>

    <!-- Feature-Liste -->
    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
        <li style="margin-bottom: 10px;">📅 <strong>Verfügbarkeit</strong> für Medenspiele angeben</li>
        <li style="margin-bottom: 10px;">🏆 <strong>Rangliste</strong> und TVM-Meldeliste einsehen</li>
        <li style="margin-bottom: 10px;">📊 <strong>Team-Übersicht</strong> und Spielplan</li>
        <li style="margin-bottom: 10px;">👤 <strong>Profil</strong> mit Kontaktdaten verwalten</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
        ✅ E-Mail bestätigen
      </a>
    </div>

    <p style="color: #999; font-size: 13px; text-align: center; margin-top: 20px;">
      Dieser Link ist 24 Stunden gültig.
    </p>

    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #999; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
      <strong>📱 Nach der Bestätigung:</strong><br>
      Logge dich mit deiner E-Mail und deinem Passwort ein.<br>
      Vervollständige dein Profil mit Namen, Telefonnummer und LK.
    </p>

    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        💡 <strong>Tipp:</strong> Speichere die App auf deinem Handy als Homescreen-Icon für schnellen Zugriff!
      </p>
    </div>

    <p style="color: #999; font-size: 13px; text-align: center; margin-top: 30px;">
      Bei Fragen wende dich an deinen Mannschaftsführer. <br>
      <strong>SV Rot-Gelb Sürth - Herren 40</strong>
    </p>

    <p style="color: #ccc; font-size: 11px; text-align: center; margin-top: 20px;">
      Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
    </p>

  </div>
</div>
```

**Klicke:** **"Save"**

---

### B) Magic Link E-Mail (falls benötigt)

**Template auswählen:**
- Klicke auf **"Magic Link"**

**Subject:**
```
Platzhirsch - Dein Anmelde-Link
```

**Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 60px; margin-bottom: 10px;">🎾</div>
      <h1 style="color: #1e40af; font-size: 32px; margin: 0;">Platzhirsch</h1>
      <p style="color: #666; font-size: 18px; font-style: italic;">Spiel, Satz und Übersicht</p>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Hallo! 👋<br><br>
      Hier ist dein Anmelde-Link für den <strong>Platzhirsch</strong>:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
        🚀 Jetzt anmelden
      </a>
    </div>

    <p style="color: #999; font-size: 13px; text-align: center;">
      Dieser Link ist 1 Stunde gültig.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #ccc; font-size: 11px; text-align: center;">
      Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.
    </p>

  </div>
</div>
```

**Klicke:** **"Save"**

---

### C) Passwort zurücksetzen (Password Reset)

**Subject:**
```
Platzhirsch - Passwort zurücksetzen
```

**Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 60px; margin-bottom: 10px;">🔒</div>
      <h1 style="color: #1e40af; font-size: 32px; margin: 0;">Platzhirsch</h1>
      <p style="color: #666; font-size: 18px; font-style: italic;">Spiel, Satz und Übersicht</p>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Hallo! 👋<br><br>
      Du hast eine Passwort-Zurücksetzung für deinen <strong>Platzhirsch</strong> Account angefordert.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
        🔑 Neues Passwort setzen
      </a>
    </div>

    <p style="color: #999; font-size: 13px; text-align: center;">
      Dieser Link ist 1 Stunde gültig.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #ccc; font-size: 11px; text-align: center;">
      Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.<br>
      Dein Passwort bleibt unverändert.
    </p>

  </div>
</div>
```

**Klicke:** **"Save"**

---

## Schritt 3: E-Mail-Einstellungen prüfen

### A) E-Mail-Bestätigung deaktivieren (für Entwicklung)

**Falls du KEINE E-Mail-Bestätigung möchtest:**

1. Gehe zu **Authentication** → **Settings**
2. Scrolle zu **"Email Confirmation"**
3. **Deaktiviere:** "Enable email confirmations"
4. **Speichern**

**Vorteil:** Spieler können sich sofort anmelden (ohne E-Mail zu bestätigen)

### B) E-Mail-Bestätigung aktiviert lassen (für Produktion)

**Empfohlen für Live-Betrieb:**
- ✅ Verhindert Fake-Accounts
- ✅ Verifiziert E-Mail-Adressen
- ✅ Professioneller

---

## Schritt 4: Test-E-Mail senden

1. **Logout** aus der App
2. Klicke **"✨ Neuen Account erstellen"**
3. **Registriere** einen Test-Account
4. **Prüfe dein E-Mail-Postfach**
5. ✅ E-Mail sollte mit neuem Template ankommen

---

## 📧 Kompakte Alternative (falls HTML zu lang ist):

**Subject:**
```
🎾 Platzhirsch - Willkommen im Team!
```

**Body (Kurz):**
```html
<h1 style="color: #1e40af;">🎾 Platzhirsch</h1>
<p style="font-style: italic; color: #666;">Spiel, Satz und Übersicht</p>

<p>Hallo! 👋</p>

<p>Willkommen bei <strong>Platzhirsch</strong> - deiner Tennis-Team-App für SV Rot-Gelb Sürth Herren 40!</p>

<p>Bitte bestätige deine E-Mail-Adresse:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
    ✅ E-Mail bestätigen
  </a>
</p>

<p style="color: #999; font-size: 13px;">
  Link gültig für 24 Stunden.
</p>

<hr>

<p style="color: #666; font-size: 14px;">
  <strong>Nach der Bestätigung kannst du:</strong><br>
  📅 Verfügbarkeit für Spiele angeben<br>
  🏆 Rangliste & Meldeliste einsehen<br>
  👤 Profil mit Kontaktdaten pflegen
</p>

<p style="color: #999; font-size: 12px; margin-top: 30px;">
  Bei Fragen: Wende dich an deinen Mannschaftsführer.<br>
  <strong>SV Rot-Gelb Sürth - Herren 40</strong>
</p>

<p style="color: #ccc; font-size: 11px;">
  Falls du dich nicht registriert hast, ignoriere diese E-Mail.
</p>
</div>
```

---

## 🎨 E-Mail Vorschau:

```
┌─────────────────────────────────┐
│           🎾                    │
│       Platzhirsch               │
│  Spiel, Satz und Übersicht      │
│                                 │
│  🎉 Willkommen im Team!         │
│  Schön, dass du dabei bist!     │
│                                 │
│  Hallo! 👋                      │
│                                 │
│  Vielen Dank für deine          │
│  Registrierung...               │
│                                 │
│  [ ✅ E-Mail bestätigen ]       │
│                                 │
│  📅 Verfügbarkeit angeben       │
│  🏆 Rangliste einsehen          │
│  📊 Team-Übersicht              │
│                                 │
│  SV Rot-Gelb Sürth - Herren 40  │
└─────────────────────────────────┘
```

---

## ⚙️ Weitere Optionen:

### Rate Limiting (Spam-Schutz):
1. **Authentication** → **Rate Limits**
2. **Email sends per hour:** 10 (verhindert Spam)

### Sender-Name ändern:
1. **Project Settings** → **Auth**
2. **Email sender name:** "Platzhirsch Team"
3. **Email from address:** noreply@yourproject.supabase.co

---

## 🧪 TESTEN:

1. **Registriere Test-Account** mit deiner E-Mail
2. **Prüfe Posteingang** (auch Spam-Ordner!)
3. ✅ E-Mail sollte mit neuem Design ankommen
4. ✅ Button "✅ E-Mail bestätigen" klicken
5. ✅ Weiterleitung zur App → Login

---

**Gefällt dir das E-Mail-Template? Soll ich noch etwas anpassen? 📧✨**
