import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './SurfaceInfo.css';

/**
 * Zeigt Belag-Info und Schuhempfehlung für ein Match
 * Prominent und visuell ansprechend
 */
function SurfaceInfo({ matchdayId, compact = false }) {
  const [surfaceData, setSurfaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSurfaceInfo = async () => {
      if (!matchdayId) {
        setLoading(false);
        return;
      }

      try {
        // Nutze unsere RPC-Funktion
        const { data, error: rpcError } = await supabase
          .rpc('get_shoe_recommendation_for_match', {
            p_matchday_id: matchdayId
          });

        if (rpcError) {
          console.error('Error loading surface info:', rpcError);
          setError(rpcError.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          setSurfaceData(data[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading surface info:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadSurfaceInfo();
  }, [matchdayId]);

  // Keine Daten verfügbar
  if (loading) return null;
  if (error) return null;
  if (!surfaceData || !surfaceData.surface_name) return null;

  // Compact Mode (für kleine Cards)
  if (compact) {
    return (
      <div className="surface-info-compact">
        <span className="surface-icon">{surfaceData.icon_emoji || '🎾'}</span>
        <span className="surface-name">{surfaceData.surface_name}</span>
        <span className="shoe-icon">👟</span>
        <span className="shoe-text">{surfaceData.shoe_recommendation || 'Standard'}</span>
      </div>
    );
  }

  // Full Mode (für größere Cards)
  return (
    <div className="surface-info-full">
      <div className="surface-section">
        <div className="section-icon">{surfaceData.icon_emoji || '🎾'}</div>
        <div className="section-content">
          <div className="section-label">Belag</div>
          <div className="section-value">{surfaceData.surface_name}</div>
        </div>
      </div>
      
      <div className="divider"></div>
      
      <div className="shoe-section">
        <div className="section-icon">👟</div>
        <div className="section-content">
          <div className="section-label">Schuhe</div>
          <div className="section-value">{surfaceData.shoe_recommendation || 'Standard'}</div>
        </div>
      </div>
      
      {surfaceData.venue_name && (
        <div className="venue-hint">
          <span className="venue-icon">🏟️</span>
          <span className="venue-name">{surfaceData.venue_name}</span>
          {surfaceData.court_number && (
            <span className="court-number">
              {surfaceData.court_number_end 
                ? `Plätze ${surfaceData.court_number}-${surfaceData.court_number_end}`
                : `Platz ${surfaceData.court_number}`
              }
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default SurfaceInfo;

