# 📧 Supabase Email-Templates für Tennis Team App

Diese Templates können Sie in Ihrem Supabase Dashboard unter **Authentication > Email Templates** konfigurieren.

## 🔐 Password Reset Email Template

### Betreff (Subject):
```
🎾 Tennis Team - Passwort vergessen? Kein Problem! 😄
```

### HTML Template:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passwort zurücksetzen</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .tennis-icon { font-size: 3rem; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="tennis-icon">🎾</div>
        <h1>Hey Tennis-Champion! 🏆</h1>
        <p>Passwort vergessen? Das passiert den Besten! 😄</p>
    </div>
    
    <div class="content">
        <h2>Hallo du Tennis-Crack! 👋</h2>
        
        <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Keine Sorge, das passiert auch den besten Spielern! Manchmal ist man so konzentriert auf den Ball, dass man alles andere vergisst 😅</p>
        
        <p>Klicke einfach auf den coolen Button unten und schon geht's weiter:</p>
        
        <div style="text-align: center;">
            <a href="{{ .ConfirmationURL }}" class="button">🚀 Passwort zurücksetzen - Los geht's!</a>
        </div>
        
        <p><strong>🎯 Wichtige Infos für dich:</strong></p>
        <ul>
            <li>⏰ Dieser Link ist nur 24 Stunden gültig (wie ein frischer Tennis-Ball!)</li>
            <li>🤷‍♂️ Falls du das nicht warst, kannst du diese E-Mail einfach ignorieren</li>
            <li>🔐 Dein Passwort ändert sich erst, wenn du auf den Link klickst</li>
        </ul>
        
        <p>Falls der Button nicht funktioniert (manchmal sind sie schüchtern 😊), kopiere einfach diesen Link:</p>
        <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace;">
            {{ .ConfirmationURL }}
        </p>
        
        <p style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
            🎾 Viel Spaß beim Tennis spielen! <br>
            <strong>Dein Capitano Daniel Becher</strong>
        </p>
    </div>
    
    <div class="footer">
        <p>🎾 Platzhirsch - Tennis Team App - Los geht's! 🚀</p>
        <p>Diese E-Mail wurde automatisch generiert. Falls du Fragen hast, schreib uns einfach! 😊</p>
    </div>
</body>
</html>
```

## 📧 Email Confirmation Template

### Betreff (Subject):
```
🎾 Willkommen im Tennis Team! Los geht's! 🚀
```

### HTML Template:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email bestätigen</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #059669; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .tennis-icon { font-size: 3rem; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="tennis-icon">🎾</div>
        <h1>Willkommen im Team, Tennis-Star! 🌟</h1>
        <p>Los geht's! Zeit für dein erstes Match! 🚀</p>
    </div>
    
    <div class="content">
        <h2>Hey du cooler Tennis-Spieler! 👋</h2>
        
        <p>Mega, dass du dabei bist! 🎉 Du bist jetzt offiziell Teil des coolsten Tennis-Teams überhaupt! Aber bevor wir loslegen können, musst du noch schnell deine E-Mail-Adresse bestätigen - das ist wie das Aufwärmen vor dem Match! 😄</p>
        
        <p>Klicke einfach auf den Button und dann kann's losgehen:</p>
        
        <div style="text-align: center;">
            <a href="{{ .ConfirmationURL }}" class="button">🎯 E-Mail bestätigen - Los geht's!</a>
        </div>
        
        <p><strong>🎾 Nach der Bestätigung erwartet dich:</strong></p>
        <ul>
            <li>🏆 Coole Matches und Turniere</li>
            <li>📅 Deine Verfügbarkeit angeben (damit wir wissen, wann du dabei bist!)</li>
            <li>👥 Andere Spieler-Profile checken (wer ist der coolste von allen?)</li>
            <li>🏅 Die Rangliste rocken und nach oben klettern</li>
            <li>🎭 Dein eigenes Profil mit lustigen Tennis-Facts</li>
        </ul>
        
        <p>Falls der Button mal nicht hört (manchmal sind sie eigenwillig 😊), kopiere einfach diesen Link:</p>
        <p style="background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace;">
            {{ .ConfirmationURL }}
        </p>
        
        <p style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
            🎾 Bereit für dein erstes Match? <br>
            <strong>Dein Tennis Team freut sich auf dich!</strong>
        </p>
    </div>
    
    <div class="footer">
        <p>🎾 Tennis Team App - Los geht's! 🚀</p>
        <p>Diese E-Mail wurde automatisch generiert. Falls du Fragen hast, schreib uns einfach! 😊</p>
    </div>
</body>
</html>
```

## ⚙️ Supabase Konfiguration

### 1. Email Templates einrichten:
1. Gehen Sie zu Ihrem **Supabase Dashboard**
2. Navigieren Sie zu **Authentication > Email Templates**
3. Wählen Sie **Password Recovery** oder **Confirm signup**
4. Kopieren Sie die entsprechenden Templates oben
5. **Speichern** Sie die Änderungen

### 2. Email-Einstellungen:
- **SMTP Settings** konfigurieren (falls gewünscht)
- **Redirect URLs** für Password Reset setzen
- **Email Bestätigung** aktivieren (empfohlen)

### 3. Redirect URL konfigurieren:
```
https://ihre-domain.com/password-reset
```

### 4. Wichtige Hinweise:
- **Alle Templates sind jetzt komplett auf Deutsch** 🇩🇪
- **Keine englischen Texte mehr** in den E-Mails
- **Lustige und motivierende Sprache** mit Tennis-Bezug
- **Templates funktionieren sofort** nach dem Kopieren

## 🎨 Anpassungen

### Farben ändern:
- **Primärfarbe:** `#10b981` (Tennis-Grün)
- **Sekundärfarbe:** `#059669` (Dunkleres Grün)
- **Hintergrund:** `#f8f9fa` (Hellgrau)

### Logo hinzufügen:
Ersetzen Sie `<div class="tennis-icon">🎾</div>` durch Ihr Logo:
```html
<img src="https://ihre-domain.com/logo.png" alt="Tennis Team" style="height: 60px;">
```

### Sprache ändern:
Alle Texte können einfach übersetzt werden, indem Sie die deutschen Begriffe durch andere Sprachen ersetzen.
