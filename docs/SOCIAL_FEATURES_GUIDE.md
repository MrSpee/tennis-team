# 🤝 Social Features System - Vollständige Dokumentation

## 📋 ÜBERBLICK

Das Social Features System ermöglicht Spielern, sich zu vernetzen, Match-Ergebnisse zu verfolgen und ihre Privatsphäre zu schützen.

---

## 🎯 FEATURES

### ✅ PHASE 1 (IMPLEMENTIERT)

#### 1. **Follow-System**
- Spielern folgen/entfolgen
- Mutual Follows (Freunde) werden automatisch erkannt
- Follower & Following Counts anzeigen
- Verhindert Follow bei Block

#### 2. **Block-System**
- Unerwünschte Spieler blockieren
- Automatisches Unfollow bei Block
- Block-Status für beide Richtungen
- Blockierung aufheben möglich

#### 3. **Privacy Settings**
- 3 Stufen: `public` | `followers_only` | `private`
- Profil-Sichtbarkeit steuern
- Match-Ergebnisse verstecken
- Kontaktdaten verbergen
- Follow-Requests deaktivieren

#### 4. **Team Favorites**
- Mannschaften favorisieren
- Notifications-Präferenzen pro Team

#### 5. **Notifications (Ready)**
- Benachrichtigungs-System vorbereitet
- Typen: follow, match_result, team_result, system
- Push & In-App Ready

---

## 🚀 INSTALLATION

### 1️⃣ Datenbank Setup

```bash
# Führe das SQL-Script aus in Supabase SQL Editor
→ CREATE_COMPLETE_SOCIAL_SYSTEM.sql
```

**Was das Script macht:**
- ✅ Erstellt 5 Tabellen (followers, blocks, privacy, favorites, notifications)
- ✅ Aktiviert RLS Policies
- ✅ Erstellt 10+ Helper Functions
- ✅ Setzt Auto-Triggers (Mutual Detection, Privacy, Notifications)
- ✅ Fügt Default Privacy Settings für alle existierenden Spieler hinzu

### 2️⃣ Frontend Setup

**Bereits implementiert in:**
- `src/components/PlayerProfileSimple.jsx`

**Dependencies:**
```bash
# Bereits vorhanden:
- lucide-react (Icons)
- @supabase/supabase-js
```

---

## 📱 VERWENDUNG

### **Als Spieler:**

#### **1. Anderen Spielern folgen**
1. Gehe auf ein fremdes Spieler-Profil: `/player/:playerName`
2. Scrolle zur "Vernetzung & Kontakt" Card
3. Klicke "Folgen" Button
4. Du siehst jetzt:
   - Match-Ergebnisse des Spielers in `/results` (Favoriten-Filter)
   - Benachrichtigungen bei neuen Matches (falls aktiviert)
   - "Freunde"-Badge wenn gegenseitiges Follow

#### **2. Spieler blockieren**
1. Auf Spieler-Profil → "Vernetzung & Kontakt" Card
2. Klicke "Blockieren"
3. Bestätige Aktion
4. Blockierter Spieler kann:
   - ❌ Dir nicht mehr folgen
   - ❌ Dein Profil nicht sehen (falls private)
   - ❌ Dir keine Match Requests senden (Phase 2)

#### **3. Privacy-Einstellungen** (TODO: UI erstellen)
Stelle ein:
- Profil-Sichtbarkeit: public | followers_only | private
- Match-Ergebnisse: Wer darf sie sehen?
- Kontaktdaten: E-Mail/Telefon verstecken
- Follow-Requests: Komplett deaktivieren

---

## 💾 DATENBANK-STRUKTUR

### **player_followers**
```sql
{
  id: UUID,
  follower_id: UUID,      -- Wer folgt
  following_id: UUID,     -- Wem wird gefolgt
  is_mutual: BOOLEAN,     -- Automatisch gesetzt
  created_at: TIMESTAMP
}
```

### **player_blocks**
```sql
{
  id: UUID,
  blocker_id: UUID,       -- Wer blockt
  blocked_id: UUID,       -- Wer wird geblockt
  reason: TEXT,           -- Optional
  created_at: TIMESTAMP
}
```

