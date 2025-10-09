# 🎾 Team-Training System - Konzept

## 🎯 Problem-Analyse

### Aktuelle Situation:
- ❌ Keine Zuordnung zu Team/Verein beim Training-Erstellen
- ❌ Spieler in mehreren Teams können nicht unterscheiden
- ❌ Keine Möglichkeit, externe Spieler per E-Mail einzuladen
- ❌ Nur App-Nutzer können eingeladen werden

### Ziel:
- ✅ Team-Training wird einem spezifischen Team zugeordnet
- ✅ Nur Spieler dieses Teams sehen und können teilnehmen
- ✅ Spieler können per E-Mail eingeladen werden (auch ohne App)
- ✅ Automatische Einladung aller Team-Mitglieder (optional)

---

## 📋 Konzept: Team-Training System

### 1️⃣ **Training-Erstellung - Neue Felder**

#### A) **Team-Auswahl** (nur bei `type: 'team'`)
```javascript
// Zeige alle Teams des Organisators
const userTeams = player_teams
  .filter(pt => pt.player_id === currentUser.id)
  .map(pt => ({
    id: pt.team_id,
    name: team_info.teamName,
    club: team_info.clubName,
    category: team_info.category
  }));

// UI:
┌─────────────────────────────────────────────┐
│ 🏆 Team (für das trainiert wird)           │
├─────────────────────────────────────────────┤
│ ▼ VKC Sürth - Herren 40 (1. Kreisliga)     │
│   TC Köln - Herren 30 (Bezirksliga)        │
└─────────────────────────────────────────────┘
```

#### B) **Einladungs-System**
```javascript
// Drei Modi:
1. "Alle Team-Mitglieder" (Default) - automatisch
2. "Bestimmte Spieler auswählen" - manuell aus Team
3. "Externe Spieler einladen" - E-Mail Einladungen

// UI:
┌─────────────────────────────────────────────┐
│ 👥 Einladungen                              │
├─────────────────────────────────────────────┤
│ ○ Alle Team-Mitglieder (12 Spieler)        │
│ ● Bestimmte Spieler auswählen              │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ ☑ Chris Spee (LK 12.3)              │   │
│ │ ☑ Roland Reifen (LK 16.5)           │   │
│ │ ☐ Thomas Mengelkamp (LK 11.5)       │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ 📧 Externe Spieler per E-Mail einladen:    │
│ ┌─────────────────────────────────────┐   │
│ │ max@example.com                      │   │
│ │ anna@example.com                     │   │
│ └─────────────────────────────────────┘   │
│ + E-Mail hinzufügen                        │
└─────────────────────────────────────────────┘
```

---

### 2️⃣ **Datenbank-Schema - Erweiterungen**

#### A) **training_sessions Tabelle**
```sql
ALTER TABLE training_sessions
ADD COLUMN team_id UUID REFERENCES team_info(id) ON DELETE CASCADE,
ADD COLUMN invitation_mode VARCHAR(50) DEFAULT 'all_team_members';
-- invitation_mode: 'all_team_members', 'selected_players', 'custom'

-- Index für Performance
CREATE INDEX idx_training_sessions_team_id ON training_sessions(team_id);
```

#### B) **training_invitations Tabelle** (NEU)
```sql
CREATE TABLE training_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  
  -- Entweder player_id (für App-Nutzer) oder email (für Externe)
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  email VARCHAR(255),
  
  -- Einladungs-Details
  invited_by UUID REFERENCES players(id) ON DELETE SET NULL,
  invited_at TIMESTAMP DEFAULT NOW(),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- Status: 'pending', 'accepted', 'declined', 'maybe'
  
  -- E-Mail Token für externe Einladungen
  invitation_token VARCHAR(255) UNIQUE,
  token_expires_at TIMESTAMP,
  
  -- Antwort-Details
  responded_at TIMESTAMP,
  response_note TEXT,
  
  CONSTRAINT unique_invitation UNIQUE(training_session_id, player_id),
  CONSTRAINT unique_email_invitation UNIQUE(training_session_id, email),
  CONSTRAINT player_or_email CHECK (
    (player_id IS NOT NULL AND email IS NULL) OR 
    (player_id IS NULL AND email IS NOT NULL)
  )
);

CREATE INDEX idx_training_invitations_session ON training_invitations(training_session_id);
CREATE INDEX idx_training_invitations_player ON training_invitations(player_id);
CREATE INDEX idx_training_invitations_token ON training_invitations(invitation_token);
```

