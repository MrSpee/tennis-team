import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Check, X, Clock } from 'lucide-react';

export default function TeamSelector({ onTeamsUpdated }) {
  const { player } = useAuth();
  const [availableTeams, setAvailableTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  useEffect(() => {
    loadTeams();
  }, [player]);

  const loadTeams = async () => {
    if (!player) return;

    try {
      setLoading(true);

      // Lade alle Teams
      const { data: allTeams, error: teamsError } = await supabase
        .from('team_info')
        .select('*')
        .order('club_name', { ascending: true });

      if (teamsError) throw teamsError;

      // Lade meine Team-Zuordnungen
      const { data: myTeamData, error: myTeamsError } = await supabase
        .from('team_memberships')
        .select(`
          *,
          team_info!inner (
            id,
            team_name,
            club_name,
            category
          )
        `)
        .eq('player_id', player.id)
        .eq('is_active', true);

      if (myTeamsError) throw myTeamsError;

      setMyTeams(myTeamData || []);
      setAvailableTeams(allTeams || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!selectedTeamId || !player) return;

    try {
      // SCHRITT 1: Prüfe ob Membership bereits existiert (auch inactive)
      const { data: existing, error: checkError } = await supabase
        .from('team_memberships')
        .select('id, is_active')
        .eq('player_id', player.id)
        .eq('team_id', selectedTeamId)
        .eq('season', 'Winter 2025/26')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // SCHRITT 2A: Membership existiert → UPDATE statt INSERT
        console.log('📝 Membership exists, updating to active:', existing.id);
        
        const { error } = await supabase
          .from('team_memberships')
          .update({
            is_active: true,
            is_primary: myTeams.length === 0,
            role: 'player'
          })
          .eq('id', existing.id);

        if (error) throw error;
        
        alert('✅ Du wurdest wieder zum Team hinzugefügt!');
      } else {
        // SCHRITT 2B: Membership existiert nicht → INSERT
        console.log('➕ Creating new membership');
        
        const { error } = await supabase
          .from('team_memberships')
          .insert({
            player_id: player.id,
            team_id: selectedTeamId,
            is_active: true,
            is_primary: myTeams.length === 0,
            role: 'player',
            season: 'Winter 2025/26'
          });

        if (error) throw error;
        
        alert('✅ Du wurdest erfolgreich zum Team hinzugefügt!');
      }

      setShowAddModal(false);
      setSelectedTeamId('');
      loadTeams();
      
      if (onTeamsUpdated) {
        onTeamsUpdated();
      }
    } catch (error) {
      console.error('Error joining team:', error);
      alert('❌ Fehler beim Beitreten: ' + error.message);
    }
  };

  const handleSetPrimary = async (teamId) => {
    try {
      // Setze alle auf false
      await supabase
        .from('team_memberships')
        .update({ is_primary: false })
        .eq('player_id', player.id);

      // Setze ausgewähltes Team auf true
      await supabase
        .from('team_memberships')
        .update({ is_primary: true })
        .eq('player_id', player.id)
        .eq('team_id', teamId);

      loadTeams();
      
      if (onTeamsUpdated) {
        onTeamsUpdated();
      }
    } catch (error) {
      console.error('Error setting primary team:', error);
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!confirm('Möchtest du dieses Team wirklich verlassen?')) return;

    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ is_active: false })
        .eq('player_id', player.id)
        .eq('team_id', teamId);

      if (error) throw error;

      alert('✅ Du hast das Team verlassen');
      loadTeams();
      
      if (onTeamsUpdated) {
        onTeamsUpdated();
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('❌ Fehler beim Verlassen: ' + error.message);
    }
  };

  const getTeamStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✅ Aktiv</span>;
      case 'pending':
        return <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}><Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />Ausstehend</span>;
      case 'rejected':
        return <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>❌ Abgelehnt</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div>Lade Teams...</div>;
  }

  const myTeamIds = myTeams.map(t => t.team_info?.id).filter(Boolean);
  const teamsToJoin = availableTeams.filter(t => !myTeamIds.includes(t.id));

  return (
    <div className="team-selector">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
          🏆 Meine Teams ({myTeams.length})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          Team beitreten
        </button>
      </div>

      {/* Meine Teams */}
      {myTeams.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myTeams.map(({ id, team_info: team, is_primary, role }) => (
            <div
              key={id}
              style={{
                padding: '1rem',
                border: is_primary ? '2px solid #10b981' : '2px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: is_primary ? '#f0fdf4' : 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    {team.club_name} - {team.team_name}
                  </h4>
                  {is_primary && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Primär
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {team?.category} • {role}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!is_primary && (
                  <button
                    onClick={() => handleSetPrimary(team?.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  >
                    Als Primär setzen
                  </button>
                )}
                <button
                  onClick={() => handleLeaveTeam(team?.id)}
                  className="btn-danger"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                >
                  Verlassen
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fbbf24'
        }}>
          <Users size={48} style={{ margin: '0 auto 1rem', color: '#92400e' }} />
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
            Du bist noch keinem Team zugeordnet. Klicke auf "Team beitreten" um loszulegen!
          </p>
        </div>
      )}

      {/* Team beitreten Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem', fontWeight: '700' }}>
              🏆 Team beitreten
            </h3>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
                Wähle ein Team:
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Bitte wählen...</option>
                {teamsToJoin.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.club_name} - {team.team_name} ({team.category})
                  </option>
                ))}
              </select>
            </div>

            {teamsToJoin.length === 0 && (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Du bist bereits allen verfügbaren Teams zugeordnet.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={handleJoinTeam}
                className="btn-primary"
                disabled={!selectedTeamId}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Check size={16} />
                Beitreten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

