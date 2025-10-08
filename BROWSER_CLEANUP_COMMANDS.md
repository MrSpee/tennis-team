# 🧹 Browser-Cleanup Befehle für Chrome DevTools

## 📋 **Chrome DevTools Console Befehle:**

### **1. 🗑️ Lokalen Storage komplett löschen:**
```javascript
// Alle localStorage Daten löschen
localStorage.clear();

// Alle sessionStorage Daten löschen  
sessionStorage.clear();

// Alle IndexedDB Datenbanken löschen
indexedDB.databases().then(databases => {
  databases.forEach(db => {
    indexedDB.deleteDatabase(db.name);
  });
});

console.log('✅ Alle lokalen Daten gelöscht!');
```

### **2. 🍪 Cookies und Cache löschen:**
```javascript
// Alle Cookies löschen (funktioniert nur für aktuelle Domain)
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Service Worker Cache löschen
if ('caches' in window) {
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      caches.delete(name);
    });
  });
}

console.log('✅ Cookies und Cache gelöscht!');
```

### **3. 🔄 Kompletter Browser-Reset (Ein-Klick):**
```javascript
// ALLES löschen - Kompletter Reset
(async function() {
  // LocalStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // IndexedDB
  const databases = await indexedDB.databases();
  databases.forEach(db => indexedDB.deleteDatabase(db.name));
  
  // Cookies
  document.cookie.split(";").forEach(c => { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  // Cache
  if ('caches' in window) {
    const names = await caches.keys();
    names.forEach(name => caches.delete(name));
  }
  
  console.log('🧹 KOMPLETTER BROWSER-RESET ABGESCHLOSSEN!');
  console.log('🔄 Seite wird neu geladen...');
  
  // Seite neu laden
  window.location.reload();
})();
```

### **4. 🎯 Spezifische App-Daten löschen:**
```javascript
// Nur Platzhirsch-spezifische Daten löschen
const keysToRemove = [
  'localPlayerData',
  'localOnboardingComplete',
  'supabase.auth.token',
  'plazhirsch_user_data',
  'tennis_app_data'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
});

console.log('🎾 Platzhirsch-Daten gelöscht!');
```

### **5. 🔍 Aktuelle Daten anzeigen:**
```javascript
// Zeige alle localStorage Daten
console.log('📦 LocalStorage:', localStorage);

// Zeige alle sessionStorage Daten
console.log('📦 SessionStorage:', sessionStorage);

// Zeige alle Cookies
console.log('🍪 Cookies:', document.cookie);

// Zeige IndexedDB Datenbanken
indexedDB.databases().then(dbs => {
  console.log('🗄️ IndexedDB:', dbs);
});
```

---

## 🚀 **Verwendung:**

### **Für sauberes Testing:**
1. **Chrome DevTools öffnen** (F12)
2. **Console Tab** auswählen
3. **Einen der Befehle** kopieren und einfügen
4. **Enter drücken**

### **Empfohlener Workflow:**
```javascript
// 1. Kompletter Reset vor jedem Test
(async function() {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(";").forEach(c => { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('🧹 Reset abgeschlossen!');
  window.location.reload();
})();
```

---

## 🎯 **Für verschiedene Profile testen:**

### **Profil 1: Neuer User (Onboarding)**
```javascript
// Kompletter Reset
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

### **Profil 2: Theo Tester (Super-Admin)**
```javascript
// Reset + Theo Tester Daten simulieren
localStorage.clear();
localStorage.setItem('test_user', 'theo_tester');
localStorage.setItem('is_super_admin', 'true');
window.location.reload();
```

### **Profil 3: Normaler User**
```javascript
// Reset + normale User-Daten
localStorage.clear();
localStorage.setItem('test_user', 'normal_user');
window.location.reload();
```

---

## 💡 **Tipps:**

- **Immer DevTools Console verwenden** - Schneller als Browser-Einstellungen
- **Vor jedem Test resetten** - Verhindert Cache-Probleme
- **Console-Befehle als Bookmarks speichern** - Für schnellen Zugriff
- **Network Tab prüfen** - Für API-Calls und Fehler

**Perfekt für sauberes Testing!** 🎾✨
