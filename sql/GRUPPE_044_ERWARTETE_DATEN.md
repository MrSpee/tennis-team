# Gruppe 044 Import - Erwartete Daten

## 📋 JSON-Quelle: `tvm_league_snapshot_groups_44.json`

### 🏢 Vereine (6 Stück):
1. **TC Bayer Dormagen**
2. **Rodenkirchener TC**
3. **TC RS Neubrück**
4. **Kölner TG BG**
5. **TC Colonius**
6. **TC Stammheim**

### 🎾 Teams (6 Stück):
1. TC Bayer Dormagen 2 (Herren 40)
2. Rodenkirchener TC 1 (Herren 40)
3. TC RS Neubrück 1 (Herren 40)
4. Kölner TG BG 2 (Herren 40)
5. TC Colonius 2 (Herren 40)
6. TC Stammheim 1 (Herren 40)

**Liga:** 2. Bezirksliga
**Gruppe:** Gr. 044
**Saison:** Winter 2025/26

### 🏆 Matches (15 Stück):

#### ✅ Beendet (4 Spiele):
1. **01.11.2025** - TC Bayer Dormagen 2 vs Rodenkirchener TC 1 → **5:1**
2. **02.11.2025** - TC RS Neubrück 1 vs Kölner TG BG 2 → **1:5**
3. **??.??.2025** - TC Colonius 2 vs TC Stammheim 1 → **3:3** ⚠️ OHNE DATUM
4. **08.11.2025** - TC Bayer Dormagen 2 vs TC Colonius 2 → **4:2**

#### 📅 Geplant (11 Spiele):
5. 29.11.2025 - Rodenkirchener TC 1 vs TC Stammheim 1
6. 14.12.2025 - TC Stammheim 1 vs TC Bayer Dormagen 2
7. 20.12.2025 - Rodenkirchener TC 1 vs TC RS Neubrück 1
8. 21.12.2025 - TC Stammheim 1 vs Kölner TG BG 2
9. 11.01.2026 - TC Bayer Dormagen 2 vs TC RS Neubrück 1
10. 11.01.2026 - TC Colonius 2 vs Kölner TG BG 2
11. 18.01.2026 - Kölner TG BG 2 vs Rodenkirchener TC 1
12. 01.02.2026 - TC Colonius 2 vs TC RS Neubrück 1
13. 28.02.2026 - Rodenkirchener TC 1 vs TC Colonius 2
14. 28.02.2026 - TC RS Neubrück 1 vs TC Stammheim 1
15. 01.03.2026 - Kölner TG BG 2 vs TC Bayer Dormagen 2

---

## ⚠️ BEKANNTE ISSUES:

### 1. Match ohne Datum
- **Match-ID:** `9fe96672-80df-3aa2-4c63-b157e84ad68b`
- **Teams:** TC Colonius 2 vs TC Stammheim 1
- **Status:** completed
- **Score:** 3:3
- **Problem:** `matchDateIso: null` im JSON
- **Ergebnis:** **WURDE ÜBERSPRUNGEN** beim Import

### 2. Scores ohne match_results
Die folgenden 3 Matches haben Gesamt-Scores, aber keine Einzelergebnisse:
- TC Bayer Dormagen 2 vs Rodenkirchener TC 1 (5:1)
- TC RS Neubrück 1 vs Kölner TG BG 2 (1:5)
- TC Bayer Dormagen 2 vs TC Colonius 2 (4:2)

---

## 🔍 Manuelle Prüfung in Supabase:

### Query 1: Vereine prüfen
\`\`\`sql
SELECT name, city, data_source, created_at::date
FROM club_info
WHERE name IN (
  'TC Bayer Dormagen', 'Rodenkirchener TC', 'TC RS Neubrück',
  'Kölner TG BG', 'TC Colonius', 'TC Stammheim'
)
ORDER BY name;
\`\`\`

**Erwartetes Ergebnis:** 6 Vereine

### Query 2: Teams prüfen
\`\`\`sql
SELECT ci.name, ti.team_name, ts.group_name, ts.season
FROM team_info ti
JOIN club_info ci ON ti.club_id = ci.id
JOIN team_seasons ts ON ti.id = ts.team_id
WHERE ts.group_name = 'Gr. 044'
  AND ts.season = 'Winter 2025/26';
\`\`\`

**Erwartetes Ergebnis:** 6 Teams

### Query 3: Matches prüfen
\`\`\`sql
SELECT 
  match_date::date,
  home.club_name || ' ' || home.team_name as heim,
  away.club_name || ' ' || away.team_name as gast,
  final_score,
  status
FROM matchdays m
JOIN team_info home ON m.home_team_id = home.id
JOIN team_info away ON m.away_team_id = away.id
WHERE m.group_name = 'Gr. 044'
  AND m.season = 'Winter 2025/26'
ORDER BY m.match_date;
\`\`\`

**Erwartetes Ergebnis:** 14 Matches (1 wurde wegen fehlendem Datum übersprungen)

---

## ✅ ERWARTETER IMPORT-STATUS:

```json
{
  "vereine": 6,
  "teams": 6,
  "team_seasons": 6,
  "matches_total": 14,
  "matches_completed": 3,
  "matches_scheduled": 11,
  "matches_skipped": 1,
  "scores_ohne_details": 3
}
```










