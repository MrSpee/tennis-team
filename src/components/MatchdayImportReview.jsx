/**
 * ============================================================================
 * MATCHDAY IMPORT REVIEW COMPONENT
 * ============================================================================
 * UI für Review und Editing von KI-Import-Sessions
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import MatchdayImportService from '../services/matchdayImportService';
import './MatchdayImportReview.css';

const MatchdayImportReview = ({ sessionId, onComplete, onCancel }) => {
  const [session, setSession] = useState(null);
  const [entities, setEntities] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  
  // Editing States
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingFixture, setEditingFixture] = useState(null);
  
  // Autocomplete Data
  const [clubSuggestions, setClubSuggestions] = useState([]);
  const [teamSuggestions, setTeamSuggestions] = useState([]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  /**
   * Lade vollständige Session
   */
  const loadSession = async () => {
    try {
      setLoading(true);
      const data = await MatchdayImportService.loadImportSession(sessionId);
      
      setSession(data.session);
      setEntities(data.entities);
      setFixtures(data.fixtures);
      
      // Validierung
      validateSession(data.session, data.entities, data.fixtures);
      
    } catch (error) {
      console.error('❌ Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validiere Session
   */
  const validateSession = (session, entities, fixtures) => {
    const newErrors = [];
    const newWarnings = [];
    
    // Entity Validation
    const clubEntity = entities.find(e => e.entity_type === 'club');
    if (!clubEntity || !clubEntity.matched_db_id) {
      newErrors.push('Verein muss zugeordnet werden');
    }
    
    const teamEntity = entities.find(e => e.entity_type === 'team');
    if (!teamEntity || !teamEntity.matched_db_id) {
      newWarnings.push('Team-Zuordnung empfohlen');
    }
    
    // Fixture Validation
    fixtures.forEach(fixture => {
      if (!fixture.match_date) {
        newWarnings.push(`Spieltag ${fixture.row_order}: Datum fehlt`);
      }
      if (!fixture.home_team_id && !fixture.raw_home_club) {
        newWarnings.push(`Spieltag ${fixture.row_order}: Heim-Team fehlt`);
      }
      if (!fixture.away_team_id && !fixture.raw_away_club) {
        newWarnings.push(`Spieltag ${fixture.row_order}: Gast-Team fehlt`);
      }
    });
    
    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  /**
   * Entity bearbeiten
   */
  const handleEditEntity = async (entityId, updates) => {
    try {
      const { data, error } = await supabase
        .from('import_entities')
        .update({
          ...updates,
          status: updates.matched_db_id ? 'confirmed' : 'needs_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setEntities(prev => prev.map(e => e.id === entityId ? data : e));
      setEditingEntity(null);
      
      // Re-validate
      const sessionData = await MatchdayImportService.loadImportSession(sessionId);
      validateSession(sessionData.session, sessionData.entities, sessionData.fixtures);
      
    } catch (error) {
      console.error('❌ Error updating entity:', error);
    }
  };

  /**
   * Fixture bearbeiten
   */
  const handleEditFixture = async (fixtureId, updates) => {
    try {
      const { data, error } = await supabase
        .from('import_fixtures')
        .update({
          ...updates,
          import_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', fixtureId)
        .select()
        .single();
      
      if (error) throw error;
      
      setFixtures(prev => prev.map(f => f.id === fixtureId ? data : f));
      setEditingFixture(null);
      
    } catch (error) {
      console.error('❌ Error updating fixture:', error);
    }
  };

  /**
   * Suche Clubs für Autocomplete
   */
  const searchClubs = async (query) => {
    if (!query || query.length < 2) {
      setClubSuggestions([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('club_info')
        .select('id, name, city')
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (!error && data) {
        setClubSuggestions(data);
      }
    } catch (error) {
      console.error('❌ Error searching clubs:', error);
    }
  };

  /**
   * Suche Teams für Autocomplete
   */
  const searchTeams = async (query, clubId) => {
    if (!query || query.length < 2) {
      setTeamSuggestions([]);
      return;
    }
    
    try {
      let queryBuilder = supabase
        .from('team_info')
        .select('id, team_name, club_name, category')
        .ilike('team_name', `%${query}%`)
        .limit(10);
      
      if (clubId) {
        queryBuilder = queryBuilder.eq('club_id', clubId);
      }
      
      const { data, error } = await queryBuilder;
      
      if (!error && data) {
        setTeamSuggestions(data);
      }
    } catch (error) {
      console.error('❌ Error searching teams:', error);
    }
  };

  /**
   * Commit Import
   */
  const handleCommit = async () => {
    try {
      setSaving(true);
      
      // Finale Validierung
      if (errors.length > 0) {
        alert('Bitte beheben Sie zuerst alle Fehler');
        return;
      }
      
      // 1. Entities: Erstelle/Update Clubs, Teams, etc.
      const clubEntity = entities.find(e => e.entity_type === 'club');
      const teamEntity = entities.find(e => e.entity_type === 'team');
      const leagueEntity = entities.find(e => e.entity_type === 'league');
      const seasonEntity = entities.find(e => e.entity_type === 'season');
      
      let finalClubId = clubEntity?.matched_db_id;
      let finalTeamId = teamEntity?.matched_db_id;
      const season = seasonEntity?.normalized_value || 'winter_25_26';
      
      // 2. Erstelle Matchdays
      const matchdaysToInsert = fixtures
        .filter(f => f.import_status === 'confirmed')
        .map(fixture => {
          // Bestimme home/away team IDs
          let homeTeamId = fixture.home_team_id || finalTeamId;
          let awayTeamId = fixture.away_team_id;
          
          // Wenn away_team noch nicht gematcht, versuche es jetzt
          if (!awayTeamId && fixture.raw_away_club) {
            // TODO: Quick Match für Away-Team
          }
          
          return {
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            match_date: fixture.match_date,
            venue: fixture.raw_venue,
            season: season,
            league: leagueEntity?.normalized_value || null,
            group_name: leagueEntity?.metadata?.group || null,
            status: fixture.status,
            home_score: fixture.matchpoints_home,
            away_score: fixture.matchpoints_away,
            location: fixture.home_team_id === finalTeamId ? 'Home' : 'Away'
          };
        })
        .filter(m => m.home_team_id && m.away_team_id && m.match_date); // Nur vollständige
      
      if (matchdaysToInsert.length === 0) {
        alert('Keine vollständigen Spieltage zum Importieren');
        return;
      }
      
      // 3. Insert (mit Idempotenz-Check)
      const { data: insertedMatchdays, error: insertError } = await supabase
        .from('matchdays')
        .insert(matchdaysToInsert)
        .select();
      
      if (insertError) {
        // Prüfe auf Duplikate
        if (insertError.code === '23505') {
          // Conflict - möglicherweise bereits vorhanden
          console.log('⚠️ Some matchdays already exist, skipping...');
        } else {
          throw insertError;
        }
      }
      
      // 4. Update Session Status
      await supabase
        .from('import_sessions')
        .update({
          status: 'committed',
          commit_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      // 5. Log
      await supabase.rpc('log_import_event', {
        p_session_id: sessionId,
        p_step: 'commit',
        p_message: `${matchdaysToInsert.length} Matchdays erfolgreich importiert`,
        p_severity: 'success'
      });
      
      alert(`✅ ${matchdaysToInsert.length} Spieltage erfolgreich importiert!`);
      
      if (onComplete) {
        onComplete(insertedMatchdays);
      }
      
    } catch (error) {
      console.error('❌ Error committing import:', error);
      alert(`Fehler beim Importieren: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="import-review-loading">
        <p>Lade Import-Session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="import-review-error">
        <p>Session nicht gefunden</p>
      </div>
    );
  }

  const clubEntity = entities.find(e => e.entity_type === 'club');
  const teamEntity = entities.find(e => e.entity_type === 'team');
  const leagueEntity = entities.find(e => e.entity_type === 'league');
  const seasonEntity = entities.find(e => e.entity_type === 'season');

  return (
    <div className="import-review-container">
      <div className="import-review-header">
        <h2>Import Review & Editing</h2>
        <div className="import-review-actions">
          <button onClick={onCancel} className="btn-secondary">Abbrechen</button>
          <button 
            onClick={handleCommit} 
            className="btn-primary"
            disabled={errors.length > 0 || saving}
          >
            {saving ? 'Speichere...' : 'Importieren'}
          </button>
        </div>
      </div>

      {/* Validation Summary */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="import-review-validation">
          {errors.length > 0 && (
            <div className="validation-errors">
              <h4>❌ Fehler:</h4>
              <ul>
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="validation-warnings">
              <h4>⚠️ Warnungen:</h4>
              <ul>
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Entities Section */}
      <div className="import-review-section">
        <h3>Erkannte Entitäten</h3>
        
        {/* Club */}
        {clubEntity && (
          <EntityEditor
            entity={clubEntity}
            label="Verein"
            onEdit={(updates) => handleEditEntity(clubEntity.id, updates)}
            onSearch={searchClubs}
            suggestions={clubSuggestions}
            entityType="club"
          />
        )}
        
        {/* Team */}
        {teamEntity && (
          <EntityEditor
            entity={teamEntity}
            label="Mannschaft"
            onEdit={(updates) => handleEditEntity(teamEntity.id, updates)}
            onSearch={(query) => searchTeams(query, clubEntity?.matched_db_id)}
            suggestions={teamSuggestions}
            entityType="team"
          />
        )}
        
        {/* League */}
        {leagueEntity && (
          <div className="entity-display">
            <label>Liga/Klasse:</label>
            <div>
              <strong>{leagueEntity.normalized_value}</strong>
              <span className={`match-badge ${leagueEntity.status}`}>
                {leagueEntity.status === 'auto' ? '✅ Auto' : '⚠️ Review'}
                {leagueEntity.match_score && ` (${Math.round(leagueEntity.match_score)}%)`}
              </span>
            </div>
          </div>
        )}
        
        {/* Season */}
        {seasonEntity && (
          <div className="entity-display">
            <label>Saison:</label>
            <strong>{seasonEntity.normalized_value}</strong>
          </div>
        )}
      </div>

      {/* Fixtures Section */}
      <div className="import-review-section">
        <h3>Spieltage ({fixtures.length})</h3>
        <div className="fixtures-table">
          <table>
            <thead>
              <tr>
                <th>Datum/Zeit</th>
                <th>Spielort</th>
                <th>Heim</th>
                <th>Gast</th>
                <th>Ergebnis</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {fixtures.map(fixture => (
                <FixtureRow
                  key={fixture.id}
                  fixture={fixture}
                  onEdit={handleEditFixture}
                  clubEntity={clubEntity}
                  teamEntity={teamEntity}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Entity Editor Component
 */
const EntityEditor = ({ entity, label, onEdit, onSearch, suggestions, entityType }) => {
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const getStatusBadge = (status, score) => {
    if (status === 'auto' && score >= 92) return '✅ Auto';
    if (score >= 80) return '⚠️ Review';
    return '❌ Fehlt';
  };
  
  const handleSelect = (selectedId, selectedName) => {
    onEdit({
      matched_db_id: selectedId,
      normalized_value: selectedName,
      display_name: selectedName
    });
    setEditing(false);
    setSearchQuery('');
  };
  
  return (
    <div className="entity-editor">
      <label>{label}:</label>
      {!editing ? (
        <div className="entity-display">
          <strong>{entity.display_name || entity.normalized_value || entity.raw_value}</strong>
          <span className={`match-badge ${entity.status}`}>
            {getStatusBadge(entity.status, entity.match_score)}
            {entity.match_score && ` (${Math.round(entity.match_score)}%)`}
          </span>
          {entity.matched_db_id && (
            <button onClick={() => setEditing(true)} className="btn-small">Bearbeiten</button>
          )}
          {(!entity.matched_db_id || entity.status === 'needs_review') && (
            <button onClick={() => setEditing(true)} className="btn-small btn-primary">
              Zuordnen
            </button>
          )}
        </div>
      ) : (
        <div className="entity-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder={`${label} suchen...`}
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className="suggestion-item"
                  onClick={() => handleSelect(suggestion.id, suggestion.name || suggestion.team_name)}
                >
                  <strong>{suggestion.name || suggestion.team_name}</strong>
                  {suggestion.city && <span className="suggestion-meta">{suggestion.city}</span>}
                  {suggestion.category && <span className="suggestion-meta">{suggestion.category}</span>}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setEditing(false)} className="btn-small">Abbrechen</button>
        </div>
      )}
      {entity.alternative_matches && entity.alternative_matches.length > 0 && (
        <div className="alternative-matches">
          <small>Alternative: {entity.alternative_matches.slice(0, 3).map(a => a.name).join(', ')}</small>
        </div>
      )}
    </div>
  );
};

/**
 * Fixture Row Component
 */
const FixtureRow = ({ fixture, onEdit, clubEntity, teamEntity }) => {
  const [editing, setEditing] = useState(false);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return fixture.raw_date_time;
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fixture.raw_date_time;
    }
  };
  
  const getStatusBadge = () => {
    if (fixture.import_status === 'auto') return '✅';
    if (fixture.import_status === 'confirmed') return '✓';
    return '⚠️';
  };
  
  return (
    <tr className={fixture.import_status === 'confirmed' ? 'confirmed' : ''}>
      <td>{formatDate(fixture.match_date)}</td>
      <td>{fixture.raw_venue}</td>
      <td>
        {fixture.raw_home_club}
        {fixture.home_club_score && (
          <span className="score-badge">{Math.round(fixture.home_club_score)}%</span>
        )}
      </td>
      <td>
        {fixture.raw_away_club}
        {fixture.away_club_score && (
          <span className="score-badge">{Math.round(fixture.away_club_score)}%</span>
        )}
      </td>
      <td>
        {fixture.matchpoints_home !== null && fixture.matchpoints_away !== null
          ? `${fixture.matchpoints_home}:${fixture.matchpoints_away}`
          : fixture.raw_result || '—'
        }
      </td>
      <td>
        <span className="status-badge">{fixture.status}</span>
        {getStatusBadge()}
      </td>
      <td>
        <button onClick={() => setEditing(!editing)} className="btn-small">
          {editing ? 'Speichern' : 'Bearbeiten'}
        </button>
      </td>
    </tr>
  );
};

export default MatchdayImportReview;


