import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function AnalyticsWrapper() {
  // Prüfe ob Analytics in dieser Umgebung aktiviert werden soll
  const shouldLoadAnalytics = () => {
    // Nur in echter Vercel-Produktion laden
    if (!import.meta.env.PROD) return false;
    
    // Nur wenn wir auf vercel.app sind
    if (!window.location.hostname.includes('vercel.app')) return false;
    
    // Prüfe ob Umgebungsvariable gesetzt ist (optional)
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED;
    if (analyticsEnabled === 'false') return false;
    
    return true;
  };

  if (!shouldLoadAnalytics()) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default AnalyticsWrapper;