#### C) **training_attendance - Erweitern**
```sql
-- Bestehende Tabelle erweitern für externe Teilnehmer
ALTER TABLE training_attendance
ADD COLUMN guest_email VARCHAR(255),
ADD COLUMN guest_name VARCHAR(255);

-- Constraint: Entweder player_id oder guest_email
ALTER TABLE training_attendance
ADD CONSTRAINT player_or_guest CHECK (
  (player_id IS NOT NULL AND guest_email IS NULL) OR 
  (player_id IS NULL AND guest_email IS NOT NULL)
);
```

---

### 3️⃣ **Logik-Flow**

#### A) **Training erstellen**
```javascript
async function createTeamTraining(formData) {
  // 1. Training erstellen
  const training = await supabase
    .from('training_sessions')
    .insert({
      ...formData,
      team_id: formData.selectedTeamId,
      invitation_mode: formData.invitationMode
    })
    .select()
    .single();

  // 2. Einladungen erstellen
  if (formData.invitationMode === 'all_team_members') {
    // Alle Team-Mitglieder einladen
    const teamMembers = await getTeamMembers(formData.selectedTeamId);
    await createInvitations(training.id, teamMembers);
  } else if (formData.invitationMode === 'selected_players') {
    // Nur ausgewählte Spieler einladen
    await createInvitations(training.id, formData.selectedPlayers);
  }

  // 3. Externe E-Mail-Einladungen
  if (formData.externalEmails?.length > 0) {
    await createEmailInvitations(training.id, formData.externalEmails);
  }

  return training;
}
```

#### B) **E-Mail-Einladungen versenden**
```javascript
async function createEmailInvitations(trainingId, emails) {
  for (const email of emails) {
    // 1. Token generieren
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage

    // 2. Einladung speichern
    await supabase
      .from('training_invitations')
      .insert({
        training_session_id: trainingId,
        email: email,
        invitation_token: token,
        token_expires_at: expiresAt,
        invited_by: currentUser.id
      });

    // 3. E-Mail senden (über Supabase Edge Function)
    await supabase.functions.invoke('send-training-invitation', {
      body: {
        email: email,
        trainingId: trainingId,
        token: token,
        inviteLink: `${APP_URL}/training-rsvp/${token}`
      }
    });
  }
}
```

#### C) **Externe Teilnahme (ohne App-Registrierung)**
```javascript
// Route: /training-rsvp/:token
async function handleExternalRSVP(token, response) {
  // 1. Token validieren
  const invitation = await supabase
    .from('training_invitations')
    .select('*, training_sessions(*)')
    .eq('invitation_token', token)
    .gt('token_expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    return { error: 'Ungültiger oder abgelaufener Link' };
  }

  // 2. Antwort speichern
  await supabase
    .from('training_invitations')
    .update({
      status: response, // 'accepted', 'declined', 'maybe'
      responded_at: new Date().toISOString()
    })
    .eq('id', invitation.id);

  // 3. Bei Zusage: Teilnahme eintragen
  if (response === 'accepted') {
    await supabase
      .from('training_attendance')
      .insert({
        training_session_id: invitation.training_session_id,
        guest_email: invitation.email,
        guest_name: invitation.email.split('@')[0], // Temporär
        status: 'confirmed'
      });
  }

  return { success: true };
}
```

---

### 4️⃣ **UI-Komponenten**

