import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Clock, Award, Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';
import { RoundRobinService } from '../services/roundRobinService';

function RoundRobinExplainer() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { players } = useData();
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [futureTrainingsPreview, setFutureTrainingsPreview] = useState([]);
  const [allAttendanceData, setAllAttendanceData] = useState([]);

  // Lade Trainings mit Attendance
  useEffect(() => {
    const loadTrainings = async () => {
      if (!player?.id) return;
      
      try {
        setLoading(true);
        
        // Hole alle privaten Trainings mit Round-Robin inkl. Attendance
        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('type', 'private')
          .eq('round_robin_enabled', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) throw error;
        
        // Lade Attendance für jedes Training
        if (data && data.length > 0) {
          const trainingsWithAttendance = await Promise.all(
            data.map(async (training) => {
              const { data: attendance } = await supabase
                .from('training_attendance')
                .select('*')
                .eq('session_id', training.id);
              
              return {
                ...training,
                attendance: attendance || []
              };
            })
          );
          
          setTrainings(trainingsWithAttendance);
          
          // Setze erstes Training als Standard
          if (trainingsWithAttendance.length > 0) {
            setSelectedTraining(trainingsWithAttendance[0]);
          }
        } else {
          setTrainings([]);
        }
      } catch (error) {
        console.error('Error loading trainings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrainings();
  }, [player]);

  // Lade attendance-Daten und Training-Sessions für alle Trainings um Statistiken zu berechnen
  const [allTrainingsHistory, setAllTrainingsHistory] = useState([]);
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        // Lade alle Trainings der letzten 90 Tage UND der nächsten 90 Tage!
        // BEIDE: Vergangene UND zukünftige Trainings!
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const ninetyDaysInFuture = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        
        const { data: trainingsData, error: trainingsError } = await supabase
          .from('training_sessions')
          .select('id, date, type, invited_players, title, max_players')
          .gte('date', ninetyDaysAgo.toISOString()) // Letzten 90 Tage
          .lte('date', ninetyDaysInFuture.toISOString()) // Nächsten 90 Tage
          .order('date', { ascending: true });
        
        if (trainingsError) throw trainingsError;
        
        // Lade Attendance für diese Trainings
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('training_attendance')
          .select('*')
          .in('session_id', trainingsData.map(t => t.id));
        
        if (attendanceError) throw attendanceError;
        
        // Verknüpfe Attendance mit Training-Daten
        const enrichedAttendance = (attendanceData || []).map(att => {
          const training = trainingsData.find(t => t.id === att.session_id);
          
          if (!training) {
            return {
              ...att,
              training_date: null
            };
          }
          
          return {
            ...att,
            training_date: training.date
          };
        });
        
        setAllAttendanceData(enrichedAttendance);
        setAllTrainingsHistory(trainingsData || []);
      } catch (error) {
        console.error('Error loading attendance data:', error);
      }
    };
    
    loadAttendanceData();
  }, []);

  // Berechne Round-Robin für ausgewähltes Training
  let roundRobinData = null;
  
  if (selectedTraining) {
    const invitedIds = selectedTraining.invited_players || [];
    
    // Berechne training_stats für jeden Spieler basierend auf attendance-Daten
    // WICHTIG: Füge Organizer automatisch zur Liste hinzu wenn nicht schon dabei
    const allInvitedIds = [...new Set([...invitedIds, selectedTraining.organizer_id])];
    
    // ZENTRALE BERECHNUNG: Verwende RoundRobinService.calculateTrainingStats()
    const trainingGroupWithStats = players
      .filter(p => allInvitedIds.includes(p.id))
      .map(player => {
        const training_stats = RoundRobinService.calculateTrainingStats(player, allAttendanceData);
        
        return {
          ...player,
          training_stats
        };
      });
    
    const trainingWithAttendance = {
      ...selectedTraining,
      attendance: selectedTraining.attendance || []
    };
    
    roundRobinData = RoundRobinService.calculateTrainingParticipants(
      trainingWithAttendance,
      trainingGroupWithStats
    );
  }

  // Berechne potentiell Aussetzende für zukünftige Trainings
  useEffect(() => {
    if (!selectedTraining || !players.length || !allAttendanceData.length) return;
    
    const roundRobinTrainings = trainings.filter(t => 
      t.round_robin_enabled && 
      t.type === 'private' && 
      t.invited_players?.length > 0
    );
    
    const futureTrainings = roundRobinTrainings
      .filter(t => t.id !== selectedTraining.id && new Date(t.date) > new Date(selectedTraining.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
    
    const preview = futureTrainings.map(training => {
      const invitedIds = training.invited_players || [];
      // WICHTIG: Füge Organizer automatisch zur Liste hinzu wenn nicht schon dabei
      const allInvitedIds_future = [...new Set([...invitedIds, training.organizer_id])];
      
      // ZENTRALE BERECHNUNG: Verwende RoundRobinService.calculateTrainingStats()
      const trainingGroupWithStats = players
        .filter(p => allInvitedIds_future.includes(p.id))
        .map(player => {
          const training_stats = RoundRobinService.calculateTrainingStats(player, allAttendanceData);
          
          return {
            ...player,
            training_stats
          };
        });
      
      const trainingWithAttendance = {
        ...training,
        attendance: training.attendance || []
      };
      
      const roundRobinForTraining = RoundRobinService.calculateTrainingParticipants(
        trainingWithAttendance,
        trainingGroupWithStats
      );
      
      const respondedCount = trainingWithAttendance.attendance?.filter(a => a.status === 'confirmed').length || 0;
      const mustSitOut = respondedCount > training.max_players;
      
      return {
        training: training,
        canPlay: roundRobinForTraining.canPlay,
        waitlist: roundRobinForTraining.waitlist,
        mustSitOut: mustSitOut,
        sittingOutPlayers: mustSitOut ? roundRobinForTraining.waitlist : []
      };
    });
    
    setFutureTrainingsPreview(preview);
  }, [selectedTraining, trainings, players, allAttendanceData]);

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Zurück Button */}
      <button
        onClick={() => navigate('/training')}
        style={{
          padding: '0.5rem 1rem',
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}
      >
        <ArrowLeft size={16} />
        Zurück zu Trainings
      </button>

      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700',
          color: '#1f2937',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          🎲 <span>Round-Robin System</span>
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          marginTop: '0.5rem',
          margin: 0
        }}>
          So funktioniert die faire Platzvergabe in deiner Trainingsgruppe
        </p>
      </div>

      {/* 1. RANGLISTE für das nächste Training */}
      {selectedTraining && roundRobinData && (
        <div style={{
          background: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            marginTop: 0,
            marginBottom: '1rem'
          }}>
            📊 Übersicht Trainingsteilnahme
          </h2>
          
          <div style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            {selectedTraining.title} - {new Date(selectedTraining.date).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          
          {/* WICHTIG: Wer muss aussetzen */}
          {roundRobinData.waitlist.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '12px'
            }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: '#92400e',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ⏸️ Diese Spieler müssen aussetzen ({roundRobinData.waitlist.length})
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {roundRobinData.waitlist.map(p => {
                  const player = players.find(pl => pl.id === p.player_id);
                  return (
                    <span key={p.player_id} style={{
                      padding: '0.5rem 0.75rem',
                      background: 'white',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      #{p.position} {player?.name || 'Unbekannt'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {roundRobinData.ranking && roundRobinData.ranking.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: '0.75rem'
            }}>
              {roundRobinData.ranking.map((p, index) => {
                const player = players.find(pl => pl.id === p.player_id);
                const isCanPlay = index < selectedTraining.max_players;
                
                const breakdown = p.priorityBreakdown || {
                  daysSinceLastTraining: 0,
                  declineBonus: 0,
                  randomFactor: 0
                };
                
                return (
                  <div key={p.player_id} style={{
                    padding: '1rem',
                    background: isCanPlay ? '#dcfce7' : '#fef3c7',
                    border: `2px solid ${isCanPlay ? '#10b981' : '#f59e0b'}`,
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: isCanPlay 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '1.2rem',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          #{p.position || index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1f2937', marginBottom: '0.25rem' }}>
                            {player?.name || 'Unbekannt'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            {player?.current_lk || 'LK unbekannt'}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: isCanPlay ? '#10b981' : '#f59e0b',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {isCanPlay ? '✅ Dabei' : '⏳ Warteliste'}
                      </div>
                    </div>
                    
                    {/* Priorität Details */}
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: '#4b5563'
                    }}>
                      <div style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937' }}>
                        📊 Priorität: {p.priority ? `${p.priority.toFixed(2)} Punkte` : '0.00 Punkte'}
                      </div>
                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <div>📅 Teilnahmen: <strong style={{ color: '#059669' }}>{p.player?.training_stats?.total_attended || 0}</strong> • ❌ Absagen vergangen: <strong style={{ color: '#dc2626' }}>{p.player?.training_stats?.total_declined || 0}</strong> {p.player?.training_stats?.future_declined > 0 && <span style={{ color: '#f59e0b' }}>• Zukünftige: {p.player?.training_stats?.future_declined}</span>}</div>
                        <div>🕐 Tage seit letztem Training: <strong style={{ color: '#059669' }}>{Math.floor(breakdown.daysSinceLastTraining)} Tage</strong> {p.player?.training_stats?.total_attended === 0 && '📅 (berechnet ab Saisonstart)'}</div>
                        <div>⏰ Absagen-Bonus: <strong style={{ color: '#059669' }}>+{breakdown.declineBonus.toFixed(1)}</strong></div>
                        <div>🎲 Zufallsfaktor: <strong style={{ color: '#059669' }}>+{breakdown.randomFactor.toFixed(2)}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Noch keine Antworten auf dieses Training
            </div>
          )}
        </div>
      )}

      {/* 2. VORAUSSICHTLICHE ROTATION */}
      {futureTrainingsPreview.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          background: '#fffbeb',
          border: '2px solid #fbbf24',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#92400e',
            marginTop: 0,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔮 Voraussichtliche Rotation bei kommenden Trainings
          </h3>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {futureTrainingsPreview.map((preview, index) => {
              const t = preview.training;
              const sittingOut = preview.sittingOutPlayers || [];
              
              return (
                <div key={t.id} style={{
                  padding: '1rem',
                  background: 'white',
                  border: sittingOut.length > 0 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: sittingOut.length > 0 ? '0.75rem' : 0
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {t.title || 'Privates Training'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        📅 {new Date(t.date).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit',
                          weekday: 'short'
                        })} - ✅ {preview.canPlay.length}/{t.max_players} dabei
                      </div>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: sittingOut.length > 0 ? '#f59e0b' : '#10b981',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      {sittingOut.length > 0 ? `⏸️ ${sittingOut.length} aussetzen` : '✅ Alle können spielen'}
                    </div>
                  </div>

                  {sittingOut.length > 0 && (
                    <div style={{
                      padding: '0.75rem',
                      background: '#fef3c7',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#92400e'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        Wer muss aussetzen:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {sittingOut.map(p => {
                          const pl = players.find(pl => pl.id === p.player_id);
                          return (
                            <span key={p.player_id} style={{
                              padding: '0.4rem 0.6rem',
                              background: 'white',
                              border: '1px solid #f59e0b',
                              borderRadius: '6px',
                              fontWeight: '600',
                              fontSize: '0.75rem'
                            }}>
                              #{p.position} {pl?.name || 'Unbekannt'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. REGELN */}
      <div style={{
        background: '#f0f9ff',
        border: '2px solid #0ea5e9',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#0c4a6e',
          marginTop: 0,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Info size={24} color="#0c4a6e" />
          <span>Die Regeln</span>
        </h2>

        <div style={{
          display: 'grid',
          gap: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0c4a6e', marginBottom: '0.25rem' }}>
                Faires Rotations-System
              </div>
              <div style={{ fontSize: '0.95rem', color: '#374151' }}>
                Alle Spieler deiner Trainingsgruppe werden der Reihe nach eingeladen. 
                Wenn mehr Spieler zusagen als Plätze vorhanden sind, entscheidet die Prioritäts-Punktzahl.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Clock size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0c4a6e', marginBottom: '0.25rem' }}>
                Tage seit letzter Teilnahme
              </div>
              <div style={{ fontSize: '0.95rem', color: '#374151' }}>
                Spieler, die länger nicht beim Training waren, bekommen höhere Priorität. 
                So bekommt jeder Spieler fair die Chance zu trainieren.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Award size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0c4a6e', marginBottom: '0.25rem' }}>
                Prioritäts-Bonus
              </div>
              <div style={{ fontSize: '0.95rem', color: '#374151' }}>
                Wenn du mehrfach absagst, bekommst du einen Bonus bei der nächsten Einladung, 
                um die Teilnahme-Zeiten auszugleichen.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoundRobinExplainer;
