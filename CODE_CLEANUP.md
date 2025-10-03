# 🧹 Code Cleanup - Plan

## Problem:
Gemischter Code aus localStorage (alt) und Supabase (neu) führt zu Fehlern.

## Lösung:
ALLES auf Supabase umstellen - KEIN localStorage mehr!

## Was zu tun ist:

### 1. SupabaseAuthContext.jsx
- ✅ Logout: Kein localStorage.clear() mehr
- ✅ updateProfile: Keine doppelten Player-Einträge
- ✅ register: Trigger erstellt Player automatisch

### 2. SupabaseDataContext.jsx  
- ❌ Keine localStorage Speicherung
- ✅ Alles nur aus Supabase laden
- ✅ Realtime-Updates nutzen

### 3. Komponenten
- Alle verwenden SupabaseAuthContext
- Alle verwenden SupabaseDataContext
- Keine Mixe mehr!

## Wird jetzt durchgeführt...