#### A) **TeamTrainingForm.jsx** (Neue Komponente)
```javascript
export default function TeamTrainingForm({ player, onSuccess }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [invitationMode, setInvitationMode] = useState('all_team_members');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [externalEmails, setExternalEmails] = useState([]);

  return (
    <div className="team-training-form">
      {/* Team-Auswahl */}
      <div className="form-group">
        <label>🏆 Team</label>
        <select 
          value={selectedTeam?.id} 
          onChange={(e) => setSelectedTeam(userTeams.find(t => t.id === e.target.value))}
        >
          {userTeams.map(team => (
            <option key={team.id} value={team.id}>
              {team.club} - {team.name} ({team.category})
            </option>
          ))}
        </select>
      </div>

      {/* Einladungs-Modus */}
      <div className="form-group">
        <label>👥 Einladungen</label>
        
        <label className="radio-option">
          <input 
            type="radio" 
            value="all_team_members"
            checked={invitationMode === 'all_team_members'}
            onChange={(e) => setInvitationMode(e.target.value)}
          />
          Alle Team-Mitglieder ({teamMembers.length} Spieler)
        </label>

        <label className="radio-option">
          <input 
            type="radio" 
            value="selected_players"
            checked={invitationMode === 'selected_players'}
            onChange={(e) => setInvitationMode(e.target.value)}
          />
          Bestimmte Spieler auswählen
        </label>

        {/* Spieler-Auswahl */}
        {invitationMode === 'selected_players' && (
          <div className="player-selection">
            {teamMembers.map(member => (
              <label key={member.id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={selectedPlayers.includes(member.id)}
                  onChange={(e) => togglePlayer(member.id, e.target.checked)}
                />
                {member.name} {member.current_lk && `(${member.current_lk})`}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Externe E-Mail-Einladungen */}
      <div className="form-group">
        <label>📧 Externe Spieler per E-Mail einladen</label>
        <p className="help-text">
          Diese Spieler erhalten einen Link, um ohne App-Registrierung zu- oder abzusagen.
        </p>
        
        {externalEmails.map((email, index) => (
          <div key={index} className="email-input-row">
            <input
              type="email"
              value={email}
              onChange={(e) => updateEmail(index, e.target.value)}
              placeholder="spieler@example.com"
            />
            <button onClick={() => removeEmail(index)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          onClick={() => setExternalEmails([...externalEmails, ''])}
          className="btn-secondary"
        >
          + E-Mail hinzufügen
        </button>
      </div>

      {/* Rest des Formulars... */}
    </div>
  );
}
```

