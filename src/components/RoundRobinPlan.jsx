import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabaseClient';

/**
 * EINFACHES ROUND-ROBIN SYSTEM
 * 
 * Logik:
 * - Ab 01.11.2025: 24 Trainingstermine (jeden Mittwoch)
 * - Bei ≥5 Anmeldungen: Ein Spieler muss aussetzen
 * - Bei <5 Anmeldungen: Kein Aussetzer, rutscht eine Woche
 * - Rotation: 4 Spieler rotieren durch
 */

function RoundRobinPlan() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const { players } = useData();
  
  const [trainingDates, setTrainingDates] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rotation-Liste (fest definiert)
  const [rotationList, setRotationList] = useState([
    { name: 'Alexander Elwert', id: null },
    { name: 'Marc Stoppenbach', id: null },
    { name: 'Markus Wilwerscheid', id: null },
    { name: 'Chris Spee', id: null },
    { name: 'Raoul van Herwijnen', id: null }
  ]);
  
  // Lade Spieler-IDs für Rotation
  useEffect(() => {
    if (players && players.length > 0) {
      setRotationList(prev => {
        const updated = prev.map(rotPlayer => {
          // Suche nach exaktem Namen (case-insensitive)
          let found = players.find(p => p.name && p.name.toLowerCase().trim() === rotPlayer.name.toLowerCase().trim());
          
          // Falls nicht gefunden, versuche Fuzzy-Match (enthält den Namen)
          if (!found) {
            found = players.find(p => p.name && 
              (p.name.toLowerCase().includes(rotPlayer.name.toLowerCase()) || 
               rotPlayer.name.toLowerCase().includes(p.name.toLowerCase()))
            );
          }
          
          if (!found) {
            console.warn(`⚠️ RoundRobinPlan: Spieler "${rotPlayer.name}" nicht in players-Liste gefunden!`);
          } else {
            console.log(`✅ RoundRobinPlan: "${rotPlayer.name}" → ID: ${found.id} (${found.name})`);
          }
          
          return found ? { ...rotPlayer, id: found.id } : rotPlayer;
        });
        
        // Filtere Spieler ohne ID aus und warne
        const playersWithoutId = updated.filter(p => !p.id);
        if (playersWithoutId.length > 0) {
          console.warn(`⚠️ RoundRobinPlan: ${playersWithoutId.length} Spieler ohne ID gefunden:`, 
            playersWithoutId.map(p => p.name).join(', '));
          console.warn(`⚠️ Diese Spieler werden in der Rotation übersprungen!`);
        }
        
        return updated;
      });
    } else {
      console.warn('⚠️ RoundRobinPlan: players-Liste ist leer oder nicht geladen!');
    }
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Generiere 24 Trainingstermine ab 01.11.2025 (jeden Mittwoch)
  const generateTrainingDates = () => {
    const startDate = new Date('2025-11-01');
    const dates = [];
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 7));
      dates.push(date);
    }
    
    return dates;
  };
  
  // Lade Attendance-Daten für alle Trainings
  useEffect(() => {
    const loadData = async () => {
      if (!player?.id) return;
      
      try {
        setLoading(true);
        
        const dates = generateTrainingDates();
        setTrainingDates(dates);
        
        // Lade alle Trainings im Zeitraum
        const startDate = dates[0].toISOString();
        const endDate = new Date(dates[dates.length - 1]);
        endDate.setDate(endDate.getDate() + 7);
        
        const { data: trainingsData, error: trainingsError } = await supabase
          .from('training_sessions')
          .select('*')
          .gte('date', startDate)
          .lt('date', endDate.toISOString())
          .order('date', { ascending: true });
        
        if (trainingsError) throw trainingsError;
        setTrainings(trainingsData || []);
        
        // Lade Attendance für alle Trainings
        if (trainingsData && trainingsData.length > 0) {
          const trainingIds = trainingsData.map(t => t.id);
          
          const { data: attendance, error: attendanceError } = await supabase
            .from('training_attendance')
            .select('*')
            .in('session_id', trainingIds);
          
          if (attendanceError) throw attendanceError;
          
          setAttendanceData(attendance || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [player]);
  
  // Berechne für jeden Termin: Wer muss aussetzen?
  const calculateRotation = () => {
    let currentRotationIndex = 0;
    const plan = [];
    
    trainingDates.forEach((date, dateIndex) => {
      // Finde entsprechendes Training an diesem Datum
      const trainingMatch = trainings.find(t => {
        const trainingDate = new Date(t.date);
        const targetDate = new Date(date);
        return trainingDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
      });
      
      // Zähle confirmed-Anmeldungen für dieses Training
      let confirmedCount = 0;
      if (trainingMatch) {
        confirmedCount = attendanceData.filter(a => 
          a.session_id === trainingMatch.id && a.status === 'confirmed'
        ).length;
      }
      
      const currentSetter = rotationList[currentRotationIndex];
      const shouldSitOut = confirmedCount >= 5;
      
      plan.push({
        date,
        dateIndex,
        currentRotationIndex,
        setter: shouldSitOut ? currentSetter : null,
        confirmedCount,
        status: shouldSitOut ? 'set' : 'skipped',
        trainingId: trainingMatch?.id,
        nextIndex: shouldSitOut ? ((currentRotationIndex + 1) % 5) : currentRotationIndex
      });
      
      // Rotation nur bei ≥5 Anmeldungen
      if (shouldSitOut) {
        currentRotationIndex = (currentRotationIndex + 1) % 5;
      }
    });
    
    return plan;
  };
  
  const rotationPlan = calculateRotation();
  
  if (loading) {
    return (
      <div className="dashboard container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
          <p>Lade Aussetzen-Plan...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard container">
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

      <div style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
        <h1 className="hi">🎲 Wartelisten Organisation</h1>
        <p style={{ fontSize: '1rem', color: '#6b7280', marginTop: '0.5rem' }}>
          24 Trainingstermine ab 01.11.2025 - Faire Rotation
        </p>
      </div>
      
      {/* Regel-Info */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#1e40af' }}>
          📋 Die Regel
        </h3>
        <div style={{ fontSize: '0.95rem', color: '#1e40af', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            <strong>Bei ≥5 Anmeldungen:</strong> Ein Spieler muss aussetzen (Rotation läuft weiter)
          </p>
          <p style={{ margin: 0 }}>
            <strong>Bei &lt;5 Anmeldungen:</strong> Kein Aussetzer (Rotation bleibt stehen)
          </p>
        </div>
      </div>
      
      {/* Rotation-Plan Table - Mobile optimized */}
      <div style={{
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {/* Desktop Table */}
        <div style={{ display: 'block', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                  Woche
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                  Datum
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                  Anmeld.
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                  Aussetzer
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rotationPlan.map((plan, index) => (
                <tr key={index} style={{
                  borderBottom: index < rotationPlan.length - 1 ? '1px solid #f3f4f6' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', color: '#1f2937' }}>
                    {index + 1}/24
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#4b5563' }}>
                    {plan.date.toLocaleDateString('de-DE', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '600', color: '#6b7280' }}>
                    {plan.confirmedCount}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    {plan.setter ? (
                      <span style={{ 
                        color: plan.date < new Date() ? '#059669' : '#f59e0b'
                      }}>
                        {plan.setter.name.split(' ')[0]}
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Aussetzer: {(() => {
                            const playersWithId = rotationList.filter(p => p.id !== null && p.id !== undefined);
                            const rotationSize = playersWithId.length || 5;
                            const currentPlayer = playersWithId.length > 0 
                              ? playersWithId[plan.currentRotationIndex % playersWithId.length]
                              : rotationList[plan.currentRotationIndex];
                            return currentPlayer?.name.split(' ')[0] || 'N/A';
                          })()}
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Nächster: {(() => {
                            const playersWithId = rotationList.filter(p => p.id !== null && p.id !== undefined);
                            const rotationSize = playersWithId.length || 5;
                            const nextIndex = (plan.currentRotationIndex + 1) % rotationSize;
                            const nextPlayer = playersWithId.length > 0 
                              ? playersWithId[nextIndex % playersWithId.length]
                              : rotationList[nextIndex];
                            return nextPlayer?.name.split(' ')[0] || 'N/A';
                          })()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {plan.status === 'set' ? (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        ⏸️
                      </span>
                    ) : (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#dcfce7',
                        color: '#065f46',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        ⏩
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Info */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280', textAlign: 'center' }}>
          💡 Dieser Plan aktualisiert sich automatisch, sobald sich Spieler anmelden oder abmelden
        </p>
      </div>
    </div>
  );
}

export default RoundRobinPlan;

