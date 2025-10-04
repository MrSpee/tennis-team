// Service für Gegner-Spieler Datenbank
import { supabase } from '../lib/supabaseClient';

class OpponentService {
  // Lade alle Gegner-Teams
  async getOpponentTeams() {
    try {
      const { data, error } = await supabase
        .from('opponent_teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Laden der Gegner-Teams:', error);
      return [];
    }
  }

  // Lade Spieler eines bestimmten Teams
  async getOpponentPlayers(teamTvmId) {
    try {
      const { data, error } = await supabase
        .from('opponent_players')
        .select(`
          *,
          opponent_teams!inner(name, tvm_id)
        `)
        .eq('opponent_teams.tvm_id', teamTvmId)
        .eq('is_active', true)
        .order('lk'); // Nach Leistungsklasse sortieren
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Laden der Gegner-Spieler:', error);
      return [];
    }
  }

  // Lade Spieler nach LK-Bereich
  async getOpponentPlayersByLkRange(teamTvmId, minLk, maxLk) {
    try {
      const { data, error } = await supabase
        .from('opponent_players')
        .select(`
          *,
          opponent_teams!inner(name, tvm_id)
        `)
        .eq('opponent_teams.tvm_id', teamTvmId)
        .eq('is_active', true)
        .gte('lk', minLk)
        .lte('lk', maxLk)
        .order('lk');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Laden der Gegner-Spieler nach LK:', error);
      return [];
    }
  }

  // Suche Spieler nach Name
  async searchOpponentPlayers(teamTvmId, searchTerm) {
    try {
      const { data, error } = await supabase
        .from('opponent_players')
        .select(`
          *,
          opponent_teams!inner(name, tvm_id)
        `)
        .eq('opponent_teams.tvm_id', teamTvmId)
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .order('name');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler bei der Spieler-Suche:', error);
      return [];
    }
  }

  // Füge neues Gegner-Team hinzu
  async addOpponentTeam(teamData) {
    try {
      const { data, error } = await supabase
        .from('opponent_teams')
        .insert([teamData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Gegner-Teams:', error);
      throw error;
    }
  }

  // Füge neuen Gegner-Spieler hinzu
  async addOpponentPlayer(playerData) {
    try {
      const { data, error } = await supabase
        .from('opponent_players')
        .insert([playerData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Gegner-Spielers:', error);
      throw error;
    }
  }

  // Aktualisiere Gegner-Spieler
  async updateOpponentPlayer(playerId, updateData) {
    try {
      const { data, error } = await supabase
        .from('opponent_players')
        .update(updateData)
        .eq('id', playerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Gegner-Spielers:', error);
      throw error;
    }
  }

  // Formatiere Spieler-Name für Display
  formatPlayerName(player) {
    return `${player.name} (LK ${player.lk})`;
  }

  // Formatiere Spieler-Name für Dropdown
  formatPlayerOption(player) {
    return `${player.name} (LK ${player.lk})`;
  }

  // Gruppiere Spieler nach LK-Bereichen
  groupPlayersByLkRange(players) {
    const groups = {
      'LK 8-10': players.filter(p => p.lk >= 8 && p.lk <= 10),
      'LK 11-15': players.filter(p => p.lk >= 11 && p.lk <= 15),
      'LK 16-20': players.filter(p => p.lk >= 16 && p.lk <= 20),
      'LK 21+': players.filter(p => p.lk >= 21)
    };
    
    return groups;
  }
}

export default new OpponentService();

