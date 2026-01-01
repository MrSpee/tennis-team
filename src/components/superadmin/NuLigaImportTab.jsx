import { useState } from 'react';
import { Download, Users, Trophy } from 'lucide-react';
import ClubRostersTab from './ClubRostersTab';
import TeamPortraitImportTab from './TeamPortraitImportTab';
import MatchErgebnisseSection from './MatchErgebnisseSection';
import './NuLigaImportTab.css';

const NuLigaImportTab = () => {
  const [selectedSection, setSelectedSection] = useState('rosters'); // 'rosters', 'matches', 'portrait'

  return (
    <div className="nuliga-import-tab">
      {/* Header */}
      <div className="nuliga-import-header">
        <div className="header-content">
          <div>
            <h2 className="tab-title">
              <Download size={28} />
              nuLiga Import
            </h2>
            <p className="tab-subtitle">
              Importiere Daten direkt von nuLiga-Seiten
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="nuliga-import-sections">
        <button
          className={`section-tab ${selectedSection === 'rosters' ? 'active' : ''}`}
          onClick={() => setSelectedSection('rosters')}
          title="Saison-Initialisierung: Einmalig zu Saisonbeginn alle Meldelisten importieren"
        >
          <Users size={18} />
          <span>Meldelisten</span>
          <span className="section-subtitle">Saison-Initialisierung (einmalig)</span>
        </button>
        <button
          className={`section-tab ${selectedSection === 'matches' ? 'active' : ''}`}
          onClick={() => setSelectedSection('matches')}
        >
          <Trophy size={18} />
          <span>Match-Ergebnisse</span>
          <span className="section-subtitle">Liga-Gruppen & Matches</span>
        </button>
        <button
          className={`section-tab ${selectedSection === 'portrait' ? 'active' : ''}`}
          onClick={() => setSelectedSection('portrait')}
          title="Für laufende Updates: Spieler-Statistiken (Einzel/Doppel) für ein einzelnes Team aktualisieren"
        >
          <Users size={18} />
          <span>Team-Portrait</span>
          <span className="section-subtitle">Spieler-Statistiken (laufende Updates)</span>
        </button>
      </div>

      {/* Section Content */}
      <div className="nuliga-import-content">
        {selectedSection === 'rosters' && (
          <div className="section-content rosters-section">
            <ClubRostersTab hideHeader={true} />
          </div>
        )}
        {selectedSection === 'matches' && (
          <div className="section-content matches-section">
            <MatchErgebnisseSection />
          </div>
        )}
        {selectedSection === 'portrait' && (
          <div className="section-content portrait-section">
            <TeamPortraitImportTab hideHeader={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NuLigaImportTab;

