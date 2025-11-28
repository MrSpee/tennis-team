/**
 * Analysiere die Rotation-Logik für das Training am 29.11.25
 * 
 * Problem: Warum soll Alexander Elwert aussetzen, obwohl er bereits ausgesetzt hat?
 */

import { readFileSync } from 'fs';

// Lade Backup-Daten
const backupData = JSON.parse(readFileSync('tmp/training_backup_2025-11-18.json', 'utf8'));

// Rotation-Liste (wie in Training.jsx definiert)
const rotationList = [
  { name: 'Alexander Elwert', id: '319d0946-bbc8-4746-a300-372a99ddcc44' },
  { name: 'Marc Stoppenbach', id: 'a18c5c2a-2d6b-4e09-89f1-3802238c215e' },
  { name: 'Markus Wilwerscheid', id: null }, // Nicht in den Daten gefunden
  { name: 'Chris Spee', id: '71d0bcd9-1da4-406d-88c2-f3ccc25938df' },
  { name: 'Raoul van Herwijnen', id: 'a869f4e3-6424-423f-9c92-a2895f3f0464' }
];

// Spieler-Mapping für bessere Lesbarkeit
const playerNames = {
  '319d0946-bbc8-4746-a300-372a99ddcc44': 'Alexander Elwert',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e': 'Marc Stoppenbach',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df': 'Chris Spee',
  'a869f4e3-6424-423f-9c92-a2895f3f0464': 'Raoul van Herwijnen',
  '43427aa7-771f-4e47-8858-c8454a1b9fee': 'Volker (Organizer)'
};

// Sortiere Trainings nach Datum
const trainings = backupData.sessions
  .filter(t => {
    const trainingDate = new Date(t.date);
    const targetDate = new Date('2025-11-29T13:00:00+00:00');
    return trainingDate <= targetDate;
  })
  .sort((a, b) => new Date(a.date) - new Date(b.date));

console.log('📊 ROTATION-ANALYSE für Training am 29.11.25\n');
console.log('Rotation-Liste:');
rotationList.forEach((p, idx) => {
  console.log(`  ${idx}: ${p.name} (${p.id || 'KEINE ID'})`);
});
console.log('\n');

// Funktion: Berechne Rotation-Index (wie in Training.jsx)
function calculateRotationIndexForTraining(targetTraining, allTrainings) {
  const beforeTrainings = allTrainings.filter(t => new Date(t.date) < new Date(targetTraining.date));
  
  let currentIndex = 0;
  
  console.log(`\n🔄 Berechne Rotation für Training am ${new Date(targetTraining.date).toLocaleDateString('de-DE')}:`);
  console.log(`   ${beforeTrainings.length} Trainings vor diesem Training\n`);
  
  beforeTrainings.forEach((prevTraining, idx) => {
    const prevAttendance = backupData.attendance.filter(a => a.session_id === prevTraining.id);
    const prevConfirmed = prevAttendance.filter(a => a.status === 'confirmed');
    const prevWaitlist = prevAttendance.filter(a => a.status === 'pending' || a.status === 'waitlist');
    const prevDeclined = prevAttendance.filter(a => a.status === 'declined');
    
    const confirmedNames = prevConfirmed.map(a => playerNames[a.player_id] || a.player_id).join(', ');
    const waitlistNames = prevWaitlist.map(a => playerNames[a.player_id] || a.player_id).join(', ') || 'keine';
    
    console.log(`   Training ${idx + 1}: ${new Date(prevTraining.date).toLocaleDateString('de-DE')}`);
    console.log(`     Max Players: ${prevTraining.max_players}`);
    console.log(`     Confirmed: ${prevConfirmed.length} (${confirmedNames})`);
    console.log(`     Pending/Waitlist: ${prevWaitlist.length} (${waitlistNames})`);
    console.log(`     Declined: ${prevDeclined.length}`);
    
    const oldIndex = currentIndex;
    
    // WICHTIG: Rotation nur wenn:
    // 1. ≥5 confirmed UND
    // 2. Jemand tatsächlich auf Warteliste war ODER confirmed > max_players
    const hasOverbooking = prevConfirmed.length > prevTraining.max_players;
    const hasWaitlist = prevWaitlist.length > 0;
    
    if (prevConfirmed.length >= 5 && (hasWaitlist || hasOverbooking)) {
      currentIndex = (currentIndex + 1) % 5;
      const setter = rotationList[currentIndex];
      console.log(`     ✅ ≥5 confirmed + Warteliste/Überbuchung → Rotation! Index: ${oldIndex} → ${currentIndex} (${setter.name} würde aussetzen)`);
    } else if (prevConfirmed.length >= 5) {
      console.log(`     ⚠️  ≥5 confirmed, aber KEINE Warteliste → Keine Rotation (alle konnten spielen)`);
    } else {
      console.log(`     ⏸️  <5 confirmed → Keine Rotation. Index bleibt: ${currentIndex}`);
    }
    console.log('');
  });
  
  return currentIndex;
}

