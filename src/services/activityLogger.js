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
      // Prüfe ob Logging möglich ist
      if (!(await this.canLog())) {
        console.log('⚠️ Logging skipped (Supabase not configured or user not authenticated):', action);
        return null;
      }
      // Erweitere Details um Browser-Info
      const enhancedDetails = {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      };

      // Verwende Supabase RPC-Funktion
      const { data, error } = await supabase.rpc('log_activity', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_details: enhancedDetails
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
   * Loggt Onboarding-Abschluss
   */
  static async logOnboardingCompletion(playerData) {
    const result = await this.logActivity('onboarding_completed', 'player', playerData.id, {
      clubs_count: playerData.clubs?.length || 0,
      teams_count: playerData.teams?.length || 0,
      whatsapp_enabled: playerData.whatsapp_enabled || false,
      source: 'onboarding'
    });

    // Aktualisiere Statistiken
    if (result) {
      await this.updateStat('onboarding_completed');
      await this.updateStat('daily_active_users');
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
   */
  static async logProfileEdit(updatedFields, playerId) {
    return this.logActivity('profile_edited', 'player', playerId, {
      updated_fields: Object.keys(updatedFields),
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
