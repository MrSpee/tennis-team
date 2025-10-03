# 🎾 Tennis Team Organizer PWA

A modern Progressive Web App for organizing tennis team matches, managing player availability, and tracking rankings.

## ✨ Features

### Phase 1 (Implemented)
- ✅ **Match Management**: Display upcoming matches for winter (4 players) and summer (6 players) seasons
- ✅ **Availability Voting**: Players can mark themselves as available/not available with optional comments
- ✅ **Official Rankings**: Display Tennisverband (DTB) player rankings (LK system)
- ✅ **League Table**: View current standings in your league
- ✅ **Simple Authentication**: Numeric code access for players and team captains
- ✅ **Admin Panel**: Team captains can create and manage matches
- ✅ **Responsive Design**: Beautiful UI that works on all devices
- ✅ **PWA Support**: Install on mobile devices, works offline

### Phase 2 (Planned)
- 🔄 Internal ranking based on match results
- 🔄 WhatsApp integration for notifications and voting
- 🔄 Match history and player statistics
- 🔄 Practice session scheduling

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 Access Codes

For demonstration purposes, use these codes:

- **Team Captain**: `1234` - Full access including admin panel
- **Player**: `5678` - Standard player access

## 📱 Installing as PWA

### On Mobile (iOS/Android)
1. Open the app in your browser
2. Tap the "Share" button (iOS) or menu (Android)
3. Select "Add to Home Screen"
4. The app will now work like a native app!

### On Desktop
- Look for the install icon in your browser's address bar
- Chrome: Click the + icon or "Install" button

## 🎨 Tech Stack

- **Frontend**: React 18
- **Routing**: React Router v6
- **Build Tool**: Vite
- **PWA**: vite-plugin-pwa with Workbox
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Styling**: Custom CSS with CSS Variables

## 📂 Project Structure

```
tennis-team-organizer/
├── public/
│   ├── tennis-icon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Matches.jsx
│   │   ├── Rankings.jsx
│   │   ├── LeagueTable.jsx
│   │   ├── AdminPanel.jsx
│   │   └── Navigation.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── DataContext.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## 🎯 Usage Guide

### For Players
1. Log in with your access code
2. View upcoming matches on the Dashboard
3. Go to "Spiele" to mark your availability
4. Add comments if you're unsure about availability
5. Check "Rangliste" for player rankings
6. View "Tabelle" for league standings

### For Team Captains
1. Log in with captain access code (1234)
2. Access the Admin Panel via the navigation
3. Click "Neues Spiel hinzufügen" to create matches
4. Fill in match details (opponent, date, time, location, season)
5. View all player responses for each match
6. Delete matches if needed

## 🔧 Customization

### Changing Access Codes
Edit `src/context/AuthContext.jsx`:
```javascript
const accessCodes = {
  'YOUR_CAPTAIN_CODE': { role: 'captain', name: 'Team Captain' },
  'YOUR_PLAYER_CODE': { role: 'player', name: 'Player' },
};
```

### Adding Players
Edit `src/context/DataContext.jsx` to modify the `initialPlayers` array.

### Updating League Table
In the future, this will fetch from an external API. For now, edit `initialLeagueStandings` in `src/context/DataContext.jsx`.

## 🌐 Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the 'dist' folder to Netlify
```

### Manual Deployment
```bash
npm run build
# Upload contents of 'dist' folder to your web server
```

## 📝 Data Persistence

The app uses `localStorage` to persist data:
- Match data
- Player availability responses
- League standings

Data persists across sessions but is device-specific.

## 🎨 Color Scheme

- Primary (Green): `#10b981`
- Secondary (Blue): `#3b82f6`
- Danger (Red): `#ef4444`
- Warning (Orange): `#f59e0b`

## 🤝 Contributing

This is a team-specific application. For feature requests or bugs, contact your team captain.

## 📄 License

Private project for tennis team use.

## 🎾 Season Information

- **Winter Season**: 4 players per match
- **Summer Season**: 6 players per match
- **League**: Bezirksliga Gruppe A
- **Team Categories**: Herren 40, Herren 50

## 📞 Support

Contact your team captain for any issues or questions.

---

Built with ❤️ for your tennis team