// Finde Training am 29.11.
const targetTraining = trainings.find(t => {
  const trainingDate = new Date(t.date);
  const targetDate = new Date('2025-11-29T13:00:00+00:00');
  return trainingDate.toISOString().startsWith('2025-11-29');
});

if (!targetTraining) {
  console.error('❌ Training am 29.11. nicht gefunden!');
  process.exit(1);
}

// Berechne Rotation-Index
const rotationIndex = calculateRotationIndexForTraining(targetTraining, trainings);
const setter = rotationList[rotationIndex];

console.log(`\n📌 ERGEBNIS für Training am 29.11.25:`);
console.log(`   Rotation-Index: ${rotationIndex}`);
console.log(`   Aussetzer: ${setter.name} (${setter.id || 'KEINE ID'})`);

// Prüfe tatsächliche Anmeldungen
const targetAttendance = backupData.attendance.filter(a => a.session_id === targetTraining.id);
const targetConfirmed = targetAttendance.filter(a => a.status === 'confirmed');
const targetWaitlist = targetAttendance.filter(a => a.status === 'pending' || a.status === 'waitlist');

console.log(`\n📋 Tatsächliche Anmeldungen für 29.11.:`);
console.log(`   Confirmed: ${targetConfirmed.length}`);
targetConfirmed.forEach(a => {
  const name = playerNames[a.player_id] || a.player_id;
  console.log(`     - ${name} (${a.player_id})`);
});

console.log(`\n   Pending/Waitlist: ${targetWaitlist.length}`);
targetWaitlist.forEach(a => {
  const name = playerNames[a.player_id] || a.player_id;
  console.log(`     - ${name} (${a.player_id})`);
});

// Prüfe: Wer hat bereits ausgesetzt?
console.log(`\n🔍 HISTORISCHE AUSSETZER-ANALYSE:`);
const allTrainingsWith5Plus = trainings.filter(t => {
  const att = backupData.attendance.filter(a => a.session_id === t.id);
  return att.filter(a => a.status === 'confirmed').length >= 5;
});

console.log(`   Trainings mit ≥5 confirmed: ${allTrainingsWith5Plus.length}`);
allTrainingsWith5Plus.forEach((t, idx) => {
  const att = backupData.attendance.filter(a => a.session_id === t.id);
  const confirmed = att.filter(a => a.status === 'confirmed');
  const waitlist = att.filter(a => a.status === 'pending' || a.status === 'waitlist');
  
  console.log(`\n   ${idx + 1}. ${new Date(t.date).toLocaleDateString('de-DE')}:`);
  console.log(`      Confirmed (${confirmed.length}): ${confirmed.map(a => playerNames[a.player_id] || a.player_id).join(', ')}`);
  if (waitlist.length > 0) {
    console.log(`      Waitlist (${waitlist.length}): ${waitlist.map(a => playerNames[a.player_id] || a.player_id).join(', ')}`);
  }
});

// Prüfe: Hat Alexander Elwert bereits ausgesetzt?
console.log(`\n🔍 HAT ALEXANDER ELWERT BEREITS AUSGESETZT?`);
const alexanderId = '319d0946-bbc8-4746-a300-372a99ddcc44';
const alexanderWaitlist = backupData.attendance.filter(a => 
  a.player_id === alexanderId && 
  (a.status === 'pending' || a.status === 'waitlist') &&
  new Date(backupData.sessions.find(s => s.id === a.session_id)?.date || 0) < new Date('2025-11-29')
);

if (alexanderWaitlist.length > 0) {
  console.log(`   ✅ JA! Alexander war ${alexanderWaitlist.length}x auf der Warteliste:`);
  alexanderWaitlist.forEach(a => {
    const training = backupData.sessions.find(s => s.id === a.session_id);
    if (training) {
      console.log(`      - ${new Date(training.date).toLocaleDateString('de-DE')}: Status ${a.status}`);
    }
  });
} else {
  console.log(`   ❌ NEIN - Alexander war noch nie auf der Warteliste vor dem 29.11.`);
}

