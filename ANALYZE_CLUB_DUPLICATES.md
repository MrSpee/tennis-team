# 🔍 Duplikate-Analyse der Vereine

## Gefundene Duplikate:

### 1. VKC Köln / VKC-Tennisclub e.V. ⚠️
**Wahrscheinlich GLEICHER Verein:**
- **Eintrag A:** `VKC Köln` (idx 3)
  - normalized_name: `vkcköln`
  - postal_code: `50937`
  - data_source: `tvm_import`
  
- **Eintrag B:** `VKC-Tennisclub e.V.` (idx 54)
  - normalized_name: `vkctennisclubev`
  - postal_code: `51105`
  - data_source: `manual`

**Unterschied:** Verschiedene PLZ! → Eventuell verschiedene Standorte?
**Empfehlung:** ⚠️ PRÜFEN - könnte gleicher Verein mit Umzug sein

---

### 2. SV Rot-Gelb Sürth / Rot-Gelb Sürth Tennis e.V. ✅
**DEFINITIV GLEICHER Verein:**
- **Eintrag A:** `SV Rot-Gelb Sürth` (idx 47)
  - normalized_name: `svrotgelbsürth`
  - postal_code: `50999`
  - data_source: `tvm_import`
  - **Hat bereits 5 Spieler!** ← HAUPT-EINTRAG
  
- **Eintrag B:** `Rot-Gelb Sürth Tennis e.V.` (idx 58)
  - normalized_name: `rotgelbsürthtennisev`
  - postal_code: `50997`
  - data_source: `manual`

**Unterschied:** Leicht andere PLZ (50999 vs 50997), aber selber Verein!
**Empfehlung:** ✅ MERGEN - B löschen, A behalten

---

### 3. Rodenkirchener Tennis Club / TCR Tennisclub Rodenkirchen ⚠️
**WAHRSCHEINLICH GLEICHER Verein:**
- **Eintrag A:** `Rodenkirchener Tennis Club e.V.` (idx 19)
  - normalized_name: `rodenkirchenertennisclubev`
  - postal_code: `50997`
  - data_source: `manual`
  
- **Eintrag B:** `TCR Tennisclub Rodenkirchen` (idx 34)
  - normalized_name: `tcrtennisclubrodenkirchen`
  - postal_code: `50999`
  - data_source: `manual`

**Unterschied:** TCR = Tennisclub Rodenkirchen (gleicher Name, andere Schreibweise)
**Empfehlung:** ✅ MERGEN - Einen behalten (egal welchen)

---

### 4. Weitere potenzielle Duplikate (NICHT sicher):

#### VKC Köln (verschiedene PLZ)
- Könnte 2 verschiedene Standorte sein
- Oder Umzug/neue Anlage

#### Rot-Gelb vs Rot-Weiss Porz
- **UNTERSCHIEDLICH!** (Farben unterscheiden sich)
- Rot-Gelb ≠ Rot-Weiss

---

## 🎯 Empfohlene Aktionen:

### ✅ Sichere Duplikate (MERGEN):

1. **SV Rot-Gelb Sürth** ← Behalten (hat Spieler!)
   - Lösche: `Rot-Gelb Sürth Tennis e.V.` (idx 58)

2. **TCR Tennisclub Rodenkirchen** ← Behalten (neuere ID)
   - Lösche: `Rodenkirchener Tennis Club e.V.` (idx 19)

### ⚠️ Unsichere Duplikate (PRÜFEN):

3. **VKC Köln vs VKC-Tennisclub e.V.**
   - Verschiedene PLZ (50937 vs 51105)
   - Könnte 2 Standorte sein
   - **ENTSCHEIDUNG BENÖTIGT**

---

## 📊 Zusammenfassung:

- **Gesamt:** 72 Vereine in der DB
- **Sichere Duplikate:** 2
- **Unsichere Duplikate:** 1
- **Nach Cleanup:** 70 Vereine (wenn VKC auch gemerged wird: 69)

