# 🔄 Komplett neu starten - SAUBER!

## 1. Browser Console öffnen (F12)

Führen Sie aus:
```javascript
// Supabase komplett ausloggen
location.href = '/login';
```

## 2. Dann auf der Login-Seite - Console:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 3. Login mit Admin-Account:
- Email: mail@christianspee.de
- Passwort: Ihr Passwort

## 4. Prüfen:
- Ist Admin-Tab (⚙️) sichtbar?
- Falls NEIN → Logout + Login nochmal

## 5. Falls immer noch kein Admin-Tab:
SQL in Supabase ausführen:
```sql
SELECT name, email, role FROM public.players WHERE email = 'mail@christianspee.de';
```
Sollte role = 'captain' zeigen!
