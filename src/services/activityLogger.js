import { supabase } from '../lib/supabaseClient';
import { isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Logging Service für Super-Admin System
 * 
 * Automatisches Logging aller wichtigen Aktivitäten:
 * - Vereinsauswahl
 * - Team-Erstellung
 * - Profil-Updates
 * - Onboarding-Abschluss
 * - Admin-Aktionen
 */

class LoggingService {
  /**
   * Prüft ob Logging möglich ist
   * @returns {Promise<boolean>}
   */
  static async canLog() {
    // Prüfe ob Supabase konfiguriert ist
    if (!isSupabaseConfigured()) {
      return false;
    }

    // Prüfe ob User authentifiziert ist
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Loggt eine Aktivität
   * @param {string} action - Die durchgeführte Aktion
   * @param {string} entityType - Typ der Entität (club, team, player, etc.)
   * @param {string} entityId - ID der Entität
   * @param {object} details - Zusätzliche Details
   */
  static async logActivity(action, entityType = null, entityId = null, details = {}) {
    try {
      // Prüfe nur ob Supabase konfiguriert ist
      if (!isSupabaseConfigured()) {
        console.log('⚠️ Logging skipped (Supabase not configured):', action);
        return null;
      }
      
      // Hilfsfunktionen
      const getSessionId = () => {
        try {
          const key = 'app_session_id';
          let sid = localStorage.getItem(key);
          if (!sid) {
            sid = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(key, sid);
          }
          return sid;
        } catch {
          return null;
        }
      };
      const getDevice = () => {
        try {
          const ua = navigator.userAgent || '';
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (window.innerWidth && window.innerWidth < 768);
          const isTablet = /iPad|Tablet|Nexus 7|Nexus 10/i.test(ua) || (window.innerWidth >= 768 && window.innerWidth < 1024);
          return isTablet ? 'Tablet' : (isMobile ? 'Mobil' : 'Desktop');
        } catch {
          return 'Unbekannt';
        }
      };
      const getAppVersion = () => {
        try {
          // bevorzugt von globaler Konstante oder Build-Env
          return window.__APP_VERSION__ || (import.meta && import.meta.env && import.meta.env.VITE_APP_VERSION) || 'unbekannt';
        } catch {
          return 'unbekannt';
        }
      };

      // Erweitere Details um Browser-Info
      const enhancedDetails = {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        device: getDevice(),
        app_version: getAppVersion(),
        session_id: getSessionId()
      };

      // Hole aktuellen User (falls verfügbar)
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (authError) {
        console.warn('⚠️ Could not get user for logging (non-critical):', authError.message);
      }

      // Verwende Supabase RPC-Funktion
      const { data, error } = await supabase.rpc('log_activity', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: { ...enhancedDetails, user_id: userId }
      });

      if (error) {
        console.error('Error logging activity:', error);
        return null;
      }

      console.log(`📝 Activity logged: ${action}`, enhancedDetails);
      return data;

    } catch (error) {
      console.error('Failed to log activity:', error);
      return null;
    }
  }

  /**
   * Aktualisiert System-Statistiken
   * @param {string} statType - Typ der Statistik
   * @param {number} increment - Inkrement (default: 1)
   * @param {object} metadata - Zusätzliche Metadaten
   */
  static async updateStat(statType, increment = 1, metadata = {}) {
    try {
      const { error } = await supabase.rpc('update_system_stat', {
        p_stat_type: statType,
        p_increment: increment,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error updating stat:', error);
        return false;
      }

      console.log(`📊 Stat updated: ${statType} (+${increment})`);
      return true;

    } catch (error) {
      console.error('Failed to update stat:', error);
      return false;
    }
  }

  // =====================================================
  // Spezifische Logging-Methoden
  // =====================================================

  /**
   * Loggt Vereinsauswahl im Onboarding
   */
  static async logClubSelection(clubName, clubId, isVerified = false) {
    return this.logActivity('club_selected', 'club', clubId, {
      club_name: clubName,
      is_verified: isVerified,
      source: 'onboarding'
    });
  }

  /**
   * Loggt Team-Erstellung
   */
  static async logTeamCreation(teamData) {
    return this.logActivity('team_created', 'team', teamData.id, {
      team_name: teamData.category,
      club_name: teamData.club_name,
      league: teamData.league,
      team_size: teamData.team_size,
      source: 'onboarding'
    });
  }

  /**
   * Loggt Profil-Update
   */
  static async logProfileUpdate(updatedFields) {
    return this.logActivity('profile_updated', 'player', null, {
      updated_fields: Object.keys(updatedFields),
      source: 'profile_page'
    });
  }

  /**
   * Loggt Onboarding-Start (Schritt 1)
   */
  static async logOnboardingStart(userEmail) {
    return this.logActivity('onboarding_started', 'player', null, {
      user_email: userEmail,
      step: 1,
      source: 'onboarding'
    });
  }

  /**
   * Loggt Onboarding Schritt-Navigation
   */
  static async logOnboardingStep(step, stepData = {}) {
    return this.logActivity('onboarding_step', 'player', null, {
      step: step,
      step_name: stepData.stepName || `Step ${step}`,
      ...stepData,
      source: 'onboarding'
    });
  }

  /**
   * Loggt Onboarding-Abbruch mit Grund
   */
  static async logOnboardingAbort(step, reason, extra = {}) {
    return this.logActivity('onboarding_aborted', 'player', null, {
      step,
      reason,
      ...extra,
      source: 'onboarding'
    });
  }

  /**
   * Loggt Importierter-Spieler-Suche
   */
  static async logImportedPlayerSearch(searchTerm, resultsCount, selectedPlayer = null) {
    return this.logActivity('onboarding_search', 'player', null, {
      search_term: searchTerm,
      results_count: resultsCount,
      player_selected: !!selectedPlayer,
      selected_player_id: selectedPlayer?.id || null,
      selected_player_name: selectedPlayer?.name || null,
      source: 'onboarding_step3'
    });
  }

  /**
   * Loggt Importierter-Spieler-Auswahl (Smart-Match)
   */
  static async logImportedPlayerSelection(importedPlayer, willMerge = true) {
    return this.logActivity('onboarding_smart_match', 'player', importedPlayer.id, {
      imported_player_name: importedPlayer.name,
      imported_player_lk: importedPlayer.import_lk,
      imported_player_team: importedPlayer.team_info?.club_name || null,
      will_merge: willMerge,
      source: 'onboarding_step3'
    });
  }

  /**
   * Loggt manuelle Dateneingabe (kein Smart-Match)
   */
  static async logManualDataEntry(playerData) {
    return this.logActivity('onboarding_manual_entry', 'player', null, {
      player_name: playerData.name,
      has_lk: !!playerData.current_lk,
      has_phone: !!playerData.phone,
      source: 'onboarding_step3'
    });
  }

  /**
   * Loggt Team-Auswahl aus Datenbank
   */
  static async logTeamSelectionFromDB(teamData) {
    return this.logActivity('onboarding_team_from_db', 'team', teamData.id, {
      team_name: teamData.category || teamData.team_name,
      club_name: teamData.club_name,
      league: teamData.league,
      season: teamData.season,
      source: 'onboarding_step2'
    });
  }

  /**
   * Loggt manuelle Team-Eingabe
   */
  static async logManualTeamEntry(teamData) {
    return this.logActivity('onboarding_team_manual', 'team', null, {
      team_name: teamData.category,
      club_name: teamData.club_name,
      league: teamData.league,
      team_size: teamData.team_size,
      is_custom: true,
      source: 'onboarding_step2'
    });
  }

  /**
   * Loggt Onboarding-Abschluss (ERWEITERT)
   */
  static async logOnboardingCompletion(playerData, onboardingStats = {}) {
    const result = await this.logActivity('onboarding_completed', 'player', playerData.id, {
      player_name: playerData.name,
      player_lk: playerData.current_lk,
      player_phone: playerData.phone,
      clubs_count: onboardingStats.clubs_count || 0,
      teams_count: onboardingStats.teams_count || 0,
      teams_from_db: onboardingStats.teams_from_db || 0,
      teams_manual: onboardingStats.teams_manual || 0,
      whatsapp_enabled: onboardingStats.whatsapp_enabled || false,
      used_smart_match: onboardingStats.used_smart_match || false,
      imported_player_id: onboardingStats.imported_player_id || null,
      imported_player_name: onboardingStats.imported_player_name || null,
      duration_seconds: onboardingStats.duration_seconds || null,
      source: 'onboarding'
    });

    // Aktualisiere Statistiken
    if (result) {
      await this.updateStat('onboarding_completed');
      await this.updateStat('daily_active_users');
      
      // Smart-Match-Statistik
      if (onboardingStats.used_smart_match) {
        await this.updateStat('smart_match_used');
      }
    }

    return result;
  }

  /**
   * Loggt Admin-Aktionen
   */
  static async logAdminAction(action, entityType, entityId, details = {}) {
    return this.logActivity(`admin_${action}`, entityType, entityId, {
      ...details,
      admin_action: true,
      source: 'super_admin_dashboard'
    });
  }

  /**
   * Loggt Vereins-Genehmigung/Ablehnung
   */
  static async logClubReview(clubId, action, adminNotes = '') {
    const result = await this.logAdminAction(action, 'club', clubId, {
      admin_notes: adminNotes,
      review_action: action
    });

    // Aktualisiere Statistiken
    if (result) {
      await this.updateStat('pending_club_reviews', action === 'approve' ? -1 : 0);
    }

    return result;
  }

  /**
   * Loggt Login-Events
   */
  static async logLogin(userEmail, loginMethod = 'email') {
    return this.logActivity('user_login', 'user', null, {
      user_email: userEmail,
      login_method: loginMethod,
      source: 'login_page'
    });
  }

  /**
   * Loggt Logout-Events
   */
  static async logLogout(userEmail) {
    return this.logActivity('user_logout', 'user', null, {
      user_email: userEmail,
      source: 'app'
    });
  }

  /**
   * Loggt Training-Erstellung
   */
  static async logTrainingCreation(trainingData) {
    return this.logActivity('training_created', 'training', trainingData.id, {
      training_type: trainingData.type,
      is_public: trainingData.is_public,
      is_recurring: trainingData.is_recurring,
      max_players: trainingData.max_players,
      organizer_id: trainingData.organizer_id,
      source: 'training_page'
    });
  }

  /**
   * Loggt Training-Zusage/Absage
   */
  static async logTrainingResponse(trainingId, response, playerId) {
    return this.logActivity(`training_${response}`, 'training', trainingId, {
      response: response, // 'confirm' oder 'decline'
      player_id: playerId,
      source: 'training_page'
    });
  }

  /**
   * Loggt Matchday-Zusage/Absage
   */
  static async logMatchdayResponse(matchId, response, playerId) {
    return this.logActivity(`matchday_${response}`, 'match', matchId, {
      response: response, // 'confirm' oder 'decline'
      player_id: playerId,
      source: 'matches_page'
    });
  }

  /**
   * Loggt Profil-Bearbeitung
   * @param {object} updatedFields - Object mit {fieldName: {old: oldValue, new: newValue}}
   * @param {string} playerId - ID des Spielers
   */
  static async logProfileEdit(updatedFields, playerId) {
    // Extrahiere Änderungen für bessere Lesbarkeit
    const changes = {};
    Object.keys(updatedFields).forEach(field => {
      const change = updatedFields[field];
      changes[field] = {
        old: change.old,
        new: change.new
      };
    });

    return this.logActivity('profile_edited', 'player', playerId, {
      field_count: Object.keys(updatedFields).length,
      changes: changes,
      field_names: Object.keys(updatedFields),
      source: 'profile_page'
    });
  }

  /**
   * Loggt Team-Wechsel
   */
  static async logTeamChange(oldTeamId, newTeamId, playerId) {
    return this.logActivity('team_changed', 'player', playerId, {
      old_team_id: oldTeamId,
      new_team_id: newTeamId,
      source: 'team_management'
    });
  }

  /**
   * Loggt LK-Änderung
   */
  static async logLKChange(oldLK, newLK, playerId) {
    return this.logActivity('lk_changed', 'player', playerId, {
      old_lk: oldLK,
      new_lk: newLK,
      source: 'profile_page'
    });
  }

  /**
   * Loggt Match-Ergebnis-Eingabe
   */
  static async logMatchResult(matchId, resultData, playerId) {
    return this.logActivity('match_result_entered', 'match', matchId, {
      result_data: resultData,
      entered_by: playerId,
      source: 'matchday_results'
    });
  }

  /**
   * Loggt Navigation zwischen Seiten
   */
  static async logPageNavigation(page, previousPage) {
    return this.logActivity('page_navigation', 'navigation', null, {
      current_page: page,
      previous_page: previousPage,
      source: 'app_navigation'
    });
  }

  /**
   * Loggt Fehler-Events
   */
  static async logError(error, context = '') {
    return this.logActivity('error_occurred', 'system', null, {
      error_message: error.message,
      error_stack: error.stack,
      context: context,
      source: 'error_handler'
    });
  }

  // =====================================================
  // Utility-Methoden
  // =====================================================

  /**
   * Prüft ob Logging aktiviert ist
   */
  static isLoggingEnabled() {
    return process.env.NODE_ENV === 'production' || 
           localStorage.getItem('enable_logging') === 'true';
  }

  /**
   * Aktiviert/Deaktiviert Logging für Development
   */
  static setLoggingEnabled(enabled) {
    localStorage.setItem('enable_logging', enabled.toString());
    console.log(`📝 Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Holt alle Logs für einen bestimmten Zeitraum
   */
  static async getLogs(startDate, endDate, actionFilter = null) {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  /**
   * Exportiert Logs als CSV
   */
  static exportLogsAsCSV(logs) {
    if (!logs || logs.length === 0) return '';

    const headers = ['Zeit', 'Benutzer', 'Aktion', 'Entität', 'Details'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.user_email || 'Unbekannt',
        log.action,
        log.entity_type || '',
        JSON.stringify(log.details || {})
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

export { LoggingService };
export default LoggingService;