### **player_privacy_settings**
```sql
{
  id: UUID,
  player_id: UUID,
  profile_visibility: 'public' | 'followers_only' | 'private',
  show_match_results: 'public' | 'followers_only' | 'private',
  show_email: BOOLEAN,
  show_phone: BOOLEAN,
  allow_follow_requests: BOOLEAN,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### **team_favorites**
```sql
{
  id: UUID,
  player_id: UUID,
  team_id: UUID,
  notify_on_match: BOOLEAN,
  notify_on_result: BOOLEAN,
  created_at: TIMESTAMP
}
```

### **player_notifications**
```sql
{
  id: UUID,
  player_id: UUID,
  type: 'follow' | 'match_result' | 'team_result' | 'match_request' | 'system',
  title: TEXT,
  message: TEXT,
  reference_type: 'player' | 'team' | 'match' | 'matchday',
  reference_id: UUID,
  is_read: BOOLEAN,
  created_at: TIMESTAMP,
  read_at: TIMESTAMP
}
```

---

## 🔧 HELPER FUNCTIONS

### **JavaScript (Frontend)**

```javascript
// In PlayerProfileSimple.jsx verfügbar:

// Lade Social Features
loadSocialFeatures(playerId);

// Follow/Unfollow
handleFollowToggle();

// Block/Unblock
handleBlock();
handleUnblock();
```

### **SQL (Backend)**

```sql
-- Follower Count
SELECT get_follower_count('player-id');

-- Following Count
SELECT get_following_count('player-id');

-- Check if Following
SELECT is_following('my-id', 'their-id');

-- Check if Blocked
SELECT is_blocked('my-id', 'their-id');

-- Check if Mutual Follow
SELECT is_mutual_follow('player1-id', 'player2-id');
```

---

## 🎨 UI KOMPONENTEN

### **Vernetzung & Kontakt Card**

**Features:**
- 💜 Lila Gradient Header
- 📊 Follower/Following Count
- ❤️ "Freunde"-Badge (bei Mutual Follow)
- 🚫 "Blockiert"-Badge
- ➕ Follow/Unfollow Button (Lila/Grau)
- 🛡️ Block/Unblock Button (Rot)
- 💡 Info-Text "Warum folgen?"

**Wird angezeigt:**
- ✅ Auf fremden Spieler-Profilen (`/player/:playerName`)
- ❌ NICHT auf eigenem Profil (`/profile`)

---

## 📊 RLS (ROW LEVEL SECURITY)

### **player_followers**
- ✅ SELECT: Alle eingeloggten User (öffentliche Info)
- ✅ INSERT: Nur eigene Follows + Check for Blocks
- ✅ DELETE: Nur eigene Follows

### **player_blocks**
- ✅ SELECT: Nur eigene Blocks (Blocker oder Blocked)
- ✅ INSERT: Nur eigene Blocks
- ✅ DELETE: Nur eigene Blocks

### **player_privacy_settings**
- ✅ SELECT: Alle eingeloggten User
- ✅ INSERT/UPDATE: Nur eigene Settings

### **team_favorites**
- ✅ SELECT: Alle eingeloggten User
- ✅ INSERT/UPDATE/DELETE: Nur eigene Favoriten

### **player_notifications**
- ✅ SELECT/UPDATE: Nur eigene Notifications

---

## 🔮 PHASE 2: UPCOMING FEATURES

### **1. Results-Seite Integration**
```jsx
// TODO: In Results.jsx
<div className="favorites-section">
  <h3>⭐ Favoriten</h3>
  {favoritePlayersMatches.map(match => (
    <MatchCard key={match.id} match={match} />
  ))}
</div>
```

**Query:**
```javascript
const { data: favoriteMatches } = await supabase
  .from('matchdays')
  .select('*')
  .in('home_team_id', favoriteTeamIds)
  .or('away_team_id', favoriteTeamIds);
```

### **2. Privacy Settings UI**
```jsx
// TODO: Neuer Tab in SupabaseProfile.jsx
<div className="privacy-settings">
  <select value={profileVisibility}>
    <option>public</option>
    <option>followers_only</option>
    <option>private</option>
  </select>
