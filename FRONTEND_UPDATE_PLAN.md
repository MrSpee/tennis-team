# Frontend Update Plan - matchday_id Migration

## Problem
Viele Komponenten verwenden noch `match_id` statt `matchday_id`.

## Benötigte Änderungen

### 1. DataContext.jsx
- `updateMatchAvailability()` - match_id → matchday_id
- `deleteMatch()` - match_id → matchday_id  
- `getMatchAvailabilityHistory()` - match_id → matchday_id

### 2. LiveResultsWithDB.jsx
- `loadExistingResults()` - match_id → matchday_id

### 3. Results.jsx
- `loadMatchResults()` - match_id → matchday_id

### 4. Rankings.jsx
- `loadPlayerStats()` - match_id → matchday_id

### 5. SuperAdminDashboard.jsx
- `loadMatchesForDataQuality()` - match_id → matchday_id

### 6. liveResultsService.js (optional - könnte entfernt werden)
- `loadExistingResults()` - match_id → matchday_id

## Wichtig
✅ Alle match_availability queries brauchen `matchday_id`
✅ Alle match_results queries brauchen `matchday_id`
✅ Alle matchday_id FK constraints müssen korrekt sein

