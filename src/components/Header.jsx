import './Header.css';

function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* App Icon - links */}
        <div className="header-icon">
          <img 
            src="/app-icon.jpg" 
            alt="Platzhirsch Logo" 
            className="app-icon"
            onError={(e) => {
              // Fallback falls Icon nicht geladen werden kann
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="icon-fallback" style={{ display: 'none' }}>
            🎾
          </div>
        </div>
        
        {/* Slogan - zentriert */}
        <div className="header-slogan">
          <h1>Platzhirsch</h1>
          <p>Deine Matches, Dein Team.</p>
        </div>
        
        {/* Rechte Seite - für zukünftige Features */}
        <div className="header-right">
          {/* Platz für zukünftige Features */}
        </div>
      </div>
    </header>
  );
}

export default Header;
