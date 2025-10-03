# Supabase Session löschen

## Problem:
Supabase speichert Sessions in IndexedDB (nicht localStorage!)
Deshalb bleiben Sie eingeloggt auch nach App-Neustart.

## Lösung - Im Browser:

### Methode 1: DevTools
1. F12 (DevTools öffnen)
2. Application Tab
3. Storage → IndexedDB
4. Suche nach "supabase-auth-token"
5. Rechtsklick → Delete

### Methode 2: Console (EINFACHER)
```javascript
// Im Browser Console (F12):
indexedDB.deleteDatabase('supabase-auth-token-fyvmyyfuxuconhdbiwoa');
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Das ist NORMAL und GUT!
- ✅ Benutzer bleiben eingeloggt (wie bei Gmail, Facebook, etc.)
- ✅ Müssen sich nicht bei jedem App-Start neu anmelden
- ✅ Session bleibt für Tage/Wochen gültig

## Nur für Development/Testing:
Wenn Sie komplett neu starten wollen, verwenden Sie die Console-Befehle oben.
