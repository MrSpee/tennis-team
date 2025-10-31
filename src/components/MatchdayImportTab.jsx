/**
 * ============================================================================
 * MATCHDAY IMPORT TAB - Neue Komponente für Matchday-Import
 * ============================================================================
 * Nutzt das neue Import-System mit Fuzzy Matching und Review-Workflow
 * ============================================================================
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MatchdayImportService from '../services/matchdayImportService';
import MatchdayImportReview from './MatchdayImportReview';
import './MatchdayImportTab.css';

const MatchdayImportTab = () => {
  const { player } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [showReview, setShowReview] = useState(false);

  /**
   * Starte Import-Workflow
   */
  const handleStartImport = async () => {
    if (!inputText.trim()) {
      setError('Bitte gib die Medenspiel-Übersicht ein.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🚀 Starting Matchday Import...');

      // 1. Erstelle Import-Session
      const session = await MatchdayImportService.createImportSession(
        inputText,
        'text',
        player?.id
      );

      console.log('✅ Session created:', session.id);

      // 2. Parse mit API
      let parsed;
      try {
        // Rufe bestehende API auf (Vercel Function)
        const response = await fetch('/api/import/parse-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            userEmail: player?.email
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        parsed = result.data || result;

        console.log('✅ Parsed data:', parsed);

      } catch (apiError) {
        console.error('❌ API Error:', apiError);
        // Fallback: Nutze lokalen Parser (wenn verfügbar)
        throw new Error(
          'API nicht verfügbar. Bitte deploye nach Vercel oder nutze Production-URL.\n' +
          apiError.message
        );
      }

      // 3. Speichere Context
      if (parsed.team_info) {
        await MatchdayImportService.loadImportSession(session.id).then(
          async (current) => {
            await fetch(`/api/supabase/import-sessions/${session.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                context_normalized: parsed.team_info
              })
            }).catch(() => {
              // Fallback: Direkt über Supabase
              const { supabase } = require('../lib/supabaseClient');
              await supabase
                .from('import_sessions')
                .update({ context_normalized: parsed.team_info })
                .eq('id', session.id);
            });
          }
        );
      }

      // 4. Entity Matching
      const entities = await MatchdayImportService.performEntityMatching(
        session.id,
        parsed
      );

      console.log('✅ Entities matched:', entities);

      // 5. Fixture Matching
      if (parsed.matches && parsed.matches.length > 0) {
        const fixtures = await MatchdayImportService.createImportFixtures(
          session.id,
          parsed.matches,
          entities
        );

        console.log('✅ Fixtures created:', fixtures.length);
      }

      // 6. Zeige Review-UI
      setSessionId(session.id);
      setShowReview(true);

    } catch (err) {
      console.error('❌ Import error:', err);
      setError(err.message || 'Fehler beim Import');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Review abgeschlossen
   */
  const handleReviewComplete = (matchdays) => {
    console.log('✅ Import completed:', matchdays);
    setShowReview(false);
    setInputText('');
    setSessionId(null);
    alert(`✅ ${matchdays?.length || 0} Spieltage erfolgreich importiert!`);
  };

  /**
   * Review abbrechen
   */
  const handleReviewCancel = () => {
    setShowReview(false);
    setSessionId(null);
  };

  // Review-UI anzeigen
  if (showReview && sessionId) {
    return (
      <MatchdayImportReview
        sessionId={sessionId}
        onComplete={handleReviewComplete}
        onCancel={handleReviewCancel}
      />
    );
  }

  // Haupt-Import-UI
  return (
    <div className="matchday-import-tab">
      <div className="import-header">
        <h2>🎾 Medenspiel-Übersicht importieren</h2>
        <p className="import-description">
          Kopiere eine Medenspiel-Übersicht (Verein, Mannschaft, Spielplan) und die KI erkennt
          automatisch alle relevanten Informationen.
        </p>
      </div>

      {error && (
        <div className="import-error">
          <strong>❌ Fehler:</strong> {error}
        </div>
      )}

      <div className="import-input-section">
        <label htmlFor="matchday-input">
          <strong>Medenspiel-Übersicht (Text):</strong>
        </label>
        <textarea
          id="matchday-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Beispiel:
SV Rot-Gelb Sürth
Stadt Köln
Auf dem Breiten Feld 25
50997 Köln

Herren 40 1. Kreisliga Gr. 046
Herren 40 1 (4er)

Datum	Spielort	Heim Verein	Gastverein	Matchpunkte	Sätze	Spiele	
05.10.2025, 14:00	TG Leverkusen	TG Leverkusen 2	SV RG Sürth 1	1:5	3:10	42:63	Spielbericht
21.03.2026, 18:00	Marienburger SC	SV RG Sürth 1	TC Ford Köln 2	0:0	0:0	0:0	offen`}
          rows={15}
          disabled={isProcessing}
        />
      </div>

      <div className="import-actions">
        <button
          onClick={handleStartImport}
          disabled={isProcessing || !inputText.trim()}
          className="btn-primary btn-large"
        >
          {isProcessing ? '⏳ Verarbeite...' : '🚀 Import starten'}
        </button>
      </div>

      <div className="import-info">
        <h4>ℹ️ Wie funktioniert es?</h4>
        <ol>
          <li>
            <strong>KI-Parsing:</strong> Die KI erkennt automatisch Verein, Mannschaft, Liga und
            alle Spieltage
          </li>
          <li>
            <strong>Fuzzy Matching:</strong> Automatisches Zuordnen zu bestehenden Clubs/Teams in
            der Datenbank
          </li>
          <li>
            <strong>Review:</strong> Alle Daten werden in einer übersichtlichen UI angezeigt und
            können bearbeitet werden
          </li>
          <li>
            <strong>Commit:</strong> Nach Bestätigung werden die Spieltage in die Datenbank
            importiert
          </li>
        </ol>
      </div>
    </div>
  );
};

export default MatchdayImportTab;


