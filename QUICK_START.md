# 🎾 Quick Start Guide

## 🚀 Get Running in 2 Minutes

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and login with:
- **Captain**: `1234`
- **Player**: `5678`

---

## 📱 Main Features

### 🏠 Dashboard
- See upcoming matches
- Quick stats overview
- Team status at a glance

### 📅 Matches
**Players:**
- View all matches
- Mark availability (Yes/No + comment)
- See who else is available

**Captains:**
- Everything players can do PLUS:
- Create new matches (Admin panel)
- Delete matches
- See detailed response statistics

### 🏆 Rankings
- View team player rankings
- Official LK ratings
- Sort by points or LK

### 📊 League Table
- Current league standings
- Your team highlighted
- Match statistics

### ⚙️ Admin (Captains Only)
- Add/remove matches
- Manage team
- View response summaries

---

## 🎯 Common Tasks

### Add a Match (Captain)
1. Go to Admin (⚙️)
2. Click "Neues Spiel hinzufügen"
3. Fill in details
4. Click "Spiel erstellen"

### Vote on Match (Player)
1. Go to Matches (📅)
2. Click "Verfügbarkeit angeben" on a match
3. Add optional comment
4. Click "Verfügbar" or "Nicht verfügbar"

### Check Who's Available (Captain)
1. Go to Admin (⚙️)
2. Scroll to match
3. See availability stats
4. Or in Matches → "Alle Antworten anzeigen"

---

## 📱 Install as App

### iPhone/iPad
1. Safari → Share → "Add to Home Screen"

### Android
1. Chrome → Menu → "Install app"

### Desktop
1. Address bar → Install icon

---

## 🎨 Customization

### Change Codes
`src/context/AuthContext.jsx` → `accessCodes`

### Update Players
`src/context/DataContext.jsx` → `initialPlayers`

### Change Colors
`src/index.css` → `:root` section

---

## 🚀 Deploy

### Vercel (Easiest)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload 'dist' folder to netlify.com
```

### Any Host
```bash
npm run build
# Upload 'dist' folder to your server
```

---

## 🆘 Help

### Can't Login?
- Use code `1234` (captain) or `5678` (player)
- Check browser console for errors

### No Matches Showing?
- Make sure date is in the future
- Check Admin panel to add matches

### Lost Data?
- Data is in browser localStorage
- Per-device storage
- See SETUP_GUIDE.md for backup

### Can't Install as App?
- Requires HTTPS (except localhost)
- Use Chrome/Safari/Edge
- Check PWA requirements

---

## 📚 More Info

- **Full Setup**: See `SETUP_GUIDE.md`
- **All Features**: See `FEATURES.md`
- **Main Docs**: See `README.md`

---

## 🎯 Pro Tips

✅ Mobile is best - app designed for phones
✅ Install as PWA for app-like experience
✅ Backup data if using localStorage
✅ Update availability as soon as matches posted
✅ Captains: Create matches 2-3 weeks ahead

---

**That's it! Start organizing your team! 🎾**