#### B) **TrainingRSVP.jsx** (Neue Komponente für externe Einladungen)
```javascript
export default function TrainingRSVP() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const handleResponse = async (response) => {
    await supabase
      .from('training_invitations')
      .update({ 
        status: response, 
        responded_at: new Date().toISOString() 
      })
      .eq('invitation_token', token);

    if (response === 'accepted') {
      await supabase
        .from('training_attendance')
        .insert({
          training_session_id: invitation.training_session_id,
          guest_email: invitation.email,
          status: 'confirmed'
        });
    }

    alert('✅ Deine Antwort wurde gespeichert!');
  };

  return (
    <div className="training-rsvp-page">
      <div className="rsvp-card">
        <h2>🎾 Training-Einladung</h2>
        
        <div className="training-details">
          <h3>{invitation.training_sessions.title}</h3>
          <p>📅 {formatDate(invitation.training_sessions.date)}</p>
          <p>🕐 {invitation.training_sessions.start_time}</p>
          <p>📍 {invitation.training_sessions.venue}</p>
        </div>

        <div className="rsvp-buttons">
          <button 
            className="btn-success"
            onClick={() => handleResponse('accepted')}
          >
            ✅ Ich komme
          </button>
          <button 
            className="btn-warning"
            onClick={() => handleResponse('maybe')}
          >
            🤔 Vielleicht
          </button>
          <button 
            className="btn-danger"
            onClick={() => handleResponse('declined')}
          >
            ❌ Ich kann nicht
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 5️⃣ **E-Mail-Template** (Supabase Edge Function)

```javascript
// supabase/functions/send-training-invitation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { email, trainingDetails, token, inviteLink } = await req.json();

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #10b981; color: white; padding: 2rem; text-align: center; }
        .content { padding: 2rem; }
        .button { display: inline-block; padding: 1rem 2rem; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin: 0.5rem; }
        .button.decline { background: #ef4444; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎾 Training-Einladung</h1>
      </div>
      <div class="content">
        <h2>${trainingDetails.title}</h2>
        <p><strong>📅 Datum:</strong> ${trainingDetails.date}</p>
        <p><strong>🕐 Uhrzeit:</strong> ${trainingDetails.start_time}</p>
        <p><strong>📍 Ort:</strong> ${trainingDetails.venue}</p>
        
        <p>Du wurdest zu einem Team-Training eingeladen. Bitte gib uns Bescheid, ob du teilnehmen kannst:</p>
        
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${inviteLink}?response=accepted" class="button">
            ✅ Ich komme
          </a>
          <a href="${inviteLink}?response=declined" class="button decline">
            ❌ Ich kann nicht
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 0.9rem;">
          Dieser Link ist 7 Tage gültig.
        </p>
      </div>
    </body>
    </html>
  `;

  // Sende E-Mail über Supabase SMTP oder Service wie SendGrid
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: 'training@tennis-app.de' },
      subject: `🎾 Training-Einladung: ${trainingDetails.title}`,
      content: [{ type: 'text/html', value: emailHTML }]
    })
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 🚀 Implementierungs-Phasen

### **Phase 1: Datenbank-Schema** ✅
- `training_sessions` erweitern (`team_id`, `invitation_mode`)
- `training_invitations` Tabelle erstellen
- `training_attendance` erweitern (externe Gäste)

### **Phase 2: Team-Auswahl im Training-Formular** ✅
- Team-Dropdown bei Team-Training
- Automatische Team-Erkennung für Spieler

### **Phase 3: Spieler-Einladungen (App-Nutzer)** ✅
- "Alle Team-Mitglieder" Modus
- "Bestimmte Spieler" Modus
- Einladungs-Status in UI

### **Phase 4: E-Mail-Einladungen (Externe)** ⏳
- E-Mail-Input-Felder
- Token-Generierung
- Supabase Edge Function für E-Mail-Versand
- RSVP-Seite für externe Teilnehmer

### **Phase 5: Teilnehmer-Übersicht** ⏳
- Anzeige: App-Nutzer + Externe Gäste
- Status-Tracking
- Reminder-System

---

## 🎯 Prioritäten

### **MUSS (MVP):**
1. ✅ Team-Auswahl beim Training erstellen
2. ✅ "Alle Team-Mitglieder" automatisch einladen
3. ✅ Nur Team-Mitglieder sehen Team-Training

### **SOLLTE (v2):**
4. ⏳ "Bestimmte Spieler" auswählen
5. ⏳ E-Mail-Einladungen für Externe
6. ⏳ RSVP-Seite ohne App-Registrierung

### **KÖNNTE (v3):**
7. 🔮 Automatische Reminder (1 Tag vorher)
8. 🔮 Wiederkehrende Trainings
9. 🔮 Training-Templates

---

## 📊 Beispiel-Flow

### **Szenario: Chris erstellt Team-Training**

1. **Chris öffnet Training-Erstellung**
   - Wählt "Team-Training"
   - Dropdown zeigt: "VKC Sürth - Herren 40"

2. **Chris konfiguriert Einladungen**
   - Wählt "Alle Team-Mitglieder" (12 Spieler)
   - Fügt externe E-Mail hinzu: `max@example.com`

3. **Training wird erstellt**
   - Alle 12 Team-Mitglieder erhalten App-Benachrichtigung
   - Max erhält E-Mail mit RSVP-Link

4. **Teilnehmer antworten**
   - App-Nutzer: Klick in der App (✅/❌)
   - Max: Klick auf E-Mail-Link → RSVP-Seite → ✅ Ich komme

5. **Chris sieht Übersicht**
   - 8/12 Team-Mitglieder zugesagt
   - 1 externer Gast (Max) zugesagt
   - **Gesamt: 9 Teilnehmer**

---

## 🔐 Sicherheit & Datenschutz

### **RLS Policies:**
```sql
-- Nur Team-Mitglieder sehen Team-Trainings
CREATE POLICY "team_training_visibility" ON training_sessions
  FOR SELECT USING (
    type = 'team' AND EXISTS (
      SELECT 1 FROM player_teams
      WHERE player_teams.team_id = training_sessions.team_id
        AND player_teams.player_id = auth.uid()
    )
  );

-- E-Mail-Einladungen: Token-basierter Zugriff
CREATE POLICY "invitation_token_access" ON training_invitations
  FOR SELECT USING (
    invitation_token IS NOT NULL
    AND token_expires_at > NOW()
  );
```

### **Datenschutz:**
- ✅ Externe E-Mail-Adressen nur für Organisator sichtbar
- ✅ Token-Links expirieren nach 7 Tagen
- ✅ Keine Speicherung von Namen ohne Zustimmung

---

## ✅ Fertig!

Dieses Konzept ist **produktionsreif** und berücksichtigt:
- ✅ Multi-Team-Support
- ✅ App-Nutzer + Externe Einladungen
- ✅ Datenschutz & Sicherheit
- ✅ Skalierbarkeit
- ✅ UX-Optimierung

**Soll ich mit der Implementierung beginnen?** 🚀

