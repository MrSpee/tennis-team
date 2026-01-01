# 🎨 Menüstruktur-Vorschlag: Vereinfachtes nuLiga Import

## 📐 Visualisierung

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN DASHBOARD                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Übersicht] [Vereine] [Spieler] [Spieltage] [📥 nuLiga Import] [...]  │
│                              ↑                                           │
│                         NEUER TAB                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

                    ⬇️ Beim Klick auf "nuLiga Import":

┌──────────────────────────────────────────────────────────────────────────┐
│  📥 nuLiga Import                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ 📋 Meldelisten  │  │ 🏆 Match-Ergebnisse│  │ 👥 Team-Portrait│      │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘      │
│       ↑ ACTIVE                                      (inaktiv)           │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📋 MELDELISTEN                                                          │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  ClubPools-URL: [https://tvm.liga.nu/.../clubPools?club=36154    ] [📥] │
│                                                                          │
│  Saison: [Winter 2025/2026 ▼]                                           │
│                                                                          │
│  [🔍 Club-Info & Teams laden]  [📋 Meldelisten laden]                   │
│                                                                          │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  Vereinsname: VKC Köln                                                  │
│  Club-Nummer: 36154                                                     │
│                                                                          │
│  Teams:                                                                  │
│  • Herren 30 (12 Spieler)                                               │
│  • Herren 40 (15 Spieler)                                               │
│  • Herren 50 (14 Spieler)                                               │
│                                                                          │
│  [✅ Alle Zuordnungen bestätigen & Importieren]                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Detaillierte Struktur

### **Haupt-Tab: "nuLiga Import"**

#### **Unter-Sektion 1: 📋 Meldelisten**
- **Quelle**: clubPools-Seite
- **API**: `nuliga-club-import` (actions: `club-info`, `teams`, `roster`)
- **Funktionen**:
  - ClubPools-URL eingeben
  - Saison auswählen
  - Club-Info & Teams laden
  - Meldelisten mit Matching anzeigen
  - Review & Import

#### **Unter-Sektion 2: 🏆 Match-Ergebnisse**
- **Quelle**: leaguePage
- **API**: `nuliga-matches-import` (actions: `league-groups`, `group-details`, `match-results`)
- **Funktionen**:
  - LigaPage-URL eingeben
  - Saison auswählen
  - Gruppen auflisten
  - Gruppen-Details laden
  - Match-Ergebnisse importieren

#### **Unter-Sektion 3: 👥 Team-Portrait**
- **Quelle**: teamPortrait-Seite
- **API**: `team-portrait`
- **Funktionen**:
  - TeamPortrait-URL eingeben
  - Spieler-Statistiken scrapen
  - Matches & Ergebnisse anzeigen
  - Import

---

## 📱 UI-Komponenten

### **Tab-Navigation (innerhalb der Komponente)**
```jsx
<div className="nuLiga-import-sections">
  <button 
    className={selectedSection === 'rosters' ? 'active' : ''}
    onClick={() => setSelectedSection('rosters')}
  >
    📋 Meldelisten
  </button>
  <button 
    className={selectedSection === 'matches' ? 'active' : ''}
    onClick={() => setSelectedSection('matches')}
  >
    🏆 Match-Ergebnisse
  </button>
  <button 
    className={selectedSection === 'portrait' ? 'active' : ''}
    onClick={() => setSelectedSection('portrait')}
  >
    👥 Team-Portrait
  </button>
</div>
```

### **Conditional Rendering**
```jsx
{selectedSection === 'rosters' && <MeldelistenSection />}
{selectedSection === 'matches' && <MatchErgebnisseSection />}
{selectedSection === 'portrait' && <TeamPortraitSection />}
```

---

## 🔄 Migration-Plan

### Schritt 1: Neue Komponente erstellen
- `src/components/superadmin/NuLigaImportTab.jsx`
- Basis-Struktur mit Tab-Navigation
- State-Management für aktive Sektion

### Schritt 2: Bestehende Komponenten integrieren
- `ClubRostersTab` → Wird zu `<MeldelistenSection />`
- `TeamPortraitImportTab` → Wird zu `<TeamPortraitSection />`
- Neu: `<MatchErgebnisseSection />` (nutzt `nuliga-matches-import`)

### Schritt 3: SuperAdminDashboard aktualisieren
- Neuen Tab "nuLiga Import" hinzufügen
- Alte Tabs entfernen:
  - ❌ "Meldelisten" (wird zu Unter-Sektion)
  - ❌ "Team-Portrait" (wird zu Unter-Sektion)
  - ✅ "Import-Tools" bleibt (für Text-Import mit OpenAI)

### Schritt 4: CSS/Styling
- Einheitliches Design
- Tab-Switching Animation
- Responsive Layout

---

## ✅ Vorteile dieser Struktur

1. **Vereinfacht**: Ein Tab statt drei
2. **Logisch gruppiert**: Alle nuLiga-Imports zusammen
3. **Erweiterbar**: Neue Sektionen einfach hinzufügbar
4. **Klar strukturiert**: Jede Sektion hat klare Aufgabe
5. **Wiederverwendbar**: Bestehende Komponenten werden genutzt

---

## 🚫 Was NICHT in diesem Tab ist

- **"Import-Tools"** (Text-Import mit OpenAI) → Bleibt separat
  - Grund: Anderer Workflow (KI-basiert vs. nuLiga-Scraping)
- **"Vereinsinfo"** → Noch nicht implementiert (könnte später hinzugefügt werden)

