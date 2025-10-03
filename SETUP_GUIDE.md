# 🎾 Tennis Team Organizer - Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Login
Use these demo codes:
- **Team Captain**: `1234`
- **Player**: `5678`

## 🎯 First Steps

### As a Team Captain (Code: 1234)

1. **Navigate to Admin Panel** (gear icon in bottom navigation)
2. **Add Your First Match**:
   - Click "Neues Spiel hinzufügen"
   - Fill in match details
   - Select season (Winter = 4 players, Summer = 6 players)
   - Click "Spiel erstellen"

3. **View Match Responses**:
   - All matches show real-time availability
   - See who's available/unavailable
   - Check if you have enough players

### As a Player (Code: 5678)

1. **View Matches** (calendar icon)
2. **Mark Your Availability**:
   - Click "Verfügbarkeit angeben"
   - Add optional comment if unsure
   - Select "Verfügbar" or "Nicht verfügbar"

3. **Check Rankings** (trophy icon)
4. **View League Table** (table icon)

## 🔧 Customization

### Change Access Codes

Edit `src/context/AuthContext.jsx`:

```javascript
const accessCodes = {
  'YOUR_CAPTAIN_CODE': { role: 'captain', name: 'Team Captain' },
  'YOUR_PLAYER_CODE': { role: 'player', name: 'Player' },
};
```

### Update Team Players

Edit `src/context/DataContext.jsx` - find `initialPlayers`:

```javascript
const initialPlayers = [
  { id: 1, name: 'Your Name', ranking: 'LK 10', points: 750 },
  // Add more players...
];
```

### Customize League Table

Edit `src/context/DataContext.jsx` - find `initialLeagueStandings`:

```javascript
const initialLeagueStandings = [
  { position: 1, team: 'Your Team Name', matches: 8, wins: 5, losses: 3, points: 10 },
  // Add more teams...
];
```

## 📱 Install as Mobile App

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on your home screen!

### Android
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install"
5. App appears in your app drawer!

### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install"
3. App opens in its own window!

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Free)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts
# Your app will be live at: your-app.vercel.app
```

### Option 2: Netlify (Free)

```bash
# Build the app
npm run build

# Go to netlify.com
# Drag and drop the 'dist' folder
# Your app is live!
```

### Option 3: GitHub Pages (Free)

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select "GitHub Actions" as source
4. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🎨 Customizing Colors

Edit `src/index.css` - find the `:root` section:

```css
:root {
  --primary: #10b981;        /* Main green color */
  --primary-dark: #059669;   /* Darker green */
  --secondary: #3b82f6;      /* Blue */
  --danger: #ef4444;         /* Red */
  --warning: #f59e0b;        /* Orange */
  --success: #10b981;        /* Green */
}
```

## 📊 Data Management

### Where is data stored?
- Data is stored in browser's `localStorage`
- Persists across browser sessions
- Separate per device/browser

### Export/Backup Data

Open browser console and run:
```javascript
// Export all data
console.log(JSON.stringify({
  matches: localStorage.getItem('matches'),
  players: localStorage.getItem('players'),
  leagueStandings: localStorage.getItem('leagueStandings')
}));
```

### Import/Restore Data

```javascript
// Restore from backup
localStorage.setItem('matches', 'YOUR_BACKUP_DATA');
localStorage.setItem('players', 'YOUR_BACKUP_DATA');
localStorage.setItem('leagueStandings', 'YOUR_BACKUP_DATA');
location.reload();
```

### Reset All Data

```javascript
localStorage.clear();
location.reload();
```

## 🔮 Future Features (Phase 2)

### Planned for Next Version:
1. **WhatsApp Integration**
   - Auto-send match notifications to WhatsApp group
   - Allow voting via WhatsApp messages
   - Share lineups automatically

2. **Internal Rankings**
   - Calculate team-specific rankings based on match results
   - Track win/loss records
   - Performance statistics

3. **Match History**
   - View all past matches
   - See who played in each match
   - Track team performance over time

4. **Player Statistics**
   - Individual win rates
   - Matches played
   - Availability percentage

5. **Backend Integration**
   - Sync data across devices
   - Real-time updates
   - Central database

## 🐛 Troubleshooting

### App won't install as PWA
- Make sure you're using HTTPS (required for PWA)
- Try clearing browser cache
- Use Chrome/Edge/Safari (best PWA support)

### Data disappeared
- Check if you're using the same browser/device
- Data is stored per browser - switching browsers starts fresh
- Consider implementing backup/restore

### Matches not showing
- Check the date format in your data
- Make sure matches are in the future for "upcoming"
- Check browser console for errors

### Can't access Admin Panel
- Make sure you logged in with captain code (1234)
- Check if the navigation shows 5 icons (including settings)

## 💡 Pro Tips

1. **Regular Backups**: Export data weekly if you're using localStorage
2. **Multiple Access Points**: Share both captain and player codes with team
3. **Mobile First**: App is designed for mobile - works best on phones
4. **Offline Mode**: PWA works offline after first visit
5. **Update Prompts**: When you update the app, users may need to refresh

## 📞 Getting Help

Common questions answered in README.md

For custom development or features, consider hiring a developer to:
- Add backend database (Firebase, Supabase)
- Implement WhatsApp API integration
- Add push notifications
- Create user accounts system

## 🎯 Best Practices

### For Team Captains
- ✅ Create matches 2-3 weeks in advance
- ✅ Check availability 3 days before match
- ✅ Send reminder to players who haven't responded
- ✅ Update league table after each match day

### For Players
- ✅ Update availability as soon as match is posted
- ✅ Add comments if availability might change
- ✅ Check the app weekly
- ✅ Update if your availability changes

## 🔐 Security Notes

- Access codes are stored in source code (for demo)
- For production, consider:
  - Environment variables for codes
  - Proper authentication system
  - Backend API for sensitive data
  - User accounts with passwords

## 🌍 Multi-Language Support

Currently in German. To add English or other languages:

1. Create translation files
2. Use i18n library (react-i18next)
3. Add language switcher
4. Update all text strings

## 📈 Analytics (Optional)

Add Google Analytics or similar:

```javascript
// Add to src/main.jsx
import ReactGA from 'react-ga4';
ReactGA.initialize('YOUR_GA_ID');
```

---

**Enjoy organizing your tennis team! 🎾**
