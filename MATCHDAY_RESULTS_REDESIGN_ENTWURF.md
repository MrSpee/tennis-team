# 🎾 MatchdayResults.jsx - Redesign Entwurf

Übertragung des neuen Dashboard-Designs auf die MatchdayResults-Seite.

---

## 📊 AKTUELLES DESIGN (alt)

```
┌─────────────────────────────────────┐
│ [← Zurück]    [Timer]    [Edit]     │ ← Header mit Buttons
├─────────────────────────────────────┤
│ AKTUELLER STAND                     │
│                                     │
│        5 : 1                        │ ← Großer Score
│   🏆 Dominanter Sieg!               │
├─────────────────────────────────────┤
│ Match-Übersicht                     │
│                                     │
│ [Match 1 Card]                      │
│ [Match 2 Card]                      │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 🎨 NEUES DESIGN (Entwurf)

Basierend auf Dashboard mit `.lk-card-full` Stil:

```
┌─────────────────────────────────────┐
│ Platzhirsch          [🎾] [🚪]      │ ← Header (bleibt)
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [← Zurück]                          │ ← Einfacher Zurück-Button
├─────────────────────────────────────┤
│ MATCH INFO              [LIVE 🔴]   │ ← Card 1: Match Header
│                                     │
│ ❄️  Winter 25/26         [TVM 🔗]  │
│                                     │
│ So, 06. Okt 2025  09:00 Uhr        │
│ vs. TG Leverkusen 2                │
│ ✈️ Auswärtsspiel                    │
│ 📍 TG Leverkusen, Von-Diergardt... [Karte 🔗]
├─────────────────────────────────────┤
│ ENDERGEBNIS                         │ ← Card 2: Scoreboard
│                                     │
│        5 : 1                        │
│   🏆 Dominanter Sieg! 💪            │
│                                     │
│ [Ergebnisse bearbeiten]             │ ← Button
├─────────────────────────────────────┤
│ EINZELMATCHES                       │ ← Card 3: Match-Liste
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Match 1 • Einzel    [✅]        │ │
│ │ Robert vs. Thorsten             │ │
│ │ 6  6  │                         │ │
│ │ 2  0  │                         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Match 2 • Einzel    [⏱️]        │ │
│ │ Frank vs. Lars                  │ │
│ │ 4  3  │                         │ │
│ │ 3  5  │                         │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 🔄 ÄNDERUNGEN IM DETAIL

### **1. Sticky Header entfernen**
- Aktuell: Header bleibt oben kleben
- Neu: Normaler Flow, scrollt mit

### **2. Card-basiertes Layout**
Alles in `.lk-card-full` Cards:

#### **Card 1: Match Info**
```jsx
<div className="lk-card-full">
  <div className="formkurve-header">
    <div className="formkurve-title">Match Info</div>
    {isLive && <div className="live-badge">LIVE 🔴</div>}
  </div>
  
  <div className="match-info-content">
    {/* Season Display */}
    <div className="season-display">
      <div className="season-icon">❄️</div>
      <div className="season-name">Winter 25/26</div>
      <a href="..." className="tvm-link-small">TVM 🔗</a>
    </div>
    
    {/* Match Details */}
    <div className="match-detail-row">
      <span className="detail-label">Datum:</span>
      <span className="detail-value">So, 06. Okt 2025</span>
    </div>
    
    <div className="match-detail-row">
      <span className="detail-label">Uhrzeit:</span>
      <span className="detail-value">09:00 Uhr</span>
    </div>
    
    <div className="match-detail-row">
      <span className="detail-label">Gegner:</span>
      <span className="detail-value-large">TG Leverkusen 2</span>
    </div>
    
    <div className="match-detail-row">
      <span className="detail-label">Spielort:</span>
      <span className="detail-value">✈️ Auswärtsspiel</span>
    </div>
    
    <div className="match-preview-location">
      <span className="location-icon">📍</span>
      <span className="location-text">TG Leverkusen, Von-Diergardt...</span>
      <a href="..." className="maps-link-button">Karte 🔗</a>
    </div>
  </div>
</div>
```

#### **Card 2: Scoreboard**
```jsx
<div className="lk-card-full">
  <div className="formkurve-header">
    <div className="formkurve-title">
      {isCompleted ? 'Endergebnis' : 'Aktueller Stand'}
    </div>
    {isCompleted && (
      <div className={`improvement-badge-top ${matchWinner === 'home' ? 'positive' : 'negative'}`}>
        {matchWinner === 'home' ? '✅ Sieg' : '❌ Niederlage'}
      </div>
    )}
  </div>
  
  <div className="scoreboard-content">
    {/* Großer Score */}
    <div className="score-display-large">
      <div className="score-number-large">{totalScore.home}</div>
      <div className="score-separator">:</div>
      <div className="score-number-large">{totalScore.guest}</div>
    </div>
    
    {/* Status-Text */}
    <div className="score-status">
      🏆 Dominanter Sieg! 💪
    </div>
    
    {/* Edit Button */}
    <button className="btn-participation" onClick={...}>
      Ergebnisse bearbeiten
    </button>
  </div>
</div>
```

