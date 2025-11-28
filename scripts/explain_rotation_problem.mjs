/**
 * Erkläre das Rotation-Problem detailliert
 */

import { readFileSync } from 'fs';

const backupData = JSON.parse(readFileSync('tmp/training_backup_2025-11-18.json', 'utf8'));

const rotationList = [
  { name: 'Alexander Elwert', id: '319d0946-bbc8-4746-a300-372a99ddcc44' },
  { name: 'Marc Stoppenbach', id: 'a18c5c2a-2d6b-4e09-89f1-3802238c215e' },
  { name: 'Markus Wilwerscheid', id: null },
  { name: 'Chris Spee', id: '71d0bcd9-1da4-406d-88c2-f3ccc25938df' },
  { name: 'Raoul van Herwijnen', id: 'a869f4e3-6424-423f-9c92-a2895f3f0464' }
];

const playerNames = {
  '319d0946-bbc8-4746-a300-372a99ddcc44': 'Alexander Elwert',
  'a18c5c2a-2d6b-4e09-89f1-3802238c215e': 'Marc Stoppenbach',
  '71d0bcd9-1da4-406d-88c2-f3ccc25938df': 'Chris Spee',
  'a869f4e3-6424-423f-9c92-a2895f3f0464': 'Raoul van Herwijnen',
  '43427aa7-771f-4e47-8858-c8454a1b9fee': 'Volker (Organizer)'
};

const trainings = backupData.sessions
  .filter(t => {
    const trainingDate = new Date(t.date);
    const targetDate = new Date('2025-11-29T13:00:00+00:00');
    return trainingDate <= targetDate;
  })
  .sort((a, b) => new Date(a.date) - new Date(b.date));

console.log('🔍 DETAILLIERTE ROTATION-ANALYSE\n');
console.log('='.repeat(80));
console.log('PROBLEM: Warum soll Alexander Elwert am 29.11. aussetzen?\n');

// Analysiere jedes Training
let currentIndex = 0;

trainings.forEach((training, idx) => {
  const attendance = backupData.attendance.filter(a => a.session_id === training.id);
  const confirmed = attendance.filter(a => a.status === 'confirmed');
  const waitlist = attendance.filter(a => a.status === 'pending' || a.status === 'waitlist');
  const declined = attendance.filter(a => a.status === 'declined');
  
  const confirmedNames = confirmed.map(a => playerNames[a.player_id] || a.player_id).join(', ');
  const waitlistNames = waitlist.map(a => playerNames[a.player_id] || a.player_id).join(', ') || 'keine';
  
  console.log(`\n📅 Training ${idx + 1}: ${new Date(training.date).toLocaleDateString('de-DE')}`);
  console.log(`   Max Players: ${training.max_players}`);
  console.log(`   Confirmed: ${confirmed.length} → ${confirmedNames}`);
  console.log(`   Waitlist: ${waitlist.length} → ${waitlistNames}`);
  console.log(`   Declined: ${declined.length}`);
  
  const oldIndex = currentIndex;
  const expectedSetter = rotationList[oldIndex];
  
  // Aktuelle Logik (FALSCH): Rotiert nur bei ≥5 confirmed
  const shouldRotateOld = confirmed.length >= 5;
  
  // Korrekte Logik: Rotiert nur wenn jemand tatsächlich ausgesetzt hat
  const hasOverbooking = confirmed.length > training.max_players;
  const hasWaitlist = waitlist.length > 0;
  const shouldRotateNew = confirmed.length >= 5 && (hasWaitlist || hasOverbooking);
  
  if (shouldRotateOld) {
    currentIndex = (currentIndex + 1) % 5;
    const newSetter = rotationList[currentIndex];
    
    console.log(`\n   🔄 ROTATION:`);
    console.log(`      Alte Logik (FALSCH): Rotiert weil ≥5 confirmed`);
    console.log(`         Index: ${oldIndex} → ${currentIndex}`);
    console.log(`         ${expectedSetter.name} sollte aussetzen → ${newSetter.name} sollte beim NÄCHSTEN Training aussetzen`);
    
    if (!shouldRotateNew) {
      console.log(`      ⚠️  PROBLEM: Keine Warteliste/Überbuchung! Rotation sollte NICHT stattfinden!`);
      console.log(`         Korrekte Logik: Keine Rotation, Index bleibt ${oldIndex}`);
      console.log(`         ${expectedSetter.name} sollte beim NÄCHSTEN Training aussetzen`);
    } else {
      console.log(`      ✅ Korrekte Logik: Rotation OK (Warteliste/Überbuchung vorhanden)`);
    }
  } else {
    console.log(`\n   ⏸️  Keine Rotation (${confirmed.length} < 5 confirmed)`);
    console.log(`      Index bleibt: ${currentIndex}`);
    console.log(`      ${expectedSetter.name} sollte beim NÄCHSTEN Training aussetzen`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n📌 ZUSAMMENFASSUNG:\n');

const targetTraining = trainings.find(t => {
  const trainingDate = new Date(t.date);
  return trainingDate.toISOString().startsWith('2025-11-29');
});

if (targetTraining) {
  // Berechne mit alter Logik
  let oldIndex = 0;
  trainings.filter(t => new Date(t.date) < new Date(targetTraining.date)).forEach(t => {
    const att = backupData.attendance.filter(a => a.session_id === t.id);
    if (att.filter(a => a.status === 'confirmed').length >= 5) {
      oldIndex = (oldIndex + 1) % 5;
    }
  });
  
  // Berechne mit neuer Logik
  let newIndex = 0;
  trainings.filter(t => new Date(t.date) < new Date(targetTraining.date)).forEach(t => {
    const att = backupData.attendance.filter(a => a.session_id === t.id);
    const confirmed = att.filter(a => a.status === 'confirmed');
    const waitlist = att.filter(a => a.status === 'pending' || a.status === 'waitlist');
    if (confirmed.length >= 5 && (waitlist.length > 0 || confirmed.length > t.max_players)) {
      newIndex = (newIndex + 1) % 5;
    }
  });
  
  console.log(`Für Training am 29.11.25:`);
  console.log(`   Alte Logik (FALSCH): Index ${oldIndex} → ${rotationList[oldIndex].name} sollte aussetzen`);
  console.log(`   Neue Logik (KORREKT): Index ${newIndex} → ${rotationList[newIndex].name} sollte aussetzen`);
  
  // Prüfe: Wer hat bereits ausgesetzt?
  const alexanderId = '319d0946-bbc8-4746-a300-372a99ddcc44';
  const alexanderWaitlist = backupData.attendance.filter(a => 
    a.player_id === alexanderId && 
    (a.status === 'pending' || a.status === 'waitlist') &&
    new Date(backupData.sessions.find(s => s.id === a.session_id)?.date || 0) < new Date('2025-11-29')
  );
  
  console.log(`\n   Alexander Elwert war ${alexanderWaitlist.length}x auf der Warteliste vor dem 29.11.`);
  
  if (alexanderWaitlist.length === 0 && newIndex === 0) {
    console.log(`\n   ✅ KORREKT: Alexander sollte aussetzen (Index 0, noch nie ausgesetzt)`);
  } else if (alexanderWaitlist.length > 0 && newIndex === 0) {
    console.log(`\n   ❌ FEHLER: Alexander hat bereits ausgesetzt, sollte NICHT nochmal aussetzen!`);
  } else {
    console.log(`\n   ⚠️  Unklar: Bitte manuell prüfen`);
  }
}

