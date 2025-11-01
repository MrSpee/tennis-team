# 🖼️ Profile Image Fix - Anleitung

## Problem
Die Spalte `profile_image` existiert nicht in der `players_unified` Tabelle, was zu Fehlern beim Laden von Profilbildern führt.

## Lösung

### Schritt 1: Spalte hinzufügen
1. Öffne **Supabase Dashboard** → **SQL Editor**
2. Kopiere den Inhalt von `ADD_PROFILE_IMAGE_COLUMN.sql`
3. Führe das Script aus
4. Prüfe die Ausgabe: Du solltest eine Bestätigung sehen

```sql
✅ Spalte erfolgreich hinzugefügt | profile_image | text | YES
```

### Schritt 2: Verifizierung
1. Öffne `CHECK_PROFILE_IMAGE_COLUMN.sql`
2. Führe es im SQL Editor aus
3. Überprüfe:
   - ✅ Spalte existiert
   - ⚠️ Noch keine Profilbilder hochgeladen (normal nach der Migration)

### Schritt 3: Frontend testen
1. Öffne die App im Browser
2. Gehe zu **Profil** → **Profilbild**
3. Lade ein neues Bild hoch
4. Prüfe:
   - Bild wird angezeigt im Profil
   - Bild wird angezeigt in Results
   - Bild bleibt nach Reload erhalten

## Erwartetes Ergebnis

### ✅ Vor dem Fix
- ❌ SQL-Error: `column "profile_image" does not exist`
- ❌ Profilbilder werden nicht gespeichert
- ❌ Default-Icon wird überall angezeigt

### ✅ Nach dem Fix
- ✅ Keine SQL-Errors mehr
- ✅ Profilbilder werden persistent gespeichert
- ✅ Profilbilder werden korrekt angezeigt in:
  - Dashboard
  - Profil
  - Results (Spieler-Ergebnisse)
  - Rankings

## Technische Details

**Spalten-Spec:**
- Name: `profile_image`
- Typ: `TEXT`
- Nullable: `YES`
- Index: Ja (für Performance bei Queries mit `WHERE profile_image IS NOT NULL`)

**Speicherformat:**
- Base64-encoded Data URL (z.B. `data:image/jpeg;base64,...`)
- Maximale Größe: Wird im Frontend komprimiert auf max. 500KB

## Nächste Schritte nach der Migration

1. ✅ `ADD_PROFILE_IMAGE_COLUMN.sql` ausführen
2. ✅ `CHECK_PROFILE_IMAGE_COLUMN.sql` zur Verifizierung
3. ✅ App testen (Profil → Bild hochladen)
4. ✅ Results-Seite prüfen (Spieler-Cards sollten Bilder zeigen)

---

**Status:** 🟡 Bereit zur Ausführung  
**Letzte Änderung:** 2025-11-01  
**Autor:** AI Assistant