#### **Card 3: Einzelmatches**
```jsx
<div className="lk-card-full">
  <div className="formkurve-header">
    <div className="formkurve-title">Einzelmatches</div>
  </div>
  
  <div className="matches-list">
    {/* Kompakte Match Cards */}
    {matchResults.map(result => (
      <div className="single-match-card">
        <div className="single-match-header">
          <span className="match-type-badge">
            {result.match_type === 'Einzel' ? '👤' : '👥'} {result.match_type}
          </span>
          <span className="match-status-icon">
            {isCompleted ? '✅' : isInProgress ? '⏱️' : '⏸️'}
          </span>
        </div>
        
        <div className="single-match-players">
          <div className="player-name-row">
            {homePlayerName} vs. {guestPlayerName}
          </div>
        </div>
        
        <div className="single-match-score">
          <div className="score-sets">
            <span>{result.set1_home}</span>
            <span>{result.set2_home}</span>
            {result.set3_home > 0 && <span>{result.set3_home}</span>}
          </div>
          <div className="score-separator-small">│</div>
          <div className="score-sets">
            <span>{result.set1_guest}</span>
            <span>{result.set2_guest}</span>
            {result.set3_guest > 0 && <span>{result.set3_guest}</span>}
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## 🎯 DESIGN-PRINZIPIEN

### **Aus Dashboard übernehmen:**
✅ `.lk-card-full` Container
✅ `.formkurve-header` für Titel + Badge
✅ `.formkurve-title` Uppercase Style
✅ `.improvement-badge-top` für Status
✅ Konsistente Abstände & Shadows
✅ `.season-display` für Saison
✅ `.maps-link-button` für Location
✅ `.btn-participation` für Actions

### **Neu für MatchdayResults:**
🆕 `.match-info-content` für Details
🆕 `.scoreboard-content` für großen Score
🆕 `.single-match-card` für kompakte Matches
🆕 `.match-detail-row` für Key-Value Pairs

---

## 📝 SCHRITTWEISE UMSETZUNG

### **Phase 1: Struktur**
1. Entferne alten sticky Header
2. Erstelle 3 Cards (Info, Score, Matches)
3. Importiere Dashboard.css Styles

### **Phase 2: Match Info Card**
1. Season Display integrieren
2. TVM Link hinzufügen
3. Match-Details als Rows
4. Location mit Maps-Link

### **Phase 3: Scoreboard Card**
1. Großer Score-Display
2. Status-Badge (Sieg/Niederlage)
3. Edit-Button im Card-Footer

### **Phase 4: Matches Card**
1. Kompakte Match-Cards
2. Typ-Badge (Einzel/Doppel)
3. Status-Icon (✅/⏱️/⏸️)
4. Scores inline

### **Phase 5: Polish**
1. Animationen
2. Hover-Effekte
3. Mobile-Optimierung
4. Dark Mode

---

## 🎨 CSS-KLASSEN (Wiederverwendung)

### **Aus Dashboard.css:**
```css
.lk-card-full { ... }
.formkurve-header { ... }
.formkurve-title { ... }
.improvement-badge-top { ... }
.season-display { ... }
.season-icon { ... }
.season-name { ... }
.tvm-link-small { ... }
.maps-link-button { ... }
.btn-participation { ... }
```

### **Neu in LiveResults.css:**
```css
.match-info-content { ... }
.match-detail-row { ... }
.scoreboard-content { ... }
.score-display-large { ... }
.single-match-card { ... }
.match-type-badge { ... }
```

---

## 🚀 VORTEILE DES NEUEN DESIGNS

✅ **Konsistenz:** Gleicher Look wie Dashboard
✅ **Übersichtlich:** Cards trennen Bereiche
✅ **Modern:** Gradient, Shadows, Animations
✅ **Funktional:** TVM Link, Maps Link, Edit Button
✅ **Mobil:** Optimiert für kleine Screens
✅ **Erweiterbar:** Einfach neue Cards hinzufügen

---

## ⚠️ VORSICHT BEI

❗ **Nicht entfernen:**
- Match-Logik (calculateSetWinner, etc.)
- Live-Timer
- Edit-Navigation
- Player-Daten laden

❗ **Nur Design ändern:**
- HTML-Struktur
- CSS-Klassen
- Layout

---

## 📋 CHECKLISTE

- [ ] Phase 1: Card-Struktur erstellen
- [ ] Phase 2: Match Info Card
- [ ] Phase 3: Scoreboard Card
- [ ] Phase 4: Matches Card
- [ ] Phase 5: Polish & Testing
- [ ] Dashboard.css styles importieren
- [ ] Alte CSS entfernen (optional)
- [ ] Mobile testen
- [ ] Dark Mode testen

---

**Bereit für die Umsetzung?** 🚀

Sollen wir mit **Phase 1** starten und die Card-Struktur erstellen?