</div>
```

### **3. Match Requests System**
```sql
CREATE TABLE match_requests (
  id UUID PRIMARY KEY,
  from_player_id UUID,
  to_player_id UUID,
  match_type TEXT, -- 'friendly' | 'training'
  proposed_date DATE,
  status TEXT,     -- 'pending' | 'accepted' | 'declined'
  message TEXT,
  created_at TIMESTAMPTZ
);
```

### **4. Activity Feed**
```sql
CREATE TABLE player_activities (
  id UUID PRIMARY KEY,
  player_id UUID,
  activity_type TEXT, -- 'match_won' | 'lk_improved' | 'joined_team'
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

### **5. Training Partner Matching**
```javascript
// Finde Spieler mit ähnlicher LK
const suggestedPartners = await supabase
  .from('players_unified')
  .select('*')
  .gte('current_lk', myLK - 2)
  .lte('current_lk', myLK + 2)
  .neq('id', myPlayerId)
  .limit(10);
```

---

## 🧪 TESTING

### **Test-Szenarien:**

#### **1. Follow-Flow**
1. User A besucht Profil von User B
2. User A klickt "Folgen"
3. ✅ `followerCount` von B steigt um 1
4. ✅ `isFollowing` State für A = true
5. User B besucht Profil von User A
6. User B klickt "Folgen"
7. ✅ Beide sehen "Freunde"-Badge (`is_mutual = true`)

#### **2. Block-Flow**
1. User A blockt User B
2. ✅ Bestehende Follows werden automatisch gelöscht (Trigger)
3. ✅ User B kann A nicht mehr folgen (RLS Policy)
4. ✅ User A sieht "Blockiert"-Badge auf B's Profil
5. User A kann Blockierung aufheben
6. ✅ User B kann wieder folgen

#### **3. Privacy-Check**
1. User A setzt Profil auf `private`
2. ✅ Nur Follower sehen Profil-Details
3. ✅ Andere sehen "Profil ist privat"

---

## 🐛 BEKANNTE ISSUES & LÖSUNGEN

### **Issue: "is_mutual wird nicht automatisch gesetzt"**
**Lösung:** Trigger `on_follow_update_mutual` prüft nach jedem Insert/Delete

### **Issue: "Block verhindert nicht Follow"**
**Lösung:** RLS Policy `followers_insert_own` prüft auf Blocks

### **Issue: "Follower Count stimmt nicht"**
**Lösung:** Reload nach Follow/Unfollow mit `setTimeout`

---

## 📈 METRIKEN & ANALYTICS

### **Wichtige Queries:**

```sql
-- Top Follower (Beliebteste Spieler)
SELECT 
  following_id,
  COUNT(*) as follower_count
FROM player_followers
GROUP BY following_id
ORDER BY follower_count DESC
LIMIT 10;

-- Most Active Users (Folgen vielen)
SELECT 
  follower_id,
  COUNT(*) as following_count
FROM player_followers
GROUP BY follower_id
ORDER BY following_count DESC
LIMIT 10;

-- Mutual Follow Ratio
SELECT 
  COUNT(*) FILTER (WHERE is_mutual = true)::FLOAT / COUNT(*) * 100 as mutual_percentage
FROM player_followers;

-- Block Stats
SELECT COUNT(*) as total_blocks FROM player_blocks;
```

---

## 🔒 SICHERHEIT & DATENSCHUTZ

### **Implementiert:**
- ✅ RLS auf allen Tabellen
- ✅ User kann nur eigene Daten ändern
- ✅ Blocks verhindern Interaction
- ✅ Privacy Settings ready

### **DSGVO Compliance:**
- ✅ User können alle ihre Daten löschen
- ✅ Blocks sind beidseitig transparent
- ✅ Privacy-Einstellungen jederzeit änderbar
- ✅ Follower-Listen sind opt-in (via Privacy)

---

## 🎓 BEST PRACTICES

### **Performance:**
- Indizes auf `follower_id`, `following_id`, `blocker_id`, `blocked_id`
- `is_mutual` Index für schnelle Friend-Queries
- Pagination bei großen Follower-Listen

### **UX:**
- Optimistic UI Updates (lokales State-Update vor DB-Bestätigung)
- Loading States während API Calls
- Confirmation Dialoge bei irreversiblen Aktionen (Block)
- Klare Feedback-Messages

### **Code Quality:**
- Separate Functions für Social Features
- Error Handling in jedem Handler
- Console Logs für Debugging
- TypeScript-Ready (Interfaces definierbar)

---

## 📞 SUPPORT & FRAGEN

**Bei Problemen:**
1. Prüfe Browser Console für Errors
2. Check Supabase Logs für RLS Violations
3. Verifiziere dass SQL Script korrekt ausgeführt wurde

**Häufige Fragen:**
- **Q:** Kann ich sehen wer mir folgt?
  - **A:** Ja, über `get_follower_count()` und Query auf `player_followers`
  
- **Q:** Werden blockierte User benachrichtigt?
  - **A:** Nein, Block ist "silent" (Privacy)
  
- **Q:** Kann ich mehreren Teams folgen?
  - **A:** Ja, via `team_favorites` (unbegrenzt)

---

## ✅ CHECKLISTE FÜR DEPLOYMENT

- [x] SQL Script ausgeführt
- [x] PlayerProfileSimple.jsx updated
- [x] Icons importiert (lucide-react)
- [x] RLS Policies getestet
- [ ] Results.jsx Favoriten-Filter (Phase 2)
- [ ] Privacy Settings UI (Phase 2)
- [ ] Notifications UI (Phase 2)
- [ ] Push Notifications Setup (Phase 2)

---

**Version:** 1.0  
**Erstellt:** 03.11.2025  
**Zuletzt aktualisiert:** 03.11.2025

