import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Clock, Award, Info } from 'lucide-react';
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
        // Lade alle Trainings der letzten 90 Tage
        const { data: trainingsData, error: trainingsError } = await supabase
          .from('training_sessions')
          .select('id, date, type')
          .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
        
        if (trainingsError) throw trainingsError;
        
        console.log('📅 Loaded trainings:', trainingsData?.length);
        console.log('📅 Sample training:', trainingsData?.[0]);
        
        // Lade Attendance für diese Trainings
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('training_attendance')
          .select('*')
          .in('session_id', trainingsData.map(t => t.id));
        
        if (attendanceError) throw attendanceError;
        
        // Verknüpfe Attendance mit Training-Daten
        const enrichedAttendance = (attendanceData || []).map(att => {
          const training = trainingsData.find(t => t.id === att.session_id);
          
          // WICHTIG: Für die "Tage seit letztem Training"-Berechnung brauchen wir
          // das tatsächliche DATUM des Trainings (nicht response_date)!
          return {
            ...att,
            training_date: training?.date || null,
            // Debug: Zeige Mismatch
            _debug: !training ? 'Training nicht gefunden' : 
                    training?.date && att.response_date && 
                    Math.abs(new Date(training.date).getTime() - new Date(att.response_date).getTime()) > (7 * 24 * 60 * 60 * 1000) ? 'Mismatch!' : 'OK'
          };
        });
        
        console.log('📊 Loaded attendance data:', enrichedAttendance.length);
        console.log('📊 Sample attendance:', enrichedAttendance[0]);
        
        // Finde ein Training vom 25.10.
        const trainingFromOct25 = enrichedAttendance.find(a => a.response_date && a.response_date.includes('2025-10-25'));
        if (trainingFromOct25) {
          console.log('✅ Training vom 25.10 gefunden:', trainingFromOct25);
          console.log('📅 Training date:', trainingFromOct25.training_date);
          console.log('📅 Session ID:', trainingFromOct25.session_id);
          
          // Finde das richtige Training in trainingsData
          const matchingTraining = trainingsData.find(t => t.id === trainingFromOct25.session_id);
          console.log('📅 Matching training:', matchingTraining);
          
          // Finde alle trainings vom 25.10.
          const trainingsOnOct25 = trainingsData.filter(t => t.date && t.date.includes('2025-10-25'));
          console.log('📅 Trainings am 25.10:', trainingsOnOct25);
          
          // Finde das Training wo Chris am 25.10 dabei war
          const attendanceForChris = enrichedAttendance.filter(a => a.player_id === '43427aa7-771f-4e47-8858-c8454a1b9fee' && a.response_date && a.response_date.includes('2025-10-25'));
          console.log('🔍 Chris Attendance am 25.10:', attendanceForChris);
        }
        
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
    const trainingGroupWithStats = players
      .filter(p => invitedIds.includes(p.id))
      .map(player => {
        const playerAttendance = allAttendanceData.filter(a => a.player_id === player.id);
        
        // Berechne Statistiken
        const total_attended = playerAttendance.filter(a => a.status === 'confirmed').length;
        const total_declined = playerAttendance.filter(a => a.status === 'declined').length;
        
        // Sortiere nach Training-Datum (nicht response_date!)
        const confirmedAttendances = playerAttendance
          .filter(a => a.status === 'confirmed' && a.training_date)
          .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
        const last_attended = confirmedAttendances.length > 0 ? confirmedAttendances[0].training_date : null;
        
        // Debug: Zeige letztes Training
        if (player.name === 'Chris Spee' || player.name === 'Markus Wilwerscheid') {
          console.log(`🔍 ${player.name}:`, {
            last_attended,
            total_attended,
            total_declined,
            confirmedAttendances: confirmedAttendances.length,
            allAttendance: playerAttendance.length
          });
          
          if (last_attended) {
            const daysSince = (Date.now() - new Date(last_attended).getTime()) / (1000 * 60 * 60 * 24);
            console.log(`🔍 ${player.name} - Days since last:`, daysSince.toFixed(1));
          }
        }
        
        // Letzte Antwort (sortiert nach Training-Datum)
        const sortedAttendance = playerAttendance
          .filter(a => a.training_date)
          .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
        const last_response = sortedAttendance.length > 0 ? sortedAttendance[0].status : null;
        
        // Berechne consecutive_declines (nach Training-Datum sortiert)
        let consecutive_declines = 0;
        const recentResponses = playerAttendance
          .filter(a => a.training_date)
          .sort((a, b) => new Date(b.training_date) - new Date(a.training_date))
          .slice(0, 3);
        
        for (const response of recentResponses) {
          if (response.status === 'declined') {
            consecutive_declines++;
          } else {
            break;
          }
        }
        
        return {
          ...player,
          training_stats: {
            total_attended,
            total_declined,
            last_attended,
            last_response,
            consecutive_declines
          }
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
      
      // Berechne training_stats für jeden Spieler (wie oben)
      const trainingGroupWithStats = players
        .filter(p => invitedIds.includes(p.id))
        .map(player => {
          const playerAttendance = allAttendanceData.filter(a => a.player_id === player.id);
          
          const total_attended = playerAttendance.filter(a => a.status === 'confirmed').length;
          const total_declined = playerAttendance.filter(a => a.status === 'declined').length;
          
          // Sortiere nach Training-Datum (nicht response_date!)
          const confirmedAttendances = playerAttendance
            .filter(a => a.status === 'confirmed' && a.training_date)
            .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
          const last_attended = confirmedAttendances.length > 0 ? confirmedAttendances[0].training_date : null;
          
          // Letzte Antwort (sortiert nach Training-Datum)
          const sortedAttendance = playerAttendance
            .filter(a => a.training_date)
            .sort((a, b) => new Date(b.training_date) - new Date(a.training_date));
          const last_response = sortedAttendance.length > 0 ? sortedAttendance[0].status : null;
          
          // Berechne consecutive_declines (nach Training-Datum sortiert)
          let consecutive_declines = 0;
          const recentResponses = playerAttendance
            .filter(a => a.training_date)
            .sort((a, b) => new Date(b.training_date) - new Date(a.training_date))
            .slice(0, 3);
          
          for (const response of recentResponses) {
            if (response.status === 'declined') {
              consecutive_declines++;
            } else {
              break;
            }
          }
          
          return {
            ...player,
            training_stats: {
              total_attended,
              total_declined,
              last_attended,
              last_response,
              consecutive_declines
            }
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
                        <div>📅 Teilnahmen: <strong style={{ color: '#059669' }}>{p.player?.training_stats?.total_attended || 0}</strong> • ❌ Absagen: <strong style={{ color: '#dc2626' }}>{p.player?.training_stats?.total_declined || 0}</strong></div>
                        <div>🕐 Tage seit letztem Training: <strong style={{ color: '#059669' }}>{breakdown.daysSinceLastTraining.toFixed(1)} Tage</strong> {p.player?.name === 'Chris Spee' && breakdown.daysSinceLastTraining > 1000 && '⚠️ Fallsback (nie dabei?)'}</div>
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
