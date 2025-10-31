# 🔍 Analyse: Team-Duplikate & Probleme

Basierend auf den bereitgestellten Daten habe ich **mehrere Probleme** identifiziert:

## ❌ Gefundene Probleme:

### 1. **SV Rot-Gelb Sürth - DUPLIKAT** (KRITISCH!)
- **Team 1**: `4fd8e7c2-2290-458e-b810-fe0bb11e0094` - team_name="Herren 40 1" ❌
- **Team 2**: `ff090c47-ff26-4df1-82fd-3e4358320d7f` - team_name="Herren 40" ❌

**Problem**: Beide Teams gehören zum gleichen Verein und haben falsche `team_name`!
- Richtiger Wert sollte sein: `team_name="1"` (nur die Nummer)
- Beide sollten **gemerged** werden (wie bei TV Ensen Westhoven)

### 2. **Falsches team_name Format** (mehrere Teams)
Diese Teams haben `team_name` wie "Herren 40 1" statt nur "1":
- `4fd8e7c2-2290-458e-b810-fe0bb11e0094`: "Herren 40 1" (SV Rot-Gelb Sürth)
- `235fade5-0974-4f5b-a758-536f771a5e80`: "Herren 40 1" (VKC Köln)
- `2fde7487-27dd-4942-ac07-2ee1cde8c2f6`: "Herren 40 1" (SV Rot-Gelb Sürth)
- `13226200-a7cd-40df-96ae-6a19c8ef351e`: "Herren 30 1" (VKC Köln)
- `a0759456-07fb-4536-953b-2a9d823bb8ef`: "Herren 50 1" (VKC Köln)
- `e9ff4b38-ba78-4c3d-9791-80f55000dc92`: "Herren 30 1" (Rodenkirchener TC)
- `95220c8e-085a-41ff-8a2c-225df6df3f29`: "Herren 1" (Kölsche Tennis-Klöppel)

### 3. **Team ohne team_name** (KRITISCH!)
- `6c38c710-28dd-41fe-b991-b7180ef23ca1`: team_name=NULL (VKC Köln, Herren 30)

## 🎯 Empfohlene Fixes:

### Fix 1: SV Rot-Gelb Sürth Merge
```sql
-- Ähnlich wie TV Ensen Westhoven
-- Merge Team "Herren 40" → Team "Herren 40 1"
-- Dann: team_name korrigieren zu "1"
```

### Fix 2: team_name korrigieren
```sql
UPDATE team_info SET team_name = '1' WHERE team_name = 'Herren 40 1';
UPDATE team_info SET team_name = '1' WHERE team_name = 'Herren 30 1';
UPDATE team_info SET team_name = '1' WHERE team_name = 'Herren 50 1';
UPDATE team_info SET team_name = '1' WHERE team_name = 'Herren 1';
```

### Fix 3: Team ohne team_name
```sql
-- Prüfe Verknüpfungen, dann team_name setzen oder löschen
UPDATE team_info SET team_name = '1' WHERE team_name IS NULL;
```

## 📋 Nächste Schritte:

1. **Führe aus**: `CHECK_TEAM_DUPLICATES.sql` - um Details zu sehen
2. **Entscheide**: Welche Teams sollen gemerged werden?
3. **Führe aus**: Merge-Script ähnlich wie MERGE_DUPLICATE_TEAMS.sql



