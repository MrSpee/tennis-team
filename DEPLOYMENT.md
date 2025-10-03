# 🚀 Deployment Guide

## Quick Deploy Options

### 1. Vercel (Recommended - 2 minutes)

**Why Vercel?**
- ✅ Zero configuration needed
- ✅ Automatic HTTPS
- ✅ Perfect PWA support
- ✅ Free tier available
- ✅ Automatic deployments from Git

**Steps:**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Production deployment
vercel --prod
```

**Result:** Your app at `https://your-project.vercel.app`

---

### 2. Netlify (Easiest - 3 minutes)

**Why Netlify?**
- ✅ Drag & drop deployment
- ✅ Free tier
- ✅ Automatic HTTPS
- ✅ Custom domains

**Steps:**

**Option A: Drag & Drop**
1. Build your app: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Sign up/login
4. Drag the `dist` folder onto the page
5. Done! Your app is live

**Option B: Git Integration**
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your repository
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Click "Deploy"

**Result:** Your app at `https://your-project.netlify.app`

---

### 3. GitHub Pages (Free forever)

**Why GitHub Pages?**
- ✅ Completely free
- ✅ GitHub integration
- ✅ Simple workflow

**Steps:**

1. **Update `vite.config.js`:**
```javascript
export default defineConfig({
  base: '/tennis-team-organizer/', // Your repo name
  // ... rest of config
});
```

2. **Create deployment workflow:**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v3
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

3. **Enable GitHub Pages:**
   - Go to repository Settings
   - Pages section
   - Source: GitHub Actions
   - Save

4. **Push to GitHub:**
```bash
git add .
git commit -m "Setup deployment"
git push origin main
```

**Result:** Your app at `https://yourusername.github.io/tennis-team-organizer/`

---

### 4. Firebase Hosting (Google Infrastructure)

**Why Firebase?**
- ✅ Google's CDN
- ✅ Free tier (generous)
- ✅ Easy backend integration later
- ✅ Custom domains

**Steps:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init hosting

# Select:
# - Use existing project or create new
# - Public directory: dist
# - Single-page app: Yes
# - GitHub integration: Optional

# Build your app
npm run build

# Deploy
firebase deploy
```

**Result:** Your app at `https://your-project.web.app`

---

### 5. Custom Server / VPS

**For any web server (Apache, Nginx, etc.):**

1. **Build the app:**
```bash
npm run build
```

2. **Upload `dist` folder contents** to your web server's public directory:
```bash
# Via FTP, SFTP, or SCP
scp -r dist/* user@yourserver.com:/var/www/html/
```

3. **Configure web server:**

**Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
```

---

## Pre-Deployment Checklist

### ✅ Before Deploying:

1. **Update Access Codes**
   - Change from demo codes (1234, 5678)
   - See `src/context/AuthContext.jsx`

2. **Customize Team Data**
   - Update player names and rankings
   - Set correct league information
   - See `src/context/DataContext.jsx`

3. **Update Branding**
   - Change app name in `package.json`
   - Update `index.html` title
   - Customize colors in `src/index.css`

4. **Test Build Locally**
   ```bash
   npm run build
   npm run preview
   ```

5. **Generate PWA Icons**
   - Create 192x192 and 512x512 PNG icons
   - Replace placeholder files in `public/`
   - Use tools like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)

6. **Test PWA Features**
   - Install on mobile device
   - Test offline functionality
   - Verify icons and splash screen

7. **Browser Testing**
   - Chrome (Desktop & Mobile)
   - Safari (iOS & macOS)
   - Firefox
   - Edge

---

## Post-Deployment Tasks

### ✅ After Deploying:

1. **Test Live Site**
   - Login with both roles
   - Create a match
   - Vote on availability
   - Check all pages

2. **Install as PWA**
   - Test on iOS
   - Test on Android
   - Test on Desktop

3. **Share with Team**
   - Send URL to team members
   - Share access codes
   - Provide quick start guide

4. **Monitor**
   - Check for console errors
   - Monitor data persistence
   - Gather user feedback

5. **Backup**
   - Export current data
   - Save configuration
   - Document customizations

---

## Environment Variables (Optional)

For sensitive configuration, use environment variables:

1. **Create `.env` file:**
```env
VITE_CAPTAIN_CODE=your_secret_code
VITE_PLAYER_CODE=your_player_code
VITE_API_URL=https://your-api.com
```

2. **Update `AuthContext.jsx`:**
```javascript
const accessCodes = {
  [import.meta.env.VITE_CAPTAIN_CODE]: { role: 'captain', name: 'Team Captain' },
  [import.meta.env.VITE_PLAYER_CODE]: { role: 'player', name: 'Player' },
};
```

3. **Configure in hosting platform:**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - GitHub Pages: Repository Secrets

---

## Custom Domain Setup

### Vercel
```bash
vercel domains add your-domain.com
# Follow DNS instructions
```

### Netlify
1. Site Settings → Domain Management
2. Add custom domain
3. Update DNS records

### Firebase
```bash
firebase hosting:channel:deploy live --add-domain your-domain.com
```

---

## SSL/HTTPS

All recommended platforms provide **automatic HTTPS** for free:
- ✅ Vercel: Auto SSL
- ✅ Netlify: Auto SSL
- ✅ GitHub Pages: Auto SSL
- ✅ Firebase: Auto SSL

For custom servers, use [Let's Encrypt](https://letsencrypt.org/):
```bash
sudo certbot --nginx -d your-domain.com
```

---

## Performance Optimization

### Before Deployment:

1. **Optimize Images** (when you add real icons)
   ```bash
   npm install -g sharp-cli
   sharp -i icon.png -o icon-optimized.png
   ```

2. **Analyze Bundle Size**
   ```bash
   npm run build -- --mode analyze
   ```

3. **Enable Compression** (automatic on most platforms)

4. **Set Cache Headers** (platform-specific)

---

## Troubleshooting

### PWA Not Installing
- Ensure HTTPS is enabled
- Check manifest.json is accessible
- Verify service worker registration
- Test in Chrome DevTools → Application → Manifest

### Blank Page After Deploy
- Check `base` URL in `vite.config.js`
- Ensure server redirects all routes to `index.html`
- Check browser console for errors

### Data Not Persisting
- localStorage might be blocked
- Check browser privacy settings
- Consider adding backend (Phase 2)

### Icons Not Showing
- Verify icon paths in manifest
- Check icon file sizes (192x192, 512x512)
- Use PNG format, not placeholder comments

---

## Monitoring & Analytics

### Add Google Analytics (Optional)

1. **Install:**
```bash
npm install react-ga4
```

2. **Add to `main.jsx`:**
```javascript
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
```

### Error Tracking (Optional)

**Sentry:**
```bash
npm install @sentry/react
```

---

## Continuous Deployment

### Automatic Deployments

**Vercel:** Auto-deploys on `git push` (after linking repo)

**Netlify:** Auto-deploys on `git push` (after linking repo)

**GitHub Actions:** Already configured (see GitHub Pages section)

**Firebase:**
```yaml
# .github/workflows/firebase-deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
```

---

## Cost Estimates

### Free Tier Limits:

| Platform | Free Tier |
|----------|-----------|
| Vercel | 100 GB bandwidth/month |
| Netlify | 100 GB bandwidth/month |
| GitHub Pages | 100 GB bandwidth/month |
| Firebase | 10 GB storage, 360 MB/day |

**For a tennis team (14 users):** Free tier is more than enough! 🎾

---

## Recommended: Vercel Setup

**Complete Vercel deployment in 2 minutes:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build to test
npm run build

# 3. Login
vercel login

# 4. Deploy
vercel

# Answer prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? tennis-team-organizer
# - Directory? ./
# - Override settings? No

# 5. Production deploy
vercel --prod

# Done! Copy the URL and share with your team
```

---

**Need help? Check the platform-specific docs or open an issue!**
